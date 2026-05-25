import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/hubspot";
import { verifyTwilioAccountCredentials } from "@/lib/messaging/twilio-account-verify";
import { encryptTwilioAuthToken } from "@/lib/messaging/twilio-token-crypto";
import { prisma } from "@/lib/prisma";

type Body = { accountSid?: string; authToken?: string };

export async function POST(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
  }

  const accountSid = typeof body.accountSid === "string" ? body.accountSid.trim() : "";
  const authToken = typeof body.authToken === "string" ? body.authToken.trim() : "";

  const verified = await verifyTwilioAccountCredentials(accountSid, authToken);
  if (!verified.ok) {
    return NextResponse.json({ message: verified.error }, { status: 400 });
  }

  let enc: string;
  try {
    enc = encryptTwilioAuthToken(authToken);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not encrypt credentials.";
    console.error("[messaging/twilio-connection] encrypt failed:", e);
    return NextResponse.json({ message: msg }, { status: 500 });
  }

  const legacyWorkspace = await prisma.messagingWorkspace.findUnique({
    where: { userId: user.id },
    select: {
      status: true,
      workspaceTenancy: true,
      externalTenantId: true,
    },
  });

  if (
    legacyWorkspace?.status === "ACTIVE" &&
    (legacyWorkspace.workspaceTenancy ?? "PLATFORM_MANAGED") === "PLATFORM_MANAGED" &&
    legacyWorkspace.externalTenantId
  ) {
    return NextResponse.json(
      {
        message:
          "Disconnect the legacy hosted workspace on Provider integration first, then connect with your own Twilio Account SID and Auth Token.",
      },
      { status: 409 },
    );
  }

  const label =
    verified.friendlyName?.trim().slice(0, 64) ||
    `messaging-${accountSid.replace(/^AC/i, "").slice(-8)}`;

  await prisma.messageProviderIntegration.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      twilioAccountSid: accountSid,
      authTokenEnc: enc,
      friendlyName: label,
      workspaceTenancy: "USER_OWNED",
      status: "ACTIVE",
    },
    update: {
      twilioAccountSid: accountSid,
      authTokenEnc: enc,
      friendlyName: label,
      workspaceTenancy: "USER_OWNED",
      status: "ACTIVE",
    },
  });

  return NextResponse.json({
    ok: true,
    message:
      "Twilio is connected for SMS and RCS only. Email (SendGrid or Resend) is separate—add it in the email card on the Provider tab if you need outbound mail.",
  });
}
