import { Router, Request, Response } from "express";
import multer from "multer";
import { requireAuth } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { getEmailDeliveryResolution, getResendSendContext, getSendGridSendContext } from "../lib/messaging/email-delivery";
import { encryptEmailApiKey } from "../lib/messaging/email-api-key-crypto";
import { sendUserOutboundEmail } from "../lib/messaging/send-user-outbound-email";
import { sendOutboundEmailViaResend } from "../lib/messaging/resend-mail";
import { sendOutboundEmailViaSendGrid } from "../lib/messaging/sendgrid-send-mail";
import { getUserInboundReplyToAddress } from "../lib/messaging/user-inbound-reply-address";
import {
  buildInboundEmailAddress,
  buildSendGridInboundLocalPart,
  normalizeInboundHostname,
} from "../lib/messaging/sendgrid-inbound-address";
import { disconnectUserMessagingWorkspace } from "../lib/messaging/disconnect-user-messaging-workspace";
import { getWorkspacePublicRow } from "../lib/messaging/user-twilio-context";
import { verifyTwilioAccountCredentials } from "../lib/messaging/twilio-account-verify";
import { encryptTwilioAuthToken, decryptTwilioAuthToken } from "../lib/messaging/twilio-token-crypto";
import { sendTwilioSms } from "../lib/messaging/twilio-send-sms";
import { getSmsSendContextForUser } from "../lib/messaging/user-sms-send-context";
import { getTwilioWorkspaceRowForUser, type TwilioWorkspaceRow } from "../lib/messaging/user-twilio-context";
import { listSmsNumberOnWorkspace } from "../lib/messaging/twilio-workspace-phone";
import {
  purchaseSmsNumberOnSubaccount,
  purchaseSmsNumberWithUserCredentials,
} from "../lib/messaging/twilio-sms-provision";

export const messagingRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Email routes ──────────────────────────────────────────────────────────────

messagingRouter.get("/email/messages", requireAuth, async (req, res) => {
  const user = req.user!;
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));

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

  res.json({ messages: rows });
});

messagingRouter.post("/email/send", requireAuth, async (req, res) => {
  const user = req.user!;
  const body = req.body as { to?: string; subject?: string; text?: string; html?: string };

  const to = typeof body.to === "string" ? body.to.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const text = typeof body.text === "string" ? body.text : "";
  const html = typeof body.html === "string" ? body.html : undefined;

  const result = await sendUserOutboundEmail(user.id, { to, subject, text, html });
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.json({ ok: true, messageId: result.messageId, provider: result.provider });
});

messagingRouter.post("/email/provider", requireAuth, async (req, res) => {
  const user = req.user!;
  const body = req.body as { provider?: string };

  const p = typeof body.provider === "string" ? body.provider.trim().toUpperCase() : "";
  if (p !== "NONE" && p !== "SENDGRID" && p !== "RESEND") {
    res.status(400).json({ error: "provider must be NONE, SENDGRID, or RESEND." });
    return;
  }

  const email = await getEmailDeliveryResolution(user.id);

  if (p === "SENDGRID" && !email.sendgridConfigured) {
    res.status(409).json({
      error:
        "Add your SendGrid API key under Connection → Provider email (or set SENDGRID_API_KEY on the server).",
    });
    return;
  }
  if (p === "RESEND" && !email.resendConfigured) {
    res.status(409).json({
      error:
        "Add your Resend API key under Connection → Provider email (or set RESEND_API_KEY on the server).",
    });
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailDeliveryProvider: p },
  });

  res.json({ ok: true, emailDeliveryProvider: p });
});

