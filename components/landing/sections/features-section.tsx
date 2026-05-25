import {
  Activity,
  Bot,
  BookOpen,
  Gauge,
  Layers,
  Mail,
  Timer,
} from "lucide-react";

const features: {
  title: string;
  desc: string;
  icon: typeof Gauge;
  className?: string;
}[] = [
  {
    title: "Lead quality scoring",
    desc: "Know which leads are most likely to respond before you send.",
    icon: Gauge,
    className: "md:col-span-2 md:row-span-1",
  },
  {
    title: "Multi-channel sequences",
    desc: "Email, SMS, and RCS in one coordinated flow.",
    icon: Layers,
  },
  {
    title: "Pre-built playbooks",
    desc: "Proven follow-up sequences ready to launch.",
    icon: BookOpen,
  },
  {
    title: "AI reply detection",
    desc: "Positive responses tracked automatically so you never miss a hot lead.",
    icon: Bot,
    className: "md:col-span-2",
  },
  {
    title: "Fast setup",
    desc: "From signup to live sequences in under 30 minutes.",
    icon: Timer,
  },
  {
    title: "Built for replies",
    desc: "Messaging tuned for real conversations—not vanity opens.",
    icon: Mail,
  },
  {
    title: "Pipeline analytics",
    desc: "See sends, replies, and recovered deals in one dashboard.",
    icon: Activity,
  },
];

export function FeaturesSection() {
  return (
    <section>
      <div className="mx-auto w-full max-w-6xl px-4 py-20 md:px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Product</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Everything built to maximize responses
          </h2>
          <p className="mt-4 text-muted-foreground md:text-lg">
            One engine focused on turning dormant leads into booked calls and revenue.
          </p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {features.map(({ title, desc, icon: Icon, className }) => (
            <div
              key={title}
              className={`group relative overflow-hidden rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition hover:border-border hover:shadow-md ${className ?? ""}`}
            >
              <div className="mb-4 inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary/15">
                <Icon className="size-5" aria-hidden />
              </div>
              <p className="font-semibold tracking-tight">{title}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
