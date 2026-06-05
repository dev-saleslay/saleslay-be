import { NextResponse } from "next/server";

import { enqueueReconcileInbound } from "@/lib/queue/queues";

/**
 * Schedule with Vercel Cron / external ping every 6h (or as needed).
 * Authorization: Bearer CRON_SECRET
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured." }, { status: 503 });
  }
  const auth = request.headers.get("authorization")?.trim();
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await enqueueReconcileInbound();
  return NextResponse.json({ ok: true, message: "Reconciliation job enqueued." });
}
