import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/hubspot";
import { prisma } from "@/lib/prisma";

function isLikelyObjectId(id: string): boolean {
  return /^[a-f\d]{24}$/i.test(id);
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: leadId } = await params;
  if (!leadId?.trim()) {
    return NextResponse.json({ error: "Missing lead id." }, { status: 400 });
  }

  if (!isLikelyObjectId(leadId.trim())) {
    return NextResponse.json({ error: "Invalid lead id." }, { status: 400 });
  }

  const lead = await prisma.crmLead.findFirst({
    where: { id: leadId.trim(), userId: user.id },
    select: { id: true, email: true },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  const email = lead.email?.trim();
  if (!email) {
    return NextResponse.json({ messages: [] });
  }

  const needle = email.toLowerCase();

  const rows = await prisma.emailMessage.findMany({
    where: { userId: user.id, direction: "OUTBOUND" },
    orderBy: { createdAt: "desc" },
    take: 400,
    select: {
      id: true,
      subject: true,
      textBody: true,
      toAddress: true,
      fromAddress: true,
      createdAt: true,
    },
  });

  const messages = rows
    .filter((m) => m.toAddress.trim().toLowerCase() === needle)
    .slice(0, 100)
    .map((m) => ({
      id: m.id,
      channel: "email" as const,
      subject: m.subject,
      preview: (m.textBody ?? "").slice(0, 2000),
      toAddress: m.toAddress,
      fromAddress: m.fromAddress,
      sentAt: m.createdAt.toISOString(),
    }));

  return NextResponse.json({ messages });
}
