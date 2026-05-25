# SalesLay PMF Sprint — Summary

**Version:** distilled from PRD v1.0 (April 2026)

---

## Your actual goal

**Prove product–market fit with 20 paying customers at $199/month** by helping US agencies reactivate dead CRM leads fast enough that they see real replies and stay subscribed.

The one outcome that matters for this sprint:

> A US-based agency uploads dead leads, gets a **genuine positive response within 48 hours**, and pays **$199/month** to keep going.

Everything else is secondary until that loop works and you have ~20 accounts.

---

## North Star (how you know it’s working)

**Positive responses per active user per month** — target **5+** by Day 60.

**Counts as positive:** clear intent to engage (e.g. “yes, still interested”, “let’s call”, “send more info”, purchase intent).

**Does not count:** auto-replies, OOO, unsubscribes, vague one-word replies.

---

## Who you’re building for (only this ICP)

| | |
|--|--|
| **Who** | US marketing agency or sales consultancy, 2–10 people |
| **Revenue** | ~$50K–$500K/month |
| **Leads** | 500+ in CRM, mostly untouched after first touch |
| **Stack** | HubSpot first; GHL acceptable |
| **Pain** | Ads + leads, under 10% conversion, no structured follow-up |
| **Budget** | Already on 2+ SaaS tools; $199/mo is not the blocker |

Do not broaden the ICP during this sprint.

---

## Weekly health signals (Level 2)

| Metric | Target |
|--------|--------|
| Time to first positive response | Under 48 hours |
| Time to first sequence launched (signup → live) | Under 30 minutes |
| Sequences launched in first 7 days | More than 2 per user |
| Email open rate (reactivation sequences) | Over 35% |
| Overall reply rate | Over 4% |
| Average lead quality score | Over 6/10 |

**Business outcomes (track, don’t optimize every day):** 20 paying customers, under 10% monthly churn, Sean Ellis over 40% (Day 30/60), MRR over ~$3.8K.

---

## What to ship

### P0 — before charging anyone

- **Lead quality scoring** (0–10): completeness, recency, engagement, source; show score + expected positive rate; **block Tier 3** behind explicit confirmation.
- **AI reply classifier**: Positive / Soft / Neutral / Negative / Auto-reply; keyword first, LLM for ambiguous; powers North Star; log everything.
- **Onboarding under 30 min**: HubSpot OAuth or CSV → map → launch; **no card or company fields before first sequence**.
- **Email + SMS sequences**: multi-step (min 5), timing (e.g. 1/3/7/14/21/30), tokens, unsubscribe.
- **3 pre-built playbooks** (agency, coaching/consulting, generic service) — quality over generic templates.
- **HubSpot**: OAuth, pull cold/dead leads, push reply status, sequence outcome, quality score.
- **Stripe**: $199/mo, 14-day trial, no card at signup, checkout ~Day 12.

### P1 — within ~30 days of launch

North Star dashboard, lead tier labels, low-quality list warning, sequence analytics (by step), RCS channel (A/B vs SMS).

### P2 — only after PMF signal + real demand

Sean Ellis in-app, CSV cleaner, WhatsApp (compliance-gated), deal recovery log / case study prompts.

---

## Do not build (until 20 customers)

LinkedIn/social DMs, phone/voice, full CRM, white-label, AI-generated sequences (vs playbooks), team seats, mobile app, Salesforce, pricing tiers.

---

## Decision filters (every new idea)

1. **PMF:** Does it help the user get their **first positive response faster**?
2. **Positioning:** Does it make SalesLay look like a **CRM, cold outreach, or generic automation**? If yes, skip.
3. **Complexity:** More than **~3 engineering days** with unclear PMF impact? Defer.

---

## 90-day arc (high level)

| Phase | Days | Focus |
|-------|------|--------|
| **Sprint 1** | 1–30 | All P0 live, billing on, manual onboarding, obsess over time-to-first-sequence and time-to-first-positive |
| **Sprint 2** | 31–60 | P1, fix top drop-offs, playbook A/B tests |
| **Sprint 3** | 61–90 | 20 customers, case study, P2 only if requested |

---

## Positioning (one line)

**SalesLay is:** a **reactivation layer** on HubSpot/GHL — recover revenue from dead pipelines.  
**SalesLay is not:** a CRM, cold outreach tool, or full marketing automation suite.

---

## Spec anchors (for implementation)

- **Lead score → tiers:** 8–10 Tier 1 (warm), 5–7 Tier 2 (cold relevant), 0–4 Tier 3 (scraped/cold — warn / confirm).
- **Replies:** classify within ~60s; under 70% confidence → needs review; allow user corrections and log them.
- **Onboarding:** signup (email/password or Google) → connect data → quality scan → pick playbook → light customise → launch; first send within minutes of confirm.

---

*Full detail lives in the confidential PMF PRD v1.0; this file is the working summary.*
