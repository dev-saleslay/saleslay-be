import type { OneMonthTemplate } from "@/app/user/dashboard/templates/_lib/one-month-templates";

export type SavedUserTemplate = {
  savedId: string;
  sourceId: OneMonthTemplate["id"];
  savedAt: string;
  /** When set, replaces every `{{senderName}}` in preview (stored copy still keeps the token). */
  senderDisplayName?: string | null;
  template: OneMonthTemplate;
};

export async function fetchSavedTemplates(): Promise<SavedUserTemplate[]> {
  const res = await fetch("/api/user/saved-templates", { cache: "no-store" });
  if (!res.ok) {
    if (res.status === 401) return [];
    throw new Error("Could not load saved templates.");
  }
  const data = (await res.json()) as { templates?: SavedUserTemplate[] };
  const list = Array.isArray(data.templates) ? data.templates : [];
  return list.map((t) => ({
    ...t,
    senderDisplayName: t.senderDisplayName ?? null,
  }));
}

export async function saveAlignedTemplate(
  sourceId: OneMonthTemplate["id"],
): Promise<{ template: SavedUserTemplate; usedOpenAI: boolean }> {
  const res = await fetch("/api/user/saved-templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceId }),
  });
  const data = (await res.json()) as {
    error?: string;
    template?: SavedUserTemplate;
    usedOpenAI?: boolean;
  };
  if (!res.ok) {
    throw new Error(data.error || "Could not save template.");
  }
  if (!data.template) {
    throw new Error("Invalid response from server.");
  }
  return { template: data.template, usedOpenAI: Boolean(data.usedOpenAI) };
}

export async function updateSavedTemplate(
  savedId: string,
  payload: { template: OneMonthTemplate; senderDisplayName: string | null },
): Promise<SavedUserTemplate> {
  const res = await fetch(`/api/user/saved-templates/${encodeURIComponent(savedId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      template: payload.template,
      senderDisplayName: payload.senderDisplayName,
    }),
  });
  const data = (await res.json()) as { error?: string; template?: SavedUserTemplate };
  if (!res.ok) {
    throw new Error(data.error || "Could not update template.");
  }
  if (!data.template) {
    throw new Error("Invalid response from server.");
  }
  return {
    ...data.template,
    senderDisplayName: data.template.senderDisplayName ?? null,
  };
}

export async function deleteSavedTemplate(savedId: string): Promise<void> {
  const res = await fetch(`/api/user/saved-templates/${encodeURIComponent(savedId)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const data = (await res.json()) as { error?: string };
    throw new Error(data.error || "Could not remove template.");
  }
}
