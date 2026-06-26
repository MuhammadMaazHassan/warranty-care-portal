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
    id: "run-nurture-campaign",
    event: "campaign.enroll",
    // Cancel this run immediately if a campaign.exit event is fired for this lead
    cancelOn: [
      {
        event: "campaign.exit",
        match: "data.leadId",
      },
    ],
  },
  async ({ event, step }) => {
    const { leadId, campaignId, enrollmentId } = event.data;

    // We do all major db work inside `step.run` so it's durable and retriable
    const { lead, campaign, enrollment } = await step.run("fetch-campaign-data", async () => {
      const e = await prisma.campaignEnrollment.findUnique({
        where: { id: enrollmentId },
        include: {
          lead: { include: { company: true } },
          campaign: { include: { steps: { orderBy: { position: "asc" } } } },
        },
      });
      return { lead: e?.lead, campaign: e?.campaign, enrollment: e };
    });

    if (!enrollment || enrollment.status !== "ACTIVE") {
      return { status: "skipped", reason: "Enrollment not active or not found" };
    }

    const steps = campaign.steps;
    let currentPosition = enrollment.currentStepPosition || 1;

    for (const currentStep of steps) {
      if (currentStep.position < currentPosition) continue;

      if (currentStep.type === "DELAY") {
        // Calculate sleep duration
        const delayValue = currentStep.delayValue || 0;
        const delayUnit = currentStep.delayUnit || "DAYS";

        let nextTime = calculateDelayTime(delayValue, delayUnit);
        
        // Handle send windows
        if (currentStep.sendWindowDays && currentStep.sendWindowStart && currentStep.sendWindowEnd) {
          const tz = getLeadTimezone(lead.state);
          nextTime = getNextValidSendWindow(nextTime, tz, currentStep.sendWindowDays, currentStep.sendWindowStart, currentStep.sendWindowEnd);
        }

        // Update DB
        await step.run("update-delay-status", async () => {
          await prisma.campaignEnrollment.update({
            where: { id: enrollment.id },
            data: { currentStepPosition: currentStep.position, nextRunAt: nextTime },
          });
        });

        // Use Inngest's durable sleep
        await step.sleepUntil("wait-for-delay", nextTime);

        currentPosition = currentStep.position + 1;
        continue;
      }

      // Check send window dynamically if it's an EMAIL or SMS step
      if (currentStep.sendWindowDays && currentStep.sendWindowStart && currentStep.sendWindowEnd) {
        const nextValidTime = await step.run("check-send-window", async () => {
          const tz = getLeadTimezone(lead.state);
          return getNextValidSendWindow(new Date(), tz, currentStep.sendWindowDays, currentStep.sendWindowStart, currentStep.sendWindowEnd);
        });

        if (new Date(nextValidTime).getTime() > new Date().getTime() + 60000) {
          await step.sleepUntil("wait-for-window", nextValidTime);
        }
      }

      // Compliance Gate
      const complianceCheck = await step.run("compliance-check", async () => {
        return ComplianceService.validateOutboundMessage(lead.id, currentStep.type);
      });

      if (!complianceCheck.allowed) {
        if (complianceCheck.reason.includes("Quiet Hours")) {
          // Sleep for an hour and retry
          const nextHour = new Date();
          nextHour.setHours(nextHour.getHours() + 1);
          nextHour.setMinutes(0, 0, 0);
          await step.sleepUntil("wait-for-quiet-hours", nextHour);
          
          // Re-evaluate this step
          currentPosition = currentStep.position;
          continue; 
        } else {
          // Suppressed
          await step.run("exit-suppressed", async () => {
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
      }

      // Send execution
      await step.run(`execute-step-${currentStep.position}`, async () => {
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

        if (currentStep.type === "EMAIL" && lead.email) {
          const subject = renderText(currentStep.subject || "Outreach Update");
          const body = renderText(currentStep.body || "");

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

          await MailService.sendEmail({
            to: lead.email,
            subject,
            html: finalHtml,
            fromName: lead.company?.name || undefined,
            fromEmail: lead.company?.email || undefined,
          });

          await prisma.leadTimeline.create({
            data: {
              leadId: lead.id,
              type: "EMAIL_SENT",
              description: `Sent campaign email: "${subject}"`,
              metadata: { subject, body, campaignId: campaign.id, stepPosition: currentStep.position },
            },
          });
        } else if (currentStep.type === "SMS" && lead.phone) {
          const rawBody = renderText(currentStep.body || "");
          const finalBody = ComplianceService.addSmsOptOutSuffix(rawBody);

          let smsSuccess = false;
          let errorMessage = "";
          try {
            await sendSms({ to: lead.phone, body: finalBody });
            smsSuccess = true;
          } catch (smsError) {
            errorMessage = smsError.message;
          }

          if (smsSuccess) {
            await prisma.leadTimeline.create({
              data: {
                leadId: lead.id,
                type: "SMS_SENT",
                description: `Sent campaign SMS: "${finalBody.slice(0, 50)}${finalBody.length > 50 ? "..." : ""}"`,
                metadata: { body: finalBody, campaignId: campaign.id, stepPosition: currentStep.position },
              },
            });
          } else {
            await prisma.leadTimeline.create({
              data: {
                leadId: lead.id,
                type: "SMS_FAILED",
                description: `Failed to send campaign SMS: ${errorMessage}`,
                metadata: { body: finalBody, error: errorMessage, campaignId: campaign.id, stepPosition: currentStep.position },
              },
            });
          }
        }

        await prisma.campaignEnrollment.update({
          where: { id: enrollment.id },
          data: { currentStepPosition: currentStep.position },
        });
      });

      currentPosition = currentStep.position + 1;
    }

    // Finished all steps
    await step.run("complete-campaign", async () => {
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
  { id: "handle-campaign-exit", event: "campaign.exit" },
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
