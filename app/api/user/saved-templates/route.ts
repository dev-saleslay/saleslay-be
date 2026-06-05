import { NextResponse } from "next/server";

import { ONE_MONTH_TEMPLATES, type OneMonthTemplate } from "@/lib/templates/one-month-templates";
import { alignTemplateWithCompany } from "@/lib/templates/align-template-with-company";
import { getAuthenticatedUser } from "@/lib/hubspot";
import { MAX_USER_SAVED_TEMPLATES } from "@/lib/templates/max-saved-templates";
import {
  effectiveCompanyLabel,
  getMyCompanyTabFields,
  myCompanyFieldsToRichContext,
} from "@/lib/templates/alignment-sources";
import { maybeAlignTemplateWithOpenAI } from "@/lib/templates/openai-align-template";
import { prisma } from "@/lib/prisma";
import { toPublicSavedTemplate } from "@/lib/templates/saved-template-public";

const SOURCE_IDS = new Set<OneMonthTemplate["id"]>([
  "agency",
  "coaching",
  "service",
  "nutic",
  "test_email",
  "test_sms",
]);

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.userSavedTemplate.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    templates: rows.map(toPublicSavedTemplate),
    maxTemplates: MAX_USER_SAVED_TEMPLATES,
  });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { sourceId?: string };
  try {
    body = (await request.json()) as { sourceId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sourceId = typeof body.sourceId === "string" ? body.sourceId.trim() : "";
  if (!SOURCE_IDS.has(sourceId as OneMonthTemplate["id"])) {
    return NextResponse.json({ error: "Invalid sourceId." }, { status: 400 });
  }

  const count = await prisma.userSavedTemplate.count({
    where: { userId: user.id },
  });
  if (count >= MAX_USER_SAVED_TEMPLATES) {
    return NextResponse.json(
      {
        error: `You can save up to ${MAX_USER_SAVED_TEMPLATES} templates. Remove one from My templates to add another.`,
      },
      { status: 409 },
    );
  }

  const source = ONE_MONTH_TEMPLATES.find((t) => t.id === sourceId);
  if (!source) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  const myCompany = await getMyCompanyTabFields(user.id);

  const companyLabel = effectiveCompanyLabel(myCompany);
  if (!companyLabel) {
    return NextResponse.json(
      {
        error:
          "Template alignment needs a saved business name from My Company: add **Company name** or **Product name**, then click **Save information**. Unsaved edits on that page are not stored — the server only reads what you saved.",
      },
      { status: 400 },
    );
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

  return NextResponse.json({
    template: toPublicSavedTemplate(created),
    usedOpenAI: Boolean(process.env.OPENAI_API_KEY?.trim()),
  });
}
