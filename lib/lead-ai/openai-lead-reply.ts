import { appendLeadConversationMessage, parseStoredMessages } from "./conversation-messages";
import { getMeetingBookingUrl } from "./meeting-link";
import { sendUserOutboundEmail } from "../messaging/send-user-outbound-email";
import { toE164Loose } from "../messaging/phone-match";
import { sendTwilioSms } from "../messaging/twilio-send-sms";
import { getSmsSendContextForUser } from "../messaging/user-sms-send-context";
import { prisma } from "../prisma";
import { getMyCompanyTabFields, myCompanyFieldsToRichContext } from "../templates/alignment-sources";

function companyContextBlock(userId: string): Promise<string> {
  return getMyCompanyTabFields(userId).then((c) => {
    const ctx = myCompanyFieldsToRichContext(c);
    return [
      ctx.companyName && `Company: ${ctx.companyName}`,
      ctx.website && `Website: ${ctx.website}`,
      ctx.productName && `Product / service: ${ctx.productName}`,
      ctx.productDescription && `Description: ${ctx.productDescription}`,
      ctx.targetAudience && `Ideal customers: ${ctx.targetAudience}`,
      ctx.uniqueValue && `Differentiator: ${ctx.uniqueValue}`,
      ctx.pricing && `Pricing (high level): ${ctx.pricing}`,
      ctx.notes && `Internal notes: ${ctx.notes}`,
    ]
      .filter(Boolean)
      .join("\n");
  });
}

function replySubjectFromHistory(messages: { role: string; content: string }[]): string {
  const lastLead = [...messages].reverse().find((m) => m.role === "lead");
  if (!lastLead) return "Following up";
  const m = lastLead.content.match(/^Subject:\s*(.+)$/im);
  if (m) return `Re: ${m[1].trim().slice(0, 180)}`;
  return "Re: Following up";
}

/**
 * Loads thread + company context, calls OpenAI, stores assistant message, optionally emails the lead.
 */
