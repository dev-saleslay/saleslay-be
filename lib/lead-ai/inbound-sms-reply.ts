import {
  appendLeadConversationMessage,
  parseStoredMessages,
} from "./conversation-messages";
import { findCrmLeadIdByPhoneForUser } from "./find-lead-by-phone";
import { generateAndMaybeSendAiReply } from "./openai-lead-reply";
import { prisma } from "../prisma";

/**
 * Inbound SMS to the user’s Twilio number: match CRM lead by From phone, log thread, optional auto-reply.
 */
export async function handleInboundSmsFromPossibleLead(params: {
  userId: string;
  fromRaw: string;
  body: string | null;
  messageSid: string;
}): Promise<{ matchedLead: boolean; crmLeadId?: string }> {
  const body = params.body?.trim() ?? "";
  if (!body) return { matchedLead: false };

  const lead = await findCrmLeadIdByPhoneForUser(params.userId, params.fromRaw);
  if (!lead) return { matchedLead: false };

  await prisma.workflowLeadProgress.deleteMany({
    where: { userId: params.userId, crmLeadId: lead.id },
  });

  const conv = await prisma.leadAiConversation.findFirst({
    where: { userId: params.userId, crmLeadId: lead.id },
    select: { messages: true },
  });
  const msgs = parseStoredMessages(conv?.messages);
  if (msgs.some((m) => m.sourceSmsMessageSid === params.messageSid)) {
    return { matchedLead: true, crmLeadId: lead.id };
  }

  const content = body.slice(0, 1600);

  await appendLeadConversationMessage({
    userId: params.userId,
    crmLeadId: lead.id,
    channel: "SMS",
    message: {
      role: "lead",
      content: content,
      createdAt: new Date().toISOString(),
      sourceSmsMessageSid: params.messageSid,
    },
  });

  const auto = process.env.LEAD_AI_AUTO_REPLY?.trim().toLowerCase();
  if ((auto === "1" || auto === "true") && content.length > 0) {
    try {
      await generateAndMaybeSendAiReply({
        userId: params.userId,
        crmLeadId: lead.id,
        sendEmail: false,
        sendSms: true,
      });
    } catch (e) {
      console.error("[lead-ai] LEAD_AI_AUTO_REPLY SMS failed:", e);
    }
  }

  return { matchedLead: true, crmLeadId: lead.id };
}
