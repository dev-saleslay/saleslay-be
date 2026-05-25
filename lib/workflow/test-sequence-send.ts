import { sendUserOutboundEmail } from "@/lib/messaging/send-user-outbound-email";
import { sendTwilioSms } from "@/lib/messaging/twilio-send-sms";
import { getSmsSendContextForUser } from "@/lib/messaging/user-sms-send-context";
import { prisma } from "@/lib/prisma";

/** Same rule as /api/messaging/sms/test — Twilio expects E.164. */
const E164_RE = /^\+[1-9]\d{6,14}$/;

export type WorkflowTestEmailResult = { ok: boolean; error: string | null };

export type WorkflowTestSmsResult = {
  ok: boolean;
  error: string | null;
  skipped: boolean;
  skipReason: string | null;
};

export type WorkflowTestStepResult = {
  leadId: string;
  name: string;
  /** CRM email used as the “To” address (so you can confirm where step 1 actually went). */
  emailTo: string | null;
  email: WorkflowTestEmailResult;
  sms?: WorkflowTestSmsResult;
};

function leadDisplayName(firstName: string | null, lastName: string | null): string {
  const n = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  return n || "Unknown";
}

/**
 * Test-only workflow: step 1 = email only; step 2 = another email + SMS (when phone is valid E.164 and Twilio is ready).
 */
export async function runWorkflowTestStep(
  userId: string,
  step: 1 | 2,
  leadIds: string[],
): Promise<{ results: WorkflowTestStepResult[] }> {
  const uniqueIds = [...new Set(leadIds)].filter(Boolean);
  const leads = await prisma.crmLead.findMany({
    where: { userId, id: { in: uniqueIds } },
    select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    orderBy: { updatedAt: "desc" },
  });

  const smsCtxResolved = step === 2 ? await getSmsSendContextForUser(userId) : null;

  const results: WorkflowTestStepResult[] = [];

  for (const lead of leads) {
    const name = leadDisplayName(lead.firstName, lead.lastName);
    const emailAddr = lead.email?.trim() ?? "";

    if (step === 1) {
      if (!emailAddr) {
        results.push({
          leadId: lead.id,
          name,
          emailTo: null,
          email: { ok: false, error: "Lead has no email." },
        });
        continue;
      }

      const text = [
        "SalesLay — workflow test (step 1 of 2)",
        `Lead: ${name}`,
        `Time (UTC): ${new Date().toISOString()}`,
        "",
        "This step is email only. Step 2 (in ~30s in the test UI) adds SMS when the lead has a valid +E.164 phone and Twilio is connected.",
      ].join("\n");

      const sent = await sendUserOutboundEmail(userId, {
        to: emailAddr,
        subject: "SalesLay workflow test — step 1 (email)",
        text,
      });

      results.push({
        leadId: lead.id,
        name,
        emailTo: emailAddr,
        email: {
          ok: sent.ok,
          error: sent.ok ? null : sent.error,
        },
      });
      continue;
    }

    // step === 2
    const emailResult: WorkflowTestEmailResult = { ok: false, error: null };
    const smsResult: WorkflowTestSmsResult = {
      ok: false,
      error: null,
      skipped: true,
      skipReason: null,
    };

    if (!emailAddr) {
      emailResult.error = "Lead has no email.";
    } else {
      const text = [
        "SalesLay — workflow test (step 2 of 2)",
        `Lead: ${name}`,
        `Time (UTC): ${new Date().toISOString()}`,
        "",
        "This step sends email plus an SMS when possible.",
      ].join("\n");

      const sent = await sendUserOutboundEmail(userId, {
        to: emailAddr,
        subject: "SalesLay workflow test — step 2 (email + SMS)",
        text,
      });
      emailResult.ok = sent.ok;
      emailResult.error = sent.ok ? null : sent.error;
    }

    const phoneRaw = lead.phone?.trim() ?? "";
    if (!phoneRaw) {
      smsResult.skipReason = "Lead has no phone.";
    } else if (!E164_RE.test(phoneRaw)) {
      smsResult.skipReason =
        "Phone must be E.164 (e.g. +15551234567) for SMS. Update the lead in your CRM and re-sync.";
    } else if (!smsCtxResolved?.ok) {
      smsResult.skipReason = smsCtxResolved?.error ?? "Twilio is not ready.";
    } else {
      smsResult.skipped = false;
      const body = [
        "SalesLay workflow test — step 2 (SMS)",
        `Time: ${new Date().toISOString()}`,
      ].join("\n");

      const sms = await sendTwilioSms({
        ctx: smsCtxResolved.ctx,
        to: phoneRaw,
        body: body.slice(0, 1600),
      });
      smsResult.ok = sms.ok;
      smsResult.error = sms.ok ? null : sms.error;
    }

    results.push({
      leadId: lead.id,
      name,
      emailTo: emailAddr || null,
      email: emailResult,
      sms: smsResult,
    });
  }

  return { results };
}
