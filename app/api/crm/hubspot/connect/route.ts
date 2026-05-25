import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/hubspot";

/**
 * HubSpot OAuth start. In the HubSpot app, set redirect URI to:
 * `{YOUR_ORIGIN}/api/crm/hubspot/callback`
 */
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.redirect(new URL("/auth/joinnow", request.url));
  }

  const clientId = process.env.HUBSPOT_CLIENT_ID;
  const redirectUri = process.env.HUBSPOT_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "HubSpot env vars are missing. Add HUBSPOT_CLIENT_ID and HUBSPOT_REDIRECT_URI." },
      { status: 500 },
    );
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

  return NextResponse.redirect(url);
}
