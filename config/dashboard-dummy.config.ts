/**
 * When `true`, `/user/dashboard` uses static preview metrics and static integration
 * state (no live CRM, Twilio, or SendGrid API calls). Set to `false` for live data.
 */
export const DASHBOARD_DUMMY_MODE = true;

export function isDashboardDummyMode(): boolean {
  return DASHBOARD_DUMMY_MODE;
}
