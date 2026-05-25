import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/hubspot";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitRaw = request.nextUrl.searchParams.get("limit");
  const limit = Math.min(100, Math.max(1, Number(limitRaw) || 30));

  const rows = await prisma.emailMessage.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      direction: true,
      fromAddress: true,
      toAddress: true,
      subject: true,
      textBody: true,
      createdAt: true,
      providerId: true,
    },
  });

  return NextResponse.json({ messages: rows });
}
