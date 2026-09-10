import React from "react";
import { Hero } from "@/components/hero/Hero";
import { TrustStrip } from "@/components/trust/TrustStrip";
import { PopularTools } from "@/components/popular/PopularTools";
import { CategoryGrid } from "@/components/categories/CategoryGrid";
import { PdfFeature } from "@/components/features/PdfFeature";
import { ImageFeature } from "@/components/features/ImageFeature";
import { FinanceFeature } from "@/components/features/FinanceFeature";
import { CountrySection } from "@/components/country/CountrySection";
import { HowItWorks } from "@/components/how-it-works/HowItWorks";
import { PrivacySection } from "@/components/privacy/PrivacySection";
import { NewTools } from "@/components/new-tools/NewTools";
import { FaqAccordion } from "@/components/faq/FaqAccordion";
import { FinalCta } from "@/components/cta/FinalCta";

export default function HomePage() {
  return (
    <>
      <Hero />
      <TrustStrip />
      <PopularTools />
      <CategoryGrid />
      <PdfFeature />
      <ImageFeature />
      <FinanceFeature />
      <CountrySection />
      <HowItWorks />
      <PrivacySection />
      <NewTools />
      <FaqAccordion />
      <FinalCta />
    </>
  );
}
