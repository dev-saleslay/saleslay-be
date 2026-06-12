import { prisma } from "../prisma";

import type { TemplateAlignRichContext } from "./openai-align-template";

/**
 * Business fields for “Align with my company” — **only** from `CompanyProfile`
 * (dashboard **My Company**). No Settings company fields, no OAuth user name.
 */
export async function getMyCompanyTabFields(userId: string): Promise<{
  companyName: string;
  website: string;
  industry?: string;
  companySize?: string;
  productName?: string;
  productCategory?: string;
  targetAudience?: string;
  productDescription?: string;
  uniqueValue?: string;
  pricing?: string;
  notes?: string;
}> {
  const row = await prisma.companyProfile.findUnique({
    where: { userId },
  });

  return {
    companyName: row?.companyName?.trim() ?? "",
    website: row?.website?.trim() ?? "",
    industry: row?.industry?.trim() || undefined,
    companySize: row?.companySize?.trim() || undefined,
    productName: row?.productName?.trim() || undefined,
    productCategory: row?.productCategory?.trim() || undefined,
    targetAudience: row?.targetAudience?.trim() || undefined,
    productDescription: row?.productDescription?.trim() || undefined,
    uniqueValue: row?.uniqueValue?.trim() || undefined,
    pricing: row?.pricing?.trim() || undefined,
    notes: row?.notes?.trim() || undefined,
  };
}

/**
 * Minimum saved identity from My Company for gating and `{{ourCompany}}`:
 * prefers **Company name**, otherwise **Product name** (same tab, same `CompanyProfile` row).
 */
export function effectiveCompanyLabel(c: {
  companyName: string;
  productName?: string;
}): string {
  const name = c.companyName.trim();
  if (name) return name;
  return (c.productName ?? "").trim();
}

export function myCompanyFieldsToRichContext(
  c: Awaited<ReturnType<typeof getMyCompanyTabFields>>,
): TemplateAlignRichContext {
  return {
    companyName: effectiveCompanyLabel(c),
    website: c.website,
    industry: c.industry,
    productName: c.productName,
    productDescription: c.productDescription,
    targetAudience: c.targetAudience,
    uniqueValue: c.uniqueValue,
    companySize: c.companySize,
    productCategory: c.productCategory,
    pricing: c.pricing,
    notes: c.notes,
  };
}
