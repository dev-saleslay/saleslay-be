import { createHmac, timingSafeEqual } from "crypto";

/**
 * Validates Twilio `X-Twilio-Signature` for an inbound webhook POST.
 * @see https://www.twilio.com/docs/usage/security#validating-requests
 */
export function twilioRequestSignatureValid(params: {
  authToken: string;
  twilioSignature: string | null;
  /** Full URL Twilio POSTed to (must match console configuration). */
  fullUrl: string;
  /** Parsed application/x-www-form-urlencoded body (all keys as strings). */
  bodyParams: Record<string, string>;
}): boolean {
  const { authToken, twilioSignature, fullUrl, bodyParams } = params;
  if (!twilioSignature?.trim() || !authToken) return false;

  const sortedKeys = Object.keys(bodyParams).sort();
  let concatenated = "";
  for (const key of sortedKeys) {
    concatenated += key + bodyParams[key];
  }

  const payload = fullUrl + concatenated;
  const expected = createHmac("sha1", authToken).update(payload, "utf8").digest("base64");

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(twilioSignature.trim()));
  } catch {
    return false;
  }
}
