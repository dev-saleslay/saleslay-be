import type { OneMonthTemplate, OneMonthTemplateStep, TemplateChannel } from "./one-month-templates";

const CHANNELS = new Set<TemplateChannel>(["email", "sms", "both", "smart"]);
const IDS = new Set<OneMonthTemplate["id"]>([
  "agency",
  "coaching",
  "service",
  "nutic",
  "test_email",
  "test_sms",
]);

const MAX_FIELD = 80_000;

function str(v: unknown, max = MAX_FIELD): string | null {
  if (typeof v !== "string") return null;
  if (v.length > max) return null;
  return v;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseStep(raw: unknown): OneMonthTemplateStep | null {
  if (!isRecord(raw)) return null;
  const step = raw.step;
  const day = raw.day;
  const channel = raw.channel;
  if (typeof step !== "number" || typeof day !== "number" || typeof channel !== "string" || !CHANNELS.has(channel as TemplateChannel)) {
    return null;
  }
  const title = str(raw.title, 2000);
  const summary = str(raw.summary, 8000);
  if (title === null || summary === null) return null;

  const deliveryRaw = raw.delivery;
  if (!isRecord(deliveryRaw)) return null;

  let email: { subject: string; body: string } | null = null;
  const e = deliveryRaw.email;
  if (e !== null && e !== undefined) {
    if (!isRecord(e)) return null;
    const subject = str(e.subject);
    const body = str(e.body);
    if (subject === null || body === null) return null;
    email = { subject, body };
  }

  let sms: string | null = null;
  const smsVal = deliveryRaw.sms;
  if (smsVal !== null && smsVal !== undefined) {
    const s = str(smsVal);
    if (s === null) return null;
    sms = s;
  }

  return {
    step,
    day,
    channel: channel as TemplateChannel,
    title,
    summary,
    delivery: { email, sms },
  };
}

/** Accepts user PATCH body; returns null if shape is invalid. */
export function parseIncomingSavedTemplate(raw: unknown): OneMonthTemplate | null {
  if (!isRecord(raw)) return null;
  const id = raw.id;
  if (typeof id !== "string" || !IDS.has(id as OneMonthTemplate["id"])) return null;

  const categoryTitle = str(raw.categoryTitle, 500);
  const categorySubtitle = str(raw.categorySubtitle, 2000);
  const bestFor = str(raw.bestFor, 2000);
  if (categoryTitle === null || categorySubtitle === null || bestFor === null) return null;

  const stepsRaw = raw.steps;
  if (!Array.isArray(stepsRaw) || stepsRaw.length === 0 || stepsRaw.length > 40) return null;

  const steps: OneMonthTemplateStep[] = [];
  for (const s of stepsRaw) {
    const parsed = parseStep(s);
    if (!parsed) return null;
    steps.push(parsed);
  }

  return {
    id: id as OneMonthTemplate["id"],
    categoryTitle,
    categorySubtitle,
    bestFor,
    steps,
  };
}
