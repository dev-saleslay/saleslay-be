import { HeroSection } from "@/components/landing/sections/hero-section";
import { ProblemSection } from "@/components/landing/sections/problem-section";
import { SolutionSection } from "@/components/landing/sections/solution-section";
import { HowItWorksSection } from "@/components/landing/sections/how-it-works-section";
import { ResultsSection } from "@/components/landing/sections/results-section";
import { FeaturesSection } from "@/components/landing/sections/features-section";
import { WhySection } from "@/components/landing/sections/why-section";
import { PricingSection } from "@/components/landing/sections/pricing-section";
import { FaqSection } from "@/components/landing/sections/faq-section";
import { FinalCtaSection } from "@/components/landing/sections/final-cta-section";
import { FooterSection } from "@/components/landing/sections/footer-section";

export function LandingPage() {
  return (
    <div className="overflow-x-hidden">
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <HowItWorksSection />
      <ResultsSection />
      <FeaturesSection />
      <WhySection />
      <PricingSection />
      <FaqSection />
      <FinalCtaSection />
      <FooterSection />
    </div>
  );
}