messagingRouter.post("/email/sendgrid-credentials", requireAuth, async (req, res) => {
  const user = req.user!;
  const body = req.body as { apiKey?: string; fromEmail?: string };

  const apiKeyRaw = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  const fromRaw = typeof body.fromEmail === "string" ? body.fromEmail.trim() : undefined;

  if (fromRaw !== undefined && fromRaw !== "" && !EMAIL_RE.test(fromRaw)) {
    res.status(400).json({ error: "fromEmail must be a valid email address." });
    return;
  }
  if (!apiKeyRaw && fromRaw === undefined) {
    res.status(400).json({ error: "Provide apiKey and/or fromEmail." });
    return;
  }

  let enc: string | undefined;
  if (apiKeyRaw) {
    if (apiKeyRaw.length < 8) {
      res.status(400).json({ error: "API key looks too short." });
      return;
    }
    try {
      enc = encryptEmailApiKey(apiKeyRaw);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not encrypt API key.";
      res.status(500).json({ error: msg });
      return;
    }
  }

  const fromEmail = fromRaw === "" ? null : fromRaw ?? undefined;
  const update: { sendgridApiKeyEnc?: string | null; sendgridFromEmail?: string | null } = {};
  if (enc) update.sendgridApiKeyEnc = enc;
  if (fromEmail !== undefined) update.sendgridFromEmail = fromEmail;

  await prisma.emailProviderIntegration.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      sendgridApiKeyEnc: enc ?? null,
      sendgridFromEmail: fromEmail === undefined ? null : fromEmail,
    },
    update,
  });

  res.json({ ok: true });
});

messagingRouter.delete("/email/sendgrid-credentials", requireAuth, async (req, res) => {
  const user = req.user!;
  await prisma.$transaction([
    prisma.emailProviderIntegration.updateMany({
      where: { userId: user.id },
      data: { sendgridApiKeyEnc: null, sendgridFromEmail: null },
    }),
    prisma.user.updateMany({
      where: { id: user.id, emailDeliveryProvider: "SENDGRID" },
      data: { emailDeliveryProvider: "NONE" },
    }),
  ]);
  res.json({ ok: true });
});

messagingRouter.post("/email/resend-credentials", requireAuth, async (req, res) => {
  const user = req.user!;
  const body = req.body as { apiKey?: string; fromEmail?: string };

  const apiKeyRaw = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  const fromRaw = typeof body.fromEmail === "string" ? body.fromEmail.trim() : undefined;

  if (fromRaw !== undefined && fromRaw !== "" && !EMAIL_RE.test(fromRaw)) {
    res.status(400).json({ error: "fromEmail must be a valid email address." });
    return;
  }
  if (!apiKeyRaw && fromRaw === undefined) {
    res.status(400).json({ error: "Provide apiKey and/or fromEmail." });
    return;
  }

  let enc: string | undefined;
  if (apiKeyRaw) {
    if (apiKeyRaw.length < 8) {
      res.status(400).json({ error: "API key looks too short." });
      return;
    }
    try {
      enc = encryptEmailApiKey(apiKeyRaw);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not encrypt API key.";
      res.status(500).json({ error: msg });
      return;
    }
  }

  const fromEmail = fromRaw === "" ? null : fromRaw ?? undefined;
  const update: { resendApiKeyEnc?: string | null; resendFromEmail?: string | null } = {};
  if (enc) update.resendApiKeyEnc = enc;
  if (fromEmail !== undefined) update.resendFromEmail = fromEmail;

  await prisma.emailProviderIntegration.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      resendApiKeyEnc: enc ?? null,
      resendFromEmail: fromEmail === undefined ? null : fromEmail,
    },
    update,
  });

  res.json({ ok: true });
});

messagingRouter.delete("/email/resend-credentials", requireAuth, async (req, res) => {
  const user = req.user!;
  await prisma.$transaction([
    prisma.emailProviderIntegration.updateMany({
      where: { userId: user.id },
      data: { resendApiKeyEnc: null, resendFromEmail: null },
    }),
    prisma.user.updateMany({
      where: { id: user.id, emailDeliveryProvider: "RESEND" },
      data: { emailDeliveryProvider: "NONE" },
    }),
  ]);
  res.json({ ok: true });
});

messagingRouter.post("/email/inbound-domain", requireAuth, async (req, res) => {
  const user = req.user!;
  const body = req.body as { domain?: string };
  const raw = typeof body.domain === "string" ? body.domain.trim() : "";

  if (raw === "") {
    await prisma.emailProviderIntegration.upsert({
      where: { userId: user.id },
      create: { userId: user.id, sendgridInboundDomain: null },
      update: { sendgridInboundDomain: null },
    });
    res.json({ ok: true, domain: null });
    return;
  }

  const normalized = normalizeInboundHostname(raw);
  if (!normalized) {
    res.status(400).json({
      error:
        "Enter a valid hostname (e.g. inbound.yourdomain.com). No URL, path, or @-email—only the host you use in SendGrid Inbound Parse.",
    });
    return;
  }

  await prisma.emailProviderIntegration.upsert({
    where: { userId: user.id },
    create: { userId: user.id, sendgridInboundDomain: normalized },
    update: { sendgridInboundDomain: normalized },
  });

  res.json({ ok: true, domain: normalized });
});

