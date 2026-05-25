import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/hubspot";
import { reconcileInboundEmailsForUser } from "@/lib/lead-ai/reconcile-inbound";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pendingInboundBefore = await prisma.emailMessage.count({
    where: {
      userId: user.id,
      direction: "INBOUND",
      inboundLeadHookAt: null,
    },
  });

  const { processed } = await reconcileInboundEmailsForUser(user.id);

  return NextResponse.json({ ok: true, processed, pendingInboundBefore });
}
