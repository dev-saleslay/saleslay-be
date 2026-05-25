import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/hubspot";
import { sendUserOutboundEmail } from "@/lib/messaging/send-user-outbound-email";

type Body = { to?: string; subject?: string; text?: string; html?: string };

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const to = typeof body.to === "string" ? body.to.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const text = typeof body.text === "string" ? body.text : "";
  const html = typeof body.html === "string" ? body.html : undefined;

  const result = await sendUserOutboundEmail(user.id, { to, subject, text, html });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    messageId: result.messageId,
    provider: result.provider,
  });
}
