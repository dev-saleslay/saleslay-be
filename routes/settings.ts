import { Router } from "express";
import { requireAuth } from "../lib/auth";
import { prisma } from "../lib/prisma";

export const settingsRouter = Router();

// GET /api/settings/profile
settingsRouter.get("/profile", requireAuth, async (req, res) => {
  const user = req.user!;

  const profile = await prisma.userProfile.findUnique({
    where: { userId: user.id },
  });

  res.json({
    profile: {
      fullName: profile?.fullName ?? user.name ?? "",
      phone: profile?.phone ?? "",
      role: profile?.role ?? "",
      location: profile?.location ?? "",
      about: profile?.about ?? "",
      linkedinUrl: profile?.linkedinUrl ?? "",
      website: profile?.website ?? "",
      email: user.email ?? "",
      image: user.image ?? "",
    },
  });
});

// POST /api/settings/profile
settingsRouter.post("/profile", requireAuth, async (req, res) => {
  const user = req.user!;

  const body = req.body as {
    fullName?: string;
    phone?: string;
    role?: string;
    location?: string;
    about?: string;
    linkedinUrl?: string;
    website?: string;
  };

  const fullName = body.fullName?.trim() || "";

  const profile = await prisma.userProfile.upsert({
    where: { userId: user.id },
    update: {
      fullName,
      phone: body.phone?.trim() || null,
      role: body.role?.trim() || null,
      location: body.location?.trim() || null,
      about: body.about?.trim() || null,
      linkedinUrl: body.linkedinUrl?.trim() || null,
      website: body.website?.trim() || null,
    },
    create: {
      userId: user.id,
      fullName,
      phone: body.phone?.trim() || null,
      role: body.role?.trim() || null,
      location: body.location?.trim() || null,
      about: body.about?.trim() || null,
      linkedinUrl: body.linkedinUrl?.trim() || null,
      website: body.website?.trim() || null,
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { name: fullName || user.name },
  });

  res.json({ success: true, profile });
});

// GET /api/settings/company
settingsRouter.get("/company", requireAuth, async (req, res) => {
  const user = req.user!;

  const company = await prisma.companyProfile.findUnique({
    where: { userId: user.id },
  });

  res.json({
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
});

// POST /api/settings/company
settingsRouter.post("/company", requireAuth, async (req, res) => {
  const user = req.user!;

  const body = req.body as {
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

  res.json({ success: true, company });
});
