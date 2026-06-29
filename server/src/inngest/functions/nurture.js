import { inngest } from "../../lib/inngest.js";
import prisma from "../../lib/prisma.js";
import { MailService } from "../../services/mail-service.js";
import { sendSms } from "../../services/sms.service.js";
import { getLeadTimezone, getNextValidSendWindow } from "../../lib/timezone.js";
import { ComplianceService } from "../../services/compliance-service.js";

// Helper function to calculate delay
const calculateDelayTime = (value, unit) => {
  const d = new Date();
  const cleanUnit = unit.toUpperCase();
  if (cleanUnit === "MINUTES" || cleanUnit === "MINUTE") {
    d.setMinutes(d.getMinutes() + value);
  } else if (cleanUnit === "HOURS" || cleanUnit === "HOUR") {
    d.setHours(d.getHours() + value);
  } else {
    d.setDate(d.getDate() + value);
  }
  return d;
};

export const runNurtureCampaign = inngest.createFunction(
  {
    id: "run-nurture-campaign-v4",
    // Delivery is at-least-once, so the trigger can arrive more than once for the same
    // enrollment. Dedupe duplicate triggers and never run two copies of one enrollment
    // in parallel (which would double-send).
    idempotency: "event.data.enrollmentId",
    concurrency: [{ key: "event.data.enrollmentId", limit: 1 }],
    triggers: [{ event: "campaign.enrollment.started" }],
  },
  async ({ event, step }) => {
    const { leadId, campaignId, enrollmentId } = event.data;
    console.log(`[Nurture] === START === event received for lead=${leadId}, campaign=${campaignId}, enrollment=${enrollmentId}`);

    const e = await prisma.campaignEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        lead: { 
          include: { 
            company: {
              include: {
                integrations: {
                  where: { platform: { in: ["BREVO_EMAIL", "BREVO_SMS", "TWILIO"] } }
                }
              }
            }
          } 
        },
        campaign: { include: { steps: { orderBy: { position: "asc" } } } },
      },
    });
    console.log(`[Nurture] fetch-campaign-data: enrollment found=${!!e}, campaign=${e?.campaign?.name}, stepsCount=${e?.campaign?.steps?.length}, lead=${e?.lead?.firstName} ${e?.lead?.lastName} (${e?.lead?.email})`);
    if (e?.campaign?.steps) {
      e.campaign.steps.forEach(s => console.log(`[Nurture]   step position=${s.position}, type=${s.type}, subject=${s.subject}`));
    }
    const lead = e?.lead;
    const campaign = e?.campaign;
    const enrollment = e;

    if (!enrollment || enrollment.status !== "ACTIVE") {
      console.log(`[Nurture] SKIPPED: enrollment status=${enrollment?.status || 'NOT FOUND'}`);
      return { status: "skipped", reason: "Enrollment not active or not found" };
    }

    const steps = campaign.steps;
    console.log(`[Nurture] Processing ${steps.length} steps. currentStepPosition=${enrollment.currentStepPosition}`);
    let currentPosition = enrollment.currentStepPosition || 1;

    // Extract messaging configurations
    let smtpConfig = null;
    let smsConfig = null;
    
    if (lead?.company?.integrations) {
      const emailInt = lead.company.integrations.find(i => i.platform === "BREVO_EMAIL" && i.isActive);
      if (emailInt) {
        smtpConfig = {
          host: emailInt.smtpHost,
          port: emailInt.smtpPort,
          user: emailInt.apiKey,
          pass: emailInt.secretKey,
          senderEmail: emailInt.senderEmail,
          senderName: emailInt.senderName,
        };
      }
      
      const smsInt = lead.company.integrations.find(i => (i.platform === "BREVO_SMS" || i.platform === "TWILIO") && i.isActive);
      if (smsInt) {
        smsConfig = {
          provider: smsInt.platform,
          apiKey: smsInt.apiKey,
          apiSecret: smsInt.secretKey,
          senderName: smsInt.senderName,
        };
      }
    }

    for (const currentStep of steps) {
      if (currentStep.position < currentPosition) continue;
      console.log(`[Nurture] Executing step position=${currentStep.position}, type=${currentStep.type}`);

      if (currentStep.type === "DELAY") {
        // Compute the wake time INSIDE a durable step so it is memoized. Computing it in
        // plain scope recomputes it on every replay; combined with a timestamp-based sleep
        // id that made the delay re-fire for the full duration on each wake. The sleep id is
        // now stable (position only), and the recorded wake time is fixed on first run.
        const nextTime = await step.run(`calc-delay-${currentStep.position}`, async () => {
          const delayValue = currentStep.delayValue || 0;
          const delayUnit = currentStep.delayUnit || "DAYS";

          let t = calculateDelayTime(delayValue, delayUnit);

          if (currentStep.sendWindowDays && currentStep.sendWindowStart && currentStep.sendWindowEnd) {
            const tz = getLeadTimezone(lead.state);
            t = getNextValidSendWindow(t, tz, currentStep.sendWindowDays, currentStep.sendWindowStart, currentStep.sendWindowEnd);
          }

          await prisma.campaignEnrollment.update({
            where: { id: enrollment.id },
            data: { currentStepPosition: currentStep.position, nextRunAt: t },
          });

          return new Date(t).toISOString();
        });

        await step.sleepUntil(`wait-for-delay-${currentStep.position}`, nextTime);

        currentPosition = currentStep.position + 1;
        continue;
      }

      // Send-window check (EMAIL/SMS). Compute the target inside a durable step and sleep
      // with a STABLE id so replays cannot re-arm the wait.
      if (currentStep.sendWindowDays && currentStep.sendWindowStart && currentStep.sendWindowEnd) {
        const windowTarget = await step.run(`calc-window-${currentStep.position}`, async () => {
          const tz = getLeadTimezone(lead.state);
          const nextValidTime = getNextValidSendWindow(new Date(), tz, currentStep.sendWindowDays, currentStep.sendWindowStart, currentStep.sendWindowEnd);
          // Only wait if the window opens more than a minute from now.
          if (new Date(nextValidTime).getTime() > Date.now() + 60000) {
            return new Date(nextValidTime).toISOString();
          }
          return null;
        });
        if (windowTarget) {
          await step.sleepUntil(`wait-for-window-${currentStep.position}`, windowTarget);
        }
      }

      // Compliance gate. Runs fresh (not memoized) so consent/suppression/quiet-hours are
      // re-evaluated accurately on every replay. Quiet-hours is transient: sleep until the
      // lead-local send window opens, then re-check the SAME step. Each wait uses an
      // attempt-scoped stable id so a memoized sleep returns instantly without advancing the
      // loop (the previous code used `continue` after the sleep, which skipped the step on
      // replay) and without colliding with a fresh wait.
      let complianceCheck;
      let quietHoursAttempts = 0;
      while (true) {
        complianceCheck = await ComplianceService.validateOutboundMessage(lead.id, currentStep.type);
        console.log(`[Nurture] Compliance check result: allowed=${complianceCheck.allowed}, reason=${complianceCheck.reason || 'none'}`);

        if (complianceCheck.allowed || !complianceCheck.reason?.includes("Quiet Hours")) {
          break; // clear to send, or a terminal block (suppressed / opted-out)
        }

        quietHoursAttempts += 1;
        const resumeAt = await step.run(`calc-quiet-hours-${currentStep.position}-${quietHoursAttempts}`, async () => {
          const tz = ComplianceService.getLeadTimezone(lead.state, lead.phone);
          // Next valid moment inside the TCPA window (8am–9pm lead-local), any day.
          const target = getNextValidSendWindow(new Date(Date.now() + 60000), tz, "Mon,Tue,Wed,Thu,Fri,Sat,Sun", "08:00", "21:00");
          return new Date(target).toISOString();
        });
        await step.sleepUntil(`wait-for-quiet-hours-${currentStep.position}-${quietHoursAttempts}`, resumeAt);
      }

      if (!complianceCheck.allowed) {
        // Terminal block (suppression list / opted out) -> exit the campaign.
        await step.run(`exit-suppressed-${currentStep.position}`, async () => {
          await prisma.campaignEnrollment.update({
            where: { id: enrollment.id },
            data: { status: "EXITED", exitedReason: "SUPPRESSED" },
          });
          await prisma.leadTimeline.create({
            data: {
              leadId: lead.id,
              type: "SYNC_UPDATE",
              description: `Campaign auto-exited. Reason: ${complianceCheck.reason}`,
            },
          });

          // Check campaign completion
          const activeCount = await prisma.campaignEnrollment.count({
            where: { campaignId, status: { in: ["ACTIVE", "PAUSED"] } }
          });
          if (activeCount === 0) {
            await prisma.campaign.update({ where: { id: campaignId }, data: { status: "Ready" } });
          }
        });
        return { status: "exited", reason: "suppressed" };
      }

      // Send (isolated, non-idempotent I/O). Returns a serializable result and performs NO
      // database writes, so if the bookkeeping step below fails and is retried, the message
      // is NOT sent again — the memoized send result is reused. The send itself never throws
      // (failures are captured into the result) so this step is not retried on a send error.
      const sendResult = await step.run(`send-step-${currentStep.position}`, async () => {
        const bookingLink = `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/sales/scheduling?leadId=${lead.id}`;
        const variables = {
          firstName: lead.firstName || "",
          lastName: lead.lastName || "",
          email: lead.email || "",
          phone: lead.phone || "",
          bookingLink,
        };

        const renderText = (templateText) => {
          if (!templateText) return "";
          return templateText
            .replace(/{firstName}/g, variables.firstName)
            .replace(/{lastName}/g, variables.lastName)
            .replace(/{email}/g, variables.email)
            .replace(/{phone}/g, variables.phone)
            .replace(/{bookingLink}/g, variables.bookingLink);
        };

        console.log(`[Nurture] Step type=${currentStep.type}, lead.email=${lead.email}, lead.phone=${lead.phone}`);

        if (currentStep.type === "EMAIL" && lead.email) {
          const subject = renderText(currentStep.subject || "Outreach Update");
          const body = renderText(currentStep.body || "");
          console.log(`[Nurture] Sending EMAIL to ${lead.email}, subject="${subject}"`);

          const formattedHtml = `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #eaeaea;">
              <div style="background-color: #0F3B3D; padding: 30px 40px; text-align: center; border-bottom: 3px solid #b48c3c;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.5px;">
                  ${lead.company?.name || "Warranty Care & Sales Portal"}
                </h1>
              </div>
              <div style="padding: 40px; color: #334155; line-height: 1.8; font-size: 16px;">
                ${body.replace(/\n/g, "<br />")}
              </div>
            </div>
            <div style="text-align: center; margin-top: 20px;">
              <span style="font-family: sans-serif; font-size: 11px; color: #94a3b8;">
                Powered by AI4Home Warranty Care
              </span>
            </div>
          `;

          const finalHtml = ComplianceService.addEmailUnsubscribeFooter(
            formattedHtml,
            `${bookingLink}&unsubscribe=true`,
            lead.company?.name || "Warranty Care Portal"
          );

          const emailResult = await MailService.sendEmail({
            to: lead.email,
            subject,
            html: finalHtml,
            fromName: lead.company?.name || undefined,
            smtpConfig,
            // NOTE: Do NOT pass fromEmail here. The company email (e.g. contact@bitzsolhomes.com)
            // is not verified in Brevo and will cause rejection. Let MailService use the
            // verified SENDER_EMAIL from .env instead.
          });

          return {
            channel: "EMAIL",
            attempted: true,
            success: !!emailResult.success,
            messageId: emailResult.messageId || null,
            error: emailResult.success ? null : (emailResult.error || "Unknown error"),
            subject,
            body,
          };
        } else if (currentStep.type === "SMS" && lead.phone) {
          const rawBody = renderText(currentStep.body || "");
          const finalBody = ComplianceService.addSmsOptOutSuffix(rawBody);

          try {
            console.log(`[Nurture] Step ${currentStep.position}: Triggering sendSms to ${lead.phone}...`);
            await sendSms({ to: lead.phone, body: finalBody, smsConfig });
            console.log(`[Nurture] Step ${currentStep.position}: sendSms completed successfully!`);
            return { channel: "SMS", attempted: true, success: true, error: null, body: finalBody };
          } catch (smsError) {
            console.error(`[Nurture] Step ${currentStep.position}: sendSms failed with error:`, smsError);
            return { channel: "SMS", attempted: true, success: false, error: smsError.message || "Unknown error", body: finalBody };
          }
        }

        // Step type with no matching contact channel on the lead -> nothing sent.
        return { channel: currentStep.type, attempted: false };
      });

      // Bookkeeping (DB writes only). Separated from the send so a retry here never re-sends.
      await step.run(`record-step-${currentStep.position}`, async () => {
        if (sendResult.attempted && sendResult.channel === "EMAIL") {
          await prisma.leadTimeline.create({
            data: sendResult.success
              ? {
                  leadId: lead.id,
                  type: "EMAIL_SENT",
                  description: `Sent campaign email: "${sendResult.subject}"`,
                  metadata: { subject: sendResult.subject, body: sendResult.body, campaignId: campaign.id, stepPosition: currentStep.position, messageId: sendResult.messageId },
                }
              : {
                  leadId: lead.id,
                  type: "EMAIL_FAILED",
                  description: `Failed to send campaign email: ${sendResult.error}`,
                  metadata: { subject: sendResult.subject, body: sendResult.body, error: sendResult.error, campaignId: campaign.id, stepPosition: currentStep.position },
                },
          });
        } else if (sendResult.attempted && sendResult.channel === "SMS") {
          await prisma.leadTimeline.create({
            data: sendResult.success
              ? {
                  leadId: lead.id,
                  type: "SMS_SENT",
                  description: `Sent campaign SMS: "${sendResult.body.slice(0, 50)}${sendResult.body.length > 50 ? "..." : ""}"`,
                  metadata: { body: sendResult.body, campaignId: campaign.id, stepPosition: currentStep.position },
                }
              : {
                  leadId: lead.id,
                  type: "SMS_FAILED",
                  description: `Failed to send campaign SMS: ${sendResult.error}`,
                  metadata: { body: sendResult.body, error: sendResult.error, campaignId: campaign.id, stepPosition: currentStep.position },
                },
          });
        } else {
          console.log(`[Nurture] Step ${currentStep.position}: no ${currentStep.type} contact channel on lead; nothing sent.`);
        }

        await prisma.campaignEnrollment.update({
          where: { id: enrollment.id },
          data: { currentStepPosition: currentStep.position },
        });
      });

      currentPosition = currentStep.position + 1;
    }

    // Finished all steps
    console.log(`[Nurture] All steps processed. Completing campaign.`);
    await step.run(`complete-campaign-${campaignId}-${enrollment.id}`, async () => {
      await prisma.campaignEnrollment.update({
        where: { id: enrollment.id },
        data: { status: "COMPLETED" },
      });

      await prisma.leadTimeline.create({
        data: {
          leadId,
          type: "SYNC_UPDATE",
          description: `Completed nurture campaign: "${campaign.name}"`,
          metadata: { campaignId: campaign.id }
        },
      });

      // Check campaign completion
      const activeCount = await prisma.campaignEnrollment.count({
        where: { campaignId, status: { in: ["ACTIVE", "PAUSED"] } }
      });
      if (activeCount === 0) {
        await prisma.campaign.update({ where: { id: campaignId }, data: { status: "Ready" } });
      }
    });

    return { status: "completed" };
  }
);

