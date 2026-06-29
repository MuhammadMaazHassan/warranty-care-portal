import prisma from "../lib/prisma.js";

// Map US State codes to standard IANA timezone identifiers
const STATE_TIMEZONE_MAP = {
  PK: "Asia/Karachi",
  PAKISTAN: "Asia/Karachi",
  // Pacific
  CA: "America/Los_Angeles",
  NV: "America/Los_Angeles",
  OR: "America/Los_Angeles",
  WA: "America/Los_Angeles",
  CALIFORNIA: "America/Los_Angeles",
  NEVADA: "America/Los_Angeles",
  OREGON: "America/Los_Angeles",
  WASHINGTON: "America/Los_Angeles",

  // Mountain
  CO: "America/Denver",
  ID: "America/Denver",
  MT: "America/Denver",
  UT: "America/Denver",
  WY: "America/Denver",
  NM: "America/Denver",
  COLORADO: "America/Denver",
  IDAHO: "America/Denver",
  MONTANA: "America/Denver",
  UTAH: "America/Denver",
  WYOMING: "America/Denver",
  "NEW MEXICO": "America/Denver",

  // Arizona (no DST)
  AZ: "America/Phoenix",
  ARIZONA: "America/Phoenix",

  // Central
  AL: "America/Chicago",
  AR: "America/Chicago",
  IL: "America/Chicago",
  IA: "America/Chicago",
  KS: "America/Chicago",
  LA: "America/Chicago",
  MN: "America/Chicago",
  MS: "America/Chicago",
  MO: "America/Chicago",
  NE: "America/Chicago",
  ND: "America/Chicago",
  OK: "America/Chicago",
  SD: "America/Chicago",
  TN: "America/Chicago",
  TX: "America/Chicago",
  WI: "America/Chicago",
  ALABAMA: "America/Chicago",
  ARKANSAS: "America/Chicago",
  ILLINOIS: "America/Chicago",
  IOWA: "America/Chicago",
  KANSAS: "America/Chicago",
  LOUISIANA: "America/Chicago",
  MINNESOTA: "America/Chicago",
  MISSISSIPPI: "America/Chicago",
  MISSOURI: "America/Chicago",
  NEBRASKA: "America/Chicago",
  "NORTH DAKOTA": "America/Chicago",
  OKLAHOMA: "America/Chicago",
  "SOUTH DAKOTA": "America/Chicago",
  TENNESSEE: "America/Chicago",
  TEXAS: "America/Chicago",
  WISCONSIN: "America/Chicago",

  // Eastern
  CT: "America/New_York",
  DE: "America/New_York",
  FL: "America/New_York",
  GA: "America/New_York",
  IN: "America/New_York",
  KY: "America/New_York",
  ME: "America/New_York",
  MD: "America/New_York",
  MA: "America/New_York",
  MI: "America/New_York",
  NH: "America/New_York",
  NJ: "America/New_York",
  NY: "America/New_York",
  NC: "America/New_York",
  OH: "America/New_York",
  PA: "America/New_York",
  RI: "America/New_York",
  SC: "America/New_York",
  VT: "America/New_York",
  VA: "America/New_York",
  WV: "America/New_York",
  CONNECTICUT: "America/New_York",
  DELAWARE: "America/New_York",
  FLORIDA: "America/New_York",
  GEORGIA: "America/New_York",
  INDIANA: "America/New_York",
  KENTUCKY: "America/New_York",
  MAINE: "America/New_York",
  MARYLAND: "America/New_York",
  MASSACHUSETTS: "America/New_York",
  MICHIGAN: "America/New_York",
  "NEW HAMPSHIRE": "America/New_York",
  "NEW JERSEY": "America/New_York",
  "NEW YORK": "America/New_York",
  "NORTH CAROLINA": "America/New_York",
  OHIO: "America/New_York",
  PENNSYLVANIA: "America/New_York",
  "RHODE ISLAND": "America/New_York",
  "SOUTH CAROLINA": "America/New_York",
  VERMONT: "America/New_York",
  VIRGINIA: "America/New_York",
  "WEST VIRGINIA": "America/New_York",

  // Alaska
  AK: "America/Anchorage",
  ALASKA: "America/Anchorage",
  // Hawaii
  HI: "Pacific/Honolulu",
  HAWAII: "Pacific/Honolulu",
};

