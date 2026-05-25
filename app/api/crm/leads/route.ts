import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/hubspot";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const maxPageSize = 100;

  const pageParam = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const pageSizeParam = Number(request.nextUrl.searchParams.get("pageSize") ?? "10");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
  const pageSize =
    Number.isFinite(pageSizeParam) && pageSizeParam > 0
      ? Math.min(Math.floor(pageSizeParam), maxPageSize)
      : 10;

  const skip = (page - 1) * pageSize;

  const [total, rows] = await Promise.all([
    prisma.crmLead.count({
      where: { userId: user.id },
    }),
    prisma.crmLead.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        company: true,
        externalId: true,
        provider: true,
        lastSyncedAt: true,
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return NextResponse.json({
    page,
    pageSize,
    total,
    totalPages,
    rows,
  });
}
