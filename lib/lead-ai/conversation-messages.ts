import { prisma } from "../prisma";

export type StoredLeadChatMessage = {
  role: "lead" | "assistant";
  content: string;
  createdAt: string;
  /** Dedupe id from EmailMessage when ingested from inbound parse. */
  sourceEmailMessageId?: string;
  /** Dedupe Twilio MessageSid when ingested from inbound SMS. */
  sourceSmsMessageSid?: string;
};

export function parseStoredMessages(raw: unknown): StoredLeadChatMessage[] {
  if (!Array.isArray(raw)) return [];
  const out: StoredLeadChatMessage[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") continue;
    const o = m as Record<string, unknown>;
    const role = o.role;
    const content = o.content;
    const createdAt = o.createdAt;
    if (role !== "lead" && role !== "assistant") continue;
    if (typeof content !== "string") continue;
    if (typeof createdAt !== "string") continue;
    const sourceEmailMessageId =
      typeof o.sourceEmailMessageId === "string" ? o.sourceEmailMessageId : undefined;
    const sourceSmsMessageSid =
      typeof o.sourceSmsMessageSid === "string" ? o.sourceSmsMessageSid : undefined;
    out.push({ role, content, createdAt, sourceEmailMessageId, sourceSmsMessageSid });
  }
  return out;
}

export async function appendLeadConversationMessage(params: {
  userId: string;
  crmLeadId: string;
  message: StoredLeadChatMessage;
  /** When creating a new thread, set channel (default EMAIL). */
  channel?: string;
}): Promise<void> {
  const existing = await prisma.leadAiConversation.findFirst({
    where: { userId: params.userId, crmLeadId: params.crmLeadId },
  });

  const prev = parseStoredMessages(existing?.messages);
  const emailSid = params.message.sourceEmailMessageId;
  if (emailSid && prev.some((m) => m.sourceEmailMessageId === emailSid)) {
    return;
  }
  const smsSid = params.message.sourceSmsMessageSid;
  if (smsSid && prev.some((m) => m.sourceSmsMessageSid === smsSid)) {
    return;
  }
  const next = [...prev, params.message];

  if (existing) {
    await prisma.leadAiConversation.update({
      where: { id: existing.id },
      data: { messages: JSON.parse(JSON.stringify(next)) as object },
    });
    return;
  }

  await prisma.leadAiConversation.create({
    data: {
      userId: params.userId,
      crmLeadId: params.crmLeadId,
      channel: params.channel ?? "EMAIL",
      messages: JSON.parse(JSON.stringify(next)) as object,
    },
  });
}
