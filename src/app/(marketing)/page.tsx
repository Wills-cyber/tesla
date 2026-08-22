import type { Metadata } from "next";

import { Hero } from "@/components/marketing/hero";
import { InvestmentPlansSection } from "@/components/marketing/investment-plans-section";
import { HowItWorksSection } from "@/components/marketing/how-it-works-section";
import { VehicleShowcaseSection } from "@/components/marketing/vehicle-showcase-section";
import { FeaturesSection } from "@/components/marketing/features-section";
import { StatisticsSection } from "@/components/marketing/statistics-section";
import { AboutSection } from "@/components/marketing/about-section";
import { FaqSection } from "@/components/marketing/faq-section";
import { FinalCtaSection } from "@/components/marketing/final-cta-section";
import { getInvestmentPlans } from "@/lib/data";
import { investmentPlans as catalogueFallback } from "@/config/investment-plans";
import { faqs } from "@/config/content";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: siteConfig.tagline,
  description: siteConfig.description,
  alternates: { canonical: "/" },
};

/**
 * Landing page.
 *
 * A Server Component: it resolves the plan catalogue once on the server and
 * passes it down, so no plan data is fetched from the browser. Sections that need
 * interactivity ("use client") are leaves of this tree, which keeps the shipped
 * JavaScript to the hero, the plan cards, the vehicle selector and the accordion.
 */
export default async function HomePage() {
  const plansResult = await getInvestmentPlans();

  // `unconfigured` is expected until Supabase is linked — fall back to the
  // published catalogue rather than rendering an empty marketing page.
  const plans =
    plansResult.status === "ready" ? plansResult.data : catalogueFallback;

  return (
    <>
      <FaqJsonLd />
      <Hero />
      <InvestmentPlansSection plans={plans} />
      <HowItWorksSection />
      <StatisticsSection />
      <VehicleShowcaseSection />
      <FeaturesSection />
      <AboutSection />
      <FaqSection />
      <FinalCtaSection />
    </>
  );
}

/**
 * FAQPage structured data.
 *
 * Mirrors exactly what the accordion renders — search engines penalise
 * structured data that doesn't match visible content.
 */
function FaqJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <script
      type="application/ld+json"
      // Content is authored in `src/config/content.ts`, not user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
