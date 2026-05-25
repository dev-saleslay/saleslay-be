import { NextResponse } from "next/server";

import { reconcileInboundEmailsGlobal } from "@/lib/lead-ai/reconcile-inbound";

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

  const result = await reconcileInboundEmailsGlobal();
  return NextResponse.json({ ok: true, ...result });
}
