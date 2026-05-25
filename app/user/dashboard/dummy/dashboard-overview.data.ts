/**
 * Sample dashboard content aligned with docs/PMF-PRD-SUMMARY.md:
 * North star, engagement signals, reply classification, funnel, sequence steps.
 */

export type NorthStarMetric = {
  title: string;
  value: string;
  caption: string;
  target: string;
};

export type HealthSignalRow = {
  metric: string;
  current: string;
  target: string;
  onTrack: boolean;
};

export type ReplyClassificationSlice = {
  label: string;
  count: number;
  pct: number;
  tone: "positive" | "soft" | "neutral" | "negative" | "auto";
};

export type FunnelStep = {
  stage: string;
  count: number;
  conversionFromPrior: string | null;
};

export type SequenceStepAnalytic = {
  day: string;
  sends: number;
  openRatePct: number;
  replyRatePct: number;
};

export const dashboardDummyOverview = {
  tagline: "Reactivation layer on your CRM — recover revenue from dead pipelines.",

  northStar: {
    title: "Positive responses / active user / month",
    value: "6",
    caption: "Last 30 days · excludes auto-replies & OOO",
    target: "Target 5+ by Day 60",
  } satisfies NorthStarMetric,

  healthSignals: [
    { metric: "Reactivation email open rate", current: "41%", target: "> 35%", onTrack: true },
    { metric: "Overall reply rate", current: "5.2%", target: "> 4%", onTrack: true },
    { metric: "Avg. lead quality score", current: "6.8 / 10", target: "> 6", onTrack: true },
  ] satisfies HealthSignalRow[],

  tierMix: [
    { tier: "Tier 1 — warm", count: 412, pct: 28 },
    { tier: "Tier 2 — cold relevant", count: 798, pct: 54 },
    { tier: "Tier 3 — low quality (warn)", count: 265, pct: 18 },
  ],

  replyClassification: [
    { label: "Positive", count: 24, pct: 31, tone: "positive" },
    { label: "Soft", count: 18, pct: 23, tone: "soft" },
    { label: "Neutral", count: 14, pct: 18, tone: "neutral" },
    { label: "Negative", count: 9, pct: 12, tone: "negative" },
    { label: "Auto / OOO", count: 12, pct: 16, tone: "auto" },
  ] satisfies ReplyClassificationSlice[],

  funnel: [
    { stage: "Dead leads in CRM", count: 2840, conversionFromPrior: null },
    { stage: "Scored & sequenced", count: 1475, conversionFromPrior: "52%" },
    { stage: "Opened email", count: 606, conversionFromPrior: "41%" },
    { stage: "Replied (any)", count: 148, conversionFromPrior: "24%" },
    { stage: "Positive intent", count: 62, conversionFromPrior: "42% of replies" },
  ] satisfies FunnelStep[],

  sequenceByStep: [
    { day: "Day 1", sends: 1180, openRatePct: 44, replyRatePct: 2.1 },
    { day: "Day 3", sends: 1124, openRatePct: 39, replyRatePct: 1.8 },
    { day: "Day 7", sends: 1088, openRatePct: 37, replyRatePct: 2.4 },
    { day: "Day 14", sends: 1012, openRatePct: 35, replyRatePct: 2.9 },
    { day: "Day 21", sends: 964, openRatePct: 33, replyRatePct: 3.1 },
    { day: "Day 30", sends: 902, openRatePct: 31, replyRatePct: 3.4 },
  ] satisfies SequenceStepAnalytic[],
};
