function authHeader(accountSid: string, authToken: string): string {
  return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
}

/**
 * Confirms Account SID + Auth Token by fetching the account resource.
 * @see https://www.twilio.com/docs/iam/api/account
 */
export async function verifyTwilioAccountCredentials(
  accountSid: string,
  authToken: string,
): Promise<{ ok: true; friendlyName: string | null } | { ok: false; error: string }> {
  const sid = accountSid.trim();
  const token = authToken.trim();
  if (!/^AC[a-f0-9]{32}$/i.test(sid)) {
    return { ok: false, error: "Account SID must look like ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx." };
  }
  if (!token) {
    return { ok: false, error: "Auth Token is required." };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}.json`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: authHeader(sid, token) },
    });
    const data = (await res.json()) as { friendly_name?: string; message?: string; code?: number };
    if (!res.ok) {
      const msg = data.message ?? `HTTP ${res.status}`;
      return { ok: false, error: data.code != null ? `[${data.code}] ${msg}` : msg };
    }
    return { ok: true, friendlyName: data.friendly_name ?? null };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, error: message };
  }
}
