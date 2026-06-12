import { Router } from "express";
import multer from "multer";
import { handleInboundEmailFromPossibleLead } from "../lib/lead-ai/inbound-email-reply";
import { handleInboundSmsFromPossibleLead } from "../lib/lead-ai/inbound-sms-reply";
import { phonesMatch } from "../lib/messaging/phone-match";
import { twilioRequestSignatureValid } from "../lib/messaging/twilio-validate-signature";
import { decryptTwilioAuthToken } from "../lib/messaging/twilio-token-crypto";
import { findUserIdFromInboundToField } from "../lib/messaging/sendgrid-inbound-address";
import { prisma } from "../lib/prisma";

export const webhooksRouter = Router();

const upload = multer();

// POST /api/webhooks/sendgrid/inbound
webhooksRouter.post("/sendgrid/inbound", upload.none(), async (req, res) => {
  const secret = process.env.SENDGRID_INBOUND_WEBHOOK_SECRET?.trim();
  if (secret) {
    const token = (req.query.token as string | undefined)?.trim();
    if (token !== secret) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }

  const body = req.body as Record<string, string>;

  let toRaw = body.to ?? "";
  const envelopeRaw = body.envelope;
  if ((!toRaw.trim() || toRaw.length < 3) && typeof envelopeRaw === "string" && envelopeRaw.trim()) {
    try {
      const env = JSON.parse(envelopeRaw) as { to?: string[] };
      if (Array.isArray(env.to) && env.to.length > 0) {
        toRaw = env.to.join(", ");
      }
    } catch { /* ignore */ }
  }

  const fromRaw = body.from ?? "";
  const subject = body.subject || null;
  const textBody = body.text || null;
  const htmlBody = body.html ?? null;

  if (!toRaw.trim()) {
    res.status(400).json({ error: "Missing to" });
    return;
  }

  const userId = findUserIdFromInboundToField(toRaw);
  if (!userId) {
    res.json({ ok: true, ignored: true, reason: "no_matching_user_address" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) {
    res.json({ ok: true, ignored: true, reason: "user_not_found" });
    return;
  }

  const msg = await prisma.emailMessage.create({
    data: {
      userId,
      direction: "INBOUND",
      fromAddress: fromRaw.trim().slice(0, 512) || "(unknown)",
      toAddress: toRaw.trim().slice(0, 512),
      subject: subject ? subject.slice(0, 998) : null,
      textBody: textBody ? textBody.slice(0, 200_000) : null,
      htmlBody: htmlBody ? htmlBody.slice(0, 500_000) : null,
    },
  });

  const claimed = await prisma.emailMessage.updateMany({
    where: { id: msg.id, inboundLeadHookAt: null },
    data: { inboundLeadHookAt: new Date() },
  });

  if (claimed.count > 0) {
    try {
      await handleInboundEmailFromPossibleLead({
        userId,
        fromHeader: fromRaw,
        subject,
        textBody,
        emailMessageId: msg.id,
      });
    } catch (e) {
      console.error("[webhooks/sendgrid/inbound] lead reply / AI hook:", e);
      await prisma.emailMessage.update({
        where: { id: msg.id },
        data: { inboundLeadHookAt: null },
      });
    }
  }

  res.json({ ok: true });
});

// POST /api/webhooks/twilio/sms
const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

function parseFormUrlEncoded(body: string): Record<string, string> {
  const params = new URLSearchParams(body);
  const out: Record<string, string> = {};
  for (const [k, v] of params.entries()) {
    out[k] = v;
  }
  return out;
}

webhooksRouter.post(
  "/twilio/sms",
  (req, res, next) => {
    // Capture raw body for Twilio signature validation
    let data = "";
    req.setEncoding("utf8");
    req.on("data", (chunk: string) => { data += chunk; });
    req.on("end", () => {
      (req as unknown as { rawBody: string }).rawBody = data;
      next();
    });
  },
  async (req, res) => {
    const shared = process.env.TWILIO_INBOUND_WEBHOOK_TOKEN?.trim();
    if (shared) {
      const q = (req.query.token as string | undefined)?.trim();
      if (q !== shared) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
    }

    const rawBody = (req as unknown as { rawBody: string }).rawBody ?? "";
    const params = parseFormUrlEncoded(rawBody);
    const accountSid = params.AccountSid?.trim() ?? "";
    const from = params.From?.trim() ?? "";
    const to = params.To?.trim() ?? "";
    const body = params.Body?.trim() ? params.Body : null;
    const messageSid = params.MessageSid?.trim() ?? "";

    if (!accountSid || !from || !to || !messageSid) {
      res.status(400).set("Content-Type", "text/xml").send(EMPTY_TWIML);
      return;
    }

    const connections = await prisma.connection.findMany({
      where: { channel: "SMS", status: "CONNECTED", fromNumber: { not: null } },
      select: { userId: true, fromNumber: true },
    });

    const hit = connections.find((c) => c.fromNumber != null && phonesMatch(c.fromNumber, to));
    if (!hit) {
      res.status(200).set("Content-Type", "text/xml").send(EMPTY_TWIML);
      return;
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
      res.status(403).json({ error: "Twilio account mismatch or not configured for inbound SMS." });
      return;
    }

    let authToken: string;
    try {
      authToken = decryptTwilioAuthToken(mp.authTokenEnc);
    } catch {
      res.status(503).json({ error: "Credential error" });
      return;
    }

    const signature = req.headers["x-twilio-signature"] as string | undefined;
    const skip =
      process.env.NODE_ENV === "development" &&
      process.env.TWILIO_INBOUND_SKIP_SIGNATURE?.trim() === "1";

    const override = process.env.SALESLAY_PUBLIC_ORIGIN?.trim().replace(/\/$/, "");
    const fullUrl = override
      ? `${override}${req.path}${req.originalUrl.includes("?") ? req.originalUrl.slice(req.originalUrl.indexOf("?")) : ""}`
      : `${req.protocol}://${req.get("host")}${req.originalUrl}`;

    if (
      !skip &&
      !twilioRequestSignatureValid({
        authToken,
        twilioSignature: signature ?? null,
        fullUrl,
        bodyParams: params,
      })
    ) {
      res.status(403).json({ error: "Invalid signature" });
      return;
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

    res.status(200).set("Content-Type", "text/xml").send(EMPTY_TWIML);
  },
);