// Select US area codes mapped to timezones
const AREA_CODE_TZ_MAP = {
  // Pacific
  "206": "America/Los_Angeles",
  "253": "America/Los_Angeles",
  "360": "America/Los_Angeles",
  "425": "America/Los_Angeles",
  "509": "America/Los_Angeles",
  "503": "America/Los_Angeles",
  "971": "America/Los_Angeles",
  "209": "America/Los_Angeles",
  "213": "America/Los_Angeles",
  "310": "America/Los_Angeles",
  "323": "America/Los_Angeles",
  "408": "America/Los_Angeles",
  "415": "America/Los_Angeles",
  "510": "America/Los_Angeles",
  "530": "America/Los_Angeles",
  "559": "America/Los_Angeles",
  "562": "America/Los_Angeles",
  "619": "America/Los_Angeles",
  "626": "America/Los_Angeles",
  "650": "America/Los_Angeles",
  "661": "America/Los_Angeles",
  "707": "America/Los_Angeles",
  "714": "America/Los_Angeles",
  "760": "America/Los_Angeles",
  "805": "America/Los_Angeles",
  "818": "America/Los_Angeles",
  "831": "America/Los_Angeles",
  "858": "America/Los_Angeles",
  "909": "America/Los_Angeles",
  "916": "America/Los_Angeles",
  "925": "America/Los_Angeles",
  "949": "America/Los_Angeles",
  "951": "America/Los_Angeles",
  "702": "America/Los_Angeles",
  "775": "America/Los_Angeles",

  // Mountain
  "208": "America/Denver",
  "307": "America/Denver",
  "406": "America/Denver",
  "435": "America/Denver",
  "801": "America/Denver",
  "385": "America/Denver",
  "970": "America/Denver",
  "303": "America/Denver",
  "720": "America/Denver",
  "505": "America/Denver",
  "575": "America/Denver",

  // Arizona
  "480": "America/Phoenix",
  "520": "America/Phoenix",
  "602": "America/Phoenix",
  "623": "America/Phoenix",
  "928": "America/Phoenix",

  // Central
  "205": "America/Chicago",
  "256": "America/Chicago",
  "334": "America/Chicago",
  "479": "America/Chicago",
  "501": "America/Chicago",
  "312": "America/Chicago",
  "773": "America/Chicago",
  "847": "America/Chicago",
  "630": "America/Chicago",
  "815": "America/Chicago",
  "309": "America/Chicago",
  "217": "America/Chicago",
  "618": "America/Chicago",
  "319": "America/Chicago",
  "515": "America/Chicago",
  "316": "America/Chicago",
  "785": "America/Chicago",
  "504": "America/Chicago",
  "225": "America/Chicago",
  "318": "America/Chicago",
  "612": "America/Chicago",
  "651": "America/Chicago",
  "952": "America/Chicago",
  "763": "America/Chicago",
  "218": "America/Chicago",
  "601": "America/Chicago",
  "662": "America/Chicago",
  "314": "America/Chicago",
  "816": "America/Chicago",
  "417": "America/Chicago",
  "402": "America/Chicago",
  "308": "America/Chicago",
  "701": "America/Chicago",
  "405": "America/Chicago",
  "918": "America/Chicago",
  "605": "America/Chicago",
  "901": "America/Chicago",
  "615": "America/Chicago",
  "865": "America/Chicago",
  "423": "America/Chicago",
  "512": "America/Chicago",
  "214": "America/Chicago",
  "972": "America/Chicago",
  "469": "America/Chicago",
  "713": "America/Chicago",
  "281": "America/Chicago",
  "832": "America/Chicago",
  "210": "America/Chicago",
  "817": "America/Chicago",
  "915": "America/Chicago",
  "806": "America/Chicago",
  "956": "America/Chicago",
  "262": "America/Chicago",
  "414": "America/Chicago",
  "608": "America/Chicago",
  "920": "America/Chicago",
  "715": "America/Chicago",

  // Alaska
  "907": "America/Anchorage",
  // Hawaii
  "808": "Pacific/Honolulu",
};

