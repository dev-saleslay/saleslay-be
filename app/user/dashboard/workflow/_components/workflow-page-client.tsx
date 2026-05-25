"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { useInboundReconcilePoll } from "@/app/user/dashboard/_hooks/use-inbound-reconcile-poll";
import {
  buildPreviewTestSequenceResponse,
  getPreviewChatThread,
  getPreviewLeadsPage,
  PREVIEW_WORKFLOW_IN_PROGRESS,
  PREVIEW_WORKFLOW_SAVED_TEMPLATES,
  type PreviewChatMessage,
} from "@/app/user/dashboard/dummy";
import {
  fetchSavedTemplates,
  type SavedUserTemplate,
} from "@/app/user/dashboard/templates/_lib/saved-templates-api";
import { isDashboardDummyMode } from "@/config/dashboard-dummy.config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DotLoader } from "@/components/ui/dot-loader";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { MessageSquare, Users } from "lucide-react";

/** Delay before the second playbook step (matches server-driven two-touch flow). */
const FOLLOW_UP_DELAY_MS = 30_000;
const MAX_LEADS_PER_RUN = 100;

type LeadRow = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  externalId: string;
  provider: string;
  lastSyncedAt: string;
};

type LeadResponse = {
  rows?: LeadRow[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  error?: string;
};

type TestSeqResultRow = {
  leadId: string;
  name: string;
  emailTo: string | null;
  email: { ok: boolean; error: string | null };
  sms?: { ok: boolean; error: string | null; skipped: boolean; skipReason: string | null };
};

type TestSeqResponse = {
  ok?: boolean;
  error?: string;
  step?: 1 | 2;
  templateStepCount?: number;
  results?: TestSeqResultRow[];
  missingLeadIds?: string[];
  summary?: Record<string, number>;
};

type InProgressRow = {
  id: string;
  crmLeadId: string;
  savedTemplateId: string;
  templateLabel: string;
  updatedAt: string;
  leadName: string;
  leadEmail: string | null;
  leadPhone: string | null;
  company: string | null;
};

type OutboundMessageRow = {
  id: string;
  channel: "email";
  subject: string | null;
  preview: string;
  toAddress: string;
  fromAddress: string;
  sentAt: string;
};

type SequencePhase = "idle" | "step1" | "wait" | "step2" | "done" | "error";

function formatRunSummaryLine(data: TestSeqResponse, touch: 1 | 2): string {
  const s = data.summary;
  if (touch === 1) {
    const parts: string[] = [];
    const eOk = s?.emailOk ?? 0;
    const eFail = s?.emailFail ?? 0;
    if (eOk + eFail > 0) {
      parts.push(`${eOk} email${eOk === 1 ? "" : "s"} delivered`);
      if (eFail) parts.push(`${eFail} email failure${eFail === 1 ? "" : "s"}`);
    }
    const smsTotal = (s?.smsOk ?? 0) + (s?.smsSkipped ?? 0) + (s?.smsFail ?? 0);
    if (smsTotal > 0) {
      parts.push(`${s?.smsOk ?? 0} SMS sent`);
      if ((s?.smsSkipped ?? 0) > 0) parts.push(`${s?.smsSkipped} SMS skipped`);
      if ((s?.smsFail ?? 0) > 0) parts.push(`${s?.smsFail} SMS failed`);
    }
    if (s?.missing) parts.push(`${s.missing} contact id(s) not found`);
    return `First touch: ${parts.join(" · ") || "complete"}`;
  }
  const parts = [
    `${s?.emailOk ?? 0} email${(s?.emailOk ?? 0) === 1 ? "" : "s"} delivered`,
    (s?.emailFail ?? 0) > 0 ? `${s?.emailFail} email failure${(s?.emailFail ?? 0) === 1 ? "" : "s"}` : null,
    `${s?.smsOk ?? 0} SMS sent`,
    (s?.smsSkipped ?? 0) > 0 ? `${s?.smsSkipped} SMS skipped` : null,
    (s?.smsFail ?? 0) > 0 ? `${s?.smsFail} SMS failed` : null,
    s?.missing ? `${s.missing} contact id(s) not found` : null,
  ].filter(Boolean);
  return `Follow-up touch: ${parts.join(" · ")}`;
}

function smsDetail(r: TestSeqResultRow): string {
  const s = r.sms;
  if (!s) return "—";
  if (s.skipped) return s.skipReason ?? "—";
  if (s.ok) return "—";
  return s.error ?? "—";
}

function EmailStatusBadge({ r }: { r: TestSeqResultRow }) {
  const emailNotUsed = r.email.ok && !r.emailTo && !r.email.error;
  if (emailNotUsed) {
    return (
      <Badge variant="outline" className="font-normal">
        Not used
      </Badge>
    );
  }
  if (r.email.ok) {
    return (
      <Badge variant="secondary" className="border-emerald-500/30 bg-emerald-500/10 font-normal text-emerald-800 dark:text-emerald-300">
        Delivered
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="font-normal">
      Failed
    </Badge>
  );
}

function SmsStatusBadge({ r }: { r: TestSeqResultRow }) {
  const s = r.sms;
  if (!s) return <span className="text-muted-foreground">—</span>;
  if (s.skipped) {
    return (
      <Badge variant="outline" className="font-normal">
        Skipped
      </Badge>
    );
  }
  if (s.ok) {
    return (
      <Badge variant="secondary" className="border-emerald-500/30 bg-emerald-500/10 font-normal text-emerald-800 dark:text-emerald-300">
        Sent
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="font-normal">
      Failed
    </Badge>
  );
}

function WorkflowOutcomePanel({
  title,
  data,
  step,
}: {
  title: string;
  data: TestSeqResponse;
  step: 1 | 2;
}) {
  const rows = data.results ?? [];
  const missing = data.missingLeadIds ?? [];
  const showSmsColumn = step === 2 || rows.some((r) => r.sms !== undefined);

  return (
    <div className="overflow-hidden rounded-xl border bg-card text-sm shadow-sm">
      <div className="border-b bg-muted/50 px-4 py-3">
        <p className="font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Per-contact email and SMS outcome for this touch.</p>
      </div>
      {missing.length > 0 ? (
        <p className="border-b bg-amber-500/5 px-4 py-2 text-xs text-amber-800 dark:text-amber-300">
          These selections are no longer on your account: {missing.join(", ")}
        </p>
      ) : null}
      {rows.length === 0 ? (
        <p className="p-4 text-muted-foreground">No rows returned for this step.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Contact</TableHead>
                <TableHead>Recipient email</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="min-w-[140px]">Email notes</TableHead>
                {showSmsColumn ? (
                  <>
                    <TableHead>SMS</TableHead>
                    <TableHead className="min-w-[160px]">SMS notes</TableHead>
                  </>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const emailNotUsed = r.email.ok && !r.emailTo && !r.email.error;
                return (
                  <TableRow key={r.leadId}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="max-w-[200px] break-all font-mono text-xs">
                      {emailNotUsed ? "—" : (r.emailTo ?? "—")}
                    </TableCell>
                    <TableCell>
                      <EmailStatusBadge r={r} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.email.error ?? "—"}</TableCell>
                    {showSmsColumn ? (
                      <>
                        <TableCell>
                          <SmsStatusBadge r={r} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{smsDetail(r)}</TableCell>
                      </>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export function WorkflowPageClient() {
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [workflowDetailsOpen, setWorkflowDetailsOpen] = useState(false);
  const [sequencePhase, setSequencePhase] = useState<SequencePhase>("idle");
  const [sequenceMessage, setSequenceMessage] = useState<string | null>(null);
  const [sequenceError, setSequenceError] = useState<string | null>(null);
  const [step1Outcome, setStep1Outcome] = useState<TestSeqResponse | null>(null);
  const [finishedRun, setFinishedRun] = useState<{
    step1: TestSeqResponse;
    step2: TestSeqResponse | null;
  } | null>(null);
  const waitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headerSelectRef = useRef<HTMLInputElement>(null);
  const [mainTab, setMainTab] = useState<"leads" | "progress">("leads");
  const [savedList, setSavedList] = useState<SavedUserTemplate[]>([]);
  const [savedLoading, setSavedLoading] = useState(true);
  const [savedTemplateId, setSavedTemplateId] = useState("");
  const [inProgressRows, setInProgressRows] = useState<InProgressRow[]>([]);
  const [inProgressLoading, setInProgressLoading] = useState(false);
  const [msgSheetOpen, setMsgSheetOpen] = useState(false);
  const [msgSheetRow, setMsgSheetRow] = useState<InProgressRow | null>(null);
  const [msgList, setMsgList] = useState<OutboundMessageRow[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [msgError, setMsgError] = useState<string | null>(null);
  const [previewChatExtra, setPreviewChatExtra] = useState<Record<string, PreviewChatMessage[]>>({});
  const [chatDraft, setChatDraft] = useState("");

  const previewChatMerged = useMemo(() => {
    if (!isDashboardDummyMode() || !msgSheetRow) return [];
    const base = getPreviewChatThread(msgSheetRow.crmLeadId);
    const extra = previewChatExtra[msgSheetRow.crmLeadId] ?? [];
    return [...base, ...extra].sort(
      (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
    );
  }, [msgSheetRow?.crmLeadId, previewChatExtra, msgSheetRow]);

  const sequenceBusy =
    sequencePhase === "step1" || sequencePhase === "wait" || sequencePhase === "step2";

  const pageIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedLeadIds.includes(id));
  const somePageSelected = pageIds.some((id) => selectedLeadIds.includes(id));

  useEffect(() => {
    const el = headerSelectRef.current;
    if (el) el.indeterminate = somePageSelected && !allPageSelected;
  }, [somePageSelected, allPageSelected]);

  const selectedCount = selectedLeadIds.length;

  useEffect(() => {
    setSequencePhase("idle");
    setSequenceMessage(null);
    setSequenceError(null);
    setStep1Outcome(null);
    setFinishedRun(null);
    setWorkflowDetailsOpen(false);
    if (waitTimerRef.current) {
      clearTimeout(waitTimerRef.current);
      waitTimerRef.current = null;
    }
  }, [page, pageSize]);

  useEffect(() => {
    if (sequencePhase === "wait" && step1Outcome) {
      setWorkflowDetailsOpen(true);
    }
  }, [sequencePhase, step1Outcome]);

  useEffect(() => {
    if (finishedRun) {
      setWorkflowDetailsOpen(true);
    }
  }, [finishedRun]);

  useEffect(() => {
    return () => {
      if (waitTimerRef.current) clearTimeout(waitTimerRef.current);
    };
  }, []);

  const refreshInProgress = useCallback(async () => {
    if (isDashboardDummyMode()) {
      setInProgressLoading(true);
      setInProgressRows(PREVIEW_WORKFLOW_IN_PROGRESS);
      setInProgressLoading(false);
      return;
    }
    setInProgressLoading(true);
    try {
      const res = await fetch("/api/workflow/in-progress", { cache: "no-store" });
      const data = (await res.json()) as { items?: InProgressRow[] };
      if (res.ok && Array.isArray(data.items)) setInProgressRows(data.items);
      else setInProgressRows([]);
    } catch {
      setInProgressRows([]);
    } finally {
      setInProgressLoading(false);
    }
  }, []);

  const refreshInProgressRef = useRef(refreshInProgress);
  refreshInProgressRef.current = refreshInProgress;
  useInboundReconcilePoll(() => void refreshInProgressRef.current());

  useEffect(() => {
    if (isDashboardDummyMode()) {
      setSavedList(PREVIEW_WORKFLOW_SAVED_TEMPLATES);
      setSavedLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const list = await fetchSavedTemplates();
        if (!cancelled) setSavedList(list);
      } catch {
        if (!cancelled) setSavedList([]);
      } finally {
        if (!cancelled) setSavedLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isDashboardDummyMode()) return;
    if (savedList.length === 0) return;
    setSavedTemplateId((id) => id || savedList[0].savedId);
  }, [savedList]);

  useEffect(() => {
    if (!msgSheetOpen || !msgSheetRow) {
      setMsgList([]);
      setMsgError(null);
      setMsgLoading(false);
      return;
    }

    if (isDashboardDummyMode()) {
      setMsgLoading(false);
      setMsgError(null);
      setMsgList([]);
      return;
    }

    let cancelled = false;
    setMsgLoading(true);
    setMsgError(null);
    void (async () => {
      try {
        const res = await fetch(
          `/api/crm/leads/${encodeURIComponent(msgSheetRow.crmLeadId)}/outbound-messages`,
          { cache: "no-store" },
        );
        const data = (await res.json()) as { messages?: OutboundMessageRow[]; error?: string };
        if (!res.ok) throw new Error(data.error || "Could not load messages.");
        if (!cancelled) setMsgList(data.messages ?? []);
      } catch (e) {
        if (!cancelled) {
          setMsgError(e instanceof Error ? e.message : "Could not load messages.");
          setMsgList([]);
        }
      } finally {
        if (!cancelled) setMsgLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [msgSheetOpen, msgSheetRow]);

  useEffect(() => {
    if (mainTab !== "progress") return;
    void refreshInProgress();
  }, [mainTab, refreshInProgress]);

  useEffect(() => {
    if (isDashboardDummyMode()) {
      setLoading(true);
      setError(null);
      const { rows, total, totalPages } = getPreviewLeadsPage(page, pageSize);
      setRows(rows);
      setTotal(total);
      setTotalPages(totalPages);
      setLoading(false);
      return;
    }

    const fetchLeads = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/crm/leads?page=${page}&pageSize=${pageSize}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as LeadResponse;
        if (!response.ok) {
          throw new Error(data.error || "Failed to load leads.");
        }
        setRows(data.rows ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
      } catch (err) {
        setRows([]);
        setTotal(0);
        setError(err instanceof Error ? err.message : "Failed to load leads.");
      } finally {
        setLoading(false);
      }
    };

    void fetchLeads();
  }, [page, pageSize]);

  const togglePageSelection = () => {
    if (allPageSelected) {
      setSelectedLeadIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedLeadIds((prev) => [...new Set([...prev, ...pageIds])]);
    }
  };

  const toggleOneLead = (leadId: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId],
    );
    setSequenceError(null);
  };

  const onStartWorkflow = () => {
    const unique = [...new Set(selectedLeadIds)].filter(Boolean);
    if (unique.length === 0 || sequenceBusy || !savedTemplateId.trim()) return;
    if (unique.length > MAX_LEADS_PER_RUN) {
      setSequenceError(`Choose at most ${MAX_LEADS_PER_RUN} contacts per run.`);
      return;
    }

    const leadIds = unique;
    const templateId = savedTemplateId.trim();
    setSequenceError(null);
    setStep1Outcome(null);
    setFinishedRun(null);
    setSequencePhase("step1");
    setSequenceMessage("Sending first touch…");

    if (isDashboardDummyMode()) {
      const previewFollowMs = 2500;
      void (async () => {
        try {
          await new Promise((r) => setTimeout(r, 700));
          const data1 = buildPreviewTestSequenceResponse(1, leadIds, templateId);
          void refreshInProgress();

          const templateStepCount = data1.templateStepCount ?? 1;
          if (templateStepCount <= 1) {
            setSequencePhase("done");
            setSequenceMessage(null);
            setFinishedRun({ step1: data1 as TestSeqResponse, step2: null });
            setStep1Outcome(null);
            void refreshInProgress();
            return;
          }

          const firstTouch = data1 as TestSeqResponse;
          setStep1Outcome(firstTouch);
          setSequencePhase("wait");
          setSequenceMessage(
            `${formatRunSummaryLine(firstTouch, 1)}. Follow-up sends automatically in ${previewFollowMs / 1000} seconds. Open the delivery report to review every recipient.`,
          );

          if (waitTimerRef.current) clearTimeout(waitTimerRef.current);
          waitTimerRef.current = setTimeout(() => {
            void (async () => {
              setSequencePhase("step2");
              setSequenceMessage("Sending follow-up touch…");
              try {
                await new Promise((r) => setTimeout(r, 600));
                const data2 = buildPreviewTestSequenceResponse(2, leadIds, templateId);
                setSequencePhase("done");
                setSequenceMessage(null);
                setFinishedRun({ step1: firstTouch, step2: data2 as TestSeqResponse });
                setStep1Outcome(null);
                void refreshInProgress();
              } catch (e) {
                setSequencePhase("error");
                setSequenceMessage(null);
                setSequenceError(e instanceof Error ? e.message : "Follow-up failed.");
              } finally {
                waitTimerRef.current = null;
              }
            })();
          }, previewFollowMs);
        } catch (e) {
          setSequencePhase("error");
          setSequenceMessage(null);
          setSequenceError(e instanceof Error ? e.message : "First touch failed.");
        }
      })();
      return;
    }

    void (async () => {
      try {
        const res1 = await fetch("/api/workflow/test-sequence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ step: 1, leadIds, savedTemplateId: templateId }),
        });
        const data1 = (await res1.json()) as TestSeqResponse;
        if (!res1.ok) {
          throw new Error(data1.error || `First touch failed (${res1.status}).`);
        }

        const templateStepCount = data1.templateStepCount ?? 1;
        void refreshInProgress();

        if (templateStepCount <= 1) {
          setSequencePhase("done");
          setSequenceMessage(null);
          setFinishedRun({ step1: data1, step2: null });
          setStep1Outcome(null);
          void refreshInProgress();
          return;
        }

        setStep1Outcome(data1);
        setSequencePhase("wait");
        setSequenceMessage(
          `${formatRunSummaryLine(data1, 1)}. Follow-up sends automatically in ${FOLLOW_UP_DELAY_MS / 1000} seconds. Open the delivery report to review every recipient.`,
        );

        if (waitTimerRef.current) clearTimeout(waitTimerRef.current);
        waitTimerRef.current = setTimeout(() => {
          void (async () => {
            setSequencePhase("step2");
            setSequenceMessage("Sending follow-up touch…");
            try {
              const res2 = await fetch("/api/workflow/test-sequence", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ step: 2, leadIds, savedTemplateId: templateId }),
              });
              const data2 = (await res2.json()) as TestSeqResponse;
              if (!res2.ok) {
                throw new Error(data2.error || `Follow-up failed (${res2.status}).`);
              }

              setSequencePhase("done");
              setSequenceMessage(null);
              setFinishedRun({ step1: data1, step2: data2 });
              setStep1Outcome(null);
              void refreshInProgress();
            } catch (e) {
              setSequencePhase("error");
              setSequenceMessage(null);
              setSequenceError(e instanceof Error ? e.message : "Follow-up failed.");
            } finally {
              waitTimerRef.current = null;
            }
          })();
        }, FOLLOW_UP_DELAY_MS);
      } catch (e) {
        setSequencePhase("error");
        setSequenceMessage(null);
        setSequenceError(e instanceof Error ? e.message : "First touch failed.");
      }
    })();
  };

  const startDisabled =
    loading ||
    savedLoading ||
    selectedCount === 0 ||
    sequenceBusy ||
    !savedTemplateId.trim() ||
    selectedCount > MAX_LEADS_PER_RUN;

  return (
    <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as "leads" | "progress")} className="w-full">
      <TabsList variant="line" className="grid w-full max-w-lg grid-cols-2">
        <TabsTrigger value="leads">Run playbook</TabsTrigger>
        <TabsTrigger value="progress">In progress</TabsTrigger>
      </TabsList>

      <TabsContent value="leads" className="mt-4 space-y-4">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <Label htmlFor="workflow-saved-template" className="text-sm font-medium">
            Playbook
          </Label>
          <p className="mt-1 text-xs text-muted-foreground">From My templates (aligned and saved).</p>
          <NativeSelect
            id="workflow-saved-template"
            className="mt-3 w-full max-w-xl"
            value={savedTemplateId}
            disabled={savedLoading || sequenceBusy}
            onChange={(e) => setSavedTemplateId(e.target.value)}
            aria-label="Choose saved playbook"
          >
            <NativeSelectOption value="">Select a playbook…</NativeSelectOption>
            {savedList.map((s) => (
              <NativeSelectOption key={s.savedId} value={s.savedId}>
                {s.template.categoryTitle}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {!savedLoading && savedList.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No playbooks saved yet.{" "}
              <Link href="/user/dashboard/templates" className="font-medium text-primary underline underline-offset-2">
                Open Templates
              </Link>{" "}
              and use <strong className="text-foreground">Align &amp; save</strong>.
            </p>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">
              Step 1 sends first; a second step runs automatically after a short delay. One-step playbooks finish after the
              first send.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>
              {loading ? "Loading contacts…" : `${total.toLocaleString()} contact${total === 1 ? "" : "s"} in CRM`}
            </span>
            {selectedCount > 0 ? (
              <Badge variant="secondary" className="font-normal">
                {selectedCount} selected
                {selectedCount > MAX_LEADS_PER_RUN ? ` (max ${MAX_LEADS_PER_RUN} per run)` : ""}
              </Badge>
            ) : null}
            <span className="text-xs text-muted-foreground">Selection persists across pages (up to {MAX_LEADS_PER_RUN} per run).</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="workflow-leads-page-size" className="text-sm text-muted-foreground">
              Per page
            </label>
            <select
              id="workflow-leads-page-size"
              value={pageSize}
              disabled={sequenceBusy}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="h-9 cursor-pointer rounded-md border bg-background px-2 text-sm disabled:opacity-50"
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" disabled={startDisabled} onClick={onStartWorkflow}>
            Run playbook
          </Button>
          {(step1Outcome || finishedRun) && !sequenceBusy ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setWorkflowDetailsOpen(true)}>
              Delivery report
            </Button>
          ) : null}
          {!loading && rows.length > 0 ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={sequenceBusy || pageIds.length === 0}
                onClick={togglePageSelection}
              >
                {allPageSelected ? "Clear page" : "Select all on page"}
              </Button>
              {selectedCount > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={sequenceBusy}
                  onClick={() => setSelectedLeadIds([])}
                >
                  Clear selection
                </Button>
              ) : null}
            </>
          ) : null}
        </div>

        {sequencePhase === "step1" ? (
          <div className="rounded-xl border bg-muted/20 p-4">
            <DotLoader label={sequenceMessage ?? "Sending first touch"} />
          </div>
        ) : null}

        {sequencePhase === "wait" && sequenceMessage ? (
          <p className="rounded-xl border border-dashed bg-muted/10 px-4 py-3 text-sm text-muted-foreground" role="status">
            {sequenceMessage}
          </p>
        ) : null}

        {sequencePhase === "step2" ? (
          <div className="rounded-xl border bg-muted/20 p-4">
            <DotLoader label={sequenceMessage ?? "Sending follow-up"} />
          </div>
        ) : null}

        {sequenceError ? (
          <p className="text-sm text-destructive" role="alert">
            {sequenceError}
          </p>
        ) : null}

        {finishedRun ? (
          <p className="text-sm text-muted-foreground" role="status">
            {formatRunSummaryLine(finishedRun.step1, 1)}
            {finishedRun.step2 ? ` · ${formatRunSummaryLine(finishedRun.step2, 2)}` : ""}
            {" · "}
            <button
              type="button"
              className="font-medium text-primary underline underline-offset-2"
              onClick={() => setWorkflowDetailsOpen(true)}
            >
              Open delivery report
            </button>
          </p>
        ) : null}

        {loading ? (
          <div className="rounded-xl border p-6">
            <DotLoader label="Loading contacts" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border bg-muted/10 p-6 text-sm text-muted-foreground">
            No contacts yet. Connect your CRM under Connection and sync.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-11">
                    <input
                      ref={headerSelectRef}
                      type="checkbox"
                      className="size-4 rounded border-input accent-primary"
                      checked={allPageSelected}
                      disabled={sequenceBusy}
                      onChange={togglePageSelection}
                      aria-label="Select all contacts on this page"
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((lead) => {
                  const fullName = `${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim() || "Unknown";
                  const checked = selectedLeadIds.includes(lead.id);
                  return (
                    <TableRow key={lead.id} className={checked ? "bg-primary/5" : undefined}>
                      <TableCell className="w-11">
                        <input
                          type="checkbox"
                          className="size-4 rounded border-input accent-primary"
                          checked={checked}
                          disabled={sequenceBusy}
                          onChange={() => toggleOneLead(lead.id)}
                          aria-label={`Select ${fullName}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{fullName}</TableCell>
                      <TableCell className="max-w-[200px] break-all text-sm">{lead.email || "—"}</TableCell>
                      <TableCell className="text-sm">{lead.phone || "—"}</TableCell>
                      <TableCell className="text-sm">{lead.company || "—"}</TableCell>
                      <TableCell className="text-sm capitalize text-muted-foreground">{lead.provider.toLowerCase()}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={loading || page <= 1 || sequenceBusy}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            Previous
          </Button>
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={loading || page >= totalPages || sequenceBusy}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          >
            Next
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="progress" className="mt-4 space-y-4">
        <div className="rounded-xl border bg-muted/30 p-5 shadow-sm">
          <div className="flex flex-wrap items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="size-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <h2 className="text-base font-semibold text-foreground">Follow-up queue</h2>
              <p className="text-sm text-muted-foreground">
                Contacts who got the first touch and are waiting for the automated second send. They leave when the
                follow-up completes, if the first touch did not fully succeed, or if they reply inbound.
              </p>
            </div>
          </div>
          {!inProgressLoading && inProgressRows.length > 0 ? (
            <p className="mt-4 text-sm font-medium text-foreground">
              {inProgressRows.length} contact{inProgressRows.length === 1 ? "" : "s"} in queue
            </p>
          ) : null}
        </div>

        {inProgressLoading ? (
          <div className="rounded-xl border p-6">
            <DotLoader label="Loading queue" />
          </div>
        ) : inProgressRows.length === 0 ? (
          <div className="rounded-xl border bg-muted/10 p-8 text-center text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Queue is empty</p>
            <p className="mt-2">Multi-step playbooks list first-touch successes here until the follow-up sends.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Contact</TableHead>
                  <TableHead>Playbook</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Last updated</TableHead>
                  <TableHead className="w-14 text-center">
                    <span className="sr-only">Outbound log</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inProgressRows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.leadName}</TableCell>
                    <TableCell className="max-w-[240px] text-sm leading-snug">{r.templateLabel}</TableCell>
                    <TableCell className="max-w-[200px] break-all font-mono text-xs">{r.leadEmail ?? "—"}</TableCell>
                    <TableCell className="text-sm">{r.leadPhone ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(r.updatedAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={`View outbound messages to ${r.leadName}`}
                        title="Outbound messages"
                        onClick={() => {
                          setMsgSheetRow(r);
                          setMsgSheetOpen(true);
                        }}
                      >
                        <MessageSquare className="size-4" aria-hidden />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={inProgressLoading}
          onClick={() => void refreshInProgress()}
        >
          Refresh queue
        </Button>
      </TabsContent>

      <Dialog open={workflowDetailsOpen} onOpenChange={setWorkflowDetailsOpen}>
        <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-3xl" showCloseButton>
          <DialogHeader>
            <DialogTitle>Delivery report</DialogTitle>
            <DialogDescription>Per-contact email and SMS results for this run.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {finishedRun ? (
              <>
                <WorkflowOutcomePanel title="First touch" data={finishedRun.step1} step={1} />
                {finishedRun.step2 ? (
                  <WorkflowOutcomePanel title="Follow-up touch" data={finishedRun.step2} step={2} />
                ) : null}
                <p className="text-xs text-muted-foreground">
                  {formatRunSummaryLine(finishedRun.step1, 1)}
                  {finishedRun.step2 ? ` · ${formatRunSummaryLine(finishedRun.step2, 2)}` : ""}
                </p>
              </>
            ) : step1Outcome ? (
              <WorkflowOutcomePanel title="First touch" data={step1Outcome} step={1} />
            ) : (
              <p className="text-sm text-muted-foreground">Run a playbook to see delivery details here.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Sheet
        open={msgSheetOpen}
        onOpenChange={(open) => {
          setMsgSheetOpen(open);
          if (!open) {
            setMsgSheetRow(null);
            setMsgList([]);
            setMsgError(null);
            setChatDraft("");
          }
        }}
      >
        <SheetContent side="right" className="flex w-full max-w-full flex-col gap-0 p-0 sm:max-w-lg">
          <SheetHeader className="shrink-0 border-b px-4 py-4">
            <SheetTitle>{isDashboardDummyMode() ? "Conversation" : "Outbound messages"}</SheetTitle>
            <SheetDescription>
              {msgSheetRow && isDashboardDummyMode()
                ? `Sample thread for ${msgSheetRow.leadName}. Your workspace on the right; contact on the left. Messages you send below are added to this preview only (not delivered).`
                : msgSheetRow
                  ? `Outbound email logged for ${msgSheetRow.leadName}${msgSheetRow.leadEmail ? ` (${msgSheetRow.leadEmail})` : ""}. Matches the lead email on file. SMS is not included in this log yet.`
                  : ""}
            </SheetDescription>
          </SheetHeader>

          {isDashboardDummyMode() && msgSheetRow ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
                {previewChatMerged.map((m) => (
                  <div
                    key={m.id}
                    className={cn("flex w-full", m.role === "system" ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[88%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                        m.role === "system"
                          ? "bg-primary text-primary-foreground"
                          : "border border-border/80 bg-muted/60 text-foreground",
                      )}
                    >
                      <p className="text-[10px] font-medium uppercase tracking-wide opacity-80">
                        {m.role === "system" ? "Your workspace" : msgSheetRow.leadName}{" "}
                        <span className="normal-case opacity-70">· {m.channel}</span>
                      </p>
                      {m.role === "system" && m.subject ? (
                        <p className="mt-1 text-xs font-semibold opacity-95">{m.subject}</p>
                      ) : null}
                      <p className="mt-1 whitespace-pre-wrap leading-relaxed">{m.body}</p>
                      <time
                        className="mt-1 block text-[10px] opacity-70"
                        dateTime={m.sentAt}
                      >
                        {new Date(m.sentAt).toLocaleString(undefined, {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </time>
                    </div>
                  </div>
                ))}
              </div>
              <div className="shrink-0 space-y-2 border-t bg-muted/20 px-4 py-3">
                <Label htmlFor="preview-chat-compose" className="text-xs font-medium text-muted-foreground">
                  Send as your workspace (preview only)
                </Label>
                <Textarea
                  id="preview-chat-compose"
                  rows={3}
                  placeholder="Type a message…"
                  value={chatDraft}
                  onChange={(e) => setChatDraft(e.target.value)}
                  className="min-h-[72px] resize-none bg-background text-sm"
                />
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  disabled={!chatDraft.trim()}
                  onClick={() => {
                    if (!msgSheetRow) return;
                    const text = chatDraft.trim();
                    if (!text) return;
                    const leadId = msgSheetRow.crmLeadId;
                    setPreviewChatExtra((prev) => ({
                      ...prev,
                      [leadId]: [
                        ...(prev[leadId] ?? []),
                        {
                          id: `local-${Date.now()}`,
                          role: "system",
                          channel: "email",
                          subject: null,
                          body: text,
                          sentAt: new Date().toISOString(),
                        },
                      ],
                    }));
                    setChatDraft("");
                  }}
                >
                  Send message
                </Button>
              </div>
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {msgLoading ? (
                <DotLoader label="Loading messages" />
              ) : msgError ? (
                <p className="text-sm text-destructive">{msgError}</p>
              ) : msgList.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No logged outbound email to this contact yet. Sends appear here after delivery (SendGrid / Resend).
                </p>
              ) : (
                <ul className="space-y-3">
                  {msgList.map((m) => (
                    <li key={m.id} className="rounded-lg border bg-card p-3 text-sm shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</span>
                        <time className="text-xs text-muted-foreground" dateTime={m.sentAt}>
                          {new Date(m.sentAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </time>
                      </div>
                      <p className="mt-1 font-medium text-foreground">{m.subject || "(No subject)"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        From <span className="font-mono text-foreground/80">{m.fromAddress}</span> →{" "}
                        <span className="font-mono text-foreground/80">{m.toAddress}</span>
                      </p>
                      <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-foreground/90">
                        {m.preview}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </Tabs>
  );
}
