/**
 * Loose phone equality for matching Twilio E.164 to CRM `phone` strings.
 */
export function normalizePhoneDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

function stripUsCountryCode(digits: string): string {
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits;
}

export function phonesMatch(a: string, b: string): boolean {
  const da = normalizePhoneDigits(a);
  const db = normalizePhoneDigits(b);
  if (!da || !db) return false;
  if (da === db) return true;
  const ta = stripUsCountryCode(da);
  const tb = stripUsCountryCode(db);
  return ta === tb && ta.length >= 10;
}

/** Best-effort E.164 for Twilio SMS (US-oriented when no +). */
export function toE164Loose(raw: string): string | null {
  const trimmed = raw.trim();
  const d = normalizePhoneDigits(trimmed);
  if (!d) return null;
  if (trimmed.startsWith("+")) return `+${d}`;
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return `+${d}`;
}
