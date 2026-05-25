export type IntegrationProvider = "hubspot" | "twilio";

export type IntegrationDefinition = {
  label: string;
  description: string;
  /** OAuth redirect vs open a dashboard page to enter API credentials */
  kind: "oauth" | "manual";
  /** For `manual`, where users complete setup */
  connectPath?: string;
};

export const integrationsConfig: Record<IntegrationProvider, IntegrationDefinition> = {
  hubspot: {
    label: "HubSpot",
    description:
      "Sign in with HubSpot (OAuth) to link your portal. We pull contacts and related CRM fields into SalesLay so you can work with leads here—use Sync leads to refresh after connecting or when your CRM changes. A full sync walks every HubSpot page and removes SalesLay copies of contacts that no longer exist in HubSpot. Disconnect removes only the HubSpot link (tokens); your synced leads stay in SalesLay until you delete them yourself.",
    kind: "oauth",
  },
  twilio: {
    label: "Twilio",
    description:
      "SMS and RCS only through your Twilio account—link a messaging-capable number when ready. Does not connect or enable email; SendGrid/Resend are set up separately in the email card.",
    kind: "manual",
    connectPath: "/user/dashboard/connection?tab=provider",
  },
};

/** Copy for the Email tab (SendGrid); not part of OAuth/manual provider connect routes. */
export const emailIntegrationMeta = {
  label: "SendGrid",
  description:
    "Each user saves their own SendGrid or Resend API key (encrypted in the database). Pick one provider for outbound at a time.",
} as const;

/** Default order on the integrations UI */
export const integrationProvidersOrder: IntegrationProvider[] = ["hubspot", "twilio"];
