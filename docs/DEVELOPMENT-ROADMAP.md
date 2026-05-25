# Saleslay — Development Roadmap
** 2.5 months (11 weeks) · Target: 20 paying customers at $199/mo**

---

## Goal

Prove product–market fit: a US agency uploads dead leads, gets a **genuine positive response within 48 hours**, and pays **$199/month** to keep going.

---

## Current State Summary

| Layer | Status |
|---|---|
| Auth (NextAuth, Google + email) | Revamp Required |
| HubSpot OAuth + pull contacts | Done |
| Twilio SMS provisioning + inbound | Changes Require |
| SendGrid email provisioning + inbound parse | Not done fully |
| AI reply generation (OpenAI, email + SMS) | WIP |
| 3 pre-built playbooks (agency, coaching, service) | Mostly Done |
| Template AI alignment with company profile | WIP |
| Inbound email/SMS → AI conversation thread | WIP |
| Sequence step 1 send (email + SMS) | Done |
| Dashboard UI shell + sidebar | Done |
| **Lead quality scoring** | **Not started** |
| **AI reply classifier** | **Not started** |
| **Multi-step sequence scheduler (days 3/7/14/21/30)** | **Not started** |
| **Stripe billing ($199/mo, 14-day trial)** | **Not started** |
| **Onboarding wizard** | **Not started** |
| **CSV lead import** | **Not started** |
| **HubSpot write-back (reply status, score, outcome)** | **Not started** |
| **Unsubscribe / opt-out** | **Not started** |
| **Real dashboard (North Star metrics)** | **Not started — all dummy data** |
| **Infra setup (prod environment)** | **Not started** |

---

## Architecture — Target (Day 1 Separation)

```
saleslay/
  apps/
    web/          ← Next.js (UI + NextAuth + zero business logic)
    api/          ← Hono on Node.js (all routes + webhooks + crons)
  packages/
    database/     ← Prisma schema + generated client (shared)
    core/         ← Business logic: lead-ai, messaging, workflow, templates, hubspot
    types/        ← Shared TypeScript API response types
```

**Auth bridge:** NextAuth already uses `strategy: "jwt"`. `apps/api` verifies the same JWT using the shared `AUTH_SECRET`. No extra auth infrastructure needed.

**Why separate on Day 1:**
- Webhook handlers (Twilio, SendGrid) need always-warm responses — Next.js serverless cold starts cause missed events
- Sequence cron worker can run for minutes — serverless function timeouts kill it
- OpenAI reply call (5–30s) currently runs inside the webhook hot path — this will time out under load
- Clean separation means the two sides evolve independently without merge conflicts

---

## Week 0 — Infrastructure Setup (Pending)

*Must be complete before any code is deployed. Estimated: 3–4 days.*

### 0.1 — Hosting Accounts

| Service | Purpose | Action |
|---|---|---|
| **Vercel** | Host `apps/web` (Next.js) | Create project, link GitHub repo, configure `apps/web` as root |
| **Railway / Fly.io / Render** | Host `apps/api` (Hono) | Create project, set start command `node dist/index.js` |
| **MongoDB Atlas** | Production database | Create M10 cluster (not free tier — M0 has no transactions), get connection string |

### 0.2 — Third-party Service Accounts

| Service | Purpose | Action |
|---|---|---|
| **Stripe** | Billing $199/mo | Create account → Products → create "Saleslay Pro" price ($199/mo recurring) → note `price_id` |
| **SendGrid** | Outbound email + inbound parse | Create account → verify sender domain → enable Inbound Parse → point MX record for inbound domain |
| **Twilio** | SMS sending + receiving | Create account → buy a US phone number → configure SMS webhook URL |
| **HubSpot Developer** | OAuth app for CRM connect | Create developer app → set scopes (`crm.objects.contacts.read`, `crm.objects.contacts.write`) → note `client_id` + `client_secret` |
| **OpenAI** | Lead reply generation + classifier | Create account → generate API key → set usage limits |

### 0.3 — Domain & DNS

| Record | Value | Purpose |
|---|---|---|
| `app.saleslay.com` | Vercel CNAME | `apps/web` |
| `api.saleslay.com` | Railway/Fly CNAME | `apps/api` |
| `inbound.saleslay.com` | SendGrid MX record | Inbound email parse domain |
| `saleslay.com` | Landing page (existing or Vercel) | Marketing |

### 0.4 — Environment Variables

**`apps/web` (Vercel)**

