import Link from "next/link";
import { Check } from "lucide-react";

const perks = [
  "Unlimited sequences",
  "Email, SMS & RCS included",
  "Lead scoring",
  "Analytics dashboard",
] as const;

export function PricingSection() {
  return (
    <section id="pricing" className="border-y bg-muted/30 dark:bg-muted/15">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 md:px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Pricing</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Simple pricing</h2>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Start in beta with full access—no surprise tiers while we ship.
        </p>
        <div className="mt-12 max-w-md">
          <div className="relative overflow-hidden rounded-2xl border-2 border-primary/20 bg-card p-8 shadow-xl shadow-primary/5 ring-1 ring-border/60">
            <div className="absolute -right-12 -top-12 size-40 rounded-full bg-primary/10 blur-3xl" aria-hidden />
            <span className="inline-flex rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
              Beta access
            </span>
            <p className="mt-6 text-sm font-medium text-muted-foreground">Everything included</p>
            <p className="mt-1 flex items-baseline gap-1">
              <span className="text-5xl font-semibold tracking-tight">$0</span>
              <span className="text-muted-foreground">/month</span>
            </p>
            <ul className="mt-8 space-y-3">
              {perks.map((item) => (
                <li key={item} className="flex gap-3 text-sm text-muted-foreground">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Check className="size-3" aria-hidden />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-8 text-sm font-medium text-foreground">Beta · No credit card required</p>
            <Link
              href="/auth/joinnow"
              className="mt-4 flex h-11 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground shadow-md shadow-primary/20 transition hover:bg-primary/90"
            >
              Join beta
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
