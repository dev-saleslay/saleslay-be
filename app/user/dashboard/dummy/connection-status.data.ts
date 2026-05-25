import type { HubSpotTabStatus } from "@/app/user/dashboard/connection/_components/crm-integration-tab";

export type ConnectionStatusDummyPack = {
  providers: {
    hubspot: HubSpotTabStatus;
    twilio: { connected: boolean; accountId: string | null; connectedAt: string | null };
  };
};

/** Matches `/api/connection/status` shape for CRM tab + Twilio row metadata. */
export const dummyConnectionStatusPack: ConnectionStatusDummyPack = {
  providers: {
    hubspot: {
      connected: true,
      accountId: "portal-88421",
      connectedAt: "2026-04-02T14:22:00.000Z",
      leadsCount: 2840,
      lastSyncedAt: "2026-04-18T09:15:00.000Z",
    },
    twilio: {
      connected: true,
      accountId: "AC••••7f2a",
      connectedAt: "2026-04-03T11:05:00.000Z",
    },
  },
};
