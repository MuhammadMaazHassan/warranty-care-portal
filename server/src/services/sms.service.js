// These should be configured in your .env file
const brevoApiKey = process.env.BREVO_API_KEY;
const brevoSender = process.env.BREVO_SMS_SENDER || "AI4Home"; // Alphanumeric sender ID up to 11 chars

let isConfigured = false;

export const initSms = () => {
  if (brevoApiKey) {
    isConfigured = true;
  } else {
    console.warn("[SMS Service] BREVO_API_KEY not found in .env. SMS sending will be simulated.");
  }
};

export const sendSms = async ({ to, body }) => {
  if (!isConfigured) {
    console.log(`[SMS Service - SIMULATED] To: ${to} | Body: ${body}`);
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { messageId: "SIMULATED_MSG_ID", status: "delivered", to, body };
  }

  try {
    const payload = {
      type: "transactional",
      unicodeEnabled: false,
      sender: brevoSender,
      recipient: to,
      content: body
    };

    console.log(`[SMS Service] Attempting to send SMS to ${to} via Brevo...`);
    console.log(`[SMS Service] Request Payload:`, JSON.stringify(payload, null, 2));

    const response = await fetch("https://api.brevo.com/v3/transactionalSMS/sms", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": brevoApiKey,
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log(`[SMS Service] Brevo API Response Status: ${response.status} ${response.statusText}`);
    console.log(`[SMS Service] Brevo API Response Body:`, JSON.stringify(data, null, 2));

    if (!response.ok) {
      throw new Error(data.message || "Failed to send Brevo SMS");
    }

    console.log(`[SMS Service] Message sent successfully to ${to}. MessageID: ${data.messageId}`);
    return data;
  } catch (error) {
    console.error(`[SMS Service] Failed to send message to ${to}:`, error);
    throw error;
  }
};
