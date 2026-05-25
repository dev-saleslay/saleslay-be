"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { dummyConnectionStatusPack } from "@/app/user/dashboard/dummy";
import { isDashboardDummyMode } from "@/config/dashboard-dummy.config";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { CrmIntegrationTab, type HubSpotTabStatus } from "./crm-integration-tab";
import { ProviderEmailCard } from "./provider-email-card";
import { TwilioMessagingCard } from "./twilio-messaging-card";
import { useProviderMessaging } from "./use-provider-messaging";

function tabFromSearchParams(searchParams: URLSearchParams): "crm" | "provider" {
  const t = searchParams.get("tab");
  if (t === "provider" || t === "email") return "provider";
  return "crm";
}

type StatusPack = {
  providers: {
    hubspot: HubSpotTabStatus;
    twilio: { connected: boolean; accountId: string | null; connectedAt: string | null };
  };
};

function parseUrlNotice(searchParams: URLSearchParams): string | null {
  const err = searchParams.get("error");
  if (err === "missing_code") {
    return "Authorization was cancelled or incomplete. Try connecting again.";
  }
  if (err === "missing_env") {
    return "HubSpot is not configured on the server.";
  }
  if (err === "token_failed") {
    return "HubSpot could not complete sign-in. Try again.";
  }
  return null;
}

export function ConnectionPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = tabFromSearchParams(searchParams);
  const [tab, setTab] = useState(tabFromUrl);
  const [pack, setPack] = useState<StatusPack | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const demoReadOnly = isDashboardDummyMode();

  const loadPack = useCallback(async (options?: { quiet?: boolean }) => {
    const quiet = options?.quiet === true;
    if (!quiet) setStatusLoading(true);
    if (isDashboardDummyMode()) {
      setPack(dummyConnectionStatusPack);
      setStatusLoading(false);
      return;
    }
    try {
      const response = await fetch("/api/connection/status", { cache: "no-store" });
      const data = (await response.json()) as StatusPack & { error?: string };
      if (!response.ok) {
        setPack(null);
        return;
      }
      setPack({
        providers: data.providers,
      });
    } catch {
      setPack(null);
    } finally {
      if (!quiet) setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPack();
  }, [loadPack]);

  useEffect(() => {
    setTab(tabFromSearchParams(searchParams));
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("tab") === "email") {
      router.replace("/user/dashboard/connection?tab=provider", { scroll: false });
    }
  }, [router, searchParams]);

  const onMessagingPersisted = useCallback(() => {
    void loadPack({ quiet: true });
  }, [loadPack]);

  const messaging = useProviderMessaging(onMessagingPersisted);

  const urlNotice = useMemo(() => parseUrlNotice(searchParams), [searchParams]);

  const oauthConnected = useMemo(() => {
    if (searchParams.get("connected") !== "hubspot") return null;
    const sync = searchParams.get("sync");
    if (sync === "ok") return "ok" as const;
    if (sync === "failed") return "failed" as const;
    return null;
  }, [searchParams]);

  const onTabChange = (value: string) => {
    const next: "crm" | "provider" = value === "provider" ? "provider" : "crm";
    setTab(next);
    router.replace(`/user/dashboard/connection?tab=${next}`, { scroll: false });
  };

  return (
    <div className="w-full space-y-6">
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Connection</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          On the CRM tab, connect your customer database. On the Provider tab, connect messaging and email so playbooks
          can send. After each connection succeeds, use that card’s test action to confirm it works.
        </p>
      </section>

      <Tabs value={tab} onValueChange={onTabChange} className="w-full">
        <TabsList variant="line" className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="crm">CRM</TabsTrigger>
          <TabsTrigger value="provider">Provider</TabsTrigger>
        </TabsList>

        <TabsContent value="crm" className="mt-6">
          <CrmIntegrationTab
            hubspot={pack?.providers.hubspot}
            statusLoading={statusLoading}
            onRefresh={loadPack}
            urlNotice={urlNotice}
            oauthConnected={oauthConnected}
            demoReadOnly={demoReadOnly}
            className="h-full max-w-3xl"
          />
        </TabsContent>

        <TabsContent value="provider" className="mt-6">
          <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
            <div className="flex min-h-0 min-w-0 flex-col">
              <TwilioMessagingCard {...messaging} demoReadOnly={demoReadOnly} />
            </div>
            <div className="flex min-h-0 min-w-0 flex-col">
              <ProviderEmailCard
                workspace={messaging.workspace}
                statusLoading={messaging.statusLoading}
                onRefresh={() => void messaging.loadMessaging({ quiet: true })}
                demoReadOnly={demoReadOnly}
                className="h-full"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
