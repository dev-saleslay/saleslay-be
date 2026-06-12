import { getAnySmsNumberOnSubaccount, getAnySmsNumberWithUserCredentials } from "./twilio-sms-provision";
import { decryptTwilioAuthToken } from "./twilio-token-crypto";
import type { TwilioWorkspaceRow } from "./user-twilio-context";

type ListResult = { ok: true; data: { phoneNumber: string } | null } | { ok: false; error: string };

/**
 * Lists a messaging-capable number on the user's Twilio workspace (user-owned or platform subaccount).
 */
export async function listSmsNumberOnWorkspace(ws: TwilioWorkspaceRow): Promise<ListResult> {
  const sid = ws.externalTenantId;
  if (!sid) {
    return { ok: false, error: "No Twilio account linked." };
  }
  if ((ws.workspaceTenancy ?? "PLATFORM_MANAGED") === "USER_OWNED") {
    if (!ws.providerAuthSecretEnc) {
      return {
        ok: false,
        error: "Twilio Auth Token is missing. Reconnect your Twilio account under Connection.",
      };
    }
    try {
      const token = decryptTwilioAuthToken(ws.providerAuthSecretEnc);
      const r = await getAnySmsNumberWithUserCredentials(sid, token);
      if (!r.ok) return { ok: false, error: r.error };
      return { ok: true, data: r.data ? { phoneNumber: r.data.phoneNumber } : null };
    } catch {
      return {
        ok: false,
        error:
          "Stored Twilio credentials could not be read. Reconnect your Twilio account under Connection.",
      };
    }
  }
  const r = await getAnySmsNumberOnSubaccount(sid);
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true, data: r.data ? { phoneNumber: r.data.phoneNumber } : null };
}
