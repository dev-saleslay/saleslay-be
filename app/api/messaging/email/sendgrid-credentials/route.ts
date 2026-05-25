import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/hubspot";
import { encryptEmailApiKey } from "@/lib/messaging/email-api-key-crypto";
import { prisma } from "@/lib/prisma";

type Body = { apiKey?: string; fromEmail?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const apiKeyRaw = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  const fromRaw = typeof body.fromEmail === "string" ? body.fromEmail.trim() : undefined;

  if (fromRaw !== undefined && fromRaw !== "" && !EMAIL_RE.test(fromRaw)) {
    return NextResponse.json({ error: "fromEmail must be a valid email address." }, { status: 400 });
  }

  if (!apiKeyRaw && fromRaw === undefined) {
    return NextResponse.json({ error: "Provide apiKey and/or fromEmail." }, { status: 400 });
  }

  let enc: string | undefined;
  if (apiKeyRaw) {
    if (apiKeyRaw.length < 8) {
      return NextResponse.json({ error: "API key looks too short." }, { status: 400 });
    }
    try {
      enc = encryptEmailApiKey(apiKeyRaw);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not encrypt API key.";
      console.error("[email/sendgrid-credentials] encrypt failed:", e);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  const fromEmail = fromRaw === "" ? null : fromRaw ?? undefined;

  const update: { sendgridApiKeyEnc?: string | null; sendgridFromEmail?: string | null } = {};
  if (enc) update.sendgridApiKeyEnc = enc;
  if (fromEmail !== undefined) update.sendgridFromEmail = fromEmail;

  await prisma.emailProviderIntegration.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      sendgridApiKeyEnc: enc ?? null,
      sendgridFromEmail: fromEmail === undefined ? null : fromEmail,
    },
    update,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.$transaction([
    prisma.emailProviderIntegration.updateMany({
      where: { userId: user.id },
      data: { sendgridApiKeyEnc: null, sendgridFromEmail: null },
    }),
    prisma.user.updateMany({
      where: { id: user.id, emailDeliveryProvider: "SENDGRID" },
      data: { emailDeliveryProvider: "NONE" },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
