import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUser, syncHubSpotContacts } from "@/lib/hubspot";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const integration = await prisma.crmIntegration.findUnique({
    where: { userId: user.id },
  });
  if (!integration) {
    return NextResponse.json({ error: "HubSpot not connected" }, { status: 404 });
  }

  const after = request.nextUrl.searchParams.get("after") ?? undefined;
  const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 50;

  /** Full sync from page 1 + remove local leads missing from HubSpot. Paged `after` = one API page only, no prune. */
  const pruneMissing = after == null || after === "";

  try {
    const result = await syncHubSpotContacts({
      userId: user.id,
      limit,
      after: pruneMissing ? undefined : after,
      maxPages: 1,
      pruneMissing,
    });

    return NextResponse.json({
      connected: true,
      syncedCount: result.syncedCount,
      totalInDb: result.totalInDb,
      prunedCount: result.prunedCount,
      results: result.results,
      paging: result.nextAfter ? { next: { after: result.nextAfter } } : undefined,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch contacts" },
      { status: 500 },
    );
  }
}
