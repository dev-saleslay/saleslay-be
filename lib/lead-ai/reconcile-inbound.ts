import { handleInboundEmailFromPossibleLead } from "./inbound-email-reply";
import { prisma } from "../prisma";

const BATCH = 40;

/**
 * Process inbound emails that are not yet marked handled (webhook failure or delayed delivery).
 * Uses atomic claim on `inboundLeadHookAt` to avoid double-processing with the webhook.
 */
export async function reconcileInboundEmailsForUser(userId: string): Promise<{ processed: number }> {
  const rows = await prisma.emailMessage.findMany({
    where: {
      userId,
      direction: "INBOUND",
      inboundLeadHookAt: null,
    },
    orderBy: { createdAt: "asc" },
    take: BATCH,
  });

  let processed = 0;
  for (const row of rows) {
    const claimed = await prisma.emailMessage.updateMany({
      where: { id: row.id, userId, inboundLeadHookAt: null },
      data: { inboundLeadHookAt: new Date() },
    });
    if (claimed.count === 0) continue;

    try {
      await handleInboundEmailFromPossibleLead({
        userId,
        fromHeader: row.fromAddress,
        subject: row.subject,
        textBody: row.textBody,
        emailMessageId: row.id,
      });
      processed += 1;
    } catch (e) {
      console.error("[reconcile-inbound] row failed:", row.id, e);
      await prisma.emailMessage.update({
        where: { id: row.id },
        data: { inboundLeadHookAt: null },
      });
    }
  }

  return { processed };
}

/** For cron: touch each user that still has pending inbound rows. */
export async function reconcileInboundEmailsGlobal(): Promise<{ userCount: number; processed: number }> {
  const pending = await prisma.emailMessage.findMany({
    where: { direction: "INBOUND", inboundLeadHookAt: null },
    select: { userId: true },
    take: 200,
  });
  const userIds = [...new Set(pending.map((p) => p.userId))];
  let processed = 0;
  for (const uid of userIds) {
    const r = await reconcileInboundEmailsForUser(uid);
    processed += r.processed;
  }
  return { userCount: userIds.length, processed };
}
