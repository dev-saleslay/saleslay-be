import { NextRequest, NextResponse } from "next/server";

import { enqueueInboundEmail } from "@/lib/queue/queues";
import { prisma } from "@/lib/prisma";
import { findUserIdFromInboundToField } from "@/lib/messaging/sendgrid-inbound-address";

export const runtime = "nodejs";

/**
 * SendGrid Inbound Parse POST (multipart/form-data).
 * Configure in SendGrid: POST URL e.g. https://yourapp.com/api/webhooks/sendgrid/inbound?token=SECRET
 * @see https://docs.sendgrid.com/for-developers/parsing-email/inbound-email
 */
export async function POST(request: NextRequest) {
  const secret = process.env.SENDGRID_INBOUND_WEBHOOK_SECRET?.trim();
  if (secret) {
    const token = request.nextUrl.searchParams.get("token")?.trim();
    if (token !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  let toRaw = String(form.get("to") ?? "");
  const envelopeRaw = form.get("envelope");
  if ((!toRaw.trim() || toRaw.length < 3) && typeof envelopeRaw === "string" && envelopeRaw.trim()) {
    try {
      const env = JSON.parse(envelopeRaw) as { to?: string[] };
      if (Array.isArray(env.to) && env.to.length > 0) {
        toRaw = env.to.join(", ");
      }
    } catch {
      /* ignore */
    }
  }
  const fromRaw = String(form.get("from") ?? "");
  const subject = String(form.get("subject") ?? "") || null;
  const textBody = String(form.get("text") ?? "") || null;
  const htmlRaw = form.get("html");
  const htmlBody = htmlRaw != null ? String(htmlRaw) : null;

  if (!toRaw.trim()) {
    return NextResponse.json({ error: "Missing to" }, { status: 400 });
  }

  const userId = findUserIdFromInboundToField(toRaw);
  if (!userId) {
    return NextResponse.json({ ok: true, ignored: true, reason: "no_matching_user_address" });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ ok: true, ignored: true, reason: "user_not_found" });
  }

  const msg = await prisma.emailMessage.create({
    data: {
      userId,
      direction: "INBOUND",
      fromAddress: fromRaw.trim().slice(0, 512) || "(unknown)",
      toAddress: toRaw.trim().slice(0, 512),
      subject: subject ? subject.slice(0, 998) : null,
      textBody: textBody ? textBody.slice(0, 200_000) : null,
      htmlBody: htmlBody ? htmlBody.slice(0, 500_000) : null,
    },
  });

  const claimed = await prisma.emailMessage.updateMany({
    where: { id: msg.id, inboundLeadHookAt: null },
    data: { inboundLeadHookAt: new Date() },
  });

  if (claimed.count > 0) {
    try {
      await enqueueInboundEmail({
        userId,
        fromHeader: fromRaw,
        subject,
        textBody,
        emailMessageId: msg.id,
      });
    } catch (e) {
      console.error("[webhooks/sendgrid/inbound] failed to enqueue email:", e);
      await prisma.emailMessage.update({
        where: { id: msg.id },
        data: { inboundLeadHookAt: null },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
