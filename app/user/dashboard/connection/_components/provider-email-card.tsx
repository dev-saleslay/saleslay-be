"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Mail } from "lucide-react";

import { cn } from "@/lib/utils";
import { DotLoader } from "@/components/ui/dot-loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type WorkspaceState = "none" | "pending" | "setting_up" | "ready" | "failed";
export type EmailPublicState = "skipped" | "setting_up" | "ready" | "failed";
export type TwilioPublicSource = "none" | "user" | "platform";

export type EmailDeliveryProviderId = "NONE" | "SENDGRID" | "RESEND";

export type ProviderWorkspacePayload = {
  state: WorkspaceState;
  email: EmailPublicState;
  twilio?: { source: TwilioPublicSource; accountSidPreview: string | null };
  sendgridConfigured?: boolean;
  sendgridInboundAddress?: string | null;
  /** Hostname the user saved for SendGrid Inbound Parse (null if only the server default applies). */
  sendgridInboundDomainSaved?: string | null;
  /** Local part for inbound (sl-…); with hostname gives the full parse address. */
  sendgridInboundLocalPart?: string;
  sendgridOutboundFromConfigured?: boolean;
  sendgridUserKeySaved?: boolean;
  sendgridFromEmailSaved?: string | null;
  emailDeliveryProvider?: EmailDeliveryProviderId;
  effectiveEmailDeliveryProvider?: EmailDeliveryProviderId;
  needsEmailProviderChoice?: boolean;
  resendConfigured?: boolean;
  resendDefaultFromConfigured?: boolean;
  resendUserKeySaved?: boolean;
  resendFromEmailSaved?: string | null;
};

type ProviderEmailCardProps = {
  workspace: ProviderWorkspacePayload | null;
  statusLoading: boolean;
  onRefresh?: () => void | Promise<void>;
  /** When true, email provider actions do not call the API (preview / read-only). */
  demoReadOnly?: boolean;
  className?: string;
};

/** Set to true when the Resend option should appear next to SendGrid on this card. */
const SHOW_RESEND_EMAIL_PROVIDER = false;

type Panel = "SENDGRID" | "RESEND";

