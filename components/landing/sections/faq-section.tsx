"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  ["Do I need new leads?", "No. SalesLay works on your existing leads."],
  ["How fast will I see results?", "Most users get their first reply within 48 hours."],
  ["Is this a CRM?", "No. We integrate with your CRM and improve conversions."],
  ["Can I customize messages?", "Yes, and our pre-built playbooks already perform well."],
  ["What channels are supported?", "Email, SMS, and RCS."],
] as const;

export function FaqSection() {
  return (
    <section className="border-y bg-muted/40 dark:bg-muted/20">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 md:px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">FAQ</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Common questions</h2>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Quick answers before you start your trial.
        </p>
        <Accordion multiple={false} className="mt-10 rounded-2xl border border-border/80 bg-background px-2 shadow-sm md:px-4">
          {faqs.map(([q, a], i) => (
            <AccordionItem key={q} value={`faq-${i}`} className="px-2 md:px-0">
              <AccordionTrigger className="py-4 text-left text-base hover:no-underline">{q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
