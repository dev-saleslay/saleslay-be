import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/hubspot";
import {
  purchaseSmsNumberOnSubaccount,
  purchaseSmsNumberWithUserCredentials,
} from "@/lib/messaging/twilio-sms-provision";
import { listSmsNumberOnWorkspace } from "@/lib/messaging/twilio-workspace-phone";
import { getTwilioWorkspaceRowForUser, type TwilioWorkspaceRow } from "@/lib/messaging/user-twilio-context";
import { decryptTwilioAuthToken } from "@/lib/messaging/twilio-token-crypto";
import { prisma } from "@/lib/prisma";

async function purchaseSmsOnWorkspace(ws: TwilioWorkspaceRow) {
  const sid = ws.externalTenantId;
  if (!sid) {
    return { ok: false as const, error: "No Twilio account linked." };
  }
  if ((ws.workspaceTenancy ?? "PLATFORM_MANAGED") === "USER_OWNED") {
    if (!ws.providerAuthSecretEnc) {
      return {
        ok: false as const,
        error: "Twilio Auth Token is missing. Reconnect your Twilio account under Connection.",
      };
    }
    try {
      const token = decryptTwilioAuthToken(ws.providerAuthSecretEnc);
      return purchaseSmsNumberWithUserCredentials(sid, token);
    } catch {
      return {
        ok: false as const,
        error:
          "Stored Twilio credentials could not be read. Reconnect your Twilio account under Connection.",
      };
    }
  }
  return purchaseSmsNumberOnSubaccount(sid);
}

function publicResponse(state: "blocked" | "none" | "ready", phoneNumber?: string, message?: string) {
  return NextResponse.json({
    state,
    phoneNumber: phoneNumber ?? null,
    message: message ?? null,
  });
}

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspace = await getTwilioWorkspaceRowForUser(user.id);

  if (!workspace?.externalTenantId || workspace.status !== "ACTIVE") {
    return publicResponse(
      "blocked",
      undefined,
      "Connect your Twilio account under Connection before linking SMS.",
    );
  }

  const existing = await prisma.connection.findFirst({
    where: { userId: user.id, channel: "SMS" },
    orderBy: { updatedAt: "desc" },
    select: { fromNumber: true },
  });

  if (existing?.fromNumber) {
    return publicResponse("ready", existing.fromNumber);
  }

  const twilioExisting = await listSmsNumberOnWorkspace(workspace);
  if (!twilioExisting.ok) {
    return publicResponse("none", undefined, twilioExisting.error);
  }

  if (!twilioExisting.data) {
    return publicResponse("none");
  }

  await prisma.connection.create({
    data: {
      userId: user.id,
      channel: "SMS",
      provider: "TWILIO",
      status: "CONNECTED",
      accountSid: workspace.externalTenantId,
      fromNumber: twilioExisting.data.phoneNumber,
    },
  });

  return publicResponse("ready", twilioExisting.data.phoneNumber);
}

export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspace = await getTwilioWorkspaceRowForUser(user.id);

  if (!workspace?.externalTenantId || workspace.status !== "ACTIVE") {
    return publicResponse(
      "blocked",
      undefined,
      "Connect your Twilio account under Connection before linking SMS.",
    );
  }

  const existing = await prisma.connection.findFirst({
    where: { userId: user.id, channel: "SMS", status: "CONNECTED" },
    orderBy: { updatedAt: "desc" },
  });

  if (existing?.fromNumber) {
    return publicResponse("ready", existing.fromNumber, "Your number is already assigned.");
  }

  const onSub = await listSmsNumberOnWorkspace(workspace);
  if (!onSub.ok) {
    return publicResponse("none", undefined, onSub.error);
  }

  let phoneNumber: string;
  if (onSub.data?.phoneNumber) {
    phoneNumber = onSub.data.phoneNumber;
  } else {
    const purchased = await purchaseSmsOnWorkspace(workspace);
    if (!purchased.ok) {
      return publicResponse("none", undefined, purchased.error);
    }
    phoneNumber = purchased.data.phoneNumber;
  }

  if (existing) {
    await prisma.connection.update({
      where: { id: existing.id },
      data: {
        status: "CONNECTED",
        provider: "TWILIO",
        channel: "SMS",
        accountSid: workspace.externalTenantId,
        fromNumber: phoneNumber,
      },
    });
  } else {
    await prisma.connection.create({
      data: {
        userId: user.id,
        channel: "SMS",
        provider: "TWILIO",
        status: "CONNECTED",
        accountSid: workspace.externalTenantId,
        fromNumber: phoneNumber,
      },
    });
  }

  return publicResponse("ready", phoneNumber, "SMS number is ready.");
}
