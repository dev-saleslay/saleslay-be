type LeadLike = {
  firstName: string | null;
  lastName: string | null;
  company: string | null;
};

export type SellerMergeContext = {
  ourCompany: string;
  ourWebsite: string;
};

/**
 * Replace common playbook merge tokens for outbound send. Aligned templates may still contain lead tokens.
 */
export function mergeWorkflowCopy(
  text: string,
  lead: LeadLike,
  seller?: SellerMergeContext,
): string {
  const first = (lead.firstName ?? "").trim();
  const last = (lead.lastName ?? "").trim();
  const company = (lead.company ?? "").trim();
  const ourCompany = seller?.ourCompany?.trim() ?? "";
  const ourWebsite = seller?.ourWebsite?.trim() ?? "";

  return text
    .replaceAll("{{firstName}}", first || "there")
    .replaceAll("{{lastName}}", last)
    .replaceAll("{{company}}", company || "your team")
    .replaceAll("{{industry}}", "")
    .replaceAll("{{topic}}", "")
    .replaceAll("{{serviceType}}", "")
    .replaceAll("{{seasonWindow}}", "")
    .replaceAll("{{lastInteractionDate}}", "")
    .replaceAll("{{unsubscribeUrl}}", "https://saleslay.app/preferences")
    .replaceAll("{{ourWebsite}}", ourWebsite)
    .replaceAll("{{ourCompany}}", ourCompany);
}
