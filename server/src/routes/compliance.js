import { Router } from "express";
import { requireAuth, requireRoles } from "../middlewares/auth.js";
import { verifyTwilioSignature, verifyWebhookSecret } from "../middlewares/webhook-auth.js";
import {
  getSuppressions,
  addSuppression,
  deleteSuppression,
  processInbound,
  unsubscribeWebhook,
  processBrevoInboundEmail,
  processTwilioInboundSms,
  processBrevoEmailEvents,
  processBrevoSmsEvents,
  processTwilioStatusCallback
} from "../controllers/compliance.controller.js";

const router = Router();

router.get("/suppression", requireAuth, requireRoles(["ADMIN", "STAFF"]), getSuppressions);
router.post("/suppression", requireAuth, requireRoles(["ADMIN", "STAFF"]), addSuppression);
router.delete("/suppression", requireAuth, requireRoles(["ADMIN", "STAFF"]), deleteSuppression);

// Public inbound webhooks — authenticated via shared secret (Brevo/generic) or
// Twilio request signature. Guards are no-ops until their env vars are configured.
router.post("/inbound", verifyWebhookSecret, processInbound);
router.post("/unsubscribe", verifyWebhookSecret, unsubscribeWebhook);
router.post("/inbound/email", verifyWebhookSecret, processBrevoInboundEmail);
router.post("/inbound/sms", verifyTwilioSignature, processTwilioInboundSms);

// ESP / SMS delivery & engagement event webhooks (delivered, opens, clicks, bounces,
// complaints, unsubscribes). Bounces/complaints/unsubscribes auto-suppress the contact.
router.post("/events/email", verifyWebhookSecret, processBrevoEmailEvents);
router.post("/events/sms", verifyWebhookSecret, processBrevoSmsEvents);
router.post("/status/sms", verifyTwilioSignature, processTwilioStatusCallback);

export default router;
