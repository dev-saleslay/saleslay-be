import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/hubspot";
import {
  getEmailDeliveryResolution,
  getResendSendContext,
  getSendGridSendContext,
} from "@/lib/messaging/email-delivery";
import { sendOutboundEmailViaResend } from "@/lib/messaging/resend-mail";
import { sendOutboundEmailViaSendGrid } from "@/lib/messaging/sendgrid-send-mail";
import { getUserInboundReplyToAddress } from "@/lib/messaging/user-inbound-reply-address";
import { prisma } from "@/lib/prisma";

type Body = { to?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body = {};
  try {
    const raw = await request.json();
    if (raw && typeof raw === "object") body = raw as Body;
  } catch {
    /* empty body ok */
  }

  const toOverride = typeof body.to === "string" ? body.to.trim() : "";
  const to = toOverride || user.email?.trim() || "";
  if (!to || !EMAIL_RE.test(to)) {
    return NextResponse.json(
      {
        error:
          "No valid recipient. Add an email to your login account, or pass { \"to\": \"you@example.com\" } in the request body.",
      },
      { status: 400 },
    );
  }

  const { effective } = await getEmailDeliveryResolution(user.id);
  if (effective === "NONE") {
    return NextResponse.json(
      { error: "Choose SendGrid or Resend and finish setup before testing." },
      { status: 409 },
    );
  }

  const subject = "SalesLay — email connection test";
  const text = [
    "This is a test message from SalesLay.",
    `Time (UTC): ${new Date().toISOString()}`,
    `Provider: ${effective === "SENDGRID" ? "SendGrid" : "Resend"}`,
    "",
    "If you received this, your outbound email setup is working.",
  ].join("\n");

  const replyToInbound = await getUserInboundReplyToAddress(user.id);

  if (effective === "SENDGRID") {
    const ctx = await getSendGridSendContext(user.id);
    if (!ctx) {
      return NextResponse.json(
        { error: "SendGrid is not fully configured (key and from address)." },
        { status: 503 },
      );
    }

    const result = await sendOutboundEmailViaSendGrid({
      apiKey: ctx.apiKey,
      fromEmail: ctx.fromEmail,
      toEmail: to,
      subject,
      text,
      replyToEmail: replyToInbound,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    await prisma.emailMessage.create({
      data: {
        userId: user.id,
        direction: "OUTBOUND",
        fromAddress: ctx.fromEmail,
        toAddress: to,
        subject,
        textBody: text.slice(0, 200_000),
        providerId: result.messageId,
      },
    });

    return NextResponse.json({
      ok: true,
      messageId: result.messageId,
      provider: "sendgrid",
      to,
    });
  }

  const ctx = await getResendSendContext(user.id);
  if (!ctx) {
    return NextResponse.json(
      { error: "Resend is not fully configured (key and from address)." },
      { status: 503 },
    );
  }

  const result = await sendOutboundEmailViaResend({
    apiKey: ctx.apiKey,
    fromEmail: ctx.fromEmail,
    toEmail: to,
    subject,
    text,
    replyToEmail: replyToInbound,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  await prisma.emailMessage.create({
    data: {
      userId: user.id,
      direction: "OUTBOUND",
      fromAddress: ctx.fromEmail,
      toAddress: to,
      subject,
      textBody: text.slice(0, 200_000),
      providerId: result.id,
    },
  });

  return NextResponse.json({
    ok: true,
    messageId: result.id,
    provider: "resend",
    to,
  });
}
