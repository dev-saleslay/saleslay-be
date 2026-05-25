import { dashboardDummyOverview } from "@/app/user/dashboard/dummy";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function toneClass(tone: (typeof dashboardDummyOverview.replyClassification)[number]["tone"]) {
  switch (tone) {
    case "positive":
      return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200";
    case "soft":
      return "bg-sky-500/15 text-sky-900 dark:text-sky-100";
    case "neutral":
      return "bg-muted text-muted-foreground";
    case "negative":
      return "bg-destructive/15 text-destructive";
    case "auto":
      return "bg-amber-500/15 text-amber-950 dark:text-amber-100";
    default:
      return "bg-muted";
  }
}

export function DashboardDummyHome() {
  const d = dashboardDummyOverview;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{d.tagline}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:items-stretch">
        <Card className="flex h-full min-h-0 flex-col border-border/80 shadow-sm">
          <CardHeader>
            <CardDescription>North Star</CardDescription>
            <CardTitle className="text-3xl font-semibold tabular-nums">{d.northStar.value}</CardTitle>
            <p className="text-sm font-medium text-foreground">{d.northStar.title}</p>
            <p className="text-xs text-muted-foreground">{d.northStar.caption}</p>
          </CardHeader>
          <CardContent className="mt-auto">
            <Badge variant="secondary" className="text-xs font-normal">
              {d.northStar.target}
            </Badge>
          </CardContent>
        </Card>

        <Card className="flex h-full min-h-0 flex-col border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Engagement &amp; quality</CardTitle>
            <CardDescription>Reactivation performance</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col space-y-3">
            {d.healthSignals.map((row) => (
              <div
                key={row.metric}
                className="flex flex-col gap-1 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-sm text-muted-foreground">{row.metric}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium tabular-nums">{row.current}</span>
                  <Badge variant={row.onTrack ? "secondary" : "outline"} className="text-xs font-normal">
                    {row.target}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="border-border/80 shadow-sm xl:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Lead tiers</CardTitle>
            <CardDescription>Score → Tier 1 / 2 / 3 (PRD anchors)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {d.tierMix.map((t) => (
              <div key={t.tier} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{t.tier}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {t.count.toLocaleString()} ({t.pct}%)
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary/80" style={{ width: `${t.pct}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Reply classification</CardTitle>
            <CardDescription>AI / keyword classifier — powers North Star counts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {d.replyClassification.map((slice) => (
                <span
                  key={slice.label}
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${toneClass(slice.tone)}`}
                >
                  {slice.label}
                  <span className="tabular-nums opacity-90">
                    {slice.count} ({slice.pct}%)
                  </span>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Reactivation funnel</CardTitle>
            <CardDescription>Dead CRM → scored → engagement → positive intent</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {d.funnel.map((step) => (
              <div
                key={step.stage}
                className="flex flex-col gap-0.5 border-b border-border/50 py-2 last:border-0 last:pb-0 first:pt-0"
              >
                <div className="flex justify-between gap-4 text-sm">
                  <span>{step.stage}</span>
                  <span className="tabular-nums font-medium">{step.count.toLocaleString()}</span>
                </div>
                {step.conversionFromPrior ? (
                  <span className="text-xs text-muted-foreground">{step.conversionFromPrior} vs prior step</span>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Sequence by step</CardTitle>
            <CardDescription>P1-style analytics — opens &amp; replies per send.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[280px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">Touch</th>
                  <th className="pb-2 pr-3 font-medium">Sends</th>
                  <th className="pb-2 pr-3 font-medium">Open %</th>
                  <th className="pb-2 font-medium">Reply %</th>
                </tr>
              </thead>
              <tbody>
                {d.sequenceByStep.map((row) => (
                  <tr key={row.day} className="border-b border-border/40 last:border-0">
                    <td className="py-2 pr-3">{row.day}</td>
                    <td className="py-2 pr-3 tabular-nums">{row.sends.toLocaleString()}</td>
                    <td className="py-2 pr-3 tabular-nums">{row.openRatePct}%</td>
                    <td className="py-2 tabular-nums">{row.replyRatePct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
