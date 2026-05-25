/**
 * Provisions an isolated messaging tenant per user on the configured platform.
 * Uses the vendor REST API from server-side credentials only (never shipped to the client).
 */

import { randomBytes } from "node:crypto";

const RANDOM_WORDS = [
  "nova",
  "river",
  "coral",
  "summit",
  "atlas",
  "pilot",
  "harbor",
  "beacon",
  "falcon",
  "cedar",
  "ember",
  "orbit",
  "quartz",
  "meadow",
  "cipher",
  "vertex",
  "lynx",
  "sable",
  "aurora",
  "marlin",
  "raven",
  "spruce",
  "cobalt",
  "delta",
  "echo",
  "flint",
  "grove",
  "haven",
  "iris",
  "jade",
  "kelp",
  "lotus",
  "mica",
  "nimbus",
  "oasis",
  "prism",
  "quest",
  "ridge",
  "stone",
  "tango",
] as const;

function slugFromUser(name: string | null | undefined, email: string | null | undefined, id: string): string {
  const raw = (name?.trim() || email?.split("@")[0]?.trim() || id).replace(/\s+/g, " ");
  const slug = raw
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase()
    .replace(/^-|-$/g, "");
  return (slug || "user").slice(0, 28);
}

function pickRandomWord(): string {
  const n = randomBytes(2).readUInt16BE(0) % RANDOM_WORDS.length;
  return RANDOM_WORDS[n]!;
}

function randomAlphanumeric(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[bytes[i]! % chars.length]!;
  }
  return out;
}

/**
 * Twilio-friendly display name: `{userSlug}-{word}-{alnum}` (max 64 chars).
 */
export function buildMessagingWorkspaceFriendlyName(user: {
  name?: string | null;
  email?: string | null;
  id: string;
}): string {
  const userPart = slugFromUser(user.name, user.email, user.id);
  const combined = `${userPart}-${pickRandomWord()}-${randomAlphanumeric(8)}`;
  return combined.slice(0, 64);
}

type ProvisionResult =
  | { ok: true; externalTenantId: string }
  | { ok: false; error: string };

type RemoveResult = { ok: true } | { ok: false; error: string };

function getMasterCredentials(): { accountSid: string; authToken: string } | null {
  const accountSid = process.env.MESSAGING_MASTER_ACCOUNT_SID ?? process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.MESSAGING_MASTER_AUTH_TOKEN ?? process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid?.trim() || !authToken?.trim()) {
    return null;
  }
  return { accountSid: accountSid.trim(), authToken: authToken.trim() };
}

/**
 * Creates a dedicated subaccount under the master account (one workspace per customer).
 * @see https://www.twilio.com/docs/iam/api/account
 */
function parseTwilioAccountsResponse(text: string): {
  sid?: string;
  message?: string;
  code?: number;
} {
  try {
    return JSON.parse(text) as { sid?: string; message?: string; code?: number };
  } catch {
    return {};
  }
}

function formatTwilioProvisionError(
  status: number,
  text: string,
  data: { sid?: string; message?: string; code?: number },
): string {
  if (data.message) {
    return data.code != null ? `[${data.code}] ${data.message}` : data.message;
  }
  const trimmed = text.trim().slice(0, 280);
  if (trimmed) {
    return trimmed;
  }
  return `HTTP ${status}`;
}

export async function provisionIsolatedMessagingTenant(friendlyName: string): Promise<ProvisionResult> {
  const creds = getMasterCredentials();
  if (!creds) {
    return {
      ok: false,
      error: "Messaging platform credentials are not configured on the server.",
    };
  }

  const useMainWorkspace =
    process.env.NODE_ENV === "development" &&
    (process.env.MESSAGING_USE_MAIN_ACCOUNT_WORKSPACE === "1" ||
      process.env.MESSAGING_USE_MAIN_ACCOUNT_WORKSPACE === "true");

  if (useMainWorkspace) {
    // Trial / local dev: Twilio may reject subaccount creation (e.g. error 10002). One shared SID for all users.
    console.warn(
      "[messaging] MESSAGING_USE_MAIN_ACCOUNT_WORKSPACE: skipping subaccount create; using main Account SID.",
    );
    return { ok: true, externalTenantId: creds.accountSid };
  }

  const auth = Buffer.from(`${creds.accountSid}:${creds.authToken}`).toString("base64");
  const body = new URLSearchParams({ FriendlyName: friendlyName.slice(0, 64) });

  try {
    const res = await fetch("https://api.twilio.com/2010-04-01/Accounts.json", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const text = await res.text();
    const data = parseTwilioAccountsResponse(text);

    if (!res.ok || !data.sid) {
      return {
        ok: false,
        error: formatTwilioProvisionError(res.status, text, data),
      };
    }

    return { ok: true, externalTenantId: data.sid };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, error: message };
  }
}

/**
 * Closes a previously created subaccount.
 * Best effort: use before removing local workspace records.
 */
export async function closeIsolatedMessagingTenant(subaccountSid: string): Promise<RemoveResult> {
  const creds = getMasterCredentials();
  if (!creds) {
    return {
      ok: false,
      error: "Messaging platform credentials are not configured on the server.",
    };
  }

  const auth = Buffer.from(`${creds.accountSid}:${creds.authToken}`).toString("base64");

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${subaccountSid}.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ Status: "closed" }),
    });

    const data = (await res.json()) as { sid?: string; message?: string };
    if (!res.ok) {
      return { ok: false, error: data.message ?? `HTTP ${res.status}` };
    }

    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, error: message };
  }
}
