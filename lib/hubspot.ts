import { prisma } from "./prisma";

type HubSpotTokenResponse = {
  token_type: string;
  refresh_token: string;
  access_token: string;
  expires_in: number;
  scope?: string;
  hub_id?: number;
};

type HubSpotContactApiResponse = {
  id: string;
  properties?: {
    firstname?: string | null;
    lastname?: string | null;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
  };
};

export async function refreshHubSpotAccessToken(userId: string) {
  const integration = await prisma.crmIntegration.findUnique({
    where: { userId },
  });

  if (!integration) {
    return null;
  }

  const now = Date.now();
  const currentExpiry = integration.expiresAt?.getTime() ?? 0;
  const stillValid = currentExpiry - now > 60_000;

  if (stillValid) {
    return integration.accessToken;
  }

  const clientId = process.env.HUBSPOT_CLIENT_ID;
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("HubSpot OAuth is not configured.");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: integration.refreshToken,
  });

  const response = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to refresh HubSpot token: ${text}`);
  }

  const data = (await response.json()) as HubSpotTokenResponse;

  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  await prisma.crmIntegration.update({
    where: { userId },
    data: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? integration.refreshToken,
      expiresAt,
      scope: data.scope ?? integration.scope,
      hubSpotPortalId: data.hub_id
        ? String(data.hub_id)
        : integration.hubSpotPortalId,
    },
  });

  return data.access_token;
}

export async function fetchHubSpotContactsPage({
  accessToken,
  limit = 50,
  after,
}: {
  accessToken: string;
  limit?: number;
  after?: string;
}) {
  const url = new URL("https://api.hubapi.com/crm/v3/objects/contacts");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("properties", "firstname,lastname,email,phone,company");
  if (after) {
    url.searchParams.set("after", after);
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to fetch HubSpot contacts");
  }

  const data = (await response.json()) as {
    results?: HubSpotContactApiResponse[];
    paging?: { next?: { after?: string } };
  };

  return {
    results: data.results ?? [],
    nextAfter: data.paging?.next?.after ?? null,
  };
}

/** Normalize HubSpot property value; empty or null → null for storage. */
function hubspotProp(value: string | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t === "" ? null : t;
}

function hubSpotScalarsPatch(properties: HubSpotContactApiResponse["properties"]): {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
} {
  if (!properties || typeof properties !== "object") {
    return {};
  }
  const p = properties as Record<string, string | null | undefined>;
  const patch: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
  } = {};
  if (Object.prototype.hasOwnProperty.call(p, "firstname")) {
    patch.firstName = hubspotProp(p.firstname);
  }
  if (Object.prototype.hasOwnProperty.call(p, "lastname")) {
    patch.lastName = hubspotProp(p.lastname);
  }
  if (Object.prototype.hasOwnProperty.call(p, "email")) {
    patch.email = hubspotProp(p.email);
  }
  if (Object.prototype.hasOwnProperty.call(p, "phone")) {
    patch.phone = hubspotProp(p.phone);
  }
  if (Object.prototype.hasOwnProperty.call(p, "company")) {
    patch.company = hubspotProp(p.company);
  }
  return patch;
}

export async function upsertHubSpotContacts(
  userId: string,
  contacts: HubSpotContactApiResponse[]
) {
  if (!contacts.length) {
    return;
  }

  const now = new Date();
  await Promise.all(
    contacts.map((contact) => {
      const scalarPatch = hubSpotScalarsPatch(contact.properties);
      return prisma.crmLead.upsert({
        where: {
          userId_provider_externalId: {
            userId,
            provider: "HUBSPOT",
            externalId: contact.id,
          },
        },
        update: {
          provider: "HUBSPOT",
          externalId: contact.id,
          rawData: JSON.stringify(contact),
          lastSyncedAt: now,
          ...scalarPatch,
        },
        create: {
          userId,
          provider: "HUBSPOT",
          externalId: contact.id,
          firstName: hubspotProp(contact.properties?.firstname),
          lastName: hubspotProp(contact.properties?.lastname),
          email: hubspotProp(contact.properties?.email),
          phone: hubspotProp(contact.properties?.phone),
          company: hubspotProp(contact.properties?.company),
          rawData: JSON.stringify(contact),
          lastSyncedAt: now,
        },
      });
    })
  );
}

const HUBSPOT_SYNC_MAX_PAGES = 500;

async function deleteHubSpotLeadsNotSeen(userId: string, seenExternalIds: Set<string>): Promise<number> {
  const existing = await prisma.crmLead.findMany({
    where: { userId, provider: "HUBSPOT" },
    select: { id: true, externalId: true },
  });
  const idsToRemove = existing.filter((row) => !seenExternalIds.has(row.externalId)).map((r) => r.id);
  const batch = 200;
  for (let i = 0; i < idsToRemove.length; i += batch) {
    const slice = idsToRemove.slice(i, i + batch);
    if (slice.length) {
      await prisma.crmLead.deleteMany({ where: { id: { in: slice } } });
    }
  }
  return idsToRemove.length;
}

export async function syncHubSpotContacts({
  userId,
  limit = 50,
  after: initialAfter,
  maxPages = 1,
  pruneMissing = false,
}: {
  userId: string;
  limit?: number;
  after?: string;
  maxPages?: number;
  pruneMissing?: boolean;
}) {
  const accessToken = await refreshHubSpotAccessToken(userId);
  if (!accessToken) {
    throw new Error("HubSpot not connected");
  }

  const seenExternalIds = new Set<string>();
  let cursor: string | null | undefined = pruneMissing ? undefined : initialAfter;
  const pageCap = pruneMissing ? HUBSPOT_SYNC_MAX_PAGES : Math.max(1, maxPages);
  let pages = 0;
  let totalSynced = 0;
  let latestResults: HubSpotContactApiResponse[] = [];
  let hubSpotCrawlComplete = false;

  while (pages < pageCap) {
    const { results, nextAfter } = await fetchHubSpotContactsPage({
      accessToken,
      limit,
      after: cursor ?? undefined,
    });

    for (const c of results) {
      seenExternalIds.add(c.id);
    }

    await upsertHubSpotContacts(userId, results);
    latestResults = results;
    totalSynced += results.length;
    pages += 1;

    if (!nextAfter) {
      cursor = null;
      hubSpotCrawlComplete = true;
      break;
    }

    cursor = nextAfter;
    if (!pruneMissing && pages >= maxPages) {
      break;
    }
  }

  let prunedCount = 0;
  if (pruneMissing && hubSpotCrawlComplete) {
    prunedCount = await deleteHubSpotLeadsNotSeen(userId, seenExternalIds);
  }

  const totalInDb = await prisma.crmLead.count({
    where: {
      userId,
      provider: "HUBSPOT",
    },
  });

  return {
    results: latestResults,
    nextAfter: pruneMissing ? null : cursor,
    syncedCount: totalSynced,
    totalInDb,
    prunedCount,
  };
}
