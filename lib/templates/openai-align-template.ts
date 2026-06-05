import { cloneOneMonthTemplate } from "@/lib/templates/align-template-with-company";
import type { OneMonthTemplate, OneMonthTemplateStep } from "@/lib/templates/one-month-templates";

export type TemplateAlignRichContext = {
  companyName: string;
  website: string;
  industry?: string;
  companySize?: string;
  productName?: string;
  productCategory?: string;
  productDescription?: string;
  targetAudience?: string;
  uniqueValue?: string;
  pricing?: string;
  notes?: string;
};

type AiStepPatch = {
  step: number;
  title?: string;
  summary?: string;
  delivery?: {
    email?: { subject: string; body: string } | null;
    sms?: string | null;
  };
};

function buildContextBlock(ctx: TemplateAlignRichContext): string {
  const lines = [
    `Company: ${ctx.companyName}`,
    ctx.website ? `Website: ${ctx.website}` : null,
    ctx.industry ? `Industry: ${ctx.industry}` : null,
    ctx.companySize ? `Company size: ${ctx.companySize}` : null,
    ctx.productName ? `Product/service: ${ctx.productName}` : null,
    ctx.productCategory ? `Product category: ${ctx.productCategory}` : null,
    ctx.productDescription ? `Product description: ${ctx.productDescription}` : null,
    ctx.targetAudience ? `Target audience: ${ctx.targetAudience}` : null,
    ctx.uniqueValue ? `Unique value: ${ctx.uniqueValue}` : null,
    ctx.pricing ? `Pricing: ${ctx.pricing}` : null,
    ctx.notes ? `Notes: ${ctx.notes}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

function mergeAiPatches(base: OneMonthTemplate, patches: AiStepPatch[]): OneMonthTemplate {
  const out = cloneOneMonthTemplate(base);
  for (const patch of patches) {
    const i = out.steps.findIndex((s: OneMonthTemplateStep) => s.step === patch.step);
    if (i < 0) continue;
    const step = out.steps[i];
    if (typeof patch.title === "string" && patch.title.trim()) {
      step.title = patch.title.trim();
    }
    if (typeof patch.summary === "string" && patch.summary.trim()) {
      step.summary = patch.summary.trim();
    }
    if (patch.delivery) {
      if (patch.delivery.email !== undefined) {
        if (patch.delivery.email === null) {
          step.delivery.email = null;
        } else if (
          typeof patch.delivery.email.subject === "string" &&
          typeof patch.delivery.email.body === "string"
        ) {
          step.delivery.email = {
            subject: patch.delivery.email.subject,
            body: patch.delivery.email.body,
          };
        }
      }
      if (patch.delivery.sms !== undefined) {
        step.delivery.sms =
          patch.delivery.sms === null || patch.delivery.sms === ""
            ? null
            : String(patch.delivery.sms);
      }
    }
    out.steps[i] = step;
  }
  return out;
}

function stepsShapeOk(original: OneMonthTemplateStep[], merged: OneMonthTemplateStep[]): boolean {
  if (original.length !== merged.length) return false;
  for (let i = 0; i < original.length; i++) {
    if (original[i].step !== merged[i].step || original[i].day !== merged[i].day) return false;
    if (original[i].channel !== merged[i].channel) return false;
  }
  return true;
}

/**
 * When OPENAI_API_KEY is set, asks the model for improved step copy; merges patches onto `template`.
 * On failure or missing key, returns `template` unchanged.
 */
export async function maybeAlignTemplateWithOpenAI(
  template: OneMonthTemplate,
  ctx: TemplateAlignRichContext,
): Promise<OneMonthTemplate> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return template;
  }

  const model = process.env.OPENAI_ALIGN_MODEL?.trim() || "gpt-4o-mini";

  const stepPayload = template.steps.map((s: OneMonthTemplateStep) => ({
    step: s.step,
    day: s.day,
    channel: s.channel,
    title: s.title,
    summary: s.summary,
    delivery: s.delivery,
  }));

  const userPrompt = [
    "You personalize a 30-day reactivation playbook for this business. Return ONLY valid JSON (no markdown).",
    "",
    "BUSINESS CONTEXT:",
    buildContextBlock(ctx),
    "",
    "RULES:",
    "- Output shape: { \"steps\": [ { \"step\": <number>, \"title\"?: string, \"summary\"?: string, \"delivery\"?: { \"email\"?: { \"subject\": string, \"body\": string } | null, \"sms\"?: string | null } } ] }",
    "- Include one object per step number listed below; step numbers must match exactly.",
    "- Do NOT include day or channel in your output (they are ignored).",
    "- Preserve every {{...}} merge token exactly as in the originals (including {{senderName}}, {{ourCompany}}, {{ourWebsite}}, and lead tokens like {{firstName}}, {{company}}, {{industry}}, {{topic}}, {{serviceType}}, {{seasonWindow}}, {{lastInteractionDate}}, {{unsubscribeUrl}}). Do not substitute them with literal names or URLs; do not invent new tokens.",
    "- You may only adjust plain text around those tokens and business-specific wording using the BUSINESS CONTEXT above.",
    "- Keep SMS under ~320 characters when present; include opt-out phrasing where the original did.",
    "- Keep email subjects concise; bodies can be several short paragraphs.",
    "",
    "CURRENT STEPS JSON:",
    JSON.stringify(stepPayload),
  ].join("\n");

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.5,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are an expert B2B sales copy editor. Output only compact JSON. Never use markdown code fences.",
          },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[openai-align-template] OpenAI error:", res.status, errText.slice(0, 500));
      return template;
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) {
      return template;
    }

    const parsed = JSON.parse(raw) as { steps?: AiStepPatch[] };
    if (!Array.isArray(parsed.steps) || parsed.steps.length === 0) {
      return template;
    }

    const merged = mergeAiPatches(template, parsed.steps);
    if (!stepsShapeOk(template.steps, merged.steps)) {
      console.error("[openai-align-template] Merged steps shape mismatch; skipping AI merge.");
      return template;
    }
    return merged;
  } catch (e) {
    console.error("[openai-align-template]", e);
    return template;
  }
}
