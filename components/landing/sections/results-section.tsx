import { MessageCircle, Phone, Send } from "lucide-react";

const quotes = [
  { icon: MessageCircle, text: "Yes, I'm interested" },
  { icon: Phone, text: "Let's jump on a call" },
  { icon: Send, text: "Send more details" },
] as const;

const stats = [
  { label: "Avg response rate", value: "4–12%" },
  { label: "First replies in", value: "<48 hrs" },
  { label: "Deals recovered", value: "Weekly" },
] as const;

export function ResultsSection() {
  return (
    <section>
      <div className="mx-auto w-full max-w-6xl px-4 py-20 md:px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Outcomes</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Real replies—not just opens</h2>
        <p className="mt-4 max-w-2xl text-muted-foreground md:text-lg">
          The whole system is tuned for one thing: positive, actionable responses.
        </p>
        <ul className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {quotes.map(({ icon: Icon, text }) => (
            <li
              key={text}
              className="inline-flex items-center gap-3 rounded-full border border-border/80 bg-muted/40 px-4 py-2.5 text-sm font-medium dark:bg-muted/25"
            >
              <Icon className="size-4 shrink-0 text-primary" aria-hidden />
              <span className="text-foreground">&ldquo;{text}&rdquo;</span>
            </li>
          ))}
        </ul>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {stats.map(({ label, value }) => (
            <div
              key={label}
              className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card to-muted/30 p-6 shadow-sm"
            >
              <div className="absolute -right-6 -top-6 size-24 rounded-full bg-primary/5 blur-2xl" aria-hidden />
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
