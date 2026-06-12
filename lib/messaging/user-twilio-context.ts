import { prisma } from "../prisma";

/** Row shape expected by SMS provisioning helpers (legacy + message provider). */
export type TwilioWorkspaceRow = {
  externalTenantId: string | null;
  status: string;
  workspaceTenancy: string | null;
  providerAuthSecretEnc: string | null;
};

/**
 * Resolves Twilio credentials for API routes: prefers MessageProviderIntegration,
 * falls back to legacy MessagingWorkspace (platform or pre-migration user-owned).
 */
export async function getTwilioWorkspaceRowForUser(
  userId: string,
): Promise<TwilioWorkspaceRow | null> {
  const [mp, ws] = await Promise.all([
    prisma.messageProviderIntegration.findUnique({
      where: { userId },
      select: {
        status: true,
        twilioAccountSid: true,
        workspaceTenancy: true,
        authTokenEnc: true,
      },
    }),
    prisma.messagingWorkspace.findUnique({
      where: { userId },
      select: {
        status: true,
        externalTenantId: true,
        workspaceTenancy: true,
        providerAuthSecretEnc: true,
      },
    }),
  ]);

  if (mp?.status === "ACTIVE" && mp.twilioAccountSid) {
    return {
      externalTenantId: mp.twilioAccountSid,
      status: mp.status,
      workspaceTenancy: mp.workspaceTenancy,
      providerAuthSecretEnc: mp.authTokenEnc,
    };
  }

  if (ws?.status === "ACTIVE" && ws.externalTenantId) {
    return {
      externalTenantId: ws.externalTenantId,
      status: ws.status,
      workspaceTenancy: ws.workspaceTenancy,
      providerAuthSecretEnc: ws.providerAuthSecretEnc,
    };
  }

  return null;
}

/** Merged messaging + email fields for workspace API public payloads. */
export type WorkspacePublicRow = {
  status: string;
  emailWorkspaceStatus: string;
  workspaceTenancy: string | null;
  externalTenantId: string | null;
};

export async function getWorkspacePublicRow(userId: string): Promise<WorkspacePublicRow> {
  const [mp, ws] = await Promise.all([
    prisma.messageProviderIntegration.findUnique({
      where: { userId },
      select: {
        status: true,
        twilioAccountSid: true,
        workspaceTenancy: true,
      },
    }),
    prisma.messagingWorkspace.findUnique({
      where: { userId },
      select: {
        status: true,
        emailWorkspaceStatus: true,
        workspaceTenancy: true,
        externalTenantId: true,
      },
    }),
  ]);

  const activeSid =
    mp?.status === "ACTIVE" && mp.twilioAccountSid
      ? mp.twilioAccountSid
      : ws?.status === "ACTIVE" && ws.externalTenantId
        ? ws.externalTenantId
        : null;
  const activeTenancy =
    mp?.status === "ACTIVE" && mp.twilioAccountSid
      ? mp.workspaceTenancy
      : ws?.workspaceTenancy ?? null;
  const messagingStatus = activeSid ? "ACTIVE" : ws?.status ?? "PENDING";

  return {
    status: messagingStatus,
    emailWorkspaceStatus: ws?.emailWorkspaceStatus ?? "SKIPPED",
    workspaceTenancy: activeTenancy,
    externalTenantId: activeSid,
  };
}
