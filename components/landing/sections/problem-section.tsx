import { Clock, MessageSquareOff, Percent, TrendingDown } from "lucide-react";

const pains = [
  {
    icon: MessageSquareOff,
    text: "Leads go cold after 1–2 follow-ups",
  },
  {
    icon: Clock,
    text: "Your team forgets or delays responses",
  },
  {
    icon: Percent,
    text: "Less than 10% of leads convert",
  },
  {
    icon: TrendingDown,
    text: "Thousands of potential deals are lost",
  },
] as const;

export function ProblemSection() {
  return (
    <section className="relative border-b bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 md:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-12 lg:gap-20">
          <div className="max-w-xl shrink-0 md:sticky md:top-24 md:pt-2">
            <span className="inline-block rounded-md border border-border bg-muted/60 px-2.5 py-1 text-xs font-medium text-foreground">
              The gap
            </span>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-balance md:text-4xl">
              You&apos;re sitting on revenue you&apos;re not following up on
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
              You already spend to generate leads—but most never convert. Here&apos;s what usually happens.
            </p>
          </div>

          <div className="min-w-0 flex-1 md:max-w-xl">
            <ul className="border-t border-border">
              {pains.map(({ icon: Icon, text }) => (
                <li
                  key={text}
                  className="flex gap-4 border-b border-border py-5 last:border-b-0 md:py-6"
                >
                  <Icon
                    className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  <p className="text-[0.9375rem] font-medium leading-snug text-foreground md:text-base">{text}</p>
                </li>
              ))}
            </ul>
            <p className="mt-8 border-l-2 border-foreground/20 pl-5 text-sm leading-relaxed text-muted-foreground md:text-base">
              <span className="font-semibold text-foreground">Bottom line:</span> the problem isn&apos;t lead
              generation—it&apos;s{" "}
              <span className="font-medium text-foreground underline decoration-primary/40 underline-offset-4">
                consistent follow-up
              </span>
              .
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
