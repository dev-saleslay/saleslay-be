/** Extract a single RFC-like email from a SendGrid / mail `From` header. */
export function parseEmailAddressFromHeader(fromHeader: string): string | null {
  const s = fromHeader.trim();
  if (!s) return null;
  const angle = s.match(/<([^>]+)>/);
  const candidate = (angle?.[1] ?? s).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate)) return null;
  return candidate;
}
