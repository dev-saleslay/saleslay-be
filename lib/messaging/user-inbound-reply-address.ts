import { prisma } from "../prisma";
import { buildInboundEmailAddress } from "./sendgrid-inbound-address";

/** Full sl-…@host for Reply-To when inbound is configured (user hostname and/or server default). */
export async function getUserInboundReplyToAddress(userId: string): Promise<string | null> {
  const row = await prisma.emailProviderIntegration.findUnique({
    where: { userId },
    select: { sendgridInboundDomain: true },
  });
  return buildInboundEmailAddress(userId, row?.sendgridInboundDomain ?? null);
}
