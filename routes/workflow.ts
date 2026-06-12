import { Router } from "express";
import { requireAuth } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { workflowStepOneComplete } from "../lib/workflow/workflow-progress";
import {
  prepareSavedTemplateForWorkflow,
  runWorkflowTemplateStep,
} from "../lib/workflow/workflow-template-send";
import { parseIncomingSavedTemplate } from "../lib/templates/parse-saved-template-payload";

export const workflowRouter = Router();

// GET /api/workflow/in-progress
workflowRouter.get("/in-progress", requireAuth, async (req, res) => {
  const user = req.user!;

  const rows = await prisma.workflowLeadProgress.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      lead: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          company: true,
        },
      },
    },
  });

  const items = rows.map((r) => {
    const ln = `${r.lead.firstName ?? ""} ${r.lead.lastName ?? ""}`.trim() || "Unknown";
    return {
      id: r.id,
      crmLeadId: r.crmLeadId,
      savedTemplateId: r.savedTemplateId,
      templateLabel: r.templateLabel,
      updatedAt: r.updatedAt.toISOString(),
      leadName: ln,
      leadEmail: r.lead.email,
      leadPhone: r.lead.phone,
      company: r.lead.company,
    };
  });

  res.json({ items });
});

const MAX_LEADS = 100;

type WorkflowBody = { step?: unknown; leadIds?: unknown; savedTemplateId?: unknown };

function summarize(results: Awaited<ReturnType<typeof runWorkflowTemplateStep>>["results"]) {
  const emailOk = results.filter((r) => r.email.ok).length;
  const emailFail = results.length - emailOk;
  let smsOk = 0, smsSkipped = 0, smsFail = 0;
  for (const r of results) {
    const s = r.sms;
    if (!s) continue;
    if (s.skipped) smsSkipped += 1;
    else if (s.ok) smsOk += 1;
    else smsFail += 1;
  }
  return { emailOk, emailFail, smsOk, smsSkipped, smsFail };
}

// POST /api/workflow/test-sequence
workflowRouter.post("/test-sequence", requireAuth, async (req, res) => {
  const user = req.user!;

  const body: WorkflowBody = req.body && typeof req.body === "object" ? req.body : {};

  const stepRaw = body.step;
  const step = stepRaw === 1 || stepRaw === 2 ? stepRaw : null;
  if (!step) {
    res.status(400).json({ error: 'Body must include "step": 1 or 2.' });
    return;
  }

  const savedIdRaw = body.savedTemplateId;
  if (typeof savedIdRaw !== "string" || !savedIdRaw.trim()) {
    res.status(400).json({ error: 'Body must include "savedTemplateId" (a My templates id).' });
    return;
  }
  const savedTemplateId = savedIdRaw.trim();

  const saved = await prisma.userSavedTemplate.findFirst({
    where: { id: savedTemplateId, userId: user.id },
  });
  if (!saved) {
    res.status(404).json({ error: "Saved template not found." });
    return;
  }

  const parsed = parseIncomingSavedTemplate(saved.template);
  if (!parsed) {
    res.status(400).json({ error: "Stored template is invalid." });
    return;
  }

  const ready = prepareSavedTemplateForWorkflow(parsed, saved.senderDisplayName);

  const idsRaw = body.leadIds;
  if (!Array.isArray(idsRaw) || idsRaw.length === 0) {
    res.status(400).json({ error: 'Body must include non-empty "leadIds" (string[]).' });
    return;
  }

  const leadIds = idsRaw
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim());

  if (leadIds.length === 0) {
    res.status(400).json({ error: "No valid lead ids in leadIds." });
    return;
  }

  const uniqueIds = [...new Set(leadIds)];
  if (uniqueIds.length > MAX_LEADS) {
    res.status(400).json({ error: `At most ${MAX_LEADS} leads per request (testing).` });
    return;
  }

  const { results, templateStepCount } = await runWorkflowTemplateStep(
    user.id, step, uniqueIds, ready,
  );
  const resultLeadIds = new Set(results.map((r) => r.leadId));
  const missingLeadIds = uniqueIds.filter((id) => !resultLeadIds.has(id));

  const summary = { ...summarize(results), missing: missingLeadIds.length };
  const templateStep0 = ready.steps[0];

  if (step === 1 && templateStepCount >= 2 && templateStep0) {
    for (const r of results) {
      if (workflowStepOneComplete(r, templateStep0)) {
        const existing = await prisma.workflowLeadProgress.findFirst({
          where: { userId: user.id, crmLeadId: r.leadId },
        });
        const label = ready.categoryTitle.slice(0, 500);
        if (existing) {
          await prisma.workflowLeadProgress.update({
            where: { id: existing.id },
            data: { savedTemplateId: saved.id, templateLabel: label },
          });
        } else {
          await prisma.workflowLeadProgress.create({
            data: { userId: user.id, crmLeadId: r.leadId, savedTemplateId: saved.id, templateLabel: label },
          });
        }
      } else {
        await prisma.workflowLeadProgress.deleteMany({
          where: { userId: user.id, crmLeadId: r.leadId },
        });
      }
    }
  }

  if (step === 2) {
    await prisma.workflowLeadProgress.deleteMany({
      where: { userId: user.id, crmLeadId: { in: uniqueIds } },
    });
  }

  res.json({ ok: true, step, templateStepCount, results, missingLeadIds, summary });
});
