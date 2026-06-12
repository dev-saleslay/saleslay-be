/** Placeholder booking URL; override with MEETING_BOOKING_URL in production. */
export function getMeetingBookingUrl(): string {
  const u = process.env.MEETING_BOOKING_URL?.trim();
  if (u) return u;
  return "https://example.com/book-meeting";
}
