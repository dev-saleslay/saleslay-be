import { Router } from "express";
import { requireAuth } from "../lib/auth";
import { syncHubSpotContacts } from "../lib/hubspot";
import { prisma } from "../lib/prisma";

export const crmRouter = Router();

const frontendUrl = () => process.env.FRONTEND_URL ?? "http://localhost:3000";

// GET /api/crm/hubspot/connect
crmRouter.get("/hubspot/connect", requireAuth, (req, res) => {
  const clientId = process.env.HUBSPOT_CLIENT_ID;
  const redirectUri = process.env.HUBSPOT_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    res.status(500).json({
      error: "HubSpot env vars are missing. Add HUBSPOT_CLIENT_ID and HUBSPOT_REDIRECT_URI.",
    });
    return;
  }

  const scope = [
    "crm.objects.contacts.read",
    "crm.objects.deals.read",
    "crm.objects.users.read",
    "crm.objects.companies.read",
    "crm.objects.leads.read",
  ].join(" ");

  const url = new URL("https://app.hubspot.com/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", scope);

  res.redirect(url.toString());
});

// GET /api/crm/hubspot/callback
crmRouter.get("/hubspot/callback", requireAuth, async (req, res) => {
  const user = req.user!;
  const code = req.query.code as string | undefined;

  if (!code) {
    res.redirect(`${frontendUrl()}/user/dashboard/connection?tab=crm&error=missing_code`);
    return;
  }

  const clientId = process.env.HUBSPOT_CLIENT_ID;
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
  const redirectUri = process.env.HUBSPOT_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    res.redirect(`${frontendUrl()}/user/dashboard/connection?tab=crm&error=missing_env`);
    return;
  }

  type HubSpotTokenResponse = {
    refresh_token: string;
    access_token: string;
    expires_in: number;
    scope?: string;
    hub_id?: number;
  };

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
  });

  const tokenResponse = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!tokenResponse.ok) {
    res.redirect(`${frontendUrl()}/user/dashboard/connection?tab=crm&error=token_failed`);
    return;
  }

  const tokenData = (await tokenResponse.json()) as HubSpotTokenResponse;
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

  await prisma.crmIntegration.upsert({
    where: { userId: user.id },
    update: {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt,
      scope: tokenData.scope,
      hubSpotPortalId: tokenData.hub_id ? String(tokenData.hub_id) : null,
    },
    create: {
      userId: user.id,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt,
      scope: tokenData.scope,
      hubSpotPortalId: tokenData.hub_id ? String(tokenData.hub_id) : null,
    },
  });

  try {
    await syncHubSpotContacts({ userId: user.id, limit: 50, pruneMissing: true });
  } catch {
    res.redirect(
      `${frontendUrl()}/user/dashboard/connection?tab=crm&connected=hubspot&sync=failed`,
    );
    return;
  }

  res.redirect(
    `${frontendUrl()}/user/dashboard/connection?tab=crm&connected=hubspot&sync=ok`,
  );
});

// GET /api/crm/hubspot/contacts
crmRouter.get("/hubspot/contacts", requireAuth, async (req, res) => {
  const user = req.user!;

  const integration = await prisma.crmIntegration.findUnique({
    where: { userId: user.id },
  });
  if (!integration) {
    res.status(404).json({ error: "HubSpot not connected" });
    return;
  }

  const after = (req.query.after as string | undefined) ?? undefined;
  const limitParam = Number(req.query.limit ?? "50");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 50;
  const pruneMissing = after == null || after === "";

  try {
    const result = await syncHubSpotContacts({
      userId: user.id,
      limit,
      after: pruneMissing ? undefined : after,
      maxPages: 1,
      pruneMissing,
    });

    res.json({
      connected: true,
      syncedCount: result.syncedCount,
      totalInDb: result.totalInDb,
      prunedCount: result.prunedCount,
      results: result.results,
      paging: result.nextAfter ? { next: { after: result.nextAfter } } : undefined,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch contacts",
    });
  }
});

// POST /api/crm/hubspot/disconnect
crmRouter.post("/hubspot/disconnect", requireAuth, async (req, res) => {
  const user = req.user!;
  await prisma.crmIntegration.deleteMany({ where: { userId: user.id } });
  res.json({ success: true });
});

// GET /api/crm/leads
crmRouter.get("/leads", requireAuth, async (req, res) => {
  const user = req.user!;
  const maxPageSize = 100;

  const pageParam = Number(req.query.page ?? "1");
  const pageSizeParam = Number(req.query.pageSize ?? "10");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
  const pageSize =
    Number.isFinite(pageSizeParam) && pageSizeParam > 0
      ? Math.min(Math.floor(pageSizeParam), maxPageSize)
      : 10;

  const skip = (page - 1) * pageSize;

  const [total, rows] = await Promise.all([
    prisma.crmLead.count({ where: { userId: user.id } }),
    prisma.crmLead.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        company: true,
        externalId: true,
        provider: true,
        lastSyncedAt: true,
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  res.json({ page, pageSize, total, totalPages, rows });
});

// GET /api/crm/leads/:id/outbound-messages
function isLikelyObjectId(id: string): boolean {
  return /^[a-f\d]{24}$/i.test(id);
}

crmRouter.get("/leads/:id/outbound-messages", requireAuth, async (req, res) => {
  const user = req.user!;
  const leadId = req.params.id?.trim();

  if (!leadId) {
    res.status(400).json({ error: "Missing lead id." });
    return;
  }
  if (!isLikelyObjectId(leadId)) {
    res.status(400).json({ error: "Invalid lead id." });
    return;
  }

  const lead = await prisma.crmLead.findFirst({
    where: { id: leadId, userId: user.id },
    select: { id: true, email: true },
  });

  if (!lead) {
    res.status(404).json({ error: "Lead not found." });
    return;
  }

  const email = lead.email?.trim();
  if (!email) {
    res.json({ messages: [] });
    return;
  }

  const needle = email.toLowerCase();

  const rows = await prisma.emailMessage.findMany({
    where: { userId: user.id, direction: "OUTBOUND" },
    orderBy: { createdAt: "desc" },
    take: 400,
    select: {
      id: true,
      subject: true,
      textBody: true,
      toAddress: true,
      fromAddress: true,
      createdAt: true,
    },
  });

  const messages = rows
    .filter((m) => m.toAddress.trim().toLowerCase() === needle)
    .slice(0, 100)
    .map((m) => ({
      id: m.id,
      channel: "email" as const,
      subject: m.subject,
      preview: (m.textBody ?? "").slice(0, 2000),
      toAddress: m.toAddress,
      fromAddress: m.fromAddress,
      sentAt: m.createdAt.toISOString(),
    }));

  res.json({ messages });
});
