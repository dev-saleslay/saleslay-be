import type { OneMonthTemplate, OneMonthTemplateStep } from "../templates/one-month-templates";
import { applySenderDisplayName } from "../templates/apply-sender-display-name";
import { sendUserOutboundEmail } from "../messaging/send-user-outbound-email";
import { sendTwilioSms } from "../messaging/twilio-send-sms";
import { getSmsSendContextForUser } from "../messaging/user-sms-send-context";
import { prisma } from "../prisma";
import { mergeWorkflowCopy, type SellerMergeContext } from "./merge-workflow-copy";
import type { WorkflowTestSmsResult, WorkflowTestStepResult } from "./test-sequence-send";

/** Same rule as /api/messaging/sms/test — Twilio expects E.164. */
const E164_RE = /^\+[1-9]\d{6,14}$/;

function leadDisplayName(firstName: string | null, lastName: string | null): string {
  const n = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  return n || "Unknown";
}

function smsSkipped(reason: string): WorkflowTestSmsResult {
  return { ok: false, error: null, skipped: true, skipReason: reason };
}

function mergeStepDelivery(
  step: OneMonthTemplateStep,
  lead: { firstName: string | null; lastName: string | null; company: string | null },
  seller: SellerMergeContext,
): { subject: string; body: string; sms: string | null } {
  const email = step.delivery.email;
  const subject = email ? mergeWorkflowCopy(email.subject, lead, seller) : "";
  const body = email ? mergeWorkflowCopy(email.body, lead, seller) : "";
  const sms = step.delivery.sms ? mergeWorkflowCopy(step.delivery.sms, lead, seller) : null;
  return { subject, body, sms };
}

async function sendSmsForLead(
  userId: string,
  phoneRaw: string,
  body: string,
  smsCtx: Awaited<ReturnType<typeof getSmsSendContextForUser>> | null,
): Promise<WorkflowTestSmsResult> {
  if (!phoneRaw) {
    return smsSkipped("Lead has no phone.");
  }
  if (!E164_RE.test(phoneRaw)) {
    return smsSkipped(
      "Phone must be E.164 (e.g. +15551234567) for SMS. Update the lead in your CRM and re-sync.",
    );
  }
  if (!smsCtx?.ok) {
    return smsSkipped(smsCtx?.error ?? "Connect messaging before sending SMS.");
  }
  const sms = await sendTwilioSms({
    ctx: smsCtx.ctx,
    to: phoneRaw,
    body: body.slice(0, 1600),
  });
  return {
    ok: sms.ok,
    error: sms.ok ? null : sms.error,
    skipped: false,
    skipReason: null,
  };
}

/**
 * Run workflow engine step 1 or 2 using the first / second step of a saved My templates playbook.
 */
export async function runWorkflowTemplateStep(
  userId: string,
  step: 1 | 2,
  leadIds: string[],
  template: OneMonthTemplate,
): Promise<{ results: WorkflowTestStepResult[]; templateStepCount: number }> {
  const companyRow = await prisma.companyProfile.findUnique({
    where: { userId },
    select: { companyName: true, website: true },
  });
  const seller: SellerMergeContext = {
    ourCompany: companyRow?.companyName?.trim() ?? "",
    ourWebsite: companyRow?.website?.trim() ?? "",
  };

  const uniqueIds = [...new Set(leadIds)].filter(Boolean);
  const leads = await prisma.crmLead.findMany({
    where: { userId, id: { in: uniqueIds } },
    select: { id: true, firstName: true, lastName: true, company: true, email: true, phone: true },
    orderBy: { updatedAt: "desc" },
  });

  const templateStepCount = template.steps.length;
  const engineIndex = step === 1 ? 0 : 1;

  if (engineIndex >= templateStepCount) {
    const results: WorkflowTestStepResult[] = leads.map((lead) => ({
      leadId: lead.id,
      name: leadDisplayName(lead.firstName, lead.lastName),
      emailTo: lead.email?.trim() ?? null,
      email: { ok: true, error: null },
    }));
    return { results, templateStepCount };
  }

  const templateStep = template.steps[engineIndex]!;
  const needEmail = Boolean(templateStep.delivery.email);
  const needSms = Boolean(templateStep.delivery.sms);
  const smsCtx = needSms ? await getSmsSendContextForUser(userId) : null;

  const results: WorkflowTestStepResult[] = [];

  for (const lead of leads) {
    const name = leadDisplayName(lead.firstName, lead.lastName);
    const emailAddr = lead.email?.trim() ?? "";
    const phoneRaw = (lead.phone?.trim() ?? "") as string;
    const { subject, body, sms: smsText } = mergeStepDelivery(templateStep, lead, seller);

    let emailResult = { ok: false, error: null as string | null };
    let smsResult: WorkflowTestSmsResult | undefined;

    if (needEmail) {
      if (!emailAddr) {
        emailResult = { ok: false, error: "Lead has no email." };
      } else if (!subject.trim() || !body.trim()) {
        emailResult = { ok: false, error: "Template email subject or body is empty after merge." };
      } else {
        const sent = await sendUserOutboundEmail(userId, {
          to: emailAddr,
          subject: subject.trim(),
          text: body,
        });
        emailResult = {
          ok: sent.ok,
          error: sent.ok ? null : sent.error,
        };
      }
    } else {
      emailResult = { ok: true, error: null };
    }

    if (needSms && smsText) {
      smsResult = await sendSmsForLead(userId, phoneRaw, smsText, smsCtx);
    } else if (step === 2 || engineIndex === 1) {
      smsResult = smsSkipped("No SMS in this template step.");
    }

    results.push({
      leadId: lead.id,
      name,
      emailTo: needEmail ? emailAddr || null : null,
      email: emailResult,
      sms: smsResult,
    });
  }

  return { results, templateStepCount };
}

/** Prepare stored JSON for sending (sender name + structure). */
export function prepareSavedTemplateForWorkflow(
  template: OneMonthTemplate,
  senderDisplayName: string | null | undefined,
): OneMonthTemplate {
  const withSender = applySenderDisplayName(template, senderDisplayName?.trim() ?? "");
  return withSender;
}