export async function generateAndMaybeSendAiReply(params: {
  userId: string;
  crmLeadId: string;
  sendEmail?: boolean;
  /** When true, send the drafted reply by SMS (linked Twilio number + lead phone). */
  sendSms?: boolean;
}): Promise<{ reply: string; sent: boolean }> {
  const sendEmail = params.sendEmail === true;
  const sendSms = params.sendSms === true;
  if (sendEmail && sendSms) {
    throw new Error("Choose either email or SMS, not both.");
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set on the server.");
  }

  const model = process.env.LEAD_AI_MODEL?.trim() || "gpt-4o-mini";

  const [conv, lead, profile, companyBlock] = await Promise.all([
    prisma.leadAiConversation.findFirst({
      where: { userId: params.userId, crmLeadId: params.crmLeadId },
    }),
    prisma.crmLead.findFirst({
      where: { id: params.crmLeadId, userId: params.userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        company: true,
      },
    }),
    prisma.userProfile.findUnique({
      where: { userId: params.userId },
      select: { fullName: true },
    }),
    companyContextBlock(params.userId),
  ]);

  if (!lead) {
    throw new Error("Lead not found.");
  }

  const history = parseStoredMessages(conv?.messages ?? []);
  if (history.length === 0) {
    throw new Error(
      sendSms
        ? "No conversation yet. Wait for an inbound SMS from this lead."
        : "No conversation yet. Wait for the lead to reply to your inbound address.",
    );
  }

  const recent = history.slice(-20);
  const prospectName = `${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim() || "the prospect";
  const sellerFirst =
    profile?.fullName?.trim().split(/\s+/)[0] ?? "";
  const meetingUrl = getMeetingBookingUrl();

  const smsMode = sendSms;
  const system = smsMode
    ? [
        "You are drafting a short SMS reply as a sales rep for the business described below.",
        "The prospect texted you. Write plain text only — no markdown, no email signatures.",
        "Keep it under about 300 characters when possible. Be warm and clear.",
        "Answer briefly if they asked something. Move toward a quick call when natural.",
        "Do not claim discounts, legal commitments, or facts not supported by BUSINESS CONTEXT.",
        "",
        "BOOKING LINK (dummy for now — replace via MEETING_BOOKING_URL on the server):",
        meetingUrl,
        "If they clearly want to schedule, you may end with one line including that URL.",
        "",
        "BUSINESS CONTEXT:",
        companyBlock || "(No My Company profile saved — keep the reply generic.)",
        "",
        `Prospect: ${prospectName}${lead.company ? ` at ${lead.company}` : ""}.`,
        sellerFirst ? `Sign off with first name: ${sellerFirst}.` : "Sign off briefly.",
      ].join("\n")
    : [
        "You are drafting an email reply as a sales rep for the business described below.",
        "The prospect has been messaging by email. Write in plain text only (no HTML).",
        "Be concise, warm, and professional. Answer their question if they asked one.",
        "Your goal is to move toward scheduling a short discovery call: suggest 2–3 concrete time windows or ask what works this week.",
        "Do not claim discounts, legal commitments, or facts not supported by BUSINESS CONTEXT.",
        "",
        "BOOKING LINK (dummy for now — replace via MEETING_BOOKING_URL on the server):",
        meetingUrl,
        "When the prospect clearly agrees to meet, asks for a calendar link, or says they are ready to schedule, you MUST end your reply with a short line such as:",
        `"Here's the link to grab a time: ${meetingUrl}"`,
        "Use that exact URL. If they have not agreed or asked for a link yet, do not include the link; keep nudging toward agreement first.",
        "",
        "BUSINESS CONTEXT:",
        companyBlock || "(No My Company profile saved — keep the reply generic and ask one clarifying question.)",
        "",
        `Prospect: ${prospectName}${lead.company ? ` at ${lead.company}` : ""}.`,
        sellerFirst ? `Sign off using first name: ${sellerFirst}.` : "Sign off with Best, and the company name from context.",
      ].join("\n");

  const apiMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: system },
  ];

  for (const m of recent) {
    if (m.role === "lead") {
      apiMessages.push({ role: "user", content: m.content });
    } else {
      apiMessages.push({ role: "assistant", content: m.content });
    }
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.45,
      max_tokens: smsMode ? 400 : 700,
      messages: apiMessages,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[lead-ai] OpenAI error:", res.status, errText.slice(0, 500));
    throw new Error("OpenAI request failed.");
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const reply = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!reply) {
    throw new Error("Empty reply from model.");
  }

  if (sendEmail) {
    const to = lead.email?.trim() ?? "";
    if (!to) {
      throw new Error("Lead has no email on file; cannot send.");
    }
    const subject = replySubjectFromHistory(history);
    const out = await sendUserOutboundEmail(params.userId, {
      to,
      subject,
      text: reply,
    });
    if (!out.ok) {
      throw new Error(out.error);
    }
    await appendLeadConversationMessage({
      userId: params.userId,
      crmLeadId: params.crmLeadId,
      message: { role: "assistant", content: reply, createdAt: new Date().toISOString() },
    });
    return { reply, sent: true };
  }

  if (sendSms) {
    const toPhone = toE164Loose(lead.phone ?? "");
    if (!toPhone) {
      throw new Error("Lead has no usable phone on file; cannot send SMS.");
    }
    const smsCtx = await getSmsSendContextForUser(params.userId);
    if (!smsCtx.ok) {
      throw new Error(smsCtx.error);
    }
    const body = reply.slice(0, 1600);
    const smsOut = await sendTwilioSms({
      ctx: smsCtx.ctx,
      to: toPhone,
      body,
    });
    if (!smsOut.ok) {
      throw new Error(smsOut.error);
    }
    await appendLeadConversationMessage({
      userId: params.userId,
      crmLeadId: params.crmLeadId,
      message: { role: "assistant", content: body, createdAt: new Date().toISOString() },
    });
    return { reply: body, sent: true };
  }

  await appendLeadConversationMessage({
    userId: params.userId,
    crmLeadId: params.crmLeadId,
    message: { role: "assistant", content: reply, createdAt: new Date().toISOString() },
  });
  return { reply, sent: false };
}
