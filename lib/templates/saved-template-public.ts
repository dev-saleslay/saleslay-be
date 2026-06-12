import type { OneMonthTemplate } from "./one-month-templates";

export type PublicSavedTemplate = {
  savedId: string;
  sourceId: OneMonthTemplate["id"];
  savedAt: string;
  senderDisplayName: string | null;
  template: OneMonthTemplate;
};

export function toPublicSavedTemplate(row: {
  id: string;
  sourceId: string;
  template: unknown;
  senderDisplayName: string | null;
  createdAt: Date;
}): PublicSavedTemplate {
  return {
    savedId: row.id,
    sourceId: row.sourceId as OneMonthTemplate["id"],
    savedAt: row.createdAt.toISOString(),
    senderDisplayName: row.senderDisplayName?.trim() || null,
    template: row.template as OneMonthTemplate,
  };
}
