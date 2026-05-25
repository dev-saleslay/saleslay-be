import { NextResponse } from "next/server";

import { parseIncomingSavedTemplate } from "@/app/user/dashboard/templates/_lib/parse-saved-template-payload";
import { getAuthenticatedUser } from "@/lib/hubspot";
import { prisma } from "@/lib/prisma";
import { toPublicSavedTemplate } from "@/lib/templates/saved-template-public";

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: rawId } = await Promise.resolve(context.params);
  if (!rawId?.trim()) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  const id = rawId.trim();

  const existing = await prisma.userSavedTemplate.findFirst({
    where: { id, userId: user.id },
    select: { id: true, sourceId: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  let body: { template?: unknown; senderDisplayName?: unknown };
  try {
    body = (await request.json()) as { template?: unknown; senderDisplayName?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const hasTemplate = body.template !== undefined;
  const hasSender = Object.prototype.hasOwnProperty.call(body, "senderDisplayName");

  if (!hasTemplate && !hasSender) {
    return NextResponse.json({ error: "Send template and/or senderDisplayName." }, { status: 400 });
  }

  const data: { template?: object; senderDisplayName?: string | null } = {};

  if (hasTemplate) {
    const parsedTemplate = parseIncomingSavedTemplate(body.template);
    if (!parsedTemplate) {
      return NextResponse.json({ error: "Invalid template payload." }, { status: 400 });
    }
    if (parsedTemplate.id !== existing.sourceId) {
      return NextResponse.json({ error: "Template id must match saved source." }, { status: 400 });
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
        return NextResponse.json({ error: "Sender name too long (max 200)." }, { status: 400 });
      }
      data.senderDisplayName = t || null;
    } else {
      return NextResponse.json({ error: "Invalid senderDisplayName." }, { status: 400 });
    }
  }

  const updated = await prisma.userSavedTemplate.update({
    where: { id: existing.id },
    data,
  });

  return NextResponse.json({
    template: toPublicSavedTemplate(updated),
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: rawId } = await Promise.resolve(context.params);
  if (!rawId?.trim()) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  const id = rawId.trim();

  const existing = await prisma.userSavedTemplate.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await prisma.userSavedTemplate.delete({
    where: { id: existing.id },
  });

  return NextResponse.json({ ok: true });
}