messagingRouter.post("/email/test", requireAuth, async (req, res) => {
  const user = req.user!;

  let body: { to?: string } = {};
  try {
    if (req.body && typeof req.body === "object") body = req.body as { to?: string };
  } catch { /* ok */ }

  const toOverride = typeof body.to === "string" ? body.to.trim() : "";
  const to = toOverride || user.email?.trim() || "";
  if (!to || !EMAIL_RE.test(to)) {
    res.status(400).json({
      error:
        'No valid recipient. Add an email to your login account, or pass { "to": "you@example.com" } in the request body.',
    });
    return;
  }

  const { effective } = await getEmailDeliveryResolution(user.id);
  if (effective === "NONE") {
    res.status(409).json({ error: "Choose SendGrid or Resend and finish setup before testing." });
    return;
  }

  const subject = "SalesLay — email connection test";
  const text = [
    "This is a test message from SalesLay.",
    `Time (UTC): ${new Date().toISOString()}`,
    `Provider: ${effective === "SENDGRID" ? "SendGrid" : "Resend"}`,
    "",
    "If you received this, your outbound email setup is working.",
  ].join("\n");

  const replyToInbound = await getUserInboundReplyToAddress(user.id);

  if (effective === "SENDGRID") {
    const ctx = await getSendGridSendContext(user.id);
    if (!ctx) {
      res.status(503).json({ error: "SendGrid is not fully configured (key and from address)." });
      return;
    }
    const result = await sendOutboundEmailViaSendGrid({
      apiKey: ctx.apiKey,
      fromEmail: ctx.fromEmail,
      toEmail: to,
      subject,
      text,
      replyToEmail: replyToInbound,
    });
    if (!result.ok) {
      res.status(502).json({ error: result.error });
      return;
    }
    await prisma.emailMessage.create({
      data: {
        userId: user.id,
        direction: "OUTBOUND",
        fromAddress: ctx.fromEmail,
        toAddress: to,
        subject,
        textBody: text.slice(0, 200_000),
        providerId: result.messageId,
      },
    });
    res.json({ ok: true, messageId: result.messageId, provider: "sendgrid", to });
    return;
  }

  const ctx = await getResendSendContext(user.id);
  if (!ctx) {
    res.status(503).json({ error: "Resend is not fully configured (key and from address)." });
    return;
  }
  const result = await sendOutboundEmailViaResend({
    apiKey: ctx.apiKey,
    fromEmail: ctx.fromEmail,
    toEmail: to,
    subject,
    text,
    replyToEmail: replyToInbound,
  });
  if (!result.ok) {
    res.status(502).json({ error: result.error });
    return;
  }
  await prisma.emailMessage.create({
    data: {
      userId: user.id,
      direction: "OUTBOUND",
      fromAddress: ctx.fromEmail,
      toAddress: to,
      subject,
      textBody: text.slice(0, 200_000),
      providerId: result.id,
    },
  });
  res.json({ ok: true, messageId: result.id, provider: "resend", to });
});

// ── Workspace routes ──────────────────────────────────────────────────────────

type EmailPublicState = "skipped" | "setting_up" | "ready" | "failed";

function mapEmailPublic(status: string): EmailPublicState {
  if (status === "ACTIVE") return "ready";
  if (status === "FAILED") return "failed";
  if (status === "PROVISIONING" || status === "PENDING") return "setting_up";
  return "skipped";
}

