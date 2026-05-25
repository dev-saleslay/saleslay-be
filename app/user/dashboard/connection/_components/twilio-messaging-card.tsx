"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, PlugZap, RefreshCw } from "lucide-react";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";

import type { ProviderMessagingHandle } from "./use-provider-messaging";

const TWILIO_CONSOLE = "https://console.twilio.com/";
const TWILIO_AUTH_DOCS = "https://www.twilio.com/docs/iam/api/authtoken";

type TwilioMessagingCardProps = ProviderMessagingHandle & { demoReadOnly?: boolean };

export function TwilioMessagingCard({ demoReadOnly = false, ...m }: TwilioMessagingCardProps) {
  const [showAuthToken, setShowAuthToken] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testBusy, setTestBusy] = useState(false);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const {
    meta,
    statusLoading,
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
    linkedSmsNumber,
    submitConnect,
    disconnectTwilio,
    linkSms,
  } = m;

  async function sendTestSms() {
    if (demoReadOnly) {
      setTestError("This action is not available.");
      return;
    }
    setTestBusy(true);
    setTestSuccess(null);
    setTestError(null);
    try {
      const res = await fetch("/api/messaging/sms/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testTo.trim() }),
      });
      const data = (await res.json()) as { error?: string; to?: string };
      if (!res.ok) throw new Error(data.error || "Test SMS failed.");
      setTestSuccess(`Sent. Check ${data.to ?? "your phone"}.`);
      await loadMessaging({ quiet: true });
    } catch (e) {
      setTestError(e instanceof Error ? e.message : "Test SMS failed.");
    } finally {
      setTestBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Card className="flex h-full min-h-[280px] flex-col border-border/80 shadow-sm">
        <CardHeader className="shrink-0">
          <div className="mb-2 inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <PlugZap className="size-5" />
          </div>
          <CardTitle>
            {meta.label}{" "}
            <span className="font-normal text-muted-foreground">(SMS &amp; RCS)</span>
          </CardTitle>
          <CardDescription>{meta.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 space-y-4">
          {statusLoading ? (
            <div className="py-2">
              <DotLoader label="Checking connection status" />
            </div>
          ) : (
            <>
              <p
                className={`text-sm ${userConnected ? "text-emerald-600" : legacyHosted ? "text-amber-800 dark:text-amber-200" : "text-muted-foreground"}`}
              >
                {helperText}
              </p>

              {userConnected && !legacyHosted ? (
                <div className="space-y-2 rounded-lg border border-border/70 bg-muted/5 p-3 text-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Outbound</p>
                  <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <span className="shrink-0 text-muted-foreground">SMS / RCS</span>
                    <span className="min-w-0 text-right sm:text-left">
                      {phoneConnected ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          Ready — use <strong className="font-medium text-foreground">Send test SMS</strong> below
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          Link a messaging number, then send a test to your phone
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
        <CardFooter className="mt-auto shrink-0 flex-wrap gap-3">
          {statusLoading ? (
            <DotLoader label="Loading actions" />
          ) : (
            <>
              {showDisconnect ? (
                <Button
                  variant="destructive"
                  onClick={() => void disconnectTwilio()}
                  disabled={loading || demoReadOnly}
                >
                  Disconnect {meta.label}
                </Button>
              ) : null}
              {showConnectButton ? (
                <Button
                  onClick={() => {
                    setError(null);
                    setDialogError(null);
                    setDialogOpen(true);
                  }}
                  disabled={loading || demoReadOnly}
                >
                  Connect {meta.label}
                </Button>
              ) : null}
              <Button
                variant="outline"
                onClick={() => void linkSms()}
                disabled={loading || !userConnected || phoneConnected || demoReadOnly}
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Link messaging number
              </Button>
              {phoneConnected ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={loading || demoReadOnly}
                  onClick={() => {
                    setTestSuccess(null);
                    setTestError(null);
                    setTestDialogOpen(true);
                  }}
                >
                  Send test SMS
                </Button>
              ) : null}
            </>
          )}
        </CardFooter>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setDialogError(null);
            setShowAuthToken(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Connect {meta.label} for SMS &amp; RCS</DialogTitle>
            <DialogDescription>
              Use your own Twilio account for SMS and RCS messaging. In{" "}
              <a
                href={TWILIO_CONSOLE}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Twilio Console
              </a>
              , open <strong className="font-medium text-foreground">Account</strong> →{" "}
              <strong className="font-medium text-foreground">API keys & tokens</strong> and copy your live credentials (
              <a
                href={TWILIO_AUTH_DOCS}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-2 hover:underline"
              >
                docs
              </a>
              ).
            </DialogDescription>
          </DialogHeader>
          {dialogError ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {dialogError}
            </p>
          ) : null}
          <div className="grid gap-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="twilio-sid-dialog">Account SID</Label>
              <Input
                id="twilio-sid-dialog"
                autoComplete="off"
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={accountSid}
                onChange={(e) => setAccountSid(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="twilio-token-dialog">Auth Token</Label>
              <InputGroup className="h-9">
                <InputGroupInput
                  id="twilio-token-dialog"
                  type={showAuthToken ? "text" : "password"}
                  autoComplete="off"
                  spellCheck={false}
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                  className="font-mono text-sm"
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    aria-label={showAuthToken ? "Hide auth token" : "Show auth token"}
                    aria-pressed={showAuthToken}
                    disabled={loading}
                    onClick={() => setShowAuthToken((v) => !v)}
                  >
                    {showAuthToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={loading || !accountSid.trim() || !authToken.trim() || demoReadOnly}
              onClick={() => void submitConnect()}
              className="gap-2"
            >
              {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <DialogTitle>Send test SMS</DialogTitle>
            <DialogDescription>
              Sends a short test from your linked Twilio number
              {linkedSmsNumber ? (
                <>
                  {" "}
                  (<span className="font-mono text-foreground">{linkedSmsNumber}</span>)
                </>
              ) : null}
              . Use E.164 format with country code (e.g. +1 for US).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="dlg-sms-test-to">Send to</Label>
              <Input
                id="dlg-sms-test-to"
                type="tel"
                autoComplete="tel"
                placeholder="+15551234567"
                value={testTo}
                onChange={(e) => {
                  setTestTo(e.target.value);
                  setTestSuccess(null);
                  setTestError(null);
                }}
                disabled={testBusy}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Standard carrier rates apply. For trial accounts, the destination may need to be a verified caller ID in
                Twilio.
              </p>
            </div>
            {testSuccess ? (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">{testSuccess}</p>
            ) : null}
            {testError ? <p className="text-sm text-destructive">{testError}</p> : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" disabled={testBusy} onClick={() => setTestDialogOpen(false)}>
              {testSuccess ? "Close" : "Cancel"}
            </Button>
            <Button
              type="button"
              disabled={testBusy || !testTo.trim() || demoReadOnly}
              onClick={() => void sendTestSms()}
            >
              {testSuccess ? "Send again" : "Send test"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
