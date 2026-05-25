import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,oklch(0.92_0.04_264),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,oklch(0.25_0.06_264/0.35),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-0 h-96 w-96 rounded-full bg-primary/5 blur-3xl dark:bg-primary/10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-muted-foreground/5 blur-3xl"
      />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-20 md:px-6 md:py-28 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3.5 py-1.5 text-xs font-medium text-foreground dark:border-primary/25 dark:bg-primary/10">
            <Sparkles className="size-3.5 text-primary" aria-hidden />
            Recover revenue from existing leads
          </p>
          <h1 className="max-w-4xl text-4xl font-semibold leading-[1.1] tracking-tight text-balance md:text-5xl lg:text-[3.25rem]">
            Your CRM is full of people who almost bought.{" "}
            <span className="bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent dark:from-white dark:via-white dark:to-white/60">
              We bring them back.
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Recover lost deals from your existing leads with automated Email, SMS, and RCS follow-ups—start
            getting real replies within 48 hours.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/auth/joinnow"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground shadow-md shadow-primary/20 transition hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25"
            >
              Start free trial
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/#how-it-works"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-background px-6 text-sm font-medium transition hover:bg-muted/80"
            >
              See how it works
            </Link>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">
            No credit card required · Setup in under 30 minutes
          </p>
        </div>

        <div className="relative lg:justify-self-end">
          <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-primary/10 via-transparent to-muted-foreground/10 blur-2xl dark:from-primary/20" aria-hidden />
          <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl shadow-black/5 ring-1 ring-black/5 dark:shadow-black/30 dark:ring-white/10">
            <Image
              src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80"
              alt="Sales dashboard analytics"
              width={1200}
              height={800}
              className="aspect-[4/3] w-full object-cover md:aspect-auto md:h-[min(420px,50vh)]"
              priority
            />
            <div className="absolute inset-x-4 bottom-4 rounded-xl border border-border/60 bg-background/85 p-4 shadow-lg backdrop-blur-md dark:bg-background/80">
              <p className="text-sm font-semibold tracking-tight">Avg first reply in &lt;48 hours</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Email + SMS + RCS follow-ups running automatically
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
