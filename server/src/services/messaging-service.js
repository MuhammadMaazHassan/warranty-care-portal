import { MailService } from "./mail-service.js";
import { sendSms } from "./sms.service.js";
import { ComplianceService } from "./compliance-service.js";

/**
 * Unified outbound gate. ALL marketing/notification messages should be sent through this
 * service so they are checked against the company suppression list before hitting the
 * provider. Transactional auth messages (OTP / password reset) intentionally bypass this —
 * a user must be able to recover their account even if they've unsubscribed from outreach.
 *
 * The nurture/campaign engine performs the richer per-lead consent + quiet-hours check via
 * ComplianceService.validateOutboundMessage before it calls the providers, so it already
 * passes the gate; this service covers the remaining send paths (e.g. warranty ticket-status
 * emails) that previously called the providers directly.
 */
export class MessagingService {
  /**
   * Suppression-gated email send. Returns { success, blocked, reason, ... }.
   */
  static async sendEmail({ companyId, to, subject, html, fromName, fromEmail, smtpConfig }) {
    if (companyId && to) {
      const { suppressed, reason } = await ComplianceService.checkSuppression(companyId, "EMAIL", to);
      if (suppressed) {
        console.warn(`[Messaging] Email to ${to} blocked — on suppression list (${reason}).`);
        return { success: false, blocked: true, reason: `Suppressed (${reason})` };
      }
    }
    return MailService.sendEmail({ to, subject, html, fromName, fromEmail, smtpConfig });
  }

  /**
   * Suppression-gated SMS send. Appends the STOP opt-out suffix unless disabled.
   */
  static async sendSms({ companyId, to, body, smsConfig, addOptOut = true }) {
    if (companyId && to) {
      const { suppressed, reason } = await ComplianceService.checkSuppression(companyId, "SMS", to);
      if (suppressed) {
        console.warn(`[Messaging] SMS to ${to} blocked — on suppression list (${reason}).`);
        return { blocked: true, reason: `Suppressed (${reason})` };
      }
    }
    const finalBody = addOptOut ? ComplianceService.addSmsOptOutSuffix(body) : body;
    return sendSms({ to, body: finalBody, smsConfig });
  }

  /**
   * Suppression-gated warranty ticket-status email. Delegates HTML composition to
   * MailService but blocks delivery to suppressed (bounced/complained/unsubscribed) contacts.
   */
  static async sendTicketStatusUpdate({ companyId, to, homeownerName, ticketId, status, company, smtpConfig }) {
    if (companyId && to) {
      const { suppressed, reason } = await ComplianceService.checkSuppression(companyId, "EMAIL", to);
      if (suppressed) {
        console.warn(`[Messaging] Ticket-status email to ${to} blocked — on suppression list (${reason}).`);
        return { success: false, blocked: true, reason: `Suppressed (${reason})` };
      }
    }
    return MailService.sendTicketStatusUpdate(to, homeownerName, ticketId, status, company, smtpConfig);
  }
}
