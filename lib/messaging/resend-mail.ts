export type ResendSendResult =
  | { ok: true; id: string | null }
  | { ok: false; error: string };

export function getResendApiKey(): string | null {
  const key = process.env.RESEND_API_KEY?.trim();
  return key || null;
}

export function isResendConfigured(): boolean {
  return getResendApiKey() !== null;
}

export function getResendDefaultFromEmail(): string | null {
  const v = process.env.RESEND_DEFAULT_FROM_EMAIL?.trim();
  return v || null;
}

/**
 * @see https://resend.com/docs/api-reference/emails/send-email
 */
export async function sendOutboundEmailViaResend(params: {
  apiKey: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  text: string;
  html?: string;
  replyToEmail?: string | null;
}): Promise<ResendSendResult> {
  const apiKey = params.apiKey.trim();
  if (!apiKey) {
    return { ok: false, error: "Resend API key is missing." };
  }

  const from = params.fromEmail.trim();
  const to = params.toEmail.trim();
  if (!from || !to) {
    return { ok: false, error: "From and to addresses are required." };
  }

  const body: Record<string, unknown> = {
    from,
    to: [to],
    subject: params.subject.trim() || "(no subject)",
  };
  if (params.html?.trim()) {
    body.html = params.html.trim();
  }
  body.text = params.text;
  const replyTo = params.replyToEmail?.trim();
  if (replyTo) {
    body.reply_to = replyTo;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const raw = (await res.text()).trim();
  if (!res.ok) {
    return { ok: false, error: raw.slice(0, 800) || `Resend send failed (${res.status}).` };
  }

  try {
    const data = JSON.parse(raw) as { id?: string };
    return { ok: true, id: data.id ?? null };
  } catch {
    return { ok: true, id: null };
  }
}
