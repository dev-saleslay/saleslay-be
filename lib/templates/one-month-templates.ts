/** `smart` kept for older saved templates in localStorage — treat like `both` in UI. */
export type TemplateChannel = "email" | "sms" | "both" | "smart";

/** Lead + {{senderName}} merge at send time. Saving to My templates fills {{ourCompany}} / {{ourWebsite}} from My Company only. */
export type TemplateEmailDelivery = {
  subject: string;
  body: string;
};

export type OneMonthTemplateStep = {
  step: number;
  day: number;
  channel: TemplateChannel;
  title: string;
  summary: string;
  /** What the lead actually receives. `both` / day 7 & 21: email + SMS when allowed. */
  delivery: {
    email: TemplateEmailDelivery | null;
    sms: string | null;
  };
};

export type OneMonthTemplate = {
  id: "agency" | "coaching" | "service" | "nutic" | "test_email" | "test_sms";
  categoryTitle: string;
  categorySubtitle: string;
  bestFor: string;
  steps: OneMonthTemplateStep[];
};

/** Three default 30-day reactivation playbooks — includes example copy the contact sees. */
export const ONE_MONTH_TEMPLATES: OneMonthTemplate[] = [
  {
    id: "agency",
    categoryTitle: "Marketing agency leads",
    categorySubtitle: "Dead inbound & proposal-stage contacts",
    bestFor: "Tier 1–2 lists with company + prior campaign or form fills.",
    steps: [
      {
        step: 1,
        day: 1,
        channel: "email",
        title: "Open the loop",
        summary: "Reference the last touch. One clear CTA.",
        delivery: {
          email: {
            subject: "Quick question about {{company}}",
            body: `Hi {{firstName}},

You reached out a while back about marketing support — I know inboxes get noisy.

Are you still looking to grow pipeline for {{company}}, or did priorities shift?

If you’re open to it, reply with “yes” and I’ll send a couple times that work for a 15-min call.

— {{senderName}}
{{ourCompany}}`,
          },
          sms: null,
        },
      },
      {
        step: 2,
        day: 3,
        channel: "email",
        title: "Add proof",
        summary: "Short win tied to their niche.",
        delivery: {
          email: {
            subject: "One result from a team like {{company}}",
            body: `Hi {{firstName}},

Following up — we helped a {{industry}} shop similar to {{company}} lift qualified replies from cold/dead leads in about 6 weeks (happy to share the outline).

Worth a quick look on your side, or should I check back next quarter?

— {{senderName}}
{{ourCompany}}`,
          },
          sms: null,
        },
      },
      {
        step: 3,
        day: 7,
        channel: "both",
        title: "Momentum bump",
        summary: "Email + SMS same day when SMS is allowed; else email only.",
        delivery: {
          email: {
            subject: "Did you see my last note?",
            body: `Hi {{firstName}},

Just bumping this — sent you something a few days ago about re-engaging old leads for {{company}}.

Anything I can clarify in one sentence?

— {{senderName}}
{{ourCompany}}`,
          },
          sms: `Hi {{firstName}} — it's {{senderName}}. I emailed about picking up the convo for {{company}}. Ok to reply here if easier? — {{ourCompany}}`,
        },
      },
      {
        step: 4,
        day: 14,
        channel: "email",
        title: "New angle",
        summary: "Different hook; fresh subject.",
        delivery: {
          email: {
            subject: "Different idea for {{company}}’s pipeline",
            body: `Hi {{firstName}},

Last note from me on this thread — if budget’s tight, we sometimes start with a one-page “dead lead audit” (what to revive vs. skip). No cost for that on our side this month.

Want me to slot you in?

— {{senderName}}
{{ourCompany}}`,
          },
          sms: null,
        },
      },
      {
        step: 5,
        day: 21,
        channel: "both",
        title: "Still relevant?",
        summary: "Email + SMS when allowed; else email only.",
        delivery: {
          email: {
            subject: "Should I close your file?",
            body: `Hi {{firstName}},

I don’t want to clutter your inbox. If reactivating older HubSpot/CRM leads isn’t a focus, totally fine — just let me know and I’ll stop here.

If it is, reply “interested” and we’ll take it from there.

— {{senderName}}
{{ourCompany}}`,
          },
          sms: `{{firstName}}, still worth a quick chat about {{company}}'s leads? Reply STOP to opt out. — {{ourCompany}}`,
        },
      },
      {
        step: 6,
        day: 30,
        channel: "email",
        title: "Respectful close",
        summary: "Breakup / door open.",
        delivery: {
          email: {
            subject: "Closing the loop",
            body: `Hi {{firstName}},

I’ll assume timing wasn’t right. If anything changes, you can always reach me at this email.

Thanks for your time.

— {{senderName}}
{{ourCompany}}

Unsubscribe: {{unsubscribeUrl}}`,
          },
          sms: null,
        },
      },
    ],
  },
  {
    id: "coaching",
    categoryTitle: "Coaching & consulting",
    categorySubtitle: "Past calls, webinars, or stalled discovery",
    bestFor: "Tier 1–2 lists with prior conversation or content engagement.",
    steps: [
      {
        step: 1,
        day: 1,
        channel: "email",
        title: "Personal reopen",
        summary: "Relationship moment first.",
        delivery: {
          email: {
            subject: "Following up after our last chat",
            body: `Hi {{firstName}},

We spoke around {{lastInteractionDate}} about {{topic}} — I imagine things got busy.

Is that goal still on your radar this quarter, or should I leave you in peace?

Either way, glad to hear a one-line update.

— {{senderName}}
{{ourCompany}}`,
          },
          sms: null,
        },
      },
      {
        step: 2,
        day: 3,
        channel: "email",
        title: "Value drop",
        summary: "One insight, low-friction question.",
        delivery: {
          email: {
            subject: "A framework that might help",
            body: `Hi {{firstName}},

One thing that’s helped clients like you: pick one outcome for the next 30 days (revenue, time, or energy) — everything else is noise until that’s stable.

Does that match where your head’s at, or is something else louder right now?

— {{senderName}}
{{ourCompany}}`,
          },
          sms: null,
        },
      },
      {
        step: 3,
        day: 7,
        channel: "both",
        title: "Human check-in",
        summary: "Email + SMS when allowed; else email only.",
        delivery: {
          email: {
            subject: "Quick check-in",
            body: `Hi {{firstName}},

Did any of my notes land, or should I point you to a different topic?

— {{senderName}}
{{ourCompany}}`,
          },
          sms: `Hey {{firstName}}, it's {{senderName}} — did my emails find you ok? Happy to pause if now's bad. — {{ourCompany}}`,
        },
      },
      {
        step: 4,
        day: 14,
        channel: "email",
        title: "Outcome-focused",
        summary: "Timeline + optional proof line.",
        delivery: {
          email: {
            subject: "Timing before things get hectic",
            body: `Hi {{firstName}},

A few people wait until “after busy season” — totally fair — but the slot we talked about usually fills a few weeks out.

If you want to hold a spot for a strategy call, reply with “hold” and I’ll send options.

— {{senderName}}
{{ourCompany}}`,
          },
          sms: null,
        },
      },
      {
        step: 5,
        day: 21,
        channel: "both",
        title: "Timing pulse",
        summary: "Email + SMS when allowed; else email only.",
        delivery: {
          email: {
            subject: "Still thinking about {{topic}}?",
            body: `Hi {{firstName}},

No pressure — is working on {{topic}} still something you want help with this quarter?

A simple “yes / no / later” is perfect.

— {{senderName}}
{{ourCompany}}`,
          },
          sms: `{{firstName}}, still on your radar to pick up {{topic}}? Reply here or say LATER. Reply STOP to opt out. — {{ourCompany}}`,
        },
      },
      {
        step: 6,
        day: 30,
        channel: "email",
        title: "Graceful last touch",
        summary: "Thank, close thread, door open.",
        delivery: {
          email: {
            subject: "Thanks — last note from me",
            body: `Hi {{firstName}},

I’ll step back so I’m not nagging. If the timing lines up later, you’re welcome to ping me here.

Wishing you a strong quarter.

— {{senderName}}
{{ourCompany}}

Unsubscribe: {{unsubscribeUrl}}`,
          },
          sms: null,
        },
      },
    ],
  },
  {
    id: "service",
    categoryTitle: "Generic service business",
    categorySubtitle: "Quotes, estimates, and follow-ups that went quiet",
    bestFor: "Tier 1–2 lists with a clear service offering.",
    steps: [
      {
        step: 1,
        day: 1,
        channel: "email",
        title: "Friendly reopen",
        summary: "Reference quote or visit.",
        delivery: {
          email: {
            subject: "Your {{serviceType}} estimate / question",
            body: `Hi {{firstName}},

We put together numbers for {{company}} around {{serviceType}} — wanted to see if you still needed this, or if you went another direction.

Happy to answer one question by reply — no obligation.

— {{senderName}}
{{ourCompany}}`,
          },
          sms: null,
        },
      },
      {
        step: 2,
        day: 3,
        channel: "email",
        title: "Clarify next step",
        summary: "Simple yes path.",
        delivery: {
          email: {
            subject: "Still interested in moving forward?",
            body: `Hi {{firstName}},

If you’re still interested in {{serviceType}}, reply YES and I’ll confirm the next step (usually a short call or updated quote).

If not, a quick “no thanks” helps me close the file.

— {{senderName}}
{{ourCompany}}`,
          },
          sms: null,
        },
      },
      {
        step: 3,
        day: 7,
        channel: "both",
        title: "Quick ping",
        summary: "Email + SMS when allowed; else email only.",
        delivery: {
          email: {
            subject: "Quick follow-up — {{company}}",
            body: `Hi {{firstName}},

Just checking in on the {{serviceType}} work we discussed. Anything holding up a decision on your side?

— {{senderName}}
{{ourCompany}}`,
          },
          sms: `Hi {{firstName}}, {{senderName}} here — following up on {{serviceType}} for {{company}}. Any questions I can answer? Reply STOP to opt out. — {{ourCompany}}`,
        },
      },
      {
        step: 4,
        day: 14,
        channel: "email",
        title: "Season or timing (soft)",
        summary: "Light urgency, single CTA.",
        delivery: {
          email: {
            subject: "Scheduling before we’re booked out",
            body: `Hi {{firstName}},

We’re filling {{seasonWindow}} slots for {{serviceType}}. If you want to hold a time, reply with “schedule” and I’ll send openings.

If you’ve already sorted it elsewhere, no worries — just let me know.

— {{senderName}}
{{ourCompany}}`,
          },
          sms: null,
        },
      },
      {
        step: 5,
        day: 21,
        channel: "both",
        title: "Check-in",
        summary: "Email + SMS when allowed; else email only.",
        delivery: {
          email: {
            subject: "Did you choose another provider?",
            body: `Hi {{firstName}},

Totally fine if you moved ahead with someone else — I’m closing out open quotes.

If you still want to compare options for {{serviceType}}, reply here and we’ll reconnect.

— {{senderName}}
{{ourCompany}}`,
          },
          sms: `{{firstName}}, did you already book {{serviceType}} elsewhere? If not I can help this week. Reply STOP to opt out. — {{ourCompany}}`,
        },
      },
      {
        step: 6,
        day: 30,
        channel: "email",
        title: "Close the loop",
        summary: "Professional close.",
        delivery: {
          email: {
            subject: "Thanks — closing your request",
            body: `Hi {{firstName}},

I’ll assume you don’t need {{serviceType}} from us right now. If anything changes, you can reach me at this email anytime.

Thanks for considering us.

— {{senderName}}
{{ourCompany}}

Unsubscribe: {{unsubscribeUrl}}`,
          },
          sms: null,
        },
      },
    ],
  },
  {
    id: "nutic",
    categoryTitle: "Nutic — quick 2-touch",
    categorySubtitle: "Step 1: email only. Step 2: after a 30 second gap — email + SMS (matches Workflow).",
    bestFor: "Two touches in one session: first email, then the same playbook waits 30 seconds (Workflow) before email + SMS.",
    steps: [
      {
        step: 1,
        day: 1,
        channel: "email",
        title: "Soft reopen",
        summary: "Email only. Step 2 starts 30 seconds later when you use Start workflow.",
        delivery: {
          email: {
            subject: "Still on your radar, {{firstName}}?",
            body: `Hi {{firstName}},

We left things open last time about {{company}} — wanted to see if that’s still worth a quick conversation on your side.

If yes, reply with a good day/time. If not, no worries — a one-line “pass” helps me close the loop.

— {{senderName}}
{{ourCompany}}`,
          },
          sms: null,
        },
      },
      {
        step: 2,
        day: 2,
        channel: "both",
        title: "Follow-up bump",
        summary: "Runs ~30 seconds after step 1 in Workflow. Email + SMS when SMS is allowed; else email only.",
        delivery: {
          email: {
            subject: "Quick bump — {{company}}",
            body: `Hi {{firstName}},

Following up right after my last note about reconnecting for {{company}} (about 30 seconds ago on our side).

Anything I can clarify in one sentence, or should I check back another time?

— {{senderName}}
{{ourCompany}}`,
          },
          sms: `Hi {{firstName}} — {{senderName}} here. I just emailed about {{company}}; ok to reply here if easier? Reply STOP to opt out. — {{ourCompany}}`,
        },
      },
    ],
  },
  {
    id: "test_email",
    categoryTitle: "Test — email only",
    categorySubtitle: "Single step: one outbound email (for pipeline testing).",
    bestFor: "Verifying email delivery and merge tokens without SMS.",
    steps: [
      {
        step: 1,
        day: 1,
        channel: "email",
        title: "Test email",
        summary: "Plain test message; lead fields merge at send time.",
        delivery: {
          email: {
            subject: "[Test] Quick ping — {{company}}",
            body: `Hi {{firstName}},

This is a test email from {{senderName}} at {{ourCompany}}.

If you received this, outbound email is working. You can ignore or reply to confirm.

— {{senderName}}
{{ourCompany}}`,
          },
          sms: null,
        },
      },
    ],
  },
  {
    id: "test_sms",
    categoryTitle: "Test — SMS only",
    categorySubtitle: "Single step: one SMS only (for pipeline testing).",
    bestFor: "Verifying SMS delivery and merge tokens without email on this step.",
    steps: [
      {
        step: 1,
        day: 1,
        channel: "sms",
        title: "Test SMS",
        summary: "Plain test text; lead fields merge at send time.",
        delivery: {
          email: null,
          sms: `[Test] Hi {{firstName}} — {{senderName}} from {{ourCompany}}. SMS test; reply OK or STOP to opt out.`,
        },
      },
    ],
  },
];

export function channelLabel(ch: TemplateChannel): string {
  if (ch === "email") return "Email";
  if (ch === "sms") return "SMS";
  return "Email + SMS";
}