```env
NEXTAUTH_URL=https://app.saleslay.com
NEXTAUTH_SECRET=<generate: openssl rand -base64 32>
AUTH_SECRET=<same as NEXTAUTH_SECRET>
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
NEXT_PUBLIC_API_URL=https://api.saleslay.com
DATABASE_URL=<MongoDB Atlas connection string>
```

**`apps/api` (Railway/Fly)**

```env
AUTH_SECRET=<same value as web AUTH_SECRET — used to verify JWT>
DATABASE_URL=<same MongoDB Atlas connection string>
HUBSPOT_CLIENT_ID=<from HubSpot developer app>
HUBSPOT_CLIENT_SECRET=<from HubSpot developer app>
HUBSPOT_REDIRECT_URI=https://api.saleslay.com/api/crm/hubspot/callback
TWILIO_INBOUND_WEBHOOK_TOKEN=<generate: openssl rand -hex 20>
SALESLAY_PUBLIC_ORIGIN=https://api.saleslay.com
SENDGRID_INBOUND_WEBHOOK_SECRET=<generate: openssl rand -hex 20>
OPENAI_API_KEY=<from OpenAI dashboard>
LEAD_AI_MODEL=gpt-4o-mini
LEAD_AI_AUTO_REPLY=false
MEETING_BOOKING_URL=<Calendly or Cal.com link>
CRON_SECRET=<generate: openssl rand -hex 20>
STRIPE_SECRET_KEY=<from Stripe dashboard>
STRIPE_WEBHOOK_SECRET=<from Stripe webhook setup>
STRIPE_PRICE_ID=<price_id of $199/mo product>
```

### 0.5 — Vercel Cron Config

Create `apps/web/vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sequence-tick",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/reconcile-inbound",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

### 0.6 — Webhook URLs to Register

| Webhook | Register at | URL |
|---|---|---|
| SendGrid inbound email | SendGrid → Settings → Inbound Parse | `https://api.saleslay.com/api/webhooks/sendgrid/inbound?token=<SENDGRID_INBOUND_WEBHOOK_SECRET>` |
| SendGrid email events | SendGrid → Settings → Mail Settings → Event Webhook | `https://api.saleslay.com/api/webhooks/sendgrid/events` |
| Twilio inbound SMS | Twilio → Phone Numbers → your number → Messaging | `https://api.saleslay.com/api/webhooks/twilio/sms?token=<TWILIO_INBOUND_WEBHOOK_TOKEN>` |
| Stripe events | Stripe → Developers → Webhooks | `https://api.saleslay.com/api/webhooks/stripe` |

### 0.7 — CI/CD

| Step | Tool | Config |
|---|---|---|
| Push to `main` → deploy `apps/web` | Vercel GitHub integration | Auto on connect |
| Push to `main` → deploy `apps/api` | Railway GitHub integration or Fly `fly deploy` | Set `rootDir = apps/api` |
| Run `prisma generate` on deploy | Add to `apps/api` build command | `prisma generate && tsc` |

**End of Week 0:** Both services deployed to production URLs. All webhooks registered. Environment variables confirmed. No feature code written yet — but the environment is ready to receive it.

---

## Week 1 — Monorepo Separation + Tech Debt

*Nothing user-facing changes this week. Sets up the structure every future week depends on.*

### Tasks

| Day | Task |
|---|---|
| 1–2 | Turborepo + pnpm workspaces init. Move app into `apps/web/`. Create `packages/database/` (Prisma schema + client). Create `packages/core/` (move all `lib/`). Update all `@/lib/*` imports to `@saleslay/core/*` and `@saleslay/database`. |
| 3 | Create `apps/api/` — Hono, TypeScript, JWT middleware (verifies NextAuth JWT using `AUTH_SECRET`). Migrate all `apps/web/app/api/` route handlers to Hono one-for-one. Delete `apps/web/app/api/` except `/api/auth/*`. |
| 4 | Deploy `apps/api` to Railway/Fly. Update `NEXT_PUBLIC_API_URL` env. Smoke test: HubSpot connect, lead sync, send test email, inbound SMS webhook — all work through the new service. |
| 5 | Tech debt batch: delete duplicate `/api/hubspot/` routes, delete deprecated `/api/leads/` re-export stub, fix `findCrmLeadIdByEmailForUser` (replace JS array filter over all leads with `prisma.crmLead.findFirst({ where: { userId, email } })`), wire `MEETING_BOOKING_URL` from env in `openai-lead-reply.ts`. |

