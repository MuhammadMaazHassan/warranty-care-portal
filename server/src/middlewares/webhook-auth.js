import twilio from "twilio";

// Authentication for public inbound webhooks (no portal session). Each guard is a
// no-op (with a warning) until its env var is configured, so local/dev and tests keep
// working while production can lock them down.

/**
 * Reconstruct the exact public URL Twilio signed. Behind a proxy/CDN the host or
 * protocol seen by Express may differ from the public URL, so allow an override.
 * WEBHOOK_BASE_URL should be the public origin, e.g. "https://api.example.com".
 */
function getRequestUrl(req) {
  const base = process.env.WEBHOOK_BASE_URL;
  if (base) return `${base.replace(/\/$/, "")}${req.originalUrl}`;
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  return `${proto}://${req.get("host")}${req.originalUrl}`;
}

/**
 * Verify the X-Twilio-Signature header on inbound SMS webhooks.
 * Requires TWILIO_AUTH_TOKEN. Twilio expects a 2xx; an invalid signature returns
 * 403 with empty TwiML so Twilio surfaces the failure without retry storms.
 */
export function verifyTwilioSignature(req, res, next) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    console.warn("[Webhook Auth] TWILIO_AUTH_TOKEN not set — skipping Twilio signature validation. Set it in production to secure /inbound/sms.");
    return next();
  }

  const signature = req.header("X-Twilio-Signature");
  const url = getRequestUrl(req);
  const params = req.body || {};

  const valid = !!signature && twilio.validateRequest(authToken, signature, url, params);
  if (!valid) {
    console.warn(`[Webhook Auth] Rejected inbound SMS: invalid Twilio signature for ${url}`);
    return res
      .status(403)
      .type("text/xml")
      .send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
  }
  return next();
}

/**
 * Verify a shared secret on provider webhooks that don't carry a verifiable signature
 * (e.g. Brevo inbound parse, generic inbound, unsubscribe). The secret is supplied via
 * the `X-Webhook-Token` header or a `?token=` query param and compared to
 * INBOUND_WEBHOOK_SECRET. Configure the provider's webhook URL with that token.
 */
export function verifyWebhookSecret(req, res, next) {
  const secret = process.env.INBOUND_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[Webhook Auth] INBOUND_WEBHOOK_SECRET not set — skipping inbound webhook auth. Set it in production to secure inbound/unsubscribe endpoints.");
    return next();
  }

  const provided = req.header("X-Webhook-Token") || req.query.token;
  if (!provided || provided !== secret) {
    console.warn("[Webhook Auth] Rejected inbound webhook: missing or invalid secret token.");
    return res.status(403).json({ message: "Forbidden" });
  }
  return next();
}
