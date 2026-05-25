import Image from "next/image";
import { Zap } from "lucide-react";

export function SolutionSection() {
  return (
    <section className="relative border-y bg-muted/40 dark:bg-muted/20">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-20 md:px-6 lg:grid-cols-2 lg:gap-16">
        <div className="order-2 lg:order-1">
          <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-background shadow-xl shadow-black/5 ring-1 ring-black/5 dark:shadow-black/20 dark:ring-white/10">
            <Image
              src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80"
              alt="Team reviewing CRM follow-up strategy"
              width={1200}
              height={800}
              className="aspect-[4/3] w-full object-cover md:aspect-auto md:h-[min(380px,45vh)]"
            />
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
            <Zap className="size-3.5" aria-hidden />
            The fix
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance md:text-4xl">
            SalesLay reactivates dead leads automatically
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Plug into your existing pipeline and run smart, multi-step follow-ups across Email, SMS, and RCS.
            No new leads required—just better conversion from what you already have.
          </p>
        </div>
      </div>
    </section>
  );
}
