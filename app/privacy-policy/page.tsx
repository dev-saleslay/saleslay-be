import { Navbar } from "@/components/main/navbar";
import { FooterSection } from "@/components/landing/sections/footer-section";
import { privacyPolicyMeta, privacyPolicySections } from "@/config/legal-pages.config";

export default function PrivacyPolicyPage() {
  const grouped = privacyPolicySections.reduce<Record<string, typeof privacyPolicySections>>((acc, section) => {
    if (!acc[section.heading]) {
      acc[section.heading] = [];
    }
    acc[section.heading].push(section);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl px-4 py-12 md:px-6">
        <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {privacyPolicyMeta.lastUpdated}</p>
        <p className="mt-4 text-sm text-muted-foreground">{privacyPolicyMeta.intro}</p>

        <div className="mt-8 space-y-6">
          {Object.entries(grouped).map(([heading, sections]) => (
            <section key={heading} className="rounded-xl border bg-card p-5 shadow-sm">
              <h2 className="text-lg font-semibold">{heading}</h2>
              <div className="mt-3 space-y-4 text-sm text-muted-foreground">
                {sections.map((section, idx) => (
                  <div key={`${section.subheading ?? section.heading}-${idx}`} className="space-y-2">
                    {section.subheading ? <h3 className="font-medium text-foreground">{section.subheading}</h3> : null}
                    {section.content?.map((line) => <p key={line}>{line}</p>)}
                    {section.bullets?.length ? (
                      <ul className="list-disc space-y-1 pl-5">
                        {section.bullets.map((bullet) => (
                          <li key={bullet}>{bullet}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
