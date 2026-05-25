import { NextRequest, NextResponse } from "next/server";

import { handleInboundSmsFromPossibleLead } from "@/lib/lead-ai/inbound-sms-reply";
import { phonesMatch } from "@/lib/messaging/phone-match";
import { twilioRequestSignatureValid } from "@/lib/messaging/twilio-validate-signature";
import { decryptTwilioAuthToken } from "@/lib/messaging/twilio-token-crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function parseFormUrlEncoded(body: string): Record<string, string> {
  const params = new URLSearchParams(body);
  const out: Record<string, string> = {};
  for (const [k, v] of params.entries()) {
    out[k] = v;
  }
  return out;
}

function fullUrlForTwilioValidation(request: NextRequest): string {
  const override = process.env.SALESLAY_PUBLIC_ORIGIN?.trim().replace(/\/$/, "");
  if (!override) {
    return request.nextUrl.href;
  }
  return `${override}${request.nextUrl.pathname}${request.nextUrl.search}`;
}

const EMPTY_TWIML =
  '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

/**
 * Twilio inbound SMS webhook (POST application/x-www-form-urlencoded).
 * Configure on your Twilio phone number: Messaging → A message comes in → Webhook POST to this URL.
 * Optional: query `?token=` must match env `TWILIO_INBOUND_WEBHOOK_TOKEN` when that variable is set.
 */
export async function POST(request: NextRequest) {
  const shared = process.env.TWILIO_INBOUND_WEBHOOK_TOKEN?.trim();
  if (shared) {
    const q = request.nextUrl.searchParams.get("token")?.trim();
    if (q !== shared) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return new NextResponse(EMPTY_TWIML, {
      status: 400,
      headers: { "Content-Type": "text/xml" },
    });
  }

  const params = parseFormUrlEncoded(rawBody);
  const accountSid = params.AccountSid?.trim() ?? "";
  const from = params.From?.trim() ?? "";
  const to = params.To?.trim() ?? "";
  const body = params.Body?.trim() ? params.Body : null;
  const messageSid = params.MessageSid?.trim() ?? "";

  if (!accountSid || !from || !to || !messageSid) {
    return new NextResponse(EMPTY_TWIML, {
      status: 400,
      headers: { "Content-Type": "text/xml" },
    });
  }

  const connections = await prisma.connection.findMany({
    where: {
      channel: "SMS",
      status: "CONNECTED",
      fromNumber: { not: null },
    },
    select: { userId: true, fromNumber: true },
  });

  const hit = connections.find((c) => c.fromNumber != null && phonesMatch(c.fromNumber, to));
  if (!hit) {
    return new NextResponse(EMPTY_TWIML, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }

  const mp = await prisma.messageProviderIntegration.findUnique({
    where: { userId: hit.userId },
    select: {
      twilioAccountSid: true,
      authTokenEnc: true,
      workspaceTenancy: true,
      status: true,
    },
  });

  if (
    !mp ||
    mp.status !== "ACTIVE" ||
    (mp.workspaceTenancy ?? "PLATFORM_MANAGED") !== "USER_OWNED" ||
    mp.twilioAccountSid !== accountSid ||
    !mp.authTokenEnc
  ) {
    return NextResponse.json(
      { error: "Twilio account mismatch or not configured for inbound SMS." },
      { status: 403 },
    );
  }

  let authToken: string;
  try {
    authToken = decryptTwilioAuthToken(mp.authTokenEnc);
  } catch {
    return NextResponse.json({ error: "Credential error" }, { status: 503 });
  }

  const signature = request.headers.get("x-twilio-signature");
  const skip =
    process.env.NODE_ENV === "development" &&
    process.env.TWILIO_INBOUND_SKIP_SIGNATURE?.trim() === "1";

  if (
    !skip &&
    !twilioRequestSignatureValid({
      authToken,
      twilioSignature: signature,
      fullUrl: fullUrlForTwilioValidation(request),
      bodyParams: params,
    })
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  try {
    await handleInboundSmsFromPossibleLead({
      userId: hit.userId,
      fromRaw: from,
      body,
      messageSid,
    });
  } catch (e) {
    console.error("[webhooks/twilio/sms]", e);
  }

  return new NextResponse(EMPTY_TWIML, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
