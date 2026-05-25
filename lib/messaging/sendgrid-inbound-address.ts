/**
 * SendGrid Inbound Parse should target addresses like sl-{mongoObjectId}@<your-parse-host>.
 * Configure the hostname in SendGrid and point MX to SendGrid; POST URL → /api/webhooks/sendgrid/inbound
 */

const LOCAL_PART_PREFIX = "sl-";

/** MongoDB ObjectId as 24 hex chars */
const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

export function buildSendGridInboundLocalPart(userId: string): string {
  const hex = userId.replace(/[^a-f\d]/gi, "");
  if (OBJECT_ID_RE.test(hex)) {
    return `${LOCAL_PART_PREFIX}${hex.toLowerCase()}`;
  }
  const safe = userId.replace(/[^a-z0-9]/gi, "").slice(-24).toLowerCase();
  return `${LOCAL_PART_PREFIX}${safe || "user"}`;
}

export function getSendGridInboundDomain(): string | null {
  const d = process.env.SENDGRID_INBOUND_DOMAIN?.trim();
  return d || null;
}

function isPlausibleHostname(s: string): boolean {
  if (s.length > 253 || s.length < 1) return false;
  if (s.includes("..") || s.startsWith(".") || s.endsWith(".")) return false;
  const labels = s.split(".");
  for (const label of labels) {
    if (label.length < 1 || label.length > 63) return false;
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i.test(label)) return false;
  }
  return labels.length >= 1;
}

/**
 * Normalize user-entered inbound hostname. Returns null if empty or invalid.
 * Strips accidental scheme, path, port, and @-suffix.
 */
export function normalizeInboundHostname(raw: string): string | null {
  let s = raw.trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/^https?:\/\//, "");
  s = s.split("/")[0] ?? "";
  s = s.split("@").pop()?.trim() ?? s;
  s = s.replace(/:\d+$/, "");
  s = s.replace(/\.$/, "");
  if (!isPlausibleHostname(s)) return null;
  return s;
}

/** Prefer per-user domain from DB; fall back to SENDGRID_INBOUND_DOMAIN. */
export function resolveInboundDomainForUser(userSavedDomain: string | null | undefined): string | null {
  const fromUser = userSavedDomain?.trim()
    ? normalizeInboundHostname(userSavedDomain)
    : null;
  if (fromUser) return fromUser;
  return getSendGridInboundDomain();
}

export function buildInboundEmailAddress(
  userId: string,
  userSavedInboundDomain?: string | null,
): string | null {
  const domain = resolveInboundDomainForUser(userSavedInboundDomain ?? null);
  if (!domain) return null;
  return `${buildSendGridInboundLocalPart(userId)}@${domain}`;
}

/** Extract bare emails from a SendGrid "to" field (may include display names, commas). */
export function extractEmailsFromAddressList(raw: string): string[] {
  const out: string[] = [];
  const parts = raw.split(/,/);
  for (const part of parts) {
    const p = part.trim();
    if (!p) continue;
    const angle = /<([^>]+)>/.exec(p);
    const candidate = (angle?.[1] ?? p).trim();
    if (candidate.includes("@")) {
      out.push(candidate.toLowerCase());
    }
  }
  return out;
}

export function parseUserIdFromInboundRecipient(emailAddress: string): string | null {
  const lower = emailAddress.trim().toLowerCase();
  const at = lower.lastIndexOf("@");
  if (at <= 0) return null;
  const local = lower.slice(0, at);
  if (!local.startsWith(LOCAL_PART_PREFIX)) return null;
  const idPart = local.slice(LOCAL_PART_PREFIX.length);
  if (OBJECT_ID_RE.test(idPart)) {
    return idPart.toLowerCase();
  }
  return null;
}

export function findUserIdFromInboundToField(toField: string): string | null {
  for (const addr of extractEmailsFromAddressList(toField)) {
    const uid = parseUserIdFromInboundRecipient(addr);
    if (uid) return uid;
  }
  return null;
}
