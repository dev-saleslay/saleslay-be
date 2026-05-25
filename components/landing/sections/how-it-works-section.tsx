import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  MessageCircleReply,
  Plug,
  Rocket,
} from "lucide-react";

const steps = [
  {
    title: "Connect",
    body: "Upload your leads or connect your CRM—no migration drama.",
    icon: Plug,
  },
  {
    title: "Score & sequence",
    body: "SalesLay scores your leads and suggests the best follow-up flow.",
    icon: BarChart3,
  },
  {
    title: "Launch",
    body: "Turn on automated Email, SMS, and RCS follow-ups in one go.",
    icon: Rocket,
  },
  {
    title: "Convert",
    body: "Get replies, book calls, and close deals from the same list.",
    icon: MessageCircleReply,
  },
] as const;

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative border-y bg-muted/30 dark:bg-muted/15">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_100%_20%,oklch(0.55_0.12_264/0.06),transparent)] dark:bg-[radial-gradient(ellipse_70%_40%_at_100%_20%,oklch(0.55_0.15_264/0.12),transparent)]"
      />

      <div className="relative mx-auto w-full max-w-6xl px-4 py-20 md:px-6 md:py-24">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start lg:gap-16">
          <header className="max-w-md lg:sticky lg:top-28">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Flow</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance md:text-4xl">
              How it works
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
              Four steps from cold list to live reactivation—no engineering required.
            </p>
            <Link
              href="/auth/joinnow"
              className="mt-8 hidden h-11 w-fit items-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground shadow-md shadow-primary/25 transition hover:bg-primary/90 lg:inline-flex"
            >
              Launch your first sequence
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </header>

          <div className="min-w-0">
            <ol className="relative space-y-0">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isLast = index === steps.length - 1;
                return (
                  <li key={step.title} className="relative flex gap-4 pb-0 md:gap-5">
                    <div className="relative flex w-12 shrink-0 flex-col items-center md:w-14">
                      {!isLast ? (
                        <div
                          className="absolute top-14 bottom-0 w-px bg-gradient-to-b from-primary/50 via-border to-transparent md:top-16"
                          aria-hidden
                        />
                      ) : null}
                      <span className="relative z-[1] flex size-12 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-primary-foreground shadow-md shadow-primary/30 md:size-14 md:text-base">
                        {index + 1}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1 pb-10 last:pb-0">
                      <div className="group relative overflow-hidden rounded-2xl border border-border/80 bg-background/80 p-5 shadow-sm ring-1 ring-black/[0.03] transition hover:border-border hover:shadow-md dark:bg-card/60 dark:ring-white/[0.06] md:p-6">
                        <div className="flex items-start gap-4">
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground transition group-hover:bg-primary/10 group-hover:text-primary md:size-11">
                            <Icon className="size-5 md:size-[1.35rem]" strokeWidth={1.75} aria-hidden />
                          </span>
                          <div className="min-w-0 pt-0.5">
                            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                              Step {index + 1}
                            </p>
                            <p className="mt-1 text-base font-semibold tracking-tight text-foreground md:text-lg">
                              {step.title}
                            </p>
                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-[0.9375rem]">
                              {step.body}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="mt-2 flex lg:hidden">
              <Link
                href="/auth/joinnow"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground shadow-md shadow-primary/25 transition hover:bg-primary/90 sm:w-auto"
              >
                Launch your first sequence in 30 minutes
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