export function ProviderEmailCard({
  workspace,
  statusLoading,
  onRefresh,
  demoReadOnly = false,
  className,
}: ProviderEmailCardProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>("SENDGRID");
  const [sgKey, setSgKey] = useState("");
  const [sgFrom, setSgFrom] = useState("");
  const [rsKey, setRsKey] = useState("");
  const [rsFrom, setRsFrom] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const didInitPanel = useRef(false);

  /** User-saved keys only — server env fallbacks must not block switching to the other provider. */
  const sendgridOn = workspace?.sendgridUserKeySaved === true;
  const resendOn = workspace?.resendUserKeySaved === true;
  const effective = workspace?.effectiveEmailDeliveryProvider ?? "NONE";
  const sendingReady = workspace?.email === "ready";
  const isSendgridPanel = SHOW_RESEND_EMAIL_PROVIDER ? panel === "SENDGRID" : true;

  const refresh = useCallback(async () => {
    await onRefresh?.();
  }, [onRefresh]);

  useEffect(() => {
    if (statusLoading || !workspace || didInitPanel.current) return;
    didInitPanel.current = true;
    if (SHOW_RESEND_EMAIL_PROVIDER && workspace.effectiveEmailDeliveryProvider === "RESEND") setPanel("RESEND");
  }, [statusLoading, workspace]);

  useEffect(() => {
    if (!SHOW_RESEND_EMAIL_PROVIDER) setPanel("SENDGRID");
  }, []);

  useEffect(() => {
    if (!workspace) return;
    setSgFrom(workspace.sendgridFromEmailSaved ?? "");
    setRsFrom(workspace.resendFromEmailSaved ?? "");
  }, [workspace]);

  const chooseProvider = useCallback(
    async (provider: EmailDeliveryProviderId) => {
      if (demoReadOnly) return;
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/messaging/email/provider", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error || "Could not update.");
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Update failed.");
      } finally {
        setBusy(false);
      }
    },
    [refresh, demoReadOnly],
  );

  function switchPanel(next: Panel) {
    setError(null);
    setTestSuccess(null);
    setTestError(null);
    setTestDialogOpen(false);
    setRemoveDialogOpen(false);
    setPanel(next);
    setSgKey("");
    setRsKey("");
    setShowApiKey(false);
    const configured = next === "SENDGRID" ? sendgridOn : resendOn;
    if (configured) void chooseProvider(next);
  }

  async function save() {
    if (demoReadOnly) return;
    setBusy(true);
    setError(null);
    try {
      if (isSendgridPanel) {
        const body: { apiKey?: string; fromEmail?: string } = {};
        if (sgKey.trim()) body.apiKey = sgKey.trim();
        body.fromEmail = sgFrom.trim();
        const res = await fetch("/api/messaging/email/sendgrid-credentials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error || "Save failed.");
        setSgKey("");
        await refresh();
        await chooseProvider("SENDGRID");
      } else {
        const body: { apiKey?: string; fromEmail?: string } = {};
        if (rsKey.trim()) body.apiKey = rsKey.trim();
        body.fromEmail = rsFrom.trim();
        const res = await fetch("/api/messaging/email/resend-credentials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error || "Save failed.");
        setRsKey("");
        await refresh();
        await chooseProvider("RESEND");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function sendTestEmail() {
    if (demoReadOnly) return;
    setBusy(true);
    setTestSuccess(null);
    setTestError(null);
    try {
      const res = await fetch("/api/messaging/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testTo.trim() ? { to: testTo.trim() } : {}),
      });
      const data = (await res.json()) as { error?: string; to?: string };
      if (!res.ok) throw new Error(data.error || "Test send failed.");
      setTestSuccess(`Sent. Check ${data.to ?? "your inbox"}.`);
      await refresh();
    } catch (e) {
      setTestError(e instanceof Error ? e.message : "Test send failed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (demoReadOnly) return;
    setBusy(true);
    setError(null);
    const wasThisOutbound =
      (isSendgridPanel && effective === "SENDGRID") || (!isSendgridPanel && effective === "RESEND");
    try {
      const url = isSendgridPanel
        ? "/api/messaging/email/sendgrid-credentials"
        : "/api/messaging/email/resend-credentials";
      const res = await fetch(url, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Remove failed.");
      if (isSendgridPanel) {
        setSgKey("");
        setSgFrom("");
      } else {
        setRsKey("");
        setRsFrom("");
      }
      await refresh();
      if (wasThisOutbound) await chooseProvider("NONE");
      setRemoveDialogOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Remove failed.");
      setRemoveDialogOpen(false);
    } finally {
      setBusy(false);
    }
  }

  const canSave = isSendgridPanel
    ? sgKey.trim() || sgFrom.trim()
    : rsKey.trim() || rsFrom.trim();
  const thisSideConfigured = isSendgridPanel ? sendgridOn : resendOn;
  const isLive =
    sendingReady &&
    ((isSendgridPanel && effective === "SENDGRID") || (!isSendgridPanel && effective === "RESEND"));
  const otherProviderLive =
    effective !== "NONE" &&
    ((isSendgridPanel && effective === "RESEND") || (!isSendgridPanel && effective === "SENDGRID"));

  const onlySendgridConnected = sendgridOn && !resendOn;
  const onlyResendConnected = resendOn && !sendgridOn;
  const panelBlocked =
    SHOW_RESEND_EMAIL_PROVIDER &&
    ((onlySendgridConnected && panel === "RESEND") || (onlyResendConnected && panel === "SENDGRID"));
  const showCredentialForm = !panelBlocked && !thisSideConfigured;
  const showConnectedSummary = !panelBlocked && thisSideConfigured;

  const outboundLabel =
    effective === "SENDGRID" ? "SendGrid" : effective === "RESEND" ? "Resend" : null;
  const outboundReady = sendingReady && effective !== "NONE";

  return (
    <div className={cn("flex h-full min-h-0 flex-col gap-4", className)}>
      <Card className="flex min-h-[260px] flex-1 flex-col border-border/80 shadow-sm">
        <CardHeader className="shrink-0">
          <div className="mb-2 inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Mail className="size-5" />
          </div>
          <CardTitle>
            Email{" "}
            <span className="font-normal text-muted-foreground">
              {SHOW_RESEND_EMAIL_PROVIDER ? "(SendGrid or Resend)" : "(SendGrid)"}
            </span>
          </CardTitle>
          <CardDescription>
            {SHOW_RESEND_EMAIL_PROVIDER
              ? "One provider at a time. Remove the current connection before switching."
              : "Connect SendGrid to send outbound email from playbooks and tests."}
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-auto">
          {statusLoading ? (
            <div className="py-2">
              <DotLoader label="Loading" />
            </div>
          ) : !workspace ? (
            <p className="text-sm text-muted-foreground">Could not load status. Refresh the page.</p>
          ) : (
            <div className="space-y-4">
              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <div className="space-y-2 rounded-lg border border-border/70 bg-muted/5 p-3 text-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Outbound</p>
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <span className="shrink-0 text-muted-foreground">Email</span>
                  <span className="min-w-0 text-right sm:text-left">
                    {outboundReady ? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        Ready{outboundLabel ? ` (${outboundLabel})` : ""}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Not connected — add credentials below</span>
                    )}
                  </span>
                </div>
              </div>

              {SHOW_RESEND_EMAIL_PROVIDER ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={panel === "SENDGRID" ? "default" : "outline"}
                    className={cn(
                      "h-11",
                      onlyResendConnected && panel !== "SENDGRID" && "opacity-60",
                    )}
                    disabled={busy || demoReadOnly}
                    onClick={() => switchPanel("SENDGRID")}
                  >
                    SendGrid
                    {effective === "SENDGRID" && sendingReady ? (
                      <span className="ml-1.5 text-[10px] font-normal opacity-90">· sending</span>
                    ) : null}
                  </Button>
                  <Button
                    type="button"
                    variant={panel === "RESEND" ? "default" : "outline"}
                    className={cn(
                      "h-11",
                      onlySendgridConnected && panel !== "RESEND" && "opacity-60",
                    )}
                    disabled={busy || demoReadOnly}
                    onClick={() => switchPanel("RESEND")}
                  >
                    Resend
                    {effective === "RESEND" && sendingReady ? (
                      <span className="ml-1.5 text-[10px] font-normal opacity-90">· sending</span>
                    ) : null}
                  </Button>
                </div>
              ) : (
                <p className="text-sm font-medium text-foreground">
                  SendGrid
                  {effective === "SENDGRID" && sendingReady ? (
                    <span className="ml-2 text-xs font-normal text-emerald-600 dark:text-emerald-400">· ready to send</span>
                  ) : null}
                </p>
              )}

              {panelBlocked ? (
                <div className="space-y-3 rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    {onlySendgridConnected
                      ? "Resend is turned off while SendGrid is connected."
                      : "SendGrid is turned off while Resend is connected."}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Remove the other provider&apos;s connection first, then you can add this one.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={busy || demoReadOnly}
                    onClick={() => switchPanel(onlySendgridConnected ? "SENDGRID" : "RESEND")}
                  >
                    {onlySendgridConnected ? "Open SendGrid" : "Open Resend"}
                  </Button>
                </div>
              ) : null}

              {!panelBlocked && isLive ? (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  Ready to send with {panel === "SENDGRID" ? "SendGrid" : "Resend"}.
                </p>
              ) : null}
              {!panelBlocked && !isLive && otherProviderLive ? (
                <p className="text-xs text-muted-foreground">
                  {SHOW_RESEND_EMAIL_PROVIDER
                    ? "Sending uses the other tab — switch tabs to change, or remove a connection to use the other provider."
                    : "Outbound email is still set to Resend for this account. Save SendGrid below to use SendGrid, or remove the Resend connection when that option is available again."}
                </p>
              ) : null}
              {!panelBlocked && !isLive && !otherProviderLive && showCredentialForm ? (
                <p className="text-xs text-muted-foreground">Add API key and from email, then Save.</p>
              ) : null}

              {showConnectedSummary ? (
                <div className="space-y-3 rounded-lg border border-border/70 bg-muted/10 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">Connected</p>
                    {isLive ? (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">Sends mail</span>
                    ) : null}
                  </div>
                  {(isSendgridPanel ? workspace.sendgridFromEmailSaved : workspace.resendFromEmailSaved) ? (
                    <p className="text-xs">
                      <span className="text-muted-foreground">From </span>
                      <span className="font-mono text-foreground">
                        {isSendgridPanel ? workspace.sendgridFromEmailSaved : workspace.resendFromEmailSaved}
                      </span>
                    </p>
                  ) : (
                    <p className="text-xs text-amber-800 dark:text-amber-200">Add a from-address if you removed it.</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {SHOW_RESEND_EMAIL_PROVIDER
                      ? "API key is saved. Remove the connection to switch to the other provider or enter new credentials."
                      : "API key is saved. Remove the connection to disconnect or enter new credentials."}
                  </p>
                  {isLive ? (
                    <div className="border-t border-border/60 pt-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={busy || demoReadOnly}
                        onClick={() => {
                          setTestSuccess(null);
                          setTestError(null);
                          setTestDialogOpen(true);
                        }}
                      >
                        Send test email
                      </Button>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy || demoReadOnly}
                      onClick={() => setRemoveDialogOpen(true)}
                    >
                      Remove connection
                    </Button>
                  </div>
                </div>
              ) : null}

              {showCredentialForm ? (
                <div className="space-y-3 rounded-lg border border-border/70 p-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="email-api-key">API key</Label>
                    <InputGroup className="h-9">
                      <InputGroupInput
                        id="email-api-key"
                        type={showApiKey ? "text" : "password"}
                        autoComplete="off"
                        spellCheck={false}
                        placeholder={isSendgridPanel ? "SG.…" : "re_…"}
                        value={isSendgridPanel ? sgKey : rsKey}
                        onChange={(e) => (isSendgridPanel ? setSgKey(e.target.value) : setRsKey(e.target.value))}
                        disabled={busy || demoReadOnly}
                        className="font-mono text-sm"
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          aria-label={showApiKey ? "Hide API key" : "Show API key"}
                          aria-pressed={showApiKey}
                          disabled={busy || demoReadOnly}
                          onClick={() => setShowApiKey((v) => !v)}
                        >
                          {showApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email-from">From email</Label>
                    <Input
                      id="email-from"
                      type="email"
                      autoComplete="email"
                      placeholder="you@yourdomain.com"
                      value={isSendgridPanel ? sgFrom : rsFrom}
                      onChange={(e) => (isSendgridPanel ? setSgFrom(e.target.value) : setRsFrom(e.target.value))}
                      disabled={busy || demoReadOnly}
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy || !canSave || demoReadOnly}
                    onClick={() => void save()}
                  >
                    Save
                  </Button>
                </div>
              ) : null}

              {SHOW_RESEND_EMAIL_PROVIDER && sendgridOn && resendOn ? (
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  disabled={busy || demoReadOnly}
                  onClick={() => void chooseProvider("NONE")}
                >
                  Clear which provider sends (pick again after)
                </button>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={testDialogOpen}
        onOpenChange={(open) => {
          setTestDialogOpen(open);
          if (!open) {
            setTestSuccess(null);
            setTestError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Send test email</DialogTitle>
            <DialogDescription>
              Enter the address where you want to receive the test. Leave it blank to use the email on your SalesLay
              account (the one you sign in with).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="dlg-email-test-to">Receive at</Label>
              <Input
                id="dlg-email-test-to"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={testTo}
                onChange={(e) => {
                  setTestTo(e.target.value);
                  setTestSuccess(null);
                  setTestError(null);
                }}
                disabled={busy || demoReadOnly}
              />
              <p className="text-xs text-muted-foreground">
                Subject line: <span className="font-medium text-foreground">SalesLay — email connection test</span>
              </p>
            </div>
            {testSuccess ? (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">{testSuccess}</p>
            ) : null}
            {testError ? <p className="text-sm text-destructive">{testError}</p> : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" disabled={busy} onClick={() => setTestDialogOpen(false)}>
              {testSuccess ? "Close" : "Cancel"}
            </Button>
            <Button type="button" disabled={busy || demoReadOnly} onClick={() => void sendTestEmail()}>
              {testSuccess ? "Send again" : "Send test"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Remove email connection?</DialogTitle>
            <DialogDescription>
              This clears your saved {isSendgridPanel ? "SendGrid" : "Resend"} API key and from-address for this
              account. Outbound email stops using this provider until you connect again (here or via another setup).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" disabled={busy} onClick={() => setRemoveDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" disabled={busy || demoReadOnly} onClick={() => void remove()}>
              Remove connection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
