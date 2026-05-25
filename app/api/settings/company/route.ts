import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/hubspot";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const company = await prisma.companyProfile.findUnique({
    where: { userId: user.id },
  });

  return NextResponse.json({
    company: {
      companyName: company?.companyName ?? "",
      website: company?.website ?? "",
      industry: company?.industry ?? "",
      companySize: company?.companySize ?? "",
      productName: company?.productName ?? "",
      productCategory: company?.productCategory ?? "",
      targetAudience: company?.targetAudience ?? "",
      productDescription: company?.productDescription ?? "",
      uniqueValue: company?.uniqueValue ?? "",
      pricing: company?.pricing ?? "",
      notes: company?.notes ?? "",
    },
  });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    companyName?: string;
    website?: string;
    industry?: string;
    companySize?: string;
    productName?: string;
    productCategory?: string;
    targetAudience?: string;
    productDescription?: string;
    uniqueValue?: string;
    pricing?: string;
    notes?: string;
  };

  const company = await prisma.companyProfile.upsert({
    where: { userId: user.id },
    update: {
      companyName: body.companyName?.trim() || null,
      website: body.website?.trim() || null,
      industry: body.industry?.trim() || null,
      companySize: body.companySize?.trim() || null,
      productName: body.productName?.trim() || null,
      productCategory: body.productCategory?.trim() || null,
      targetAudience: body.targetAudience?.trim() || null,
      productDescription: body.productDescription?.trim() || null,
      uniqueValue: body.uniqueValue?.trim() || null,
      pricing: body.pricing?.trim() || null,
      notes: body.notes?.trim() || null,
    },
    create: {
      userId: user.id,
      companyName: body.companyName?.trim() || null,
      website: body.website?.trim() || null,
      industry: body.industry?.trim() || null,
      companySize: body.companySize?.trim() || null,
      productName: body.productName?.trim() || null,
      productCategory: body.productCategory?.trim() || null,
      targetAudience: body.targetAudience?.trim() || null,
      productDescription: body.productDescription?.trim() || null,
      uniqueValue: body.uniqueValue?.trim() || null,
      pricing: body.pricing?.trim() || null,
      notes: body.notes?.trim() || null,
    },
  });

  return NextResponse.json({ success: true, company });
}