function maskTwilioAccountSid(sid: string): string {
  const s = sid.trim();
  if (s.length <= 8) return "AC…";
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

function messagingConnectionPublic(row: {
  status: string;
  workspaceTenancy: string | null | undefined;
  externalTenantId: string | null;
} | null) {
  if (!row?.externalTenantId || row.status !== "ACTIVE") {
    return { source: "none" as const, accountSidPreview: null as string | null };
  }
  if ((row.workspaceTenancy ?? "PLATFORM_MANAGED") === "USER_OWNED") {
    return { source: "user" as const, accountSidPreview: maskTwilioAccountSid(row.externalTenantId) };
  }
  return { source: "platform" as const, accountSidPreview: null as string | null };
}

async function workspaceClientPayload(
  row: Awaited<ReturnType<typeof getWorkspacePublicRow>> | null,
  userId: string,
) {
  const r = await getEmailDeliveryResolution(userId);
  const emailRow = await prisma.emailProviderIntegration.findUnique({
    where: { userId },
    select: { sendgridInboundDomain: true },
  });
  const userInboundDomain = emailRow?.sendgridInboundDomain?.trim() || null;

  let email: EmailPublicState = "skipped";
  if (r.effective === "SENDGRID" && r.sendgridCanSend) email = "ready";
  else if (r.effective === "RESEND" && r.resendCanSend) email = "ready";

  const state = !row
    ? ("none" as const)
    : row.status === "ACTIVE"
    ? ("ready" as const)
    : row.status === "FAILED"
    ? ("failed" as const)
    : row.status === "PROVISIONING"
    ? ("setting_up" as const)
    : ("pending" as const);

  return {
    state,
    email,
    twilio: messagingConnectionPublic(row),
    emailDeliveryProvider: r.stored,
    effectiveEmailDeliveryProvider: r.effective,
    needsEmailProviderChoice: r.needsEmailProviderChoice,
    sendgridConfigured: r.sendgridConfigured,
    sendgridInboundDomainSaved: userInboundDomain,
    sendgridInboundLocalPart: buildSendGridInboundLocalPart(userId),
    sendgridInboundAddress: buildInboundEmailAddress(userId, userInboundDomain),
    sendgridOutboundFromConfigured: r.sendgridOutboundFromConfigured,
    sendgridUserKeySaved: r.sendgridUserKeySaved,
    sendgridFromEmailSaved: r.sendgridFromEmailSaved,
    resendConfigured: r.resendConfigured,
    resendDefaultFromConfigured: r.resendDefaultFromConfigured,
    resendUserKeySaved: r.resendUserKeySaved,
    resendFromEmailSaved: r.resendFromEmailSaved,
  };
}

messagingRouter.get("/workspace", requireAuth, async (req, res) => {
  const user = req.user!;
  const workspace = await getWorkspacePublicRow(user.id);
  res.json(await workspaceClientPayload(workspace, user.id));
});

messagingRouter.post("/workspace", requireAuth, async (req, res) => {
  const user = req.user!;

  const mp = await prisma.messageProviderIntegration.findUnique({
    where: { userId: user.id },
    select: { status: true, twilioAccountSid: true },
  });
  const existing = await prisma.messagingWorkspace.findUnique({ where: { userId: user.id } });

  const twilioReady =
    (mp?.status === "ACTIVE" && Boolean(mp.twilioAccountSid)) ||
    (existing?.status === "ACTIVE" && Boolean(existing?.externalTenantId));

  if (twilioReady) {
    const row = await getWorkspacePublicRow(user.id);
    res.json({
      ...(await workspaceClientPayload(row, user.id)),
      message:
        "Twilio messaging is ready for SMS and RCS. Email is independent—connect SendGrid or Resend only in the email panel on this tab.",
    });
    return;
  }

  if (existing?.status === "PROVISIONING" && !existing.externalTenantId) {
    res.json({
      ...(await workspaceClientPayload(await getWorkspacePublicRow(user.id), user.id)),
      message: "Setup in progress.",
    });
    return;
  }

  res.status(410).json({
    ...(await workspaceClientPayload(await getWorkspacePublicRow(user.id), user.id)),
    message:
      "Hosted Twilio subaccounts are no longer used. Open Connection → Provider integration and use Connect Twilio with your own Account SID and Auth Token.",
  });
});

messagingRouter.delete("/workspace", requireAuth, async (req, res) => {
  const user = req.user!;
  const { hadWorkspace, providerMessage } = await disconnectUserMessagingWorkspace(user.id);

  if (!hadWorkspace) {
    res.json({
      ...(await workspaceClientPayload(null, user.id)),
      message: "No workspace to remove.",
    });
    return;
  }

  res.json({
    ...(await workspaceClientPayload(await getWorkspacePublicRow(user.id), user.id)),
    message: providerMessage
      ? `Workspace removed locally. Provider cleanup warning: ${providerMessage}`
      : "Messaging workspace disconnected from this account.",
  });
});

// ── Twilio connection ─────────────────────────────────────────────────────────

messagingRouter.post("/twilio-connection", requireAuth, async (req, res) => {
  const user = req.user!;
  const body = req.body as { accountSid?: string; authToken?: string };

  const accountSid = typeof body.accountSid === "string" ? body.accountSid.trim() : "";
  const authToken = typeof body.authToken === "string" ? body.authToken.trim() : "";

  const verified = await verifyTwilioAccountCredentials(accountSid, authToken);
  if (!verified.ok) {
    res.status(400).json({ message: verified.error });
    return;
  }

  let enc: string;
  try {
    enc = encryptTwilioAuthToken(authToken);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not encrypt credentials.";
    res.status(500).json({ message: msg });
    return;
  }

  const legacyWorkspace = await prisma.messagingWorkspace.findUnique({
    where: { userId: user.id },
    select: { status: true, workspaceTenancy: true, externalTenantId: true },
  });

  if (
    legacyWorkspace?.status === "ACTIVE" &&
    (legacyWorkspace.workspaceTenancy ?? "PLATFORM_MANAGED") === "PLATFORM_MANAGED" &&
    legacyWorkspace.externalTenantId
  ) {
    res.status(409).json({
      message:
        "Disconnect the legacy hosted workspace on Provider integration first, then connect with your own Twilio Account SID and Auth Token.",
    });
    return;
  }

  const label =
    verified.friendlyName?.trim().slice(0, 64) ||
    `messaging-${accountSid.replace(/^AC/i, "").slice(-8)}`;

  await prisma.messageProviderIntegration.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      twilioAccountSid: accountSid,
      authTokenEnc: enc,
      friendlyName: label,
      workspaceTenancy: "USER_OWNED",
      status: "ACTIVE",
    },
    update: {
      twilioAccountSid: accountSid,
      authTokenEnc: enc,
      friendlyName: label,
      workspaceTenancy: "USER_OWNED",
      status: "ACTIVE",
    },
  });

  res.json({
    ok: true,
    message:
      "Twilio is connected for SMS and RCS only. Email (SendGrid or Resend) is separate—add it in the email card on the Provider tab if you need outbound mail.",
  });
});

