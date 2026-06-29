import twilio from "twilio";

export const sendSms = async ({ to, body, smsConfig }) => {
  // smsConfig is configured per-company via the frontend and stored in the
  // Integration table. Expected shape:
  //   { provider: "BREVO_SMS" | "TWILIO", apiKey, apiSecret, senderName }

  if (!smsConfig) {
    console.log(`[SMS Service - SIMULATED] No company SMS config provided. To: ${to} | Body: ${body}`);
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { messageId: "SIMULATED_MSG_ID", status: "delivered", to, body };
  }

  const provider = smsConfig.provider || "BREVO_SMS";

  try {
    if (provider === "TWILIO") {
      console.log(`[SMS Service] Attempting to send SMS to ${to} via Twilio...`);
      const client = twilio(smsConfig.apiKey, smsConfig.apiSecret);
      
      const message = await client.messages.create({
        body,
        from: smsConfig.senderName, // Twilio phone number or alphanumeric sender ID
        to
      });
      
      console.log(`[SMS Service] Twilio message sent successfully to ${to}. SID: ${message.sid}`);
      return { messageId: message.sid, status: message.status, provider: "TWILIO" };
      
    } else {
      // Default to Brevo
      const apiKey = smsConfig.apiKey;
      const sender = smsConfig.senderName;

      if (!apiKey) {
        throw new Error("Brevo SMS API key missing in company configuration");
      }

      const payload = {
        type: "transactional",
        unicodeEnabled: false,
        sender,
        recipient: to,
        content: body
      };

      console.log(`[SMS Service] Attempting to send SMS to ${to} via Brevo...`);
      console.log(`[SMS Service] Request Payload:`, JSON.stringify(payload, null, 2));

      const response = await fetch("https://api.brevo.com/v3/transactionalSMS/sms", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "api-key": apiKey,
          "content-type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      console.log(`[SMS Service] Brevo API Response Status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to send Brevo SMS");
      }

      console.log(`[SMS Service] Message sent successfully to ${to}. MessageID: ${data.messageId}`);
      return { ...data, provider: "BREVO_SMS" };
    }
  } catch (error) {
    console.error(`[SMS Service] Failed to send message to ${to}:`, error);
    throw error;
  }
};
