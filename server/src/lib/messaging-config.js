import prisma from "./prisma.js";

// Build a publicly reachable backend webhook URL (used for Twilio status callbacks).
// Returns null when no public base URL is configured so callers can omit it gracefully.
export function buildSmsWebhookUrl(path, companyId) {
  const base = process.env.PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_URL;
  if (!base) return null;
  try {
    const url = new URL(path, base);
    if (companyId) url.searchParams.set("companyId", companyId);
    if (process.env.INBOUND_WEBHOOK_SECRET) {
      url.searchParams.set("token", process.env.INBOUND_WEBHOOK_SECRET);
    }
    return url.toString();
  } catch {
    return null;
  }
}

export async function getMessagingConfig(companyId) {
  if (!companyId) return { smtpConfig: null, smsConfig: null };

  const integrations = await prisma.integration.findMany({
    where: {
      companyId,
      isActive: true,
      platform: { in: ["BREVO_EMAIL", "TWILIO_SMS"] },
    },
  });

  let smtpConfig = null;
  let smsConfig = null;

  const emailInt = integrations.find((i) => i.platform === "BREVO_EMAIL");
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

  const smsInt = integrations.find((i) => i.platform === "TWILIO_SMS");
  if (smsInt) {
    smsConfig = {
      provider: "TWILIO_SMS",
      accountSid: smsInt.apiKey,
      authToken: smsInt.secretKey,
      // `from` is a Twilio phone number (E.164) or a Messaging Service SID.
      from: smsInt.senderName,
      statusCallbackUrl: buildSmsWebhookUrl("/api/sales/compliance/events/sms", companyId),
    };
  }

  return { smtpConfig, smsConfig };
}