// ── SMS routes ────────────────────────────────────────────────────────────────

async function purchaseSmsOnWorkspace(ws: TwilioWorkspaceRow) {
  const sid = ws.externalTenantId;
  if (!sid) return { ok: false as const, error: "No Twilio account linked." };
  if ((ws.workspaceTenancy ?? "PLATFORM_MANAGED") === "USER_OWNED") {
    if (!ws.providerAuthSecretEnc) {
      return {
        ok: false as const,
        error: "Twilio Auth Token is missing. Reconnect your Twilio account under Connection.",
      };
    }
    try {
      const token = decryptTwilioAuthToken(ws.providerAuthSecretEnc);
      return purchaseSmsNumberWithUserCredentials(sid, token);
    } catch {
      return {
        ok: false as const,
        error: "Stored Twilio credentials could not be read. Reconnect your Twilio account under Connection.",
      };
    }
  }
  return purchaseSmsNumberOnSubaccount(sid);
}

function smsPublicResponse(
  res: Response,
  state: "blocked" | "none" | "ready",
  phoneNumber?: string,
  message?: string,
) {
  res.json({ state, phoneNumber: phoneNumber ?? null, message: message ?? null });
}

messagingRouter.get("/sms-number", requireAuth, async (req, res) => {
  const user = req.user!;
  const workspace = await getTwilioWorkspaceRowForUser(user.id);

  if (!workspace?.externalTenantId || workspace.status !== "ACTIVE") {
    smsPublicResponse(res, "blocked", undefined, "Connect your Twilio account under Connection before linking SMS.");
    return;
  }

  const existing = await prisma.connection.findFirst({
    where: { userId: user.id, channel: "SMS" },
    orderBy: { updatedAt: "desc" },
    select: { fromNumber: true },
  });

  if (existing?.fromNumber) {
    smsPublicResponse(res, "ready", existing.fromNumber);
    return;
  }

  const twilioExisting = await listSmsNumberOnWorkspace(workspace);
  if (!twilioExisting.ok) {
    smsPublicResponse(res, "none", undefined, twilioExisting.error);
    return;
  }
  if (!twilioExisting.data) {
    smsPublicResponse(res, "none");
    return;
  }

  await prisma.connection.create({
    data: {
      userId: user.id,
      channel: "SMS",
      provider: "TWILIO",
      status: "CONNECTED",
      accountSid: workspace.externalTenantId,
      fromNumber: twilioExisting.data.phoneNumber,
    },
  });

  smsPublicResponse(res, "ready", twilioExisting.data.phoneNumber);
});

