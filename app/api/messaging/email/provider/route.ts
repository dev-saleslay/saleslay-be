import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/hubspot";
import { getEmailDeliveryResolution } from "@/lib/messaging/email-delivery";
import { prisma } from "@/lib/prisma";

type Body = { provider?: string };

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

  const p = typeof body.provider === "string" ? body.provider.trim().toUpperCase() : "";
  if (p !== "NONE" && p !== "SENDGRID" && p !== "RESEND") {
    return NextResponse.json(
      { error: "provider must be NONE, SENDGRID, or RESEND." },
      { status: 400 },
    );
  }

  const email = await getEmailDeliveryResolution(user.id);

  if (p === "SENDGRID" && !email.sendgridConfigured) {
    return NextResponse.json(
      {
        error:
          "Add your SendGrid API key under Connection → Provider email (or set SENDGRID_API_KEY on the server).",
      },
      { status: 409 },
    );
  }
  if (p === "RESEND" && !email.resendConfigured) {
    return NextResponse.json(
      {
        error:
          "Add your Resend API key under Connection → Provider email (or set RESEND_API_KEY on the server).",
      },
      { status: 409 },
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      // Prisma enum EmailDeliveryProvider — run `npx prisma generate` after schema pull.
      emailDeliveryProvider: p,
    },
  });

  return NextResponse.json({
    ok: true,
    emailDeliveryProvider: p,
  });
}
