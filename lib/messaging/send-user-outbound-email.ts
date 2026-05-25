import {
  getEmailDeliveryResolution,
  getResendSendContext,
  getSendGridSendContext,
} from "@/lib/messaging/email-delivery";
import { sendOutboundEmailViaResend } from "@/lib/messaging/resend-mail";
import { sendOutboundEmailViaSendGrid } from "@/lib/messaging/sendgrid-send-mail";
import { getUserInboundReplyToAddress } from "@/lib/messaging/user-inbound-reply-address";
import { prisma } from "@/lib/prisma";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SendUserOutboundEmailParams = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

/**
 * Sends one outbound email using the same resolution rules as POST /api/messaging/email/send.
 */
export async function sendUserOutboundEmail(
  userId: string,
  params: SendUserOutboundEmailParams,
): Promise<{ ok: true; provider: "sendgrid" | "resend"; messageId: string } | { ok: false; error: string; status: number }> {
  const to = params.to.trim();
  const subject = params.subject.trim();
  const text = params.text;
  const html = params.html;

  if (!to || !EMAIL_RE.test(to)) {
    return { ok: false, status: 400, error: 'Valid "to" email is required.' };
  }
  if (!text.trim()) {
    return { ok: false, status: 400, error: "Message text is required." };
  }

  const { effective } = await getEmailDeliveryResolution(userId);
  const replyToInbound = await getUserInboundReplyToAddress(userId);

  if (effective === "NONE") {
    return {
      ok: false,
      status: 409,
      error:
        "No email provider is active. In Connection → Provider, choose SendGrid or Resend and add an API key plus verified from-address.",
    };
  }

  if (effective === "SENDGRID") {
    const ctx = await getSendGridSendContext(userId);
    if (!ctx) {
      return {
        ok: false,
        status: 503,
        error:
          "SendGrid is not ready: add your API key and a verified from email on the Provider tab (or set SENDGRID_API_KEY and SENDGRID_DEFAULT_FROM_EMAIL on the server).",
      };
    }

    const result = await sendOutboundEmailViaSendGrid({
      apiKey: ctx.apiKey,
      fromEmail: ctx.fromEmail,
      toEmail: to,
      subject: subject || "(no subject)",
      text,
      html,
      replyToEmail: replyToInbound,
    });

    if (!result.ok) {
      return { ok: false, status: 502, error: result.error };
    }

    await prisma.emailMessage.create({
      data: {
        userId,
        direction: "OUTBOUND",
        fromAddress: ctx.fromEmail,
        toAddress: to,
        subject: subject || null,
        textBody: text.slice(0, 200_000),
        htmlBody: html?.trim() ? html.trim().slice(0, 500_000) : null,
        providerId: result.messageId,
      },
    });

    return { ok: true, provider: "sendgrid", messageId: result.messageId ?? "" };
  }

  const ctx = await getResendSendContext(userId);
  if (!ctx) {
    return {
      ok: false,
      status: 503,
      error:
        "Resend is not ready: add your API key and a verified from email on the Provider tab (or set RESEND_API_KEY and RESEND_DEFAULT_FROM_EMAIL on the server).",
    };
  }

  const result = await sendOutboundEmailViaResend({
    apiKey: ctx.apiKey,
    fromEmail: ctx.fromEmail,
    toEmail: to,
    subject: subject || "(no subject)",
    text,
    html,
    replyToEmail: replyToInbound,
  });

  if (!result.ok) {
    return { ok: false, status: 502, error: result.error };
  }

  await prisma.emailMessage.create({
    data: {
      userId,
      direction: "OUTBOUND",
      fromAddress: ctx.fromEmail,
      toAddress: to,
      subject: subject || null,
      textBody: text.slice(0, 200_000),
      htmlBody: html?.trim() ? html.trim().slice(0, 500_000) : null,
      providerId: result.id,
    },
  });

  return { ok: true, provider: "resend", messageId: result.id ?? "" };
}