messagingRouter.post("/sms-number", requireAuth, async (req, res) => {
  const user = req.user!;
  const workspace = await getTwilioWorkspaceRowForUser(user.id);

  if (!workspace?.externalTenantId || workspace.status !== "ACTIVE") {
    smsPublicResponse(res, "blocked", undefined, "Connect your Twilio account under Connection before linking SMS.");
    return;
  }

  const existing = await prisma.connection.findFirst({
    where: { userId: user.id, channel: "SMS", status: "CONNECTED" },
    orderBy: { updatedAt: "desc" },
  });

  if (existing?.fromNumber) {
    smsPublicResponse(res, "ready", existing.fromNumber, "Your number is already assigned.");
    return;
  }

  const onSub = await listSmsNumberOnWorkspace(workspace);
  if (!onSub.ok) {
    smsPublicResponse(res, "none", undefined, onSub.error);
    return;
  }

  let phoneNumber: string;
  if (onSub.data?.phoneNumber) {
    phoneNumber = onSub.data.phoneNumber;
  } else {
    const purchased = await purchaseSmsOnWorkspace(workspace);
    if (!purchased.ok) {
      smsPublicResponse(res, "none", undefined, purchased.error);
      return;
    }
    phoneNumber = purchased.data.phoneNumber;
  }

  if (existing) {
    await prisma.connection.update({
      where: { id: existing.id },
      data: {
        status: "CONNECTED",
        provider: "TWILIO",
        channel: "SMS",
        accountSid: workspace.externalTenantId,
        fromNumber: phoneNumber,
      },
    });
  } else {
    await prisma.connection.create({
      data: {
        userId: user.id,
        channel: "SMS",
        provider: "TWILIO",
        status: "CONNECTED",
        accountSid: workspace.externalTenantId,
        fromNumber: phoneNumber,
      },
    });
  }

  smsPublicResponse(res, "ready", phoneNumber, "SMS number is ready.");
});

const E164_RE = /^\+[1-9]\d{6,14}$/;

messagingRouter.post("/sms/test", requireAuth, async (req, res) => {
  const user = req.user!;
  let body: { to?: string } = {};
  try {
    if (req.body && typeof req.body === "object") body = req.body as { to?: string };
  } catch { /* ok */ }

  const toRaw = typeof body.to === "string" ? body.to.trim().replace(/\s+/g, "") : "";
  if (!toRaw || !E164_RE.test(toRaw)) {
    res.status(400).json({
      error: 'Pass a valid E.164 mobile number in the request body, e.g. { "to": "+15551234567" } (include country code).',
    });
    return;
  }

  const resolved = await getSmsSendContextForUser(user.id);
  if (!resolved.ok) {
    res.status(resolved.status).json({ error: resolved.error });
    return;
  }

  const text = [
    "SalesLay — SMS connection test",
    `Time (UTC): ${new Date().toISOString()}`,
    "",
    "If you received this, your Twilio SMS setup is working.",
  ].join("\n");

  const result = await sendTwilioSms({ ctx: resolved.ctx, to: toRaw, body: text.slice(0, 1600) });
  if (!result.ok) {
    res.status(502).json({ error: result.error });
    return;
  }

  res.json({ ok: true, messageSid: result.messageSid, to: toRaw, from: resolved.ctx.fromNumber });
});
