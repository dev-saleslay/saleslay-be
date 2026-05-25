import { Navbar } from "@/components/main/navbar";
import { FooterSection } from "@/components/landing/sections/footer-section";
import { termsOfServiceMeta, termsOfServiceSections } from "@/config/legal-pages.config";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl px-4 py-12 md:px-6">
        <h1 className="text-3xl font-semibold tracking-tight">Terms and Conditions</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {termsOfServiceMeta.lastUpdated}</p>
        <p className="mt-4 text-sm text-muted-foreground">{termsOfServiceMeta.intro}</p>

        <div className="mt-8 space-y-6">
          {termsOfServiceSections.map((section) => (
            <section key={section.heading} className="rounded-xl border bg-card p-5 shadow-sm">
              <h2 className="text-lg font-semibold">{section.heading}</h2>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                {section.content?.map((line) => <p key={line}>{line}</p>)}
                {section.bullets?.length ? (
                  <ul className="list-disc space-y-1 pl-5">
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </section>
          ))}
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
