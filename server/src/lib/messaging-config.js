import prisma from "./prisma.js";

// A host is publicly reachable (i.e. Twilio can POST to it) if it's not a
// loopback / private / .local address. Twilio rejects non-public callback URLs.
function isPubliclyReachable(hostname) {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".localhost")) return false;
  if (h === "0.0.0.0" || h === "::1" || h === "[::1]") return false;
  if (/^127\./.test(h)) return false; // loopback
  if (/^10\./.test(h)) return false; // private class A
  if (/^192\.168\./.test(h)) return false; // private class C
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return false; // private class B
  if (/^169\.254\./.test(h)) return false; // link-local
  return true;
}

// Build a publicly reachable backend webhook URL (used for Twilio status callbacks).
// Returns null when no public base URL is configured, or when the resolved URL is
// not publicly reachable (e.g. localhost in dev) — callers then omit it gracefully.
export function buildSmsWebhookUrl(path, companyId) {
  const base = process.env.PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_URL;
  if (!base) return null;
  try {
    const url = new URL(path, base);
    if (!isPubliclyReachable(url.hostname)) return null;
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
