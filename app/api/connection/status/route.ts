import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/hubspot";
import { prisma } from "@/lib/prisma";

/**
 * Snapshot of CRM + messaging provider connection state for the dashboard Connection UI.
 */
export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [
    hubspotIntegration,
    leadsCount,
    latestLead,
    messageProvider,
    messagingWorkspace,
  ] = await Promise.all([
    prisma.crmIntegration.findUnique({
      where: { userId: user.id },
      select: {
        updatedAt: true,
        hubSpotPortalId: true,
      },
    }),
    prisma.crmLead.count({
      where: {
        userId: user.id,
        provider: "HUBSPOT",
      },
    }),
    prisma.crmLead.findFirst({
      where: {
        userId: user.id,
        provider: "HUBSPOT",
      },
      orderBy: { lastSyncedAt: "desc" },
      select: { lastSyncedAt: true },
    }),
    prisma.messageProviderIntegration.findUnique({
      where: { userId: user.id },
      select: {
        updatedAt: true,
        twilioAccountSid: true,
        status: true,
      },
    }),
    prisma.messagingWorkspace.findUnique({
      where: { userId: user.id },
      select: {
        status: true,
        externalTenantId: true,
        updatedAt: true,
      },
    }),
  ]);

  const twilioFromProvider =
    messageProvider?.status === "ACTIVE" && Boolean(messageProvider.twilioAccountSid);
  const twilioFromLegacyWorkspace =
    messagingWorkspace?.status === "ACTIVE" && Boolean(messagingWorkspace.externalTenantId);
  const twilioConnected = twilioFromProvider || twilioFromLegacyWorkspace;

  return NextResponse.json({
    providers: {
      hubspot: {
        connected: Boolean(hubspotIntegration),
        accountId: hubspotIntegration?.hubSpotPortalId ?? null,
        connectedAt: hubspotIntegration?.updatedAt ?? null,
        leadsCount,
        lastSyncedAt: latestLead?.lastSyncedAt ?? null,
      },
      twilio: {
        connected: twilioConnected,
        accountId:
          messageProvider?.twilioAccountSid ??
          messagingWorkspace?.externalTenantId ??
          null,
        connectedAt: messageProvider?.updatedAt ?? messagingWorkspace?.updatedAt ?? null,
      },
    },
  });
}
