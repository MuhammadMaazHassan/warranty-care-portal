import crypto from "crypto";
import prisma from "../lib/prisma.js";
import { verifyWebhookSecret } from "./webhook-auth.js";

// Reconstruct the exact URL Twilio used to sign the request.
function getRequestUrl(req) {
  if (process.env.TWILIO_WEBHOOK_BASE_URL) {
    return `${process.env.TWILIO_WEBHOOK_BASE_URL.replace(/\/$/, "")}${req.originalUrl}`;
  }
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.get("host");
  return `${proto}://${host}${req.originalUrl}`;
}

// Compute Twilio's X-Twilio-Signature for a form-encoded POST:
// base64(HMAC-SHA1(authToken, url + sorted(param key+value concatenated))).
function computeSignature(authToken, url, params) {
  let data = url;
  Object.keys(params)
    .sort()
    .forEach((key) => {
      data += key + params[key];
    });
  return crypto.createHmac("sha1", authToken).update(Buffer.from(data, "utf-8")).digest("base64");
}

// Validates inbound Twilio webhooks. When TWILIO_VALIDATE_SIGNATURE is enabled we
// verify the X-Twilio-Signature using the company's Auth Token; otherwise we fall
// back to the shared-secret token check used by the other inbound webhooks.
export async function verifyTwilioSignature(req, res, next) {
  const shouldValidate = ["1", "true", "yes"].includes(
    String(process.env.TWILIO_VALIDATE_SIGNATURE || "").toLowerCase()
  );

  if (!shouldValidate) {
    return verifyWebhookSecret(req, res, next);
  }

  try {
    const signature = req.header("X-Twilio-Signature");
    if (!signature) {
      console.warn("[Twilio Auth] Missing X-Twilio-Signature header.");
      return res.status(403).json({ message: "Forbidden" });
    }

    // Prefer the per-company Auth Token; fall back to the env token.
    let authToken = process.env.TWILIO_AUTH_TOKEN;
    const companyId = req.query.companyId || req.body?.companyId;
    if (companyId) {
      const integration = await prisma.integration.findFirst({
        where: { companyId, platform: "TWILIO_SMS" },
      });
      if (integration?.secretKey) authToken = integration.secretKey;
    }

    if (!authToken) {
      console.warn("[Twilio Auth] No Auth Token available to validate signature.");
      return res.status(403).json({ message: "Forbidden" });
    }

    const url = getRequestUrl(req);
    const expected = computeSignature(authToken, url, req.body || {});

    const valid =
      expected.length === signature.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));

    if (!valid) {
      console.warn("[Twilio Auth] Signature mismatch — rejecting webhook.");
      return res.status(403).json({ message: "Forbidden" });
    }

    return next();
  } catch (error) {
    console.error("[Twilio Auth] Validation error:", error);
    return res.status(403).json({ message: "Forbidden" });
  }
}
