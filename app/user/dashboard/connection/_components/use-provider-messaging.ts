"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { dummyProviderWorkspace, dummySmsNumberStatus } from "@/app/user/dashboard/dummy";
import { integrationsConfig } from "@/config/integrations.config";
import { isDashboardDummyMode } from "@/config/dashboard-dummy.config";

import type { ProviderWorkspacePayload } from "./provider-email-card";

type SmsJson = {
  state?: "blocked" | "none" | "ready";
  phoneNumber?: string | null;
};

export function useProviderMessaging(onPersistedChange?: () => void) {
  const meta = integrationsConfig.twilio;

  const [statusLoading, setStatusLoading] = useState(true);
  const [workspace, setWorkspace] = useState<ProviderWorkspacePayload | null>(null);
  const [sms, setSms] = useState<SmsJson | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");

  const loadMessaging = useCallback(async (options?: { quiet?: boolean }) => {
    const quiet = options?.quiet === true;
    if (!quiet) setStatusLoading(true);
    if (isDashboardDummyMode()) {
      setWorkspace(dummyProviderWorkspace);
      setSms(dummySmsNumberStatus);
      if (!quiet) setStatusLoading(false);
      return;
    }
    try {
      const [wRes, sRes] = await Promise.all([
        fetch("/api/messaging/workspace", { cache: "no-store" }),
        fetch("/api/messaging/sms-number", { cache: "no-store" }),
      ]);
      if (wRes.ok) {
        setWorkspace((await wRes.json()) as ProviderWorkspacePayload);
      } else {
        setWorkspace(null);
      }
      if (sRes.ok) {
        setSms((await sRes.json()) as SmsJson);
      } else {
        setSms(null);
      }
    } catch {
      setWorkspace(null);
      setSms(null);
    } finally {
      if (!quiet) setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMessaging();
  }, [loadMessaging]);

  const state = workspace?.state ?? null;
  const twilioSource = workspace?.twilio?.source ?? "none";
  const accountPreview = workspace?.twilio?.accountSidPreview ?? null;

  const userConnected = state === "ready" && twilioSource === "user";
  const legacyHosted = state === "ready" && twilioSource === "platform";
  const phoneConnected = userConnected && sms?.state === "ready" && Boolean(sms?.phoneNumber);

  const helperText = useMemo(() => {
    if (legacyHosted) {
      return "A legacy hosted Twilio workspace is still linked. Disconnect it below, then connect your own Twilio account for SMS and RCS (Account SID and Auth Token).";
    }
    if (userConnected) {
      if (phoneConnected && sms?.phoneNumber) {
        return `Twilio connected. SMS and RCS use this messaging number: ${sms.phoneNumber}`;
      }
      return accountPreview
        ? `Twilio connected (${accountPreview}). Link a messaging number for SMS and RCS when you’re ready.`
        : "Twilio connected. Link a messaging number for SMS and RCS when you’re ready.";
    }
    if (state === "setting_up" || state === "pending") {
      return "Setup is still in progress. If this doesn’t finish, refresh the page or disconnect and connect again with your Twilio credentials.";
    }
    if (state === "failed") {
      return "Previous setup didn’t finish. Use Connect Twilio with your own Account SID and Auth Token.";
    }
    return "SMS and RCS use one Twilio account. Add your Account SID and Auth Token from the Twilio Console.";
  }, [accountPreview, legacyHosted, meta.label, phoneConnected, sms?.phoneNumber, state, userConnected]);

  const showConnectButton = !userConnected && !legacyHosted;
  const showDisconnect = userConnected || legacyHosted;

  async function submitConnect() {
    if (isDashboardDummyMode()) {
      setDialogError("This action is not available.");
      return;
    }
    setLoading(true);
    setDialogError(null);
    try {
      const res = await fetch("/api/messaging/twilio-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountSid: accountSid.trim(), authToken: authToken.trim() }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        throw new Error(data.message || "Could not connect Twilio.");
      }
      setDialogOpen(false);
      setAccountSid("");
      setAuthToken("");
      await loadMessaging({ quiet: true });
      onPersistedChange?.();
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : "Could not connect Twilio.");
    } finally {
      setLoading(false);
    }
  }

  async function disconnectTwilio() {
    if (isDashboardDummyMode()) {
      setError("This action is not available.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/messaging/workspace", { method: "DELETE" });
      const data = (await res.json()) as { message?: string };
      if (!res.ok && !data.message) {
        throw new Error("Could not disconnect.");
      }
      await loadMessaging({ quiet: true });
      onPersistedChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disconnect.");
    } finally {
      setLoading(false);
    }
  }

  async function linkSms() {
    if (isDashboardDummyMode()) {
      setError("This action is not available.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/messaging/sms-number", { method: "POST" });
      const data = (await res.json()) as { message?: string | null };
      if (!res.ok && !data.message) {
        throw new Error("Could not link an SMS number.");
      }
      await loadMessaging({ quiet: true });
      onPersistedChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not link SMS.");
    } finally {
      setLoading(false);
    }
  }

  const linkedSmsNumber = sms?.state === "ready" ? (sms.phoneNumber ?? null) : null;

  return {
    meta,
    statusLoading,
    workspace,
    linkedSmsNumber,
    loading,
    error,
    setError,
    dialogOpen,
    setDialogOpen,
    dialogError,
    setDialogError,
    accountSid,
    setAccountSid,
    authToken,
    setAuthToken,
    loadMessaging,
    helperText,
    userConnected,
    legacyHosted,
    showConnectButton,
    showDisconnect,
    phoneConnected,
    submitConnect,
    disconnectTwilio,
    linkSms,
  };
}

export type ProviderMessagingHandle = ReturnType<typeof useProviderMessaging>;
