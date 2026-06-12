import type { SmsSendContext } from "./user-sms-send-context";

/**
 * Sends a single SMS via Twilio REST (2010 API).
 * @see https://www.twilio.com/docs/sms/api/message-resource#create-a-message-resource
 */
export async function sendTwilioSms(params: {
  ctx: SmsSendContext;
  to: string;
  body: string;
}): Promise<{ ok: true; messageSid: string } | { ok: false; error: string }> {
  const { ctx, to, body } = params;
  const auth = Buffer.from(`${ctx.basicUser}:${ctx.basicPassword}`).toString("base64");
  const form = new URLSearchParams();
  form.set("To", to);
  form.set("From", ctx.fromNumber);
  form.set("Body", body);

  const url = `https://api.twilio.com/2010-04-01/Accounts/${ctx.resourceAccountSid}/Messages.json`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });

    const text = await res.text();
    let json: { message?: string; code?: number; sid?: string } = {};
    try {
      json = JSON.parse(text) as typeof json;
    } catch {
      /* Twilio errors are usually JSON; fall through */
    }

    if (!res.ok) {
      const msg =
        typeof json.message === "string" && json.message.trim()
          ? json.message
          : text.trim() || `Twilio SMS failed (${res.status}).`;
      return { ok: false, error: msg };
    }

    const sid = typeof json.sid === "string" ? json.sid.trim() : "";
    if (!sid) {
      return { ok: false, error: "Twilio returned no message SID." };
    }
    return { ok: true, messageSid: sid };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "SMS request failed.";
    return { ok: false, error: msg };
  }
}
