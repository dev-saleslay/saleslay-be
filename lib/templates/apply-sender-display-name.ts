import type { OneMonthTemplate } from "@/app/user/dashboard/templates/_lib/one-month-templates";

/** Preview / send helper: replace `{{senderName}}` everywhere in recipient-facing copy when user sets a saved-template sender name. */
export function applySenderDisplayName(template: OneMonthTemplate, senderDisplayName: string): OneMonthTemplate {
  const name = senderDisplayName.trim();
  const clone = structuredClone(template);
  if (!name) return clone;

  for (const s of clone.steps) {
    s.title = s.title.replaceAll("{{senderName}}", name);
    s.summary = s.summary.replaceAll("{{senderName}}", name);
    if (s.delivery.email) {
      s.delivery.email.subject = s.delivery.email.subject.replaceAll("{{senderName}}", name);
      s.delivery.email.body = s.delivery.email.body.replaceAll("{{senderName}}", name);
    }
    if (s.delivery.sms) {
      s.delivery.sms = s.delivery.sms.replaceAll("{{senderName}}", name);
    }
  }
  return clone;
}
