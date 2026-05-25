"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

type AuthShellProps = {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  actionIcon?: ReactNode;
  footerText?: string;
  footerLinkLabel?: string;
  footerLinkHref?: string;
};

const highlights = [
  "Recover dead leads with automated follow-ups",
  "Email + SMS + RCS from one dashboard",
  "Get real replies in less than 48 hours",
];

export function AuthShell({
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
  footerText,
  footerLinkLabel,
  footerLinkHref,
}: AuthShellProps) {
  return (
    <main className="min-h-screen bg-background">
      <div className="grid min-h-screen w-full md:grid-cols-[1.15fr_1fr]">
        <section className="relative hidden flex-col justify-between overflow-hidden bg-slate-950 px-10 py-12 text-slate-100 md:flex lg:px-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_45%)]" />
          <div className="absolute -left-28 bottom-0 size-72 rounded-full bg-blue-500/15 blur-3xl" />
          <div className="relative space-y-5">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-xs font-medium text-slate-200">
              <Sparkles className="size-3.5" />
              SalesLay Growth Engine
            </p>
            <h2 className="max-w-xl text-4xl font-semibold leading-tight lg:text-5xl">
              Turn old leads into new revenue with smart reactivation workflows.
            </h2>
            <p className="max-w-lg text-base text-slate-300">
              Setup in under 30 minutes. Launch sequences and start conversations fast.
            </p>
          </div>
          <ul className="relative mt-10 space-y-4">
            {highlights.map((item) => (
              <li key={item} className="flex items-start gap-2 text-base text-slate-200">
                <CheckCircle2 className="mt-0.5 size-5 text-emerald-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-8 md:px-12">
          <div className="w-full max-w-md">
            <Link
              href="/"
              className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Back to home
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-2 text-base text-muted-foreground">{description}</p>

            <form
              className="mt-8"
              onSubmit={(event) => {
                event.preventDefault();
                onAction();
              }}
            >
              <Button type="submit" className="h-11 w-full text-base">
                {actionIcon ? <span className="mr-2 inline-flex items-center">{actionIcon}</span> : null}
                {actionLabel}
              </Button>
            </form>

            {footerText ? (
              <p className="mt-5 text-sm text-muted-foreground">
                {footerText}{" "}
                {footerLinkLabel && footerLinkHref ? (
                  <Link href={footerLinkHref} className="font-medium text-foreground hover:underline">
                    {footerLinkLabel}
                  </Link>
                ) : null}
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
