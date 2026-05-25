import { CircleSlash2, Database, Megaphone } from "lucide-react";

const items = [
  {
    icon: Database,
    label: "Not a CRM",
    detail: "We work with the CRM you already use.",
  },
  {
    icon: Megaphone,
    label: "Not cold outreach",
    detail: "Built for leads who already know you.",
  },
  {
    icon: CircleSlash2,
    label: "Not generic marketing automation",
    detail: "Purpose-built for reactivation and replies.",
  },
] as const;

export function WhySection() {
  return (
    <section className="border-y bg-muted/40 dark:bg-muted/20">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 md:px-6">
        <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-balance md:text-4xl">
          Not another CRM. Not another outreach tool.
        </h2>
        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {items.map(({ icon: Icon, label, detail }) => (
            <li
              key={label}
              className="rounded-2xl border border-border/80 bg-background p-6 shadow-sm transition hover:shadow-md"
            >
              <Icon className="size-8 text-primary" aria-hidden />
              <p className="mt-4 font-semibold">{label}</p>
              <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
            </li>
          ))}
        </ul>
        <p className="mt-10 max-w-2xl text-lg font-medium leading-snug">
          It&apos;s a reactivation engine focused on turning old leads into new revenue.
        </p>
      </div>
    </section>
  );
}
