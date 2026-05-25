"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";

import {
  ONE_MONTH_TEMPLATES,
  channelLabel,
  type OneMonthTemplate,
  type OneMonthTemplateStep,
} from "@/app/user/dashboard/templates/_lib/one-month-templates";
import {
  deleteSavedTemplate,
  fetchSavedTemplates,
  saveAlignedTemplate,
  updateSavedTemplate,
  type SavedUserTemplate,
} from "@/app/user/dashboard/templates/_lib/saved-templates-api";
import { applySenderDisplayName } from "@/lib/templates/apply-sender-display-name";
import { MAX_USER_SAVED_TEMPLATES } from "@/lib/templates/max-saved-templates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, FolderOpen, Layers, Library, Mail, MessageSquare, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

function RecipientEmailBlock({
  label,
  subject,
  body,
}: {
  label: string;
  subject: string;
  body: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="rounded-lg border bg-muted/50 ring-1 ring-border/60 dark:bg-slate-900/50">
        <div className="border-b border-border/80 px-3 py-2">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Mail className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span className="font-medium text-foreground">Subject</span>
          </div>
          <p className="mt-1 pl-5 text-sm font-medium text-foreground">{subject}</p>
        </div>
        <div className="px-3 py-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Body (what they read)</p>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">{body}</pre>
        </div>
      </div>
    </div>
  );
}

function RecipientSmsBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex items-start gap-2 rounded-lg border bg-muted/50 p-3 ring-1 ring-border/60 dark:bg-slate-900/50">
        <MessageSquare className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">SMS text (recipient sees)</p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-snug text-foreground">{text}</p>
          <p className="mt-2 text-xs text-muted-foreground">{text.length} characters (approx.)</p>
        </div>
      </div>
    </div>
  );
}

function StepRecipientContent({ row }: { row: OneMonthTemplateStep }) {
  const { email, sms } = row.delivery;
  const isEmailAndSms =
    row.channel === "both" || row.channel === "smart";

  if (!email && !sms) {
    return <p className="text-sm text-muted-foreground">No sample message configured for this step.</p>;
  }

  return (
    <div className="mt-3 space-y-4 border-t border-dashed pt-3">
      {email && sms && isEmailAndSms ? (
        <>
          <RecipientEmailBlock label="Email (recipient sees)" subject={email.subject} body={email.body} />
          <RecipientSmsBlock
            label="SMS (recipient sees — same day when consent allows)"
            text={sms}
          />
        </>
      ) : email && !sms ? (
        <RecipientEmailBlock label="Email (recipient sees)" subject={email.subject} body={email.body} />
      ) : !email && sms ? (
        <RecipientSmsBlock label="SMS (recipient sees)" text={sms} />
      ) : (
        <>
          {email ? <RecipientEmailBlock label="Email (recipient sees)" subject={email.subject} body={email.body} /> : null}
          {sms ? <RecipientSmsBlock label="SMS (recipient sees)" text={sms} /> : null}
        </>
      )}
    </div>
  );
}

type SavedDraftState = {
  template: OneMonthTemplate;
  senderDisplayName: string;
};

function patchSavedTemplateStep(
  template: OneMonthTemplate,
  stepNum: number,
  patch: Partial<{ title: string; summary: string; emailSubject: string; emailBody: string; sms: string }>,
): OneMonthTemplate {
  const next = structuredClone(template);
  const step = next.steps.find((s) => s.step === stepNum);
  if (!step) return next;
  if (patch.title !== undefined) step.title = patch.title;
  if (patch.summary !== undefined) step.summary = patch.summary;
  if (step.delivery.email) {
    if (patch.emailSubject !== undefined) step.delivery.email.subject = patch.emailSubject;
    if (patch.emailBody !== undefined) step.delivery.email.body = patch.emailBody;
  }
  if (patch.sms !== undefined && step.delivery.sms !== null) {
    step.delivery.sms = patch.sms;
  }
  return next;
}