// Exit function to handle DB updates when a campaign run is cancelled
export const handleCampaignExit = inngest.createFunction(
  { id: "handle-campaign-exit", triggers: [{ event: "campaign.exit" }] },
  async ({ event, step }) => {
    const { leadId, reason } = event.data;

    await step.run("update-enrollments-exited", async () => {
      // Find all active enrollments for this lead
      const enrollments = await prisma.campaignEnrollment.findMany({
        where: { leadId, status: { in: ["ACTIVE", "PAUSED"] } },
        include: { campaign: true }
      });

      for (const enrollment of enrollments) {
        await prisma.campaignEnrollment.update({
          where: { id: enrollment.id },
          data: { status: "EXITED", exitedReason: reason },
        });

        await prisma.leadTimeline.create({
          data: {
            leadId,
            type: "SYNC_UPDATE",
            description: `Exited campaign "${enrollment.campaign.name}". Reason: ${reason}`,
            metadata: { campaignId: enrollment.campaignId }
          },
        });

        // Check completion
        const activeCount = await prisma.campaignEnrollment.count({
          where: { campaignId: enrollment.campaignId, status: { in: ["ACTIVE", "PAUSED"] } }
        });
        if (activeCount === 0) {
          await prisma.campaign.update({ where: { id: enrollment.campaignId }, data: { status: "Ready" } });
        }
      }
    });
    return { exitedCount: 1 }; // For logging
  }
);
