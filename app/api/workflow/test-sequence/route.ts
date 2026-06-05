import { NextResponse } from "next/server";

import { parseIncomingSavedTemplate } from "@/lib/templates/parse-saved-template-payload";
import { getAuthenticatedUser } from "@/lib/hubspot";
import { prisma } from "@/lib/prisma";
import { workflowStepOneComplete } from "@/lib/workflow/workflow-progress";
import {
  prepareSavedTemplateForWorkflow,
  runWorkflowTemplateStep,
} from "@/lib/workflow/workflow-template-send";

type Body = { step?: unknown; leadIds?: unknown; savedTemplateId?: unknown };

const MAX_LEADS = 100;

function summarize(results: Awaited<ReturnType<typeof runWorkflowTemplateStep>>["results"], step: 1 | 2) {
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

  if (step === 1) {
    return { emailOk, emailFail, smsOk, smsSkipped, smsFail };
  }
  return { emailOk, emailFail, smsOk, smsSkipped, smsFail };
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body = {};
  try {
    const raw = await request.json();
    if (raw && typeof raw === "object") body = raw as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const stepRaw = body.step;
  const step = stepRaw === 1 || stepRaw === 2 ? stepRaw : null;
  if (!step) {
    return NextResponse.json(
      { error: 'Body must include "step": 1 or 2.' },
      { status: 400 },
    );
  }

  const savedIdRaw = body.savedTemplateId;
  if (typeof savedIdRaw !== "string" || !savedIdRaw.trim()) {
    return NextResponse.json(
      { error: 'Body must include "savedTemplateId" (a My templates id).' },
      { status: 400 },
    );
  }
  const savedTemplateId = savedIdRaw.trim();

  const saved = await prisma.userSavedTemplate.findFirst({
    where: { id: savedTemplateId, userId: user.id },
  });
  if (!saved) {
    return NextResponse.json({ error: "Saved template not found." }, { status: 404 });
  }

  const parsed = parseIncomingSavedTemplate(saved.template);
  if (!parsed) {
    return NextResponse.json({ error: "Stored template is invalid." }, { status: 400 });
  }

  const ready = prepareSavedTemplateForWorkflow(parsed, saved.senderDisplayName);

  const idsRaw = body.leadIds;
  if (!Array.isArray(idsRaw) || idsRaw.length === 0) {
    return NextResponse.json({ error: 'Body must include non-empty "leadIds" (string[]).' }, { status: 400 });
  }

  const leadIds = idsRaw
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim());

  if (leadIds.length === 0) {
    return NextResponse.json({ error: "No valid lead ids in leadIds." }, { status: 400 });
  }

  const uniqueIds = [...new Set(leadIds)];
  if (uniqueIds.length > MAX_LEADS) {
    return NextResponse.json(
      { error: `At most ${MAX_LEADS} leads per request (testing).` },
      { status: 400 },
    );
  }

  const { results, templateStepCount } = await runWorkflowTemplateStep(user.id, step, uniqueIds, ready);
  const resultLeadIds = new Set(results.map((r) => r.leadId));
  const missingLeadIds = uniqueIds.filter((id) => !resultLeadIds.has(id));

  const summary = summarize(results, step);
  const summaryWithMissing = { ...summary, missing: missingLeadIds.length };

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
            data: {
              savedTemplateId: saved.id,
              templateLabel: label,
            },
          });
        } else {
          await prisma.workflowLeadProgress.create({
            data: {
              userId: user.id,
              crmLeadId: r.leadId,
              savedTemplateId: saved.id,
              templateLabel: label,
            },
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

  return NextResponse.json({
    ok: true,
    step,
    templateStepCount,
    results,
    missingLeadIds,
    summary: summaryWithMissing,
  });
}