function SavedTemplateEditForm({
  draft,
  onApplyStepPatch,
  onSenderChange,
}: {
  draft: SavedDraftState;
  onApplyStepPatch: (
    stepNum: number,
    patch: Partial<{ title: string; summary: string; emailSubject: string; emailBody: string; sms: string }>,
  ) => void;
  onSenderChange: (value: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/20 p-4">
        <Label htmlFor="saved-sender-name" className="text-sm font-medium">
          Sender name (applies to all{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">{"{{senderName}}"}</code>)
        </Label>
        <Input
          id="saved-sender-name"
          className="mt-2"
          placeholder="Your name as it appears to leads"
          value={draft.senderDisplayName}
          onChange={(e) => onSenderChange(e.target.value)}
          maxLength={200}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Stored on this template. Preview replaces the token everywhere it appears; lead tokens like{" "}
          <code className="rounded bg-muted px-0.5 font-mono text-[0.65rem]">{"{{firstName}}"}</code> stay for send
          time.
        </p>
      </div>

      {draft.template.steps.map((row) => (
        <div key={row.step} className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Step {row.step} — Day {row.day} ({channelLabel(row.channel)})
          </p>
          <div className="mt-3 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Title</Label>
              <Input
                value={row.title}
                onChange={(e) => onApplyStepPatch(row.step, { title: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Summary</Label>
              <Textarea
                value={row.summary}
                onChange={(e) => onApplyStepPatch(row.step, { summary: e.target.value })}
                className="min-h-[4.5rem] resize-y"
              />
            </div>
            {row.delivery.email ? (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">Email subject</Label>
                  <Input
                    value={row.delivery.email.subject}
                    onChange={(e) => onApplyStepPatch(row.step, { emailSubject: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email body</Label>
                  <Textarea
                    value={row.delivery.email.body}
                    onChange={(e) => onApplyStepPatch(row.step, { emailBody: e.target.value })}
                    className="min-h-[10rem] resize-y font-sans text-sm"
                  />
                </div>
              </>
            ) : null}
            {row.delivery.sms !== null ? (
              <div className="space-y-1">
                <Label className="text-xs">SMS</Label>
                <Textarea
                  value={row.delivery.sms}
                  onChange={(e) => onApplyStepPatch(row.step, { sms: e.target.value })}
                  className="min-h-[5rem] resize-y font-sans text-sm"
                />
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function TemplateSequence({
  template,
  footnote,
}: {
  template: OneMonthTemplate;
  footnote?: "library" | "saved";
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30 p-3 sm:p-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Best for: </span>
          {template.bestFor}
        </p>
      </div>
      {footnote === "library" ? (
        <p className="text-xs text-muted-foreground">
          Placeholders for the lead (for example first name) fill in when you send. Saving a playbook stores it in My
          templates and applies your My Company details.
        </p>
      ) : null}
      {footnote === "saved" ? (
        <p className="text-xs text-muted-foreground">
          Your company details are already in this copy. You can edit steps and set how your name appears on sends.
        </p>
      ) : null}
      <ol className="space-y-4">
        {template.steps.map((row) => (
          <li key={row.step} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="font-mono text-xs">
                Day {row.day}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {channelLabel(row.channel)}
              </Badge>
            </div>
            <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Step {row.step} — {row.title}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{row.summary}</p>
            <StepRecipientContent row={row} />
          </li>
        ))}
      </ol>
      <p className="text-xs text-muted-foreground">
        Email + SMS steps send both on the same day when consent allows; otherwise only the email is sent.
      </p>
    </div>
  );
}

function TemplateCard({
  title,
  subtitle,
  stepCount,
  onOpen,
  onRemove,
  removeBusy,
  removeLocked,
  footer,
}: {
  title: string;
  subtitle: string;
  stepCount: number;
  onOpen: () => void;
  /** When set, shows a Remove control (e.g. saved templates on the My templates tab). */
  onRemove?: () => void;
  /** True while this card’s template is being deleted (shows “Removing…”). */
  removeBusy?: boolean;
  /** True while another template is being deleted — disables this Remove button. */
  removeLocked?: boolean;
  footer?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-xl border border-slate-200 bg-card p-5 text-left shadow-sm transition-colors",
        "dark:border-slate-800"
      )}
    >
      <div className="mb-3 inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Layers className="size-5" />
      </div>
      <h2 className="text-base font-semibold leading-snug tracking-tight">{title}</h2>
      <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 font-medium text-foreground">
          <CalendarDays className="size-3.5 shrink-0" />
          30 days
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 font-medium text-foreground">
          {stepCount} steps
        </span>
      </div>
      {footer}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onOpen}>
          View sequence
        </Button>
        {onRemove ? (
          <Button
            type="button"
            variant="outline"
            className="w-full border-destructive/50 text-destructive hover:bg-destructive/10 sm:w-auto"
            disabled={removeBusy || removeLocked}
            onClick={() => onRemove()}
          >
            {removeBusy ? (
              "Removing…"
            ) : (
              <span className="inline-flex items-center gap-2">
                <Trash2 className="size-4 shrink-0" aria-hidden />
                Remove template
              </span>
            )}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function TemplatesPageClient() {
  const [mainTab, setMainTab] = useState("mine");
  const [savedList, setSavedList] = useState<SavedUserTemplate[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSource, setDialogSource] = useState<"library" | "saved">("library");
  const [previewTemplate, setPreviewTemplate] = useState<OneMonthTemplate | null>(null);
  const [activeSavedId, setActiveSavedId] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  /** Inline validation when saving from library dialog — My Company must be saved first. */
  const [alignGateError, setAlignGateError] = useState<null | "company">(null);
  const [listLoading, setListLoading] = useState(true);
  const [savedDraft, setSavedDraft] = useState<SavedDraftState | null>(null);
  const [savedBaseline, setSavedBaseline] = useState<SavedDraftState | null>(null);
  const [savedPanelTab, setSavedPanelTab] = useState<"preview" | "edit">("preview");
  const [savedPersistLoading, setSavedPersistLoading] = useState(false);
  const [removingSavedId, setRemovingSavedId] = useState<string | null>(null);
  /** Syncs with open saved-template dialog for the saved-template picker. */
  const [savedTemplatePicker, setSavedTemplatePicker] = useState("");

  const savedIsDirty = useMemo(
    () =>
      Boolean(
        savedDraft &&
          savedBaseline &&
          (JSON.stringify(savedDraft.template) !== JSON.stringify(savedBaseline.template) ||
            savedDraft.senderDisplayName !== savedBaseline.senderDisplayName),
      ),
    [savedDraft, savedBaseline],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await fetchSavedTemplates();
        if (!cancelled) setSavedList(list);
      } catch {
        if (!cancelled) {
          setActionMessage({ tone: "err", text: "Could not load My templates. Refresh the page." });
        }
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!actionMessage) return;
    const t = window.setTimeout(() => setActionMessage(null), 5000);
    return () => window.clearTimeout(t);
  }, [actionMessage]);

  useEffect(() => {
    if (!dialogOpen) {
      setSavedTemplatePicker("");
      return;
    }
    if (dialogSource === "saved" && activeSavedId) {
      setSavedTemplatePicker(activeSavedId);
    } else {
      setSavedTemplatePicker("");
    }
  }, [dialogOpen, dialogSource, activeSavedId]);

  const openLibrary = useCallback((t: OneMonthTemplate) => {
    setDialogSource("library");
    setPreviewTemplate(t);
    setActiveSavedId(null);
    setSavedDraft(null);
    setSavedBaseline(null);
    setSavedPanelTab("preview");
    setAlignGateError(null);
    setDialogOpen(true);
  }, []);

  const openSaved = useCallback((s: SavedUserTemplate) => {
    const template = structuredClone(s.template);
    const sender = s.senderDisplayName?.trim() ?? "";
    setDialogSource("saved");
    setPreviewTemplate(s.template);
    setActiveSavedId(s.savedId);
    setSavedDraft({ template, senderDisplayName: sender });
    setSavedBaseline({ template: structuredClone(s.template), senderDisplayName: sender });
    setSavedPanelTab("preview");
    setAlignGateError(null);
    setDialogOpen(true);
  }, []);

  const applySavedStepPatch = useCallback(
    (
      stepNum: number,
      patch: Partial<{ title: string; summary: string; emailSubject: string; emailBody: string; sms: string }>,
    ) => {
      setSavedDraft((prev) =>
        prev ? { ...prev, template: patchSavedTemplateStep(prev.template, stepNum, patch) } : prev,
      );
    },
    [],
  );

  const handleAlignAndSave = useCallback(async () => {
    if (!previewTemplate || dialogSource !== "library") return;

    setSaveLoading(true);
    setActionMessage(null);
    setAlignGateError(null);
    try {
      const { usedOpenAI } = await saveAlignedTemplate(previewTemplate.id);
      const list = await fetchSavedTemplates();
      setSavedList(list);
      setActionMessage({
        tone: "ok",
        text: usedOpenAI ? "Saved to My templates with copy tuned for your company." : "Saved to My templates.",
      });
      setDialogOpen(false);
      setMainTab("mine");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong. Try again.";
      if (msg.includes("My Company") || msg.includes("Save information")) setAlignGateError("company");
      else setActionMessage({ tone: "err", text: msg });
    } finally {
      setSaveLoading(false);
    }
  }, [previewTemplate, dialogSource]);

  const handlePersistSaved = useCallback(async () => {
    if (!activeSavedId || !savedDraft) return;
    setSavedPersistLoading(true);
    setActionMessage(null);
    try {
      const updated = await updateSavedTemplate(activeSavedId, {
        template: savedDraft.template,
        senderDisplayName: savedDraft.senderDisplayName.trim() || null,
      });
      setSavedList((prev) => prev.map((x) => (x.savedId === updated.savedId ? updated : x)));
      const nextTemplate = structuredClone(updated.template);
      const nextSender = updated.senderDisplayName?.trim() ?? "";
      setSavedDraft({ template: nextTemplate, senderDisplayName: nextSender });
      setSavedBaseline({ template: structuredClone(updated.template), senderDisplayName: nextSender });
      setPreviewTemplate(updated.template);
      setActionMessage({ tone: "ok", text: "Template saved." });
      setSavedPanelTab("preview");
    } catch (e) {
      setActionMessage({
        tone: "err",
        text: e instanceof Error ? e.message : "Could not save template.",
      });
    } finally {
      setSavedPersistLoading(false);
    }
  }, [activeSavedId, savedDraft]);

  const removeSavedById = useCallback(async (savedId: string) => {
    setRemovingSavedId(savedId);
    setActionMessage(null);
    try {
      await deleteSavedTemplate(savedId);
      const list = await fetchSavedTemplates();
      setSavedList(list);
      setActionMessage({ tone: "ok", text: "Removed from My templates." });
      if (activeSavedId === savedId) {
        setDialogOpen(false);
        setActiveSavedId(null);
        setPreviewTemplate(null);
        setSavedDraft(null);
        setSavedBaseline(null);
      }
    } catch (e) {
      setActionMessage({ tone: "err", text: e instanceof Error ? e.message : "Could not remove template." });
    } finally {
      setRemovingSavedId(null);
    }
  }, [activeSavedId]);

  const handleRemoveSaved = useCallback(() => {
    if (!activeSavedId) return;
    void removeSavedById(activeSavedId);
  }, [activeSavedId, removeSavedById]);

  return (
    <div className="w-full space-y-6">
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          This page is for email and SMS playbooks. Browse the library, save ones you like to My templates, then use them
          in Workflow. Saving fills in your company from the My Company tab.
        </p>
        {actionMessage ? (
          <p
            className={cn(
              "mt-3 text-sm font-medium",
              actionMessage.tone === "ok" ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"
            )}
            role="status"
          >
            {actionMessage.text}
          </p>
        ) : null}
      </section>

      <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
        <TabsList variant="line" className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="mine" className="gap-2">
            <FolderOpen className="size-4" />
            My templates
          </TabsTrigger>
          <TabsTrigger value="browse" className="gap-2">
            <Library className="size-4" />
            Template browser
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mine" className="mt-6 space-y-4">
          {listLoading ? (
            <div className="rounded-xl border bg-muted/20 p-8 text-center">
              <p className="text-sm text-muted-foreground">Loading your templates…</p>
            </div>
          ) : savedList.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center">
              <p className="text-sm text-muted-foreground">
                You have no saved templates yet. Open the Template browser tab, pick a playbook, and save it here.
              </p>
              <Button type="button" className="mt-4" variant="secondary" onClick={() => setMainTab("browse")}>
                Go to Template browser
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <Label htmlFor="saved-template-picker" className="text-sm font-medium">
                  My templates
                </Label>
                <NativeSelect
                  id="saved-template-picker"
                  className="mt-2 w-full max-w-xl"
                  value={savedTemplatePicker}
                  onChange={(e) => {
                    const id = e.target.value;
                    if (!id) return;
                    const s = savedList.find((x) => x.savedId === id);
                    if (s) openSaved(s);
                  }}
                  aria-label="Choose a saved template to open"
                >
                  <NativeSelectOption value="">Choose a template…</NativeSelectOption>
                  {savedList.map((s) => (
                    <NativeSelectOption key={s.savedId} value={s.savedId}>
                      {`${s.template.categoryTitle} (${s.sourceId})`}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {savedList.map((s) => (
                <TemplateCard
                  key={s.savedId}
                  title={s.template.categoryTitle}
                  subtitle={s.template.categorySubtitle}
                  stepCount={s.template.steps.length}
                  onOpen={() => openSaved(s)}
                  onRemove={() => void removeSavedById(s.savedId)}
                  removeBusy={removingSavedId === s.savedId}
                  removeLocked={removingSavedId !== null && removingSavedId !== s.savedId}
                  footer={
                    <p className="mt-3 text-xs text-muted-foreground">
                      Saved {new Date(s.savedAt).toLocaleString()}
                    </p>
                  }
                />
              ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="browse" className="mt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {ONE_MONTH_TEMPLATES.map((t) => (
              <TemplateCard
                key={t.id}
                title={t.categoryTitle}
                subtitle={t.categorySubtitle}
                stepCount={t.steps.length}
                onOpen={() => openLibrary(t)}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setAlignGateError(null);
            setSavedDraft(null);
            setSavedBaseline(null);
            setSavedPanelTab("preview");
          }
        }}
      >
        <DialogContent
          showCloseButton
          className="flex max-h-[min(92vh,800px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 p-0 sm:max-w-3xl"
        >
          <DialogHeader className="shrink-0 space-y-1 border-b px-5 py-4 text-left">
            <DialogTitle className="pr-8 text-lg">{previewTemplate?.categoryTitle ?? "Sequence"}</DialogTitle>
            {previewTemplate ? (
              <DialogDescription className="text-sm">{previewTemplate.categorySubtitle}</DialogDescription>
            ) : null}
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {previewTemplate && dialogSource === "saved" && savedDraft ? (
              <Tabs value={savedPanelTab} onValueChange={(v) => setSavedPanelTab(v as "preview" | "edit")}>
                <TabsList variant="line" className="mb-4 w-full justify-start">
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="edit">Edit</TabsTrigger>
                </TabsList>
                <TabsContent value="preview" className="mt-0 outline-none">
                  <TemplateSequence
                    template={applySenderDisplayName(savedDraft.template, savedDraft.senderDisplayName)}
                    footnote="saved"
                  />
                </TabsContent>
                <TabsContent value="edit" className="mt-0 outline-none">
                  <SavedTemplateEditForm
                    draft={savedDraft}
                    onApplyStepPatch={applySavedStepPatch}
                    onSenderChange={(v) => setSavedDraft((p) => (p ? { ...p, senderDisplayName: v } : p))}
                  />
                </TabsContent>
              </Tabs>
            ) : previewTemplate ? (
              <TemplateSequence
                template={previewTemplate}
                footnote={dialogSource === "library" ? "library" : "saved"}
              />
            ) : null}
          </div>
          {dialogSource === "library" && previewTemplate ? (
            <div className="shrink-0 space-y-3 border-t bg-muted/30 px-5 py-4">
              {alignGateError ? (
                <div
                  className="rounded-lg border border-destructive/35 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                  role="alert"
                >
                  <>
                    The server did not find a saved <strong className="font-semibold">company name</strong> or{" "}
                    <strong className="font-semibold">product name</strong> on My Company. Fill at least one, click{" "}
                    <strong className="font-semibold">Save information</strong>, then try again — unsaved form data is not
                    used for templates.{" "}
                    <Link
                      href="/user/dashboard/my-company"
                      className="font-medium text-destructive underline decoration-destructive/60 underline-offset-2 hover:decoration-destructive"
                    >
                      Open My Company
                    </Link>
                  </>
                </div>
              ) : null}
              {savedList.length >= MAX_USER_SAVED_TEMPLATES ? (
                <div
                  className="rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm text-amber-950 dark:text-amber-100"
                  role="status"
                >
                  You already have {MAX_USER_SAVED_TEMPLATES} saved templates. Remove one from{" "}
                  <strong className="font-medium">My templates</strong> before adding another.
                </div>
              ) : null}
              <Button
                type="button"
                className="w-full sm:w-auto"
                disabled={saveLoading || savedList.length >= MAX_USER_SAVED_TEMPLATES}
                onClick={() => void handleAlignAndSave()}
              >
                {saveLoading ? "Saving…" : "Align with my company & save to My templates"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Requires a saved <strong className="text-foreground">company name</strong> or{" "}
                <strong className="text-foreground">product name</strong> on My Company (click{" "}
                <strong className="text-foreground">Save information</strong>). OpenAI refines copy when configured;
                {" "}
                <code className="text-[0.7rem]">{"{{senderName}}"}</code> and lead tokens stay for send time. Limit:{" "}
                {MAX_USER_SAVED_TEMPLATES} per account.
              </p>
            </div>
          ) : null}
          {dialogSource === "saved" && activeSavedId ? (
            <div className="shrink-0 space-y-3 border-t bg-muted/30 px-5 py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <Button
                  type="button"
                  disabled={savedPersistLoading || !savedIsDirty}
                  onClick={() => void handlePersistSaved()}
                >
                  {savedPersistLoading ? "Saving…" : "Save changes"}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="gap-2 sm:ml-auto"
                  disabled={removingSavedId !== null}
                  onClick={() => void handleRemoveSaved()}
                >
                  <Trash2 className="size-4" />
                  {removingSavedId === activeSavedId ? "Removing…" : "Remove from My templates"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Switch to <strong className="text-foreground">Edit</strong> to change copy or set sender name.{" "}
                <strong className="text-foreground">Save changes</strong> updates your stored template.
              </p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