### Milestone
Two deployed services. All existing functionality intact. No duplicate routes. No memory-scan queries.

---

## Week 2 — Lead Quality Scoring

*The onboarding quality scan and Tier 3 block both depend on this.*

### Tasks

| Day | Task |
|---|---|
| 1 | Schema migration: add `score Int?`, `tier String?` (`tier1`/`tier2`/`tier3`), `scoredAt DateTime?` to `CrmLead` in `packages/database`. |
| 2–3 | Scoring function in `packages/core/lead-scoring/score-lead.ts`. Inputs: email present (+2), phone present (+2), company present (+1), HubSpot `lifecyclestage` from `rawData` (subscriber = +1, lead = +2, opportunity = +3), `lastSyncedAt` recency (< 90 days = +2, < 180 days = +1). Max 10. Tiers: 8–10 = Tier 1, 5–7 = Tier 2, 0–4 = Tier 3. Run inside `syncHubSpotContacts`. |
| 4 | `GET /leads` response includes `score`, `tier`. Update `LeadTable` in `apps/web`: Score badge (number, 0–10), Tier chip (Tier 1 = green, Tier 2 = amber, Tier 3 = red). |
| 5 | Tier 3 confirmation modal: when user selects Tier 3 leads and tries to launch a sequence, show "X leads are low quality (score 0–4). Expect lower reply rates. Launch anyway?" Require explicit confirm. |

### Milestone
Every lead in the DB has a score and tier. Lead table shows it. Tier 3 launches are gated.

---

## Week 3 — Sequence Scheduler (Part 1 — Schema + Worker)

*The biggest missing piece. Without it no lead ever gets day 3, 7, 14, 21, or 30 follow-up.*

### Context
All 6 steps (days 1/3/7/14/21/30) are already defined in the template data. The schema and worker to fire them do not exist.

### Tasks