export class ComplianceService {
  /**
   * Estimate the timezone of a lead based on state abbreviation or phone area code
   */
  static getLeadTimezone(state, phone) {
    if (state) {
      const cleanState = state.trim().toUpperCase();
      if (STATE_TIMEZONE_MAP[cleanState]) {
        return STATE_TIMEZONE_MAP[cleanState];
      }
    }

    if (phone) {
      const digits = phone.replace(/\D/g, "");
      // For E.164: +12345678901 -> country code 1, area code is 234 (digits indices 1, 2, 3 if length is 11)
      let areaCode = "";
      if (digits.length === 11 && digits.startsWith("1")) {
        areaCode = digits.substring(1, 4);
      } else if (digits.length === 10) {
        areaCode = digits.substring(0, 3);
      }

      if (areaCode && AREA_CODE_TZ_MAP[areaCode]) {
        return AREA_CODE_TZ_MAP[areaCode];
      }
    }

    return "America/New_York"; // Default to Eastern Time
  }

  /**
   * Check if the current time in the given timezone is within allowed TCPA sending hours (8:00 AM - 9:00 PM)
   */
  static checkSendingHours(timeZone) {
    try {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour: "numeric",
        hour12: false,
      });
      const hour = parseInt(formatter.format(new Date()), 10);
      return hour >= 8 && hour < 21; // 8 AM to 9 PM (exclusive of 9:00 PM)
    } catch (error) {
      console.error(
        `[Compliance Service] Timezone check failed for ${timeZone}:`,
        error
      );
      return true; // Default to sending if check fails to prevent infinite queue lockups
    }
  }

  /**
   * Validate if an outbound message is allowed to be sent to a lead
   */
  static async validateOutboundMessage(leadId, channel) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { company: true },
    });

    if (!lead) {
      return { allowed: false, reason: "Lead not found" };
    }

    const { company } = lead;
    const value = channel === "EMAIL" ? lead.email : lead.phone;

    if (!value) {
      return {
        allowed: false,
        reason: `Lead lacks contact details for channel ${channel}`,
      };
    }

    const normalizedValue =
      channel === "EMAIL"
        ? value.trim().toLowerCase()
        : value.replace(/\D/g, "");

    // 1. Check suppression list
    const suppressed = await prisma.suppressionList.findFirst({
      where: {
        companyId: lead.companyId,
        value: {
          equals: normalizedValue,
          mode: "insensitive",
        },
      },
    });

    if (suppressed) {
      return {
        allowed: false,
        reason: `Contact is on the suppression list (Reason: ${suppressed.reason})`,
      };
    }

    // 2. Check consent flags
    if (company.complianceOptInRequired) {
      if (channel === "SMS" && !lead.smsOptIn) {
        return {
          allowed: false,
          reason: "Explicit SMS consent is required and not granted",
        };
      }
      if (channel === "EMAIL" && lead.emailOptIn === false) {
        // For email, block if they explicitly opted out (optIn is false)
        return {
          allowed: false,
          reason: "Explicit email consent was revoked (Opt-out)",
        };
      }
    } else {
      // If compliance checks are relaxed, still block if they are explicitly marked as opt-out (optIn === false)
      if (channel === "SMS" && lead.smsOptIn === false) {
        return { allowed: false, reason: "SMS communications are opted out" };
      }
      if (channel === "EMAIL" && lead.emailOptIn === false) {
        return { allowed: false, reason: "Email communications are opted out" };
      }
    }

    // 3. Check quiet hours (SMS only)
    if (channel === "SMS") {
      const tz = this.getLeadTimezone(lead.state, lead.phone);
      const isWithinHours = this.checkSendingHours(tz);
      if (!isWithinHours) {
        return {
          allowed: false,
          reason: `Quiet Hours active in recipient timezone (${tz}). Re-try between 8 AM and 9 PM.`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Process incoming SMS keyword triggers (STOP, HELP, START)
   */
  static async handleInboundKeyword(companyId, senderContact, messageText, channel) {
    const text = messageText.trim().toUpperCase();
    const isSms = channel === "SMS";

    const stopKeywords = ["STOP", "UNSUBSCRIBE", "QUIT", "CANCEL", "END"];
    const startKeywords = ["START", "YES", "UNSTOP", "RESUBSCRIBE"];
    const helpKeywords = ["HELP", "INFO"];

    const normalizedContact = isSms
      ? senderContact.replace(/\D/g, "")
      : senderContact.trim().toLowerCase();

    // Find the lead(s) for this company matching the contact info
    const leads = await prisma.lead.findMany({
      where: {
        companyId,
        OR: [
          { email: normalizedContact },
          { phone: { contains: normalizedContact.slice(-10) } }, // match last 10 digits
        ],
      },
    });

    if (leads.length === 0) {
      return { isComplianceAction: false };
    }

    if (stopKeywords.includes(text)) {
      // 1. Opt-out
      for (const lead of leads) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            smsOptIn: isSms ? false : lead.smsOptIn,
            emailOptIn: !isSms ? false : lead.emailOptIn,
            consentSource: isSms
              ? "SMS STOP Keyword"
              : "Email Unsubscribe Request",
            consentTimestamp: new Date(),
            timeline: {
              create: {
                type: "CONSENT_CHANGE",
                description: `Opted-out of ${channel} communications via ${text} keyword.`,
              },
            },
          },
        });
      }

      // Add to suppression list
      await prisma.suppressionList.upsert({
        where: {
          companyId_value: {
            companyId,
            value: normalizedContact,
          },
        },
        create: {
          companyId,
          value: normalizedContact,
          reason: "UNSUBSCRIBE",
        },
        update: {
          reason: "UNSUBSCRIBE",
        },
      });

      return {
        isComplianceAction: true,
        replyText: isSms
          ? "You have successfully been unsubscribed. You will receive no further SMS alerts from this number. Reply START to resubscribe."
          : "You have been unsubscribed from all marketing emails.",
      };
    }

    if (startKeywords.includes(text) && isSms) {
      // 2. Opt-in/resubscribe
      for (const lead of leads) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            smsOptIn: true,
            consentSource: "SMS START Keyword",
            consentTimestamp: new Date(),
            timeline: {
              create: {
                type: "CONSENT_CHANGE",
                description: `Resubscribed to SMS communications via ${text} keyword.`,
              },
            },
          },
        });
      }

      // Remove from suppression list
      try {
        await prisma.suppressionList.delete({
          where: {
            companyId_value: {
              companyId,
              value: normalizedContact,
            },
          },
        });
      } catch {
        // Safe to ignore if not present in suppression list
      }

      return {
        isComplianceAction: true,
        replyText:
          "You have successfully resubscribed to SMS alerts. Standard message & data rates may apply. Reply STOP to opt out.",
      };
    }

    if (helpKeywords.includes(text) && isSms) {
      return {
        isComplianceAction: true,
        replyText:
          "Aiforhomebuilder Marketing Hub: For client assistance, reply to this thread. Msg & data rates may apply. Reply STOP to cancel.",
      };
    }

    return { isComplianceAction: false };
  }

  /**
   * Helper to format email HTML with required CAN-SPAM opt-out footer links
   */
  static addEmailUnsubscribeFooter(htmlContent, unsubscribeUrl, companyName) {
    const footerHtml = `
      <div style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 11px; color: #718096; text-align: center; line-height: 1.5;">
        <p>This email was sent by <strong>${companyName}</strong>.</p>
        <p>If you no longer wish to receive these emails, you can <a href="${unsubscribeUrl}" style="color: #b48c3c; text-decoration: underline;">unsubscribe here</a> at any time.</p>
        <p>&copy; 2026 ${companyName}. All rights reserved.</p>
      </div>
    `;

    // Try to inject before </body> if present, else append
    if (htmlContent.includes("</body>")) {
      return htmlContent.replace("</body>", `${footerHtml}</body>`);
    }
    return `${htmlContent}${footerHtml}`;
  }

  /**
   * Helper to append opt-out instructions to an SMS message
   */
  static addSmsOptOutSuffix(body) {
    const suffix = " Reply STOP to opt out.";
    if (body.toLowerCase().includes("reply stop")) {
      return body;
    }
    return `${body}${suffix}`;
  }

  /**
   * Normalize a contact value for storage/comparison: lowercased email, digits-only phone.
   */
  static normalizeContact(channel, value) {
    if (!value) return "";
    return channel === "EMAIL"
      ? value.trim().toLowerCase()
      : value.replace(/\D/g, "");
  }

  /**
   * Lightweight suppression check by raw contact value (used by the unified send gate
   * for recipients that aren't a known Lead, e.g. warranty ticket-status emails).
   */
  static async checkSuppression(companyId, channel, value) {
    const normalizedValue = this.normalizeContact(channel, value);
    if (!companyId || !normalizedValue) return { suppressed: false };

    const match =
      channel === "EMAIL"
        ? await prisma.suppressionList.findFirst({
            where: {
              companyId,
              value: { equals: normalizedValue, mode: "insensitive" },
            },
          })
        : await prisma.suppressionList.findFirst({
            // Phone numbers may be stored with/without a country-code prefix; match on the
            // last 10 digits to stay consistent across E.164 and national formats.
            where: { companyId, value: { contains: normalizedValue.slice(-10) } },
          });

    return match
      ? { suppressed: true, reason: match.reason }
      : { suppressed: false };
  }

  /**
   * Map a raw provider event name (Brevo email/SMS event, Twilio status) to an internal
   * category. Returns null for events we don't act on.
   */
  static mapEventCategory(rawEventType) {
    const map = {
      // Delivery
      delivered: "DELIVERED",
      delivery: "DELIVERED",
      // Engagement (email)
      opened: "OPENED",
      unique_opened: "OPENED",
      open: "OPENED",
      click: "CLICKED",
      clicks: "CLICKED",
      proxy_open: "OPENED",
      // Hard failures -> suppress (BOUNCE)
      hard_bounce: "BOUNCED",
      invalid_email: "BOUNCED",
      blocked: "BOUNCED",
      // Soft / transient failures -> log only
      soft_bounce: "SOFT_BOUNCE",
      deferred: "SOFT_BOUNCE",
      // Spam complaints -> suppress (COMPLAINT)
      spam: "COMPLAINED",
      complaint: "COMPLAINED",
      // Unsubscribes -> suppress (UNSUBSCRIBE)
      unsubscribed: "UNSUBSCRIBED",
      unsubscribe: "UNSUBSCRIBED",
      // SMS / generic failures -> log only (no suppression by default)
      failed: "FAILED",
      undelivered: "FAILED",
      // Ignored lifecycle events
      sent: "IGNORE",
      request: "IGNORE",
      queued: "IGNORE",
      sending: "IGNORE",
      accepted: "IGNORE",
    };
    return map[(rawEventType || "").toLowerCase()] || null;
  }

  /**
   * Add a contact to the suppression list, opt the matching leads out of the channel, and
   * exit them from any active campaigns. Shared by the bounce/complaint/unsubscribe paths.
   */
  static async suppressAndOptOut({ companyId, channel, normalizedValue, reason, sourceLabel }) {
    if (!companyId || !normalizedValue) return [];

    await prisma.suppressionList.upsert({
      where: { companyId_value: { companyId, value: normalizedValue } },
      create: { companyId, value: normalizedValue, reason },
      update: { reason },
    });

    const isEmail = channel === "EMAIL";
    const where = isEmail
      ? { companyId, email: normalizedValue }
      : { companyId, phone: { contains: normalizedValue.slice(-10) } };

    const leads = await prisma.lead.findMany({ where });

    const exitReason =
      reason === "COMPLAINT" ? "COMPLAINT" : reason === "BOUNCE" ? "BOUNCE" : "UNSUBSCRIBE";

    for (const lead of leads) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          ...(isEmail ? { emailOptIn: false } : { smsOptIn: false }),
          consentSource: sourceLabel,
          consentTimestamp: new Date(),
          timeline: {
            create: {
              type: "CONSENT_CHANGE",
              description: `Auto-suppressed (${reason}) from ${channel} via ${sourceLabel}.`,
            },
          },
        },
      });

      const { inngest } = await import("../lib/inngest.js");
      await inngest.send({
        name: "campaign.exit",
        data: { leadId: lead.id, reason: exitReason },
      });
    }

    return leads;
  }

  /**
   * Ingest a delivery/engagement/failure event from an ESP or SMS provider. Logs the event
   * on the matching lead timeline(s) and auto-suppresses on hard bounce / complaint /
   * unsubscribe. Returns { handled, category, leadsMatched }.
   */
  static async handleMessageEvent({
    companyId,
    channel,
    provider,
    contact,
    rawEventType,
    errorCode = null,
    metadata = {},
  }) {
    let category = this.mapEventCategory(rawEventType);

    // Provider-specific overrides keyed on error codes. Twilio 21610 = recipient replied STOP
    // (opt-out); 30007 = carrier filtered as spam/violation.
    if (channel === "SMS" && errorCode) {
      const code = String(errorCode);
      if (code === "21610") category = "UNSUBSCRIBED";
      else if (code === "30007") category = "COMPLAINED";
    }

    if (!category || category === "IGNORE") {
      return { handled: false, category: null, leadsMatched: 0 };
    }

    const normalizedValue = this.normalizeContact(channel, contact);
    if (!normalizedValue) return { handled: false, category, leadsMatched: 0 };

    const where =
      channel === "EMAIL"
        ? { companyId, email: normalizedValue }
        : { companyId, phone: { contains: normalizedValue.slice(-10) } };
    const leads = await prisma.lead.findMany({ where });

    const typeMap = {
      DELIVERED: channel === "EMAIL" ? "EMAIL_DELIVERED" : "SMS_DELIVERED",
      OPENED: "EMAIL_OPENED",
      CLICKED: "EMAIL_CLICKED",
      SOFT_BOUNCE: channel === "EMAIL" ? "EMAIL_DEFERRED" : "SMS_DEFERRED",
      BOUNCED: channel === "EMAIL" ? "EMAIL_BOUNCED" : "SMS_FAILED",
      COMPLAINED: channel === "EMAIL" ? "EMAIL_COMPLAINED" : "SMS_COMPLAINED",
      FAILED: channel === "EMAIL" ? "EMAIL_FAILED" : "SMS_FAILED",
      UNSUBSCRIBED: channel === "EMAIL" ? "EMAIL_UNSUBSCRIBED" : "SMS_UNSUBSCRIBED",
    };
    const timelineType = typeMap[category] || "SYNC_UPDATE";

    // Record the raw event on every matching lead timeline (powers deliverability analytics
    // and the complaint-rate metric).
    for (const lead of leads) {
      await prisma.leadTimeline.create({
        data: {
          leadId: lead.id,
          type: timelineType,
          description: `${channel} ${category.toLowerCase()} event from ${provider}`,
          metadata: { ...metadata, provider, channel, category, rawEventType, contact, errorCode },
        },
      });
    }

    // Suppression-triggering categories.
    const sourceLabel = `${provider} ${rawEventType}${errorCode ? ` (${errorCode})` : ""}`;
    if (category === "BOUNCED") {
      await this.suppressAndOptOut({ companyId, channel, normalizedValue, reason: "BOUNCE", sourceLabel });
    } else if (category === "COMPLAINED") {
      await this.suppressAndOptOut({ companyId, channel, normalizedValue, reason: "COMPLAINT", sourceLabel });
      // NFR-O-001: re-evaluate the rolling complaint rate after every new complaint.
      await this.checkComplaintRate(companyId, channel);
    } else if (category === "UNSUBSCRIBED") {
      await this.suppressAndOptOut({ companyId, channel, normalizedValue, reason: "UNSUBSCRIBE", sourceLabel });
    }

    return { handled: true, category, leadsMatched: leads.length };
  }

  /**
   * NFR-O-001 — Compute the rolling complaint rate (complaints / sent) for a company and
   * raise an alert when it exceeds the configured threshold (default 0.1%). Tunable via
   * COMPLAINT_RATE_THRESHOLD, COMPLAINT_RATE_WINDOW_HOURS, COMPLAINT_RATE_MIN_VOLUME.
   */
  static async checkComplaintRate(companyId, channel = "EMAIL") {
    const windowHours = parseInt(process.env.COMPLAINT_RATE_WINDOW_HOURS || "24", 10);
    const threshold = parseFloat(process.env.COMPLAINT_RATE_THRESHOLD || "0.001"); // 0.1%
    const minVolume = parseInt(process.env.COMPLAINT_RATE_MIN_VOLUME || "100", 10);
    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);

    const sentType = channel === "EMAIL" ? "EMAIL_SENT" : "SMS_SENT";
    const complaintType = channel === "EMAIL" ? "EMAIL_COMPLAINED" : "SMS_COMPLAINED";

    const [sentCount, complaintCount] = await Promise.all([
      prisma.leadTimeline.count({
        where: { lead: { companyId }, type: sentType, createdAt: { gte: since } },
      }),
      prisma.leadTimeline.count({
        where: { lead: { companyId }, type: complaintType, createdAt: { gte: since } },
      }),
    ]);

    const rate = sentCount > 0 ? complaintCount / sentCount : 0;

    // Below the minimum volume a single complaint produces a misleadingly high rate, so hold
    // the alert until there's enough signal.
    if (sentCount < minVolume) {
      return { alerted: false, rate, sentCount, complaintCount, reason: "below-min-volume" };
    }

    if (rate > threshold) {
      console.error(
        `[Compliance ALERT][NFR-O-001] Complaint rate ${(rate * 100).toFixed(3)}% exceeds ` +
          `threshold ${(threshold * 100).toFixed(3)}% for company ${companyId} ` +
          `(${complaintCount} complaints / ${sentCount} ${channel} sent in last ${windowHours}h).`
      );
      await this.sendComplaintRateAlert(companyId, {
        rate,
        threshold,
        complaintCount,
        sentCount,
        windowHours,
        channel,
      });
      return { alerted: true, rate, sentCount, complaintCount };
    }

    return { alerted: false, rate, sentCount, complaintCount };
  }

  /**
   * Deliver the complaint-rate alert to an ops mailbox (COMPLIANCE_ALERT_EMAIL). No-op when
   * unset, so the console.error above remains the baseline alert hook. Never throws.
   */
  static async sendComplaintRateAlert(companyId, metrics) {
    const to = process.env.COMPLIANCE_ALERT_EMAIL;
    if (!to) return;

    try {
      const company = await prisma.company.findUnique({ where: { id: companyId } });
      const { MailService } = await import("./mail-service.js");
      const ratePct = (metrics.rate * 100).toFixed(3);
      const thresholdPct = (metrics.threshold * 100).toFixed(3);

      await MailService.sendEmail({
        to,
        subject: `[ALERT] High ${metrics.channel} complaint rate (${ratePct}%) — ${company?.name || companyId}`,
        html: `
          <div style="font-family: sans-serif; line-height: 1.6;">
            <h2 style="color: #b91c1c;">Complaint-rate threshold exceeded (NFR-O-001)</h2>
            <p><strong>Company:</strong> ${company?.name || "(unknown)"} (${companyId})</p>
            <p><strong>Channel:</strong> ${metrics.channel}</p>
            <p><strong>Complaint rate:</strong> ${ratePct}% (threshold ${thresholdPct}%)</p>
            <p><strong>Volume:</strong> ${metrics.complaintCount} complaints / ${metrics.sentCount} sent in the last ${metrics.windowHours}h</p>
            <p>Review recent campaigns and sending lists. Affected contacts are auto-suppressed.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error("[Compliance] Failed to send complaint-rate alert email:", error?.message || error);
    }
  }
}
