import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/hubspot";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.workflowLeadProgress.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      lead: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          company: true,
        },
      },
    },
  });

  const items = rows.map((r) => {
    const ln = `${r.lead.firstName ?? ""} ${r.lead.lastName ?? ""}`.trim() || "Unknown";
    return {
      id: r.id,
      crmLeadId: r.crmLeadId,
      savedTemplateId: r.savedTemplateId,
      templateLabel: r.templateLabel,
      updatedAt: r.updatedAt.toISOString(),
      leadName: ln,
      leadEmail: r.lead.email,
      leadPhone: r.lead.phone,
      company: r.lead.company,
    };
  });

  return NextResponse.json({ items });
}
