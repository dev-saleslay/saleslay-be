import { ONE_MONTH_TEMPLATES } from "@/app/user/dashboard/templates/_lib/one-month-templates";
import type { SavedUserTemplate } from "@/app/user/dashboard/templates/_lib/saved-templates-api";

import { type PreviewCRMLeadRow, previewLeadById } from "./leads.data";

function templateById(id: (typeof ONE_MONTH_TEMPLATES)[number]["id"]) {
  const t = ONE_MONTH_TEMPLATES.find((x) => x.id === id);
  if (!t) throw new Error(`Missing template ${id}`);
  return t;
}

/** Saved playbooks shown in Workflow when dashboard preview is on. */
export const PREVIEW_WORKFLOW_SAVED_TEMPLATES: SavedUserTemplate[] = [
  {
    savedId: "preview-saved-agency",
    sourceId: "agency",
    savedAt: "2026-04-10T12:00:00.000Z",
    senderDisplayName: "Jordan Lee",
    template: templateById("agency"),
  },
  {
    savedId: "preview-saved-coaching",
    sourceId: "coaching",
    savedAt: "2026-04-11T09:30:00.000Z",
    senderDisplayName: "Jordan Lee",
    template: templateById("coaching"),
  },
  {
    savedId: "preview-saved-test-email",
    sourceId: "test_email",
    savedAt: "2026-04-12T15:00:00.000Z",
    senderDisplayName: "Alex Rivera",
    template: templateById("test_email"),
  },
];

export type PreviewTestSeqResultRow = {
  leadId: string;
  name: string;
  emailTo: string | null;
  email: { ok: boolean; error: string | null };
  sms?: { ok: boolean; error: string | null; skipped: boolean; skipReason: string | null };
};

export type PreviewTestSeqResponse = {
  ok: boolean;
  error?: string;
  step?: 1 | 2;
  templateStepCount?: number;
  results?: PreviewTestSeqResultRow[];
  missingLeadIds?: string[];
  summary?: Record<string, number>;
};

function summarizePreview(results: PreviewTestSeqResultRow[], step: 1 | 2) {
  const emailOk = results.filter((r) => r.email.ok).length;
  const emailFail = results.length - emailOk;
  let smsOk = 0;
  let smsSkipped = 0;
  let smsFail = 0;
  for (const r of results) {
    const s = r.sms;
    if (!s) continue;
    if (s.skipped) smsSkipped += 1;
    else if (s.ok) smsOk += 1;
    else smsFail += 1;
  }
  if (step === 1) return { emailOk, emailFail, smsOk, smsSkipped, smsFail };
  return { emailOk, emailFail, smsOk, smsSkipped, smsFail };
}

export function getPreviewTemplateStepCount(savedTemplateId: string): number {
  const s = PREVIEW_WORKFLOW_SAVED_TEMPLATES.find((t) => t.savedId === savedTemplateId);
  return s?.template.steps.length ?? 1;
}

