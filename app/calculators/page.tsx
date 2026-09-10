import React from "react";
import { Metadata } from "next";
import { CATEGORIES } from "@/data/categories";
import { TOOLS } from "@/data/tools";
import { CategoryHubView } from "@/components/tools/CategoryHubView";

export const metadata: Metadata = {
  title: "Free Online Calculators – Age, BMI, Percentage & More | Toolqivo",
  description: "Use free online calculators for age, BMI, percentage, date difference and more. Fast, accurate and easy to use.",
  keywords: ["calculators","age calculator","bmi calculator","percentage calculator","date calculator"],
  alternates: { canonical: "https://toolqivo.com/calculators" },
  openGraph: {
    title: "Free Online Calculators – Age, BMI, Percentage & More | Toolqivo",
    description: "Use free online calculators for age, BMI, percentage, date difference and more. Fast, accurate and easy to use.",
    url: "https://toolqivo.com/calculators",
    siteName: "Toolqivo",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Online Calculators – Age, BMI, Percentage & More | Toolqivo",
    description: "Use free online calculators for age, BMI, percentage, date difference and more. Fast, accurate and easy to use.",
  },
};

export default function CalculatorsPage() {
  const category = CATEGORIES.find((c) => c.id === "calculators")!;
  const tools = TOOLS.filter((t) => t.category === "calculators");
  return <CategoryHubView category={category} tools={tools} />;
}
