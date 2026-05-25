import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function FinalCtaSection() {
  return (
    <section className="relative overflow-hidden bg-foreground text-background dark:bg-background dark:text-foreground">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08] dark:opacity-[0.06]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
        aria-hidden
      />
      <div className="relative mx-auto w-full max-w-6xl px-4 py-24 md:px-6 md:py-28">
        <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-balance md:text-4xl lg:text-[2.75rem] lg:leading-tight">
          Your leads are already there. Revenue isn&apos;t.
        </h2>
        <p className="mt-5 max-w-xl text-base text-background/80 md:text-lg dark:text-muted-foreground">
          Start reactivating your pipeline today—same list, better outcomes.
        </p>
        <Link
          href="/auth/joinnow"
          className="mt-10 inline-flex h-12 items-center gap-2 rounded-lg bg-background px-8 text-sm font-semibold text-foreground shadow-lg transition hover:bg-background/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"
        >
          Start free trial now
          <ArrowRight className="size-4" aria-hidden />
        </Link>
        <p className="mt-4 text-sm text-background/65 dark:text-muted-foreground">
          No credit card · Cancel anytime
        </p>
      </div>
    </section>
  );
}
