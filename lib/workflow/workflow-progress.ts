import type { OneMonthTemplateStep } from "../templates/one-month-templates";
import type { WorkflowTestStepResult } from "./test-sequence-send";

/** True when step 1 of the playbook succeeded for all channels that step defines. */
export function workflowStepOneComplete(
  result: WorkflowTestStepResult,
  templateStep0: OneMonthTemplateStep,
): boolean {
  const needEmail = Boolean(templateStep0.delivery.email);
  const needSms = Boolean(templateStep0.delivery.sms);
  const emailOk = !needEmail || result.email.ok;
  if (!needSms) return emailOk;
  const s = result.sms;
  if (!s || s.skipped) return false;
  return emailOk && s.ok;
}
