export type SendMailResult =
  | { ok: true; messageId: string | null }
  | { ok: false; error: string };

/**
 * Sends mail with the given SendGrid API key (user-owned or env fallback).
 * `from` must be a verified sender or domain in that SendGrid account.
 */
export async function sendOutboundEmailViaSendGrid(params: {
  apiKey: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  text: string;
  html?: string;
  /** When set, most clients send replies here (e.g. inbound parse address) instead of only From. */
  replyToEmail?: string | null;
}): Promise<SendMailResult> {
  const apiKey = params.apiKey.trim();
  if (!apiKey) {
    return { ok: false, error: "SendGrid API key is missing." };
  }

  const from = params.fromEmail.trim();
  const to = params.toEmail.trim();
  if (!from || !to) {
    return { ok: false, error: "From and to addresses are required." };
  }

  const content: { type: string; value: string }[] = [{ type: "text/plain", value: params.text }];
  if (params.html?.trim()) {
    content.push({ type: "text/html", value: params.html.trim() });
  }

  const replyTo = params.replyToEmail?.trim();
  const payload: Record<string, unknown> = {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: from },
    subject: params.subject.trim() || "(no subject)",
    content,
  };
  if (replyTo) {
    payload.reply_to = { email: replyTo };
  }

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = (await res.text()).trim().slice(0, 800);
    return { ok: false, error: text || `SendGrid mail send failed (${res.status}).` };
  }

  const messageId = res.headers.get("x-message-id");
  return { ok: true, messageId };
}

export function getSendGridDefaultFromEmail(): string | null {
  const v = process.env.SENDGRID_DEFAULT_FROM_EMAIL?.trim();
  return v || null;
}
