/**
 * Optional server-wide SendGrid API key (fallback when a user has not saved their own key).
 * Does not read Twilio-prefixed env vars—connecting Twilio SMS/RCS must not imply SendGrid.
 */

export function getSendGridApiKey(): string | null {
  const key =
    process.env.SENDGRID_API_KEY?.trim() ?? process.env.MESSAGING_SENDGRID_API_KEY?.trim();
  return key || null;
}

export function isSendGridConfigured(): boolean {
  return getSendGridApiKey() !== null;
}