export function buildPreviewTestSequenceResponse(
  step: 1 | 2,
  leadIds: string[],
  savedTemplateId: string,
): PreviewTestSeqResponse {
  const templateStepCount = getPreviewTemplateStepCount(savedTemplateId);
  const unique = [...new Set(leadIds)];
  const resolved = unique.map((id) => previewLeadById(id)).filter(Boolean) as PreviewCRMLeadRow[];
  const missingLeadIds = unique.filter((id) => !previewLeadById(id));

  const results: PreviewTestSeqResultRow[] = resolved.map((lead) => {
    const name = `${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim() || "Unknown";
    const base = {
      leadId: lead.id,
      name,
      emailTo: lead.email,
      email: { ok: true, error: null as string | null },
    };
    if (step === 2) {
      if (lead.phone) {
        return {
          ...base,
          sms: { ok: true, error: null, skipped: false, skipReason: null },
        };
      }
      return {
        ...base,
        sms: {
          ok: false,
          error: null,
          skipped: true,
          skipReason: "No E.164 mobile on record",
        },
      };
    }
    return base;
  });

  const summary = summarizePreview(results, step);
  return {
    ok: true,
    step,
    templateStepCount,
    results,
    missingLeadIds,
    summary: { ...summary, missing: missingLeadIds.length },
  };
}

/** In-progress queue rows for Workflow “In progress” tab. */
export const PREVIEW_WORKFLOW_IN_PROGRESS: Array<{
  id: string;
  crmLeadId: string;
  savedTemplateId: string;
  templateLabel: string;
  updatedAt: string;
  leadName: string;
  leadEmail: string | null;
  leadPhone: string | null;
  company: string | null;
}> = [
  {
    id: "wfprog-1",
    crmLeadId: "pre-lead-003",
    savedTemplateId: "preview-saved-agency",
    templateLabel: "Marketing agency leads",
    updatedAt: "2026-04-18T14:05:00.000Z",
    leadName: "Jordan Patel",
    leadEmail: "jordan.patel@brightlane.co",
    leadPhone: null,
    company: "Brightlane Media",
  },
  {
    id: "wfprog-2",
    crmLeadId: "pre-lead-007",
    savedTemplateId: "preview-saved-coaching",
    templateLabel: "Coaching & consulting",
    updatedAt: "2026-04-18T13:42:00.000Z",
    leadName: "Quinn Foster",
    leadEmail: "quinn.foster@marblehq.com",
    leadPhone: null,
    company: "Marble HQ",
  },
  {
    id: "wfprog-3",
    crmLeadId: "pre-lead-011",
    savedTemplateId: "preview-saved-agency",
    templateLabel: "Marketing agency leads",
    updatedAt: "2026-04-18T11:18:00.000Z",
    leadName: "Reese Walsh",
    leadEmail: "reese.walsh@canvaspeak.com",
    leadPhone: null,
    company: "Canvaspeak",
  },
];

/** Chat-style thread for workflow preview (system = your workspace, user = contact). */
export type PreviewChatMessage = {
  id: string;
  role: "system" | "user";
  channel: "email" | "sms";
  sentAt: string;
  /** Outbound email subject (system only). */
  subject?: string | null;
  body: string;
};

const PREVIEW_CHAT_BY_LEAD: Record<string, PreviewChatMessage[]> = {
  "pre-lead-003": [
    {
      id: "pv-ch-301a",
      role: "system",
      channel: "email",
      subject: "Quick question about Brightlane Media",
      body: "Hi Jordan,\n\nYou reached out a while back about marketing support — I know inboxes get noisy.\n\nAre you still looking to grow pipeline for Brightlane Media, or did priorities shift?\n\n— Jordan Lee",
      sentAt: "2026-04-16T10:00:00.000Z",
    },
    {
      id: "pv-ch-301b",
      role: "user",
      channel: "email",
      body: "Hey — yes still on our side. Can you send a few times for a quick call this week?",
      sentAt: "2026-04-16T15:22:00.000Z",
    },
    {
      id: "pv-ch-301c",
      role: "system",
      channel: "email",
      subject: "Re: Quick question about Brightlane Media",
      body: "Hi Jordan,\n\nAbsolutely — here are three windows (all ET): Tue 2–4pm, Wed 9–11am, Thu 3–5pm. Reply with one and I’ll send a calendar hold.\n\n— Jordan Lee",
      sentAt: "2026-04-16T16:05:00.000Z",
    },
    {
      id: "pv-ch-301d",
      role: "system",
      channel: "email",
      subject: "One result from a team like Brightlane Media",
      body: "Hi Jordan,\n\nFollowing up — we helped a similar shop lift qualified replies from cold leads in about 6 weeks. Worth a quick look, or should I check back next quarter?\n\n— Jordan Lee",
      sentAt: "2026-04-18T14:02:00.000Z",
    },
  ],
  "pre-lead-007": [
    {
      id: "pv-ch-701a",
      role: "system",
      channel: "email",
      subject: "A framework that might help",
      body: "Hi Quinn,\n\nOne thing that’s helped clients like you: pick one outcome for the next 30 days — everything else is noise until that’s stable.\n\n— Jordan Lee",
      sentAt: "2026-04-17T09:15:00.000Z",
    },
    {
      id: "pv-ch-701b",
      role: "user",
      channel: "email",
      body: "Love this framing. We’re heads-down on a launch but I’ll revisit end of month.",
      sentAt: "2026-04-17T11:40:00.000Z",
    },
    {
      id: "pv-ch-701c",
      role: "system",
      channel: "email",
      subject: "Following up after our last chat",
      body: "Hi Quinn,\n\nWe spoke around Q1 about positioning — I imagine things got busy.\n\nIs that goal still on your radar this quarter?\n\n— Jordan Lee",
      sentAt: "2026-04-18T13:38:00.000Z",
    },
    {
      id: "pv-ch-701d",
      role: "user",
      channel: "sms",
      body: "Thanks for the nudge — email is easier for me this week. Will reply there tonight.",
      sentAt: "2026-04-18T13:55:00.000Z",
    },
  ],
  "pre-lead-011": [
    {
      id: "pv-ch-111a",
      role: "system",
      channel: "email",
      subject: "Quick question about Canvaspeak",
      body: "Hi Reese,\n\nAre you still exploring help with pipeline for Canvaspeak?\n\n— Jordan Lee",
      sentAt: "2026-04-17T16:00:00.000Z",
    },
    {
      id: "pv-ch-111b",
      role: "user",
      channel: "email",
      body: "Possibly — send one concrete example of how you’d start with us.",
      sentAt: "2026-04-17T18:30:00.000Z",
    },
    {
      id: "pv-ch-111c",
      role: "system",
      channel: "email",
      subject: "Re: Quick question about Canvaspeak",
      body: "Hi Reese,\n\nHappy to. Week 1 we’d audit your last-touch list + ICP fit, week 2 we launch one playbook to Tier 1–2 only, week 3 we measure replies (not opens). I can paste a one-pager if useful.\n\n— Jordan Lee",
      sentAt: "2026-04-18T09:10:00.000Z",
    },
    {
      id: "pv-ch-111d",
      role: "system",
      channel: "email",
      subject: "Quick question about Canvaspeak",
      body: "Hi Reese,\n\nBumping this — sent you something yesterday about re-engaging old leads for Canvaspeak.\n\nAnything I can clarify in one sentence?\n\n— Jordan Lee",
      sentAt: "2026-04-18T11:12:00.000Z",
    },
  ],
};

export function getPreviewChatThread(crmLeadId: string): PreviewChatMessage[] {
  const list = PREVIEW_CHAT_BY_LEAD[crmLeadId] ?? [];
  return [...list].sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
}

/** @deprecated Use getPreviewChatThread; kept for any legacy preview callers. */
export type PreviewOutboundMessage = {
  id: string;
  channel: "email";
  subject: string | null;
  preview: string;
  toAddress: string;
  fromAddress: string;
  sentAt: string;
};

export function getPreviewOutboundMessages(crmLeadId: string): PreviewOutboundMessage[] {
  return getPreviewChatThread(crmLeadId)
    .filter((m) => m.role === "system" && m.channel === "email")
    .map((m) => ({
      id: m.id,
      channel: "email" as const,
      subject: m.subject ?? null,
      preview: m.body,
      toAddress: "",
      fromAddress: "hello@agency.example",
      sentAt: m.sentAt,
    }));
}
