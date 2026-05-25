import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/hubspot";
import { sendTwilioSms } from "@/lib/messaging/twilio-send-sms";
import { getSmsSendContextForUser } from "@/lib/messaging/user-sms-send-context";

type Body = { to?: string };

/** Loose E.164: + then country code and digits (7–15 digits after +). */
const E164_RE = /^\+[1-9]\d{6,14}$/;

function normalizeE164(raw: string): string {
  const s = raw.trim().replace(/\s+/g, "");
  return s;
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body = {};
  try {
    const raw = await request.json();
    if (raw && typeof raw === "object") body = raw as Body;
  } catch {
    /* empty body ok */
  }

  const toRaw = typeof body.to === "string" ? normalizeE164(body.to) : "";
  if (!toRaw || !E164_RE.test(toRaw)) {
    return NextResponse.json(
      {
        error:
          'Pass a valid E.164 mobile number in the request body, e.g. { "to": "+15551234567" } (include country code).',
      },
      { status: 400 },
    );
  }

  const resolved = await getSmsSendContextForUser(user.id);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  const text = [
    "SalesLay — SMS connection test",
    `Time (UTC): ${new Date().toISOString()}`,
    "",
    "If you received this, your Twilio SMS setup is working.",
  ].join("\n");

  const result = await sendTwilioSms({
    ctx: resolved.ctx,
    to: toRaw,
    body: text.slice(0, 1600),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    messageSid: result.messageSid,
    to: toRaw,
    from: resolved.ctx.fromNumber,
  });
}
