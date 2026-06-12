import { Router } from "express";
import { requireAuth } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { reconcileInboundEmailsForUser } from "../lib/lead-ai/reconcile-inbound";
import { parseIncomingSavedTemplate } from "../lib/templates/parse-saved-template-payload";
import { toPublicSavedTemplate } from "../lib/templates/saved-template-public";
import { MAX_USER_SAVED_TEMPLATES } from "../lib/templates/max-saved-templates";
import {
  effectiveCompanyLabel,
  getMyCompanyTabFields,
  myCompanyFieldsToRichContext,
} from "../lib/templates/alignment-sources";
import { maybeAlignTemplateWithOpenAI } from "../lib/templates/openai-align-template";
import { alignTemplateWithCompany } from "../lib/templates/align-template-with-company";
import { ONE_MONTH_TEMPLATES, type OneMonthTemplate } from "../lib/templates/one-month-templates";

export const userRouter = Router();

// POST /api/user/inbound/reconcile
userRouter.post("/inbound/reconcile", requireAuth, async (req, res) => {
  const user = req.user!;

  const pendingInboundBefore = await prisma.emailMessage.count({
    where: {
      userId: user.id,
      direction: "INBOUND",
      inboundLeadHookAt: null,
    },
  });

  const { processed } = await reconcileInboundEmailsForUser(user.id);
  res.json({ ok: true, processed, pendingInboundBefore });
});

const SOURCE_IDS = new Set<OneMonthTemplate["id"]>([
  "agency",
  "coaching",
  "service",
  "nutic",
  "test_email",
  "test_sms",
]);

// GET /api/user/saved-templates
userRouter.get("/saved-templates", requireAuth, async (req, res) => {
  const user = req.user!;

  const rows = await prisma.userSavedTemplate.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  res.json({
    templates: rows.map(toPublicSavedTemplate),
    maxTemplates: MAX_USER_SAVED_TEMPLATES,
  });
});

// POST /api/user/saved-templates
userRouter.post("/saved-templates", requireAuth, async (req, res) => {
  const user = req.user!;

  const body = req.body as { sourceId?: string };
  const sourceId = typeof body.sourceId === "string" ? body.sourceId.trim() : "";

  if (!SOURCE_IDS.has(sourceId as OneMonthTemplate["id"])) {
    res.status(400).json({ error: "Invalid sourceId." });
    return;
  }

  const count = await prisma.userSavedTemplate.count({ where: { userId: user.id } });
  if (count >= MAX_USER_SAVED_TEMPLATES) {
    res.status(409).json({
      error: `You can save up to ${MAX_USER_SAVED_TEMPLATES} templates. Remove one from My templates to add another.`,
    });
    return;
  }

  const source = ONE_MONTH_TEMPLATES.find((t) => t.id === sourceId);
  if (!source) {
    res.status(404).json({ error: "Template not found." });
    return;
  }

  const myCompany = await getMyCompanyTabFields(user.id);
  const companyLabel = effectiveCompanyLabel(myCompany);

  if (!companyLabel) {
    res.status(400).json({
      error:
        "Template alignment needs a saved business name from My Company: add **Company name** or **Product name**, then click **Save information**. Unsaved edits on that page are not stored — the server only reads what you saved.",
    });
    return;
  }

  const rich = myCompanyFieldsToRichContext(myCompany);

  let working = structuredClone(source) as OneMonthTemplate;
  working = await maybeAlignTemplateWithOpenAI(working, rich);
  working = alignTemplateWithCompany(working, {
    ourCompany: companyLabel,
    ourWebsite: myCompany.website,
  });

  const created = await prisma.userSavedTemplate.create({
    data: {
      userId: user.id,
      sourceId,
      template: JSON.parse(JSON.stringify(working)) as object,
    },
  });

  res.json({
    template: toPublicSavedTemplate(created),
    usedOpenAI: Boolean(process.env.OPENAI_API_KEY?.trim()),
  });
});

// PATCH /api/user/saved-templates/:id
userRouter.patch("/saved-templates/:id", requireAuth, async (req, res) => {
  const user = req.user!;
  const id = req.params.id?.trim();

  if (!id) {
    res.status(400).json({ error: "Missing id." });
    return;
  }

  const existing = await prisma.userSavedTemplate.findFirst({
    where: { id, userId: user.id },
    select: { id: true, sourceId: true },
  });

  if (!existing) {
    res.status(404).json({ error: "Not found." });
    return;
  }

  const body = req.body as { template?: unknown; senderDisplayName?: unknown };

  const hasTemplate = body.template !== undefined;
  const hasSender = Object.prototype.hasOwnProperty.call(body, "senderDisplayName");

  if (!hasTemplate && !hasSender) {
    res.status(400).json({ error: "Send template and/or senderDisplayName." });
    return;
  }

  const data: { template?: object; senderDisplayName?: string | null } = {};

  if (hasTemplate) {
    const parsedTemplate = parseIncomingSavedTemplate(body.template);
    if (!parsedTemplate) {
      res.status(400).json({ error: "Invalid template payload." });
      return;
    }
    if (parsedTemplate.id !== existing.sourceId) {
      res.status(400).json({ error: "Template id must match saved source." });
      return;
    }
    data.template = JSON.parse(JSON.stringify(parsedTemplate)) as object;
  }

  if (hasSender) {
    const s = body.senderDisplayName;
    if (s === null || s === undefined) {
      data.senderDisplayName = null;
    } else if (typeof s === "string") {
      const t = s.trim();
      if (t.length > 200) {
        res.status(400).json({ error: "Sender name too long (max 200)." });
        return;
      }
      data.senderDisplayName = t || null;
    } else {
      res.status(400).json({ error: "Invalid senderDisplayName." });
      return;
    }
  }

  const updated = await prisma.userSavedTemplate.update({
    where: { id: existing.id },
    data,
  });

  res.json({ template: toPublicSavedTemplate(updated) });
});

// DELETE /api/user/saved-templates/:id
userRouter.delete("/saved-templates/:id", requireAuth, async (req, res) => {
  const user = req.user!;
  const id = req.params.id?.trim();

  if (!id) {
    res.status(400).json({ error: "Missing id." });
    return;
  }

  const existing = await prisma.userSavedTemplate.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });

  if (!existing) {
    res.status(404).json({ error: "Not found." });
    return;
  }

  await prisma.userSavedTemplate.delete({ where: { id: existing.id } });
  res.json({ ok: true });
});
