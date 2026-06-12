import { Router } from "express";
import { requireAuth } from "../lib/auth";
import { prisma } from "../lib/prisma";

export const connectionRouter = Router();

connectionRouter.get("/status", requireAuth, async (req, res) => {
  const user = req.user!;

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

  res.json({
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
});
