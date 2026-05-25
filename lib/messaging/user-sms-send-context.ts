import { getMessagingMasterCredentials } from "@/lib/messaging/twilio-sms-provision";
import { listSmsNumberOnWorkspace } from "@/lib/messaging/twilio-workspace-phone";
import { getTwilioWorkspaceRowForUser } from "@/lib/messaging/user-twilio-context";
import { decryptTwilioAuthToken } from "@/lib/messaging/twilio-token-crypto";
import { prisma } from "@/lib/prisma";

export type SmsSendContext = {
  fromNumber: string;
  resourceAccountSid: string;
  basicUser: string;
  basicPassword: string;
};

/**
 * Resolves Twilio REST auth and the outbound "From" number for SMS (same rules as /api/messaging/sms-number).
 */
export async function getSmsSendContextForUser(
  userId: string,
): Promise<{ ok: true; ctx: SmsSendContext } | { ok: false; error: string; status: number }> {
  const workspace = await getTwilioWorkspaceRowForUser(userId);

  if (!workspace?.externalTenantId || workspace.status !== "ACTIVE") {
    return {
      ok: false,
      status: 409,
      error: "Connect your Twilio account under Connection before sending SMS.",
    };
  }

  const existing = await prisma.connection.findFirst({
    where: { userId, channel: "SMS" },
    orderBy: { updatedAt: "desc" },
    select: { fromNumber: true },
  });

  let fromNumber = existing?.fromNumber?.trim() || "";

  if (!fromNumber) {
    const listed = await listSmsNumberOnWorkspace(workspace);
    if (!listed.ok) {
      return { ok: false, status: 503, error: listed.error };
    }
    if (!listed.data?.phoneNumber) {
      return {
        ok: false,
        status: 409,
        error: "Link a messaging number first (use Link messaging number on the Connection page).",
      };
    }
    fromNumber = listed.data.phoneNumber;
  }

  const sid = workspace.externalTenantId;

  if ((workspace.workspaceTenancy ?? "PLATFORM_MANAGED") === "USER_OWNED") {
    if (!workspace.providerAuthSecretEnc) {
      return {
        ok: false,
        status: 503,
        error: "Twilio Auth Token is missing. Reconnect your Twilio account under Connection.",
      };
    }
    try {
      const token = decryptTwilioAuthToken(workspace.providerAuthSecretEnc);
      return {
        ok: true,
        ctx: {
          fromNumber,
          resourceAccountSid: sid,
          basicUser: sid,
          basicPassword: token,
        },
      };
    } catch {
      return {
        ok: false,
        status: 503,
        error: "Stored Twilio credentials could not be read. Reconnect under Connection.",
      };
    }
  }

  const creds = getMessagingMasterCredentials();
  if (!creds) {
    return {
      ok: false,
      status: 503,
      error: "Messaging platform credentials are not configured on the server.",
    };
  }

  return {
    ok: true,
    ctx: {
      fromNumber,
      resourceAccountSid: sid,
      basicUser: creds.accountSid,
      basicPassword: creds.authToken,
    },
  };
}
