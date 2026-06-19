/**
 * SMS delivery — uses Twilio when configured, otherwise logs in dev.
 */
export async function sendSms(phone: string, message: string): Promise<{ sent: boolean; provider: "twilio" | "log" }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (sid && token && from) {
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: phone, From: from, Body: message }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Twilio SMS failed (${res.status}): ${body}`);
    }
    return { sent: true, provider: "twilio" };
  }

  console.log(`[SMS] To: ${phone} | ${message}`);
  return { sent: false, provider: "log" };
}

export function isSmsConfigured(): boolean {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);
}
