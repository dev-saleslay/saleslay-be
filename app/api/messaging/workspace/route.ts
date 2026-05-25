import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/hubspot";
import { getEmailDeliveryResolution } from "@/lib/messaging/email-delivery";
import {
  buildInboundEmailAddress,
  buildSendGridInboundLocalPart,
} from "@/lib/messaging/sendgrid-inbound-address";
import { disconnectUserMessagingWorkspace } from "@/lib/messaging/disconnect-user-messaging-workspace";
import { getWorkspacePublicRow } from "@/lib/messaging/user-twilio-context";
import { prisma } from "@/lib/prisma";

type EmailPublicState = "skipped" | "setting_up" | "ready" | "failed";

function mapEmailPublic(status: string): EmailPublicState {
  if (status === "ACTIVE") return "ready";
  if (status === "FAILED") return "failed";
  if (status === "PROVISIONING" || status === "PENDING") return "setting_up";
  return "skipped";
}

function maskTwilioAccountSid(sid: string): string {
  const s = sid.trim();
  if (s.length <= 8) return "AC…";
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

function messagingConnectionPublic(row: {
  status: string;
  workspaceTenancy: string | null | undefined;
  externalTenantId: string | null;
} | null) {
  if (!row?.externalTenantId || row.status !== "ACTIVE") {
    return {
      source: "none" as const,
      accountSidPreview: null as string | null,
    };
  }
  if ((row.workspaceTenancy ?? "PLATFORM_MANAGED") === "USER_OWNED") {
    return {
      source: "user" as const,
      accountSidPreview: maskTwilioAccountSid(row.externalTenantId),
    };
  }
  return {
    source: "platform" as const,
    accountSidPreview: null as string | null,
  };
}

function publicPayload(
  row: {
    status: string;
    emailWorkspaceStatus: string;
    workspaceTenancy: string | null | undefined;
    externalTenantId: string | null;
  } | null,
) {
  if (!row) {
    return {
      state: "none" as const,
      email: "skipped" as EmailPublicState,
      twilio: messagingConnectionPublic(null),
    };
  }
  return {
    state:
      row.status === "ACTIVE"
        ? ("ready" as const)
        : row.status === "FAILED"
          ? ("failed" as const)
          : row.status === "PROVISIONING"
            ? ("setting_up" as const)
            : ("pending" as const),
    email: mapEmailPublic(row.emailWorkspaceStatus),
    twilio: messagingConnectionPublic(row),
  };
}

/** Client-facing workspace + email: outbound provider is SendGrid or Resend (mutually exclusive). */
async function workspaceClientPayload(
  row: Awaited<ReturnType<typeof getWorkspacePublicRow>> | null,
  userId: string,
) {
  const r = await getEmailDeliveryResolution(userId);
  const emailRow = await prisma.emailProviderIntegration.findUnique({
    where: { userId },
    select: { sendgridInboundDomain: true },
  });
  const userInboundDomain = emailRow?.sendgridInboundDomain?.trim() || null;

  let email: EmailPublicState = "skipped";
  if (r.effective === "SENDGRID" && r.sendgridCanSend) {
    email = "ready";
  } else if (r.effective === "RESEND" && r.resendCanSend) {
    email = "ready";
  }

  return {
    ...publicPayload(row),
    email,
    emailDeliveryProvider: r.stored,
    effectiveEmailDeliveryProvider: r.effective,
    needsEmailProviderChoice: r.needsEmailProviderChoice,
    sendgridConfigured: r.sendgridConfigured,
    sendgridInboundDomainSaved: userInboundDomain,
    sendgridInboundLocalPart: buildSendGridInboundLocalPart(userId),
    sendgridInboundAddress: buildInboundEmailAddress(userId, userInboundDomain),
    sendgridOutboundFromConfigured: r.sendgridOutboundFromConfigured,
    sendgridUserKeySaved: r.sendgridUserKeySaved,
    sendgridFromEmailSaved: r.sendgridFromEmailSaved,
    resendConfigured: r.resendConfigured,
    resendDefaultFromConfigured: r.resendDefaultFromConfigured,
    resendUserKeySaved: r.resendUserKeySaved,
    resendFromEmailSaved: r.resendFromEmailSaved,
  };
}

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await getWorkspacePublicRow(user.id);

  return NextResponse.json(await workspaceClientPayload(workspace, user.id));
}

export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mp = await prisma.messageProviderIntegration.findUnique({
    where: { userId: user.id },
    select: {
      status: true,
      twilioAccountSid: true,
    },
  });
  const existing = await prisma.messagingWorkspace.findUnique({
    where: { userId: user.id },
  });

  const twilioReady =
    (mp?.status === "ACTIVE" && Boolean(mp.twilioAccountSid)) ||
    (existing?.status === "ACTIVE" && Boolean(existing?.externalTenantId));

  if (twilioReady) {
    const row = await getWorkspacePublicRow(user.id);
    return NextResponse.json({
      ...(await workspaceClientPayload(row, user.id)),
      message:
        "Twilio messaging is ready for SMS and RCS. Email is independent—connect SendGrid or Resend only in the email panel on this tab.",
    });
  }

  if (existing?.status === "PROVISIONING" && !existing.externalTenantId) {
    return NextResponse.json({
      ...(await workspaceClientPayload(await getWorkspacePublicRow(user.id), user.id)),
      message: "Setup in progress.",
    });
  }

  const row = await getWorkspacePublicRow(user.id);

  return NextResponse.json(
    {
      ...(await workspaceClientPayload(row, user.id)),
      message:
        "Hosted Twilio subaccounts are no longer used. Open Connection → Provider integration and use Connect Twilio with your own Account SID and Auth Token.",
    },
    { status: 410 },
  );
}

export async function DELETE() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { hadWorkspace, providerMessage } = await disconnectUserMessagingWorkspace(user.id);

  if (!hadWorkspace) {
    return NextResponse.json({
      ...(await workspaceClientPayload(null, user.id)),
      message: "No workspace to remove.",
    });
  }

  return NextResponse.json({
    ...(await workspaceClientPayload(await getWorkspacePublicRow(user.id), user.id)),
    message: providerMessage
      ? `Workspace removed locally. Provider cleanup warning: ${providerMessage}`
      : "Messaging workspace disconnected from this account.",
  });
}
