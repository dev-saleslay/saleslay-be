import type { OneMonthTemplate, OneMonthTemplateStep } from "./one-month-templates";

export type CompanyAlignmentInput = {
  ourCompany: string;
  ourWebsite?: string;
};

function fillSellerTokens(text: string, ctx: CompanyAlignmentInput): string {
  const company = ctx.ourCompany.trim();
  const site = (ctx.ourWebsite ?? "").trim();

  let out = text
    .replaceAll("{{ourCompany}}", company)
    .replaceAll("{{ourWebsite}}", site);

  out = out.replace(/\n{3,}/g, "\n\n").trimEnd();
  if (!company) {
    out = out.replace(/\s+—\s*$/g, "").trimEnd();
  }
  return out;
}

function alignStep(step: OneMonthTemplateStep, ctx: CompanyAlignmentInput): OneMonthTemplateStep {
  const email = step.delivery.email
    ? {
        subject: fillSellerTokens(step.delivery.email.subject, ctx),
        body: fillSellerTokens(step.delivery.email.body, ctx),
      }
    : null;
  const sms = step.delivery.sms ? fillSellerTokens(step.delivery.sms, ctx) : null;
  return {
    ...step,
    delivery: { email, sms },
  };
}

export function cloneOneMonthTemplate(template: OneMonthTemplate): OneMonthTemplate {
  return structuredClone(template);
}

/** Deep clone and replace {{ourCompany}} / {{ourWebsite}} from My Company. Lead + {{senderName}} stay for send-time merge. */
export function alignTemplateWithCompany(
  template: OneMonthTemplate,
  ctx: CompanyAlignmentInput
): OneMonthTemplate {
  const clone = cloneOneMonthTemplate(template);
  return {
    ...clone,
    steps: clone.steps.map((s) => alignStep(s, ctx)),
  };
}
