import { prisma } from "@/lib/prisma";
import { closeIsolatedMessagingTenant } from "@/lib/messaging/workspace-provision";

export async function disconnectUserMessagingWorkspace(userId: string): Promise<{
  hadWorkspace: boolean;
  providerMessage: string | null;
}> {
  const workspace = await prisma.messagingWorkspace.findUnique({
    where: { userId },
    select: { id: true, externalTenantId: true, workspaceTenancy: true },
  });

  if (!workspace) {
    const mp = await prisma.messageProviderIntegration.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!mp) {
      return { hadWorkspace: false, providerMessage: null };
    }
    await prisma.$transaction([
      prisma.connection.deleteMany({
        where: { userId, channel: "SMS" },
      }),
      prisma.messageProviderIntegration.deleteMany({ where: { userId } }),
    ]);
    return { hadWorkspace: true, providerMessage: null };
  }

  let providerMessage: string | null = null;
  if (
    workspace.externalTenantId &&
    (workspace.workspaceTenancy ?? "PLATFORM_MANAGED") === "PLATFORM_MANAGED"
  ) {
    const closed = await closeIsolatedMessagingTenant(workspace.externalTenantId);
    if (!closed.ok) {
      providerMessage = closed.error;
    }
  }

  await prisma.$transaction([
    prisma.connection.deleteMany({
      where: { userId, channel: "SMS" },
    }),
    prisma.messageProviderIntegration.deleteMany({ where: { userId } }),
    prisma.messagingWorkspace.delete({
      where: { userId },
    }),
  ]);

  return { hadWorkspace: true, providerMessage };
}
