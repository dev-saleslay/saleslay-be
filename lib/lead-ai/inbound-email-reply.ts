import {
  appendLeadConversationMessage,
  parseStoredMessages,
} from "@/lib/lead-ai/conversation-messages";
import { findCrmLeadIdByEmailForUser } from "@/lib/lead-ai/find-lead-by-email";
import { parseEmailAddressFromHeader } from "@/lib/messaging/parse-email-from-header";
import { prisma } from "@/lib/prisma";
import { generateAndMaybeSendAiReply } from "@/lib/lead-ai/openai-lead-reply";

/**
 * When an inbound email hits the user’s parse address: match a CRM lead by From,
 * stop workflow “in progress” for that lead, log the reply into the AI thread,
 * and optionally auto-reply (LEAD_AI_AUTO_REPLY=true).
 */
export async function handleInboundEmailFromPossibleLead(params: {
  userId: string;
  fromHeader: string;
  subject: string | null;
  textBody: string | null;
  /** When set, appended to the thread for idempotent ingest (webhook + poll). */
  emailMessageId?: string;
}): Promise<{ matchedLead: boolean; crmLeadId?: string }> {
  const addr = parseEmailAddressFromHeader(params.fromHeader);
  if (!addr) return { matchedLead: false };

  const lead = await findCrmLeadIdByEmailForUser(params.userId, addr);
  if (!lead) return { matchedLead: false };

  await prisma.workflowLeadProgress.deleteMany({
    where: { userId: params.userId, crmLeadId: lead.id },
  });

  if (params.emailMessageId) {
    const conv = await prisma.leadAiConversation.findFirst({
      where: { userId: params.userId, crmLeadId: lead.id },
      select: { messages: true },
    });
    const msgs = parseStoredMessages(conv?.messages);
    if (msgs.some((m) => m.sourceEmailMessageId === params.emailMessageId)) {
      return { matchedLead: true, crmLeadId: lead.id };
    }
  }

  const content = [
    params.subject ? `Subject: ${params.subject}` : null,
    params.textBody?.trim() ? params.textBody.trim() : null,
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 16_000);

  if (content.length > 0) {
    await appendLeadConversationMessage({
      userId: params.userId,
      crmLeadId: lead.id,
      message: {
        role: "lead",
        content,
        createdAt: new Date().toISOString(),
        ...(params.emailMessageId ? { sourceEmailMessageId: params.emailMessageId } : {}),
      },
    });
  }

  const auto = process.env.LEAD_AI_AUTO_REPLY?.trim().toLowerCase();
  if ((auto === "1" || auto === "true") && content.length > 0) {
    try {
      await generateAndMaybeSendAiReply({
        userId: params.userId,
        crmLeadId: lead.id,
        sendEmail: true,
      });
    } catch (e) {
      console.error("[lead-ai] LEAD_AI_AUTO_REPLY failed:", e);
    }
  }

  return { matchedLead: true, crmLeadId: lead.id };
}
