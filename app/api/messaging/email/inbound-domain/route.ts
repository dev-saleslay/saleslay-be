import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/hubspot";
import { normalizeInboundHostname } from "@/lib/messaging/sendgrid-inbound-address";
import { prisma } from "@/lib/prisma";

type Body = { domain?: string };

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

  const raw = typeof body.domain === "string" ? body.domain.trim() : "";
  if (raw === "") {
    await prisma.emailProviderIntegration.upsert({
      where: { userId: user.id },
      create: { userId: user.id, sendgridInboundDomain: null },
      update: { sendgridInboundDomain: null },
    });
    return NextResponse.json({ ok: true, domain: null });
  }

  const normalized = normalizeInboundHostname(raw);
  if (!normalized) {
    return NextResponse.json(
      {
        error:
          "Enter a valid hostname (e.g. inbound.yourdomain.com). No URL, path, or @-email—only the host you use in SendGrid Inbound Parse.",
      },
      { status: 400 },
    );
  }

  await prisma.emailProviderIntegration.upsert({
    where: { userId: user.id },
    create: { userId: user.id, sendgridInboundDomain: normalized },
    update: { sendgridInboundDomain: normalized },
  });

  return NextResponse.json({ ok: true, domain: normalized });
}
