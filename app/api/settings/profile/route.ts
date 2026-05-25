import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/hubspot";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.userProfile.findUnique({
    where: { userId: user.id },
  });

  return NextResponse.json({
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
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
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
    data: {
      name: fullName || user.name,
    },
  });

  return NextResponse.json({ success: true, profile });
}
