import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUser, syncHubSpotContacts } from "@/lib/hubspot";
import { prisma } from "@/lib/prisma";

type HubSpotTokenResponse = {
  refresh_token: string;
  access_token: string;
  expires_in: number;
  scope?: string;
  hub_id?: number;
};

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.redirect(new URL("/auth/joinnow", request.url));
  }

  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL("/user/dashboard/connection?tab=crm&error=missing_code", request.url),
    );
  }

  const clientId = process.env.HUBSPOT_CLIENT_ID;
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
  const redirectUri = process.env.HUBSPOT_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(
      new URL("/user/dashboard/connection?tab=crm&error=missing_env", request.url),
    );
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
  });

  const tokenResponse = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  if (!tokenResponse.ok) {
    return NextResponse.redirect(
      new URL("/user/dashboard/connection?tab=crm&error=token_failed", request.url),
    );
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
    await syncHubSpotContacts({
      userId: user.id,
      limit: 50,
      pruneMissing: true,
    });
  } catch {
    return NextResponse.redirect(
      new URL("/user/dashboard/connection?tab=crm&connected=hubspot&sync=failed", request.url),
    );
  }

  return NextResponse.redirect(
    new URL("/user/dashboard/connection?tab=crm&connected=hubspot&sync=ok", request.url),
  );
}