| Day | Task |
|---|---|
| 1 | Schema migration on `WorkflowLeadProgress`: add `currentStep Int @default(1)`, `nextStep Int?`, `nextSendAt DateTime?`, `completedAt DateTime?`, `stoppedReason String?` (`replied` / `unsubscribed` / `manual`). On step 1 success, set `nextStep = 2`, `nextSendAt = now + 2 days`. |
| 2–3 | Sequence worker in `packages/core/workflow/sequence-worker.ts`. Query: `WorkflowLeadProgress` where `nextSendAt <= now AND completedAt IS NULL AND stoppedReason IS NULL`. For each: load saved template, find step at `currentStep + 1`, send (email + SMS per step's delivery config), advance `currentStep`, set `nextSendAt` from `step.day` offset from sequence start, or set `completedAt` if no more steps. |
| 4 | Wire stop-on-reply: in `handleInboundEmailFromPossibleLead` and `handleInboundSmsFromPossibleLead`, replace `workflowLeadProgress.deleteMany` with update to `stoppedReason = "replied"` (preserve history). |
| 5 | `POST /cron/sequence-tick` endpoint in `apps/api`, Bearer-token protected (`CRON_SECRET`). Calls the worker. Add cron to `vercel.json` (hourly). |

### Milestone
Sequences advance automatically. A lead who gets day 1 today gets day 3 in 2 days without manual action. Stop-on-reply works.

---

## Week 4 — Sequence Scheduler (Part 2 — Testing + Unsubscribe)

*Complete the scheduler and close the unsubscribe gap before any real user touches the product.*

### Tasks

| Day | Task |
|---|---|
| 1–2 | End-to-end test: launch sequence on test lead, manually set `nextSendAt` to 1 min from now, trigger cron, verify step 2 sends. Test stop-on-reply. Test graceful skip when lead has no email on step 3. |
| 3 | `UnsubscribeList` model in `packages/database`: `userId`, `email String?`, `phone String?`, `unsubscribedAt`, `source` (`link` / `bounce` / `spam`). Check before every outbound send in the sequence worker — skip and set `stoppedReason = "unsubscribed"` if matched. |
| 4 | Signed unsubscribe token: `packages/core/messaging/unsubscribe-token.ts` generates a short-lived JWT per recipient on each send. Update `merge-workflow-copy.ts` so `{{unsubscribeUrl}}` resolves to a real signed URL (not hardcoded `saleslay.app/preferences`). |
| 5 | Public `GET /unsubscribe?token=<jwt>` page in `apps/web` — no auth required. Verify token, insert into `UnsubscribeList`, show confirmation screen. |

### Milestone
Full 6-step sequences work. Unsubscribe is real and legally sound. Sequences respect opt-outs.

---

## Week 5 — Onboarding Wizard

*Now that scoring and sequences work, build the flow that gets a new user to first send in under 30 minutes.*

### Tasks

| Day | Task |
|---|---|
| 1 | Route `/user/onboarding` in `apps/web`. Middleware: redirect here after first login if no `CrmIntegration` and no `CrmLead` rows exist for the user. Add `onboardedAt DateTime?` to `User`. |
| 2 | Step 1 — Connect data source: HubSpot OAuth button (existing flow, rehoused here) or CSV upload placeholder (CSV implemented in Week 10, button disabled but visible). On HubSpot connect, sync + score runs automatically and user advances. |
| 3 | Step 2 — Quality scan: show tier breakdown (Tier 1/2/3 counts, donut chart). If >40% Tier 3, show warning: "Your list has a high proportion of low-quality leads. Expect lower reply rates." Confirm to proceed. |
| 4 | Step 3 + 4 — Pick playbook + light customise: reuse existing template cards. Only field required: sender display name. No company profile required before first sequence. |
| 5 | Step 5 — Launch: calls `POST /workflow/launch` (wraps existing step-1 send logic), shows send summary (X emails sent, Y SMS sent), redirects to dashboard. Sets `onboardedAt` on `User`. |

### Milestone
New user: signup → onboarding → first email sent in under 30 minutes. No settings page required.

---

## Week 6 — Stripe Billing

*Trial starts at signup. Card prompt at Day 12. Must be in place before any real users.*

### Tasks

| Day | Task |
|---|---|
| 1 | Schema: add `stripeCustomerId String?`, `subscriptionStatus String?` (`trialing` / `active` / `past_due` / `canceled`), `trialEndsAt DateTime?` to `User`. Set `trialEndsAt = createdAt + 14 days` inside `getAuthenticatedUser` upsert on first login. |
| 2–3 | `POST /billing/checkout` in `apps/api`: create Stripe Customer if needed, create Checkout Session ($199/mo, trial period = `trialEndsAt - now`). `POST /webhooks/stripe`: handle `checkout.session.completed` (set `subscriptionStatus = active`), `invoice.payment_failed` (set `past_due`), `customer.subscription.deleted` (set `canceled`). |
| 4 | Subscription gate middleware in `apps/api`: if `subscriptionStatus` is `canceled` and `trialEndsAt < now`, return 402 on all non-billing routes. Dashboard banner in `apps/web`: if `trialEndsAt - now < 2 days`, show "Add your card to keep sequences running" CTA. |
| 5 | `BillingTab` in `apps/web`: current plan, next charge date, Stripe Customer Portal link (`POST /billing/portal`). Replace the current "Coming soon." placeholder. |

### Milestone
Users can pay. Trial gate works. No one gets silently cut off.

---

## Week 7 — AI Reply Classifier

*The North Star metric (positive responses per user per month) cannot be measured without this.*

### Tasks

| Day | Task |
|---|---|
| 1–2 | Keyword-first classifier in `packages/core/lead-ai/classify-reply.ts`. Positive: "yes", "still interested", "let's connect", "send more", "book a call". Negative: "unsubscribe", "remove me", "not interested", "stop emailing". Auto: "out of office", "on vacation", "auto-reply". Returns `{ tone, confidence, method: "keyword" | "llm" }`. |
| 3 | LLM fallback: when keyword confidence < 70%, fire a single-call OpenAI classification request ("classify this reply as one of: positive, soft, neutral, negative, auto_reply — reply with just the word"). Add `classifiedTone String?`, `classifiedAt DateTime?`, `classifiedBy String?` (`keyword` / `llm` / `user`) to `LeadAiConversation`. |
| 4 | Call classifier inside `handleInboundEmailFromPossibleLead` and `handleInboundSmsFromPossibleLead` after logging the message. **Move `LEAD_AI_AUTO_REPLY` OpenAI call out of webhook hot path** — webhook returns 200 immediately, reconcile cron picks up the reply generation asynchronously. Fixes the 30s timeout risk. |
| 5 | `PATCH /leads/:crmLeadId/classification` — user override endpoint. Log `classifiedBy = "user"`. Small "Mark as Positive / Negative" button in the lead conversation view in `apps/web`. |

### Milestone
Every inbound reply is classified within ~60s. Webhook no longer risks timing out on OpenAI. User corrections are logged.

---

## Week 8 — Real Dashboard (North Star Metrics)

*The dashboard is 100% fake data (`DASHBOARD_DUMMY_MODE = true`). Fix it now that classifier and scheduler are running.*

### Tasks

| Day | Task |
|---|---|
| 1 | Set `DASHBOARD_DUMMY_MODE = false`. Delete `app/user/dashboard/dummy/` folder. Use build failures as the real-data checklist. |
| 2–3 | `GET /metrics/overview` in `apps/api`: North Star (positive tone count, last 30 days), reply breakdown by tone (count + %), tier mix (count per tier), active sequence count. Wire to real `DashboardHome` component. |
| 4 | Sequence analytics by step: `GET /metrics/sequence-steps` — for each step 1–6, count sends, count replies, reply rate. Real version of the step chart. Open rate shows "—" until SendGrid events land (Week 9). |
| 5 | Health signals: reply rate (classified replies / total outbound sends), avg lead quality score (mean of `CrmLead.score`), time-to-first-sequence (`onboardedAt - createdAt`). All real. |

### Milestone
No user ever sees fake data. North Star metric is visible and real.

---

## Week 9 — HubSpot Write-back + SendGrid Events

*Close the CRM loop and get real open rate data.*

### Tasks

| Day | Task |
|---|---|
| 1–2 | HubSpot write-back in `packages/core/hubspot/hubspot-write.ts`. On Positive/Soft classification: PATCH contact `lifecyclestage` to `lead` or `opportunity`. On sequence complete with no reply: set custom property `saleslay_outcome = no_response`. On lead import/sync: push `saleslay_score` as a custom property. Uses existing token refresh. |
| 3 | `POST /webhooks/sendgrid/events` in `apps/api`. Handle `open`, `click`, `bounce`, `spam_report`. Match by `X-Message-Id` (stored as `providerId` on `EmailMessage`). Add `openedAt DateTime?`, `bouncedAt DateTime?` to `EmailMessage`. |
| 4 | Wire open rate into sequence analytics: `openedAt IS NOT NULL / total outbound sends per step`. Dashboard open rate health signal is now real (target > 35%). |
| 5 | Auto-unsubscribe on bounce/spam: insert sender's email into `UnsubscribeList` (`source = "bounce"` / `source = "spam"`). Sequence worker respects this on next tick. |

### Milestone
HubSpot shows reply outcomes. Open rate is real. Bounced addresses auto-unsubscribe.

---

## Week 10 — CSV Lead Import

*Second data source. Safely deferred until everything else works.*

### Tasks

| Day | Task |
|---|---|
| 1–2 | `POST /leads/import/csv` in `apps/api`: accepts multipart CSV, parses headers, returns column names + first 5 rows for mapping preview. `POST /leads/import/csv/confirm`: accepts column mapping + parsed rows, validates (email format, E.164 phone), bulk-inserts into `CrmLead` with `provider = "CSV"` (add to enum), runs scorer on each row. Max 2000 rows per upload. |
| 3 | Upload UI in `apps/web`: drag-and-drop CSV dropzone, calls import endpoint, shows returned headers. |
| 4 | Column mapping screen: for each CSV header, dropdown to assign to `firstName` / `lastName` / `email` / `phone` / `company` / skip. Preview table shows merged values for 5 sample rows. |
| 5 | Confirm → import → redirect to quality scan (same component used in onboarding). Wire into onboarding Step 1 as the second option alongside HubSpot. |

### Milestone
Users without HubSpot can use the product. Onboarding Step 1 has two real paths.

---

## Week 11 — QA, Polish & Buffer

*Half a week of planned buffer. Treat unplanned slippage from any earlier week as coming from here.*

### Tasks

| Day | Task |
|---|---|
| 1–2 | End-to-end QA: signup → onboarding → HubSpot connect → quality scan → pick playbook → launch. Verify all 6 sequence steps advance. Verify unsubscribe works. Verify Stripe trial → checkout → active. |
| 3 | Edge cases: lead with no email on step 3 (skip gracefully), HubSpot token expired mid-sequence (refresh + retry), Stripe webhook replay (idempotency check on `subscriptionStatus` upsert). |
| 4 | Performance: add DB index on `WorkflowLeadProgress.nextSendAt`. Score batching for large lead lists (>500 rows, batch of 50 to avoid timeout). |
| 5 | Buffer — absorb any slippage from weeks 1–10. If none, begin P1: low-quality list warning banner, sequence A/B toggle, `vercel.json` cron monitoring. |

---

## Tech Debt Register

Items to fix as part of the work they touch, not as separate tasks.

| Item | Fix In | Detail |
|---|---|---|
| `DASHBOARD_DUMMY_MODE = true` hardcoded | Week 8 | Flip flag, delete `dashboard/dummy/` folder |
| Duplicate HubSpot routes at `/api/hubspot/` and `/api/crm/hubspot/` | Week 1 | Delete old `/api/hubspot/` set |
| Deprecated `/api/leads/route.ts` re-export stub | Week 1 | Delete file |
| `findCrmLeadIdByEmailForUser` loads all leads into JS memory | Week 1 | Replace with `prisma.crmLead.findFirst({ where: { userId, email } })` |
| `{{unsubscribeUrl}}` resolves to hardcoded non-existent URL | Week 4 | Build real signed URL + unsubscribe page |
| `MEETING_BOOKING_URL` is a comment, not read from env | Week 1 | Wire `process.env.MEETING_BOOKING_URL` |
| `LEAD_AI_AUTO_REPLY` OpenAI call runs synchronously inside webhook | Week 7 | Move to async reconcile path |
| `WorkflowLeadProgress` only tracks step 1→2, no step history | Week 3 | Schema migration with `currentStep`, `nextSendAt`, `completedAt` |
| `BillingTab` is a placeholder ("Coming soon.") | Week 6 | Replace with real Stripe UI |
| Dashboard home is entirely dummy data | Week 8 | Replace with real metrics |
| `RCS` in `ConnectionChannel` enum, zero implementation | Leave for P1 | Do not build until PMF signal |

---

## Risk Map

| Risk | Likelihood | Mitigation |
|---|---|---|
| Sequence worker timing drift (Vercel Cron fires ±5 min) | Low | Use `nextSendAt <= now` query — late fires are fine |
| OpenAI latency causes webhook timeout (5–30s) | High | Week 7 moves OpenAI out of hot path; reconcile cron handles async |
| HubSpot token expires mid-sequence | Medium | Existing refresh logic in `lib/hubspot.ts` — add retry on 401 in write-back |
| Solo dev hits blocker mid-week | Medium | Week 11 is the buffer; weeks 3–4 (scheduler) are most likely to overrun |
| Stripe webhook replay double-charges | Low | `subscriptionStatus` upsert is idempotent — check before update |
| SendGrid inbound parse MX misconfiguration | Medium | Test with a real email before Week 1 ends — DNS propagation takes 24–48h |
| MongoDB Atlas M0 free tier transaction limits | High | Use M10 or higher in production — set this up in Week 0 |

---

## P0 Complete — What the Product Does at Week 11

1. User signs up → guided onboarding → connects HubSpot or uploads CSV
2. Leads are scored (0–10) and tiered (1/2/3) automatically
3. Tier 3 leads require confirmation before launching
4. User picks a playbook, sets sender name, launches — in under 30 minutes
5. Sequences send at days 1 / 3 / 7 / 14 / 21 / 30 automatically
6. Sequences stop automatically when a lead replies
7. Unsubscribe links work and are respected by the scheduler
8. Inbound replies are classified (Positive / Soft / Neutral / Negative / Auto)
9. North Star dashboard shows real metrics — no fake data
10. HubSpot contact records updated with reply status and sequence outcome
11. User pays $199/mo after 14-day trial — card prompted at Day 12

---

## P1 Backlog (Days 31–60 after PMF signal)

| Feature | Effort | Notes |
|---|---|---|
| Low-quality list warning banner | 1 day | Warn when >40% of import is Tier 3 before confirming |
| Sequence analytics by step (open rate) | 2 days | Needs SendGrid events (Week 9) as prerequisite |
| RCS channel A/B vs SMS | 5 days | Only if users ask for it |
| Sean Ellis survey in-app | 2 days | Day 30 + Day 60 prompt |
| Lead tier filter/sort in lead table | 1 day | Quick UI add-on |
| Sequence pause / resume | 2 days | Manual pause for a lead or all leads |

---

## Do Not Build (Until 20 Customers)

Per PRD: LinkedIn/social DMs, phone/voice, full CRM, white-label, AI-generated sequences, team seats, mobile app, Salesforce, pricing tiers.

---

*Last updated: 2026-05-04*
