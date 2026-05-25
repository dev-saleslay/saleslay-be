"use client";

import { useMemo, useState } from "react";
import { Loader2, PlugZap, RefreshCw } from "lucide-react";

import { integrationsConfig } from "@/config/integrations.config";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DotLoader } from "@/components/ui/dot-loader";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type HubSpotTabStatus = {
  connected: boolean;
  accountId: string | null;
  connectedAt: string | null;
  leadsCount: number;
  lastSyncedAt: string | null;
};

type CrmIntegrationTabProps = {
  hubspot: HubSpotTabStatus | undefined;
  statusLoading: boolean;
  onRefresh: () => Promise<void>;
  urlNotice: string | null;
  oauthConnected: "ok" | "failed" | null;
  /** When true, CRM actions do not call the API (preview / read-only). */
  demoReadOnly?: boolean;
  className?: string;
};

export function CrmIntegrationTab({
  hubspot,
  statusLoading,
  onRefresh,
  urlNotice,
  oauthConnected,
  demoReadOnly = false,
  className,
}: CrmIntegrationTabProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta = integrationsConfig.hubspot;

  const helperText = useMemo(() => {
    if (oauthConnected === "ok") {
      return `${meta.label} connected. All data is fetched.`;
    }
    if (oauthConnected === "failed") {
      return `${meta.label} connected, but first sync failed. Click Sync leads.`;
    }
    if (hubspot?.connected) {
      return `${meta.label} connected. All data is fetched.`;
    }
    return `Connect ${meta.label} first, then click Sync leads to fetch data.`;
  }, [hubspot?.connected, meta.label, oauthConnected]);

  async function fetchHubSpotContacts() {
    if (demoReadOnly) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "100" });
      const response = await fetch(`/api/crm/hubspot/contacts?${params.toString()}`);
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Unable to fetch contacts.");
      }
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong while fetching leads.");
    } finally {
      setLoading(false);
    }
  }

  async function disconnectHubSpot() {
    if (demoReadOnly) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/crm/hubspot/disconnect", { method: "POST" });
      const data = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to disconnect.");
      }
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to disconnect HubSpot.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("flex h-full min-h-0 flex-col gap-4", className)}>
      {urlNotice ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
          {urlNotice}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Card className="flex min-h-[280px] flex-1 flex-col border-border/80 shadow-sm">
        <CardHeader className="shrink-0">
          <div className="mb-2 inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <PlugZap className="size-5" />
          </div>
          <CardTitle>{meta.label}</CardTitle>
          <CardDescription>{meta.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          {statusLoading ? (
            <div className="py-2">
              <DotLoader label="Checking connection status" />
            </div>
          ) : (
            <p
              className={`text-sm ${hubspot?.connected ? "text-emerald-600" : "text-muted-foreground"}`}
            >
              {helperText}
            </p>
          )}
        </CardContent>
        <CardFooter className="mt-auto shrink-0 flex-wrap gap-3">
          {statusLoading ? (
            <DotLoader label="Loading actions" />
          ) : (
            <>
              {hubspot?.connected ? (
                <Button
                  variant="destructive"
                  onClick={() => void disconnectHubSpot()}
                  disabled={loading || demoReadOnly}
                >
                  Disconnect {meta.label}
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    window.location.href = "/api/crm/hubspot/connect";
                  }}
                  disabled={loading || demoReadOnly}
                >
                  Connect {meta.label}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => void fetchHubSpotContacts()}
                disabled={loading || !hubspot?.connected || demoReadOnly}
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Sync leads
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
