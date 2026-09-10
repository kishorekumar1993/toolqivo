import React from "react";
import { Metadata } from "next";
import { CATEGORIES } from "@/data/categories";
import { TOOLS } from "@/data/tools";
import { CategoryHubView } from "@/components/tools/CategoryHubView";

export const metadata: Metadata = {
  title: "Free Online Converters – Unit & Currency Converter | Toolqivo",
  description: "Convert units of length, weight, temperature and currency online for free. Accurate and instant conversion tools.",
  keywords: ["converters","unit converter","currency converter","length converter","weight converter"],
  alternates: { canonical: "https://toolqivo.com/converters" },
  openGraph: {
    title: "Free Online Converters – Unit & Currency Converter | Toolqivo",
    description: "Convert units of length, weight, temperature and currency online for free. Accurate and instant conversion tools.",
    url: "https://toolqivo.com/converters",
    siteName: "Toolqivo",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Online Converters – Unit & Currency Converter | Toolqivo",
    description: "Convert units of length, weight, temperature and currency online for free. Accurate and instant conversion tools.",
  },
};

export default function ConvertersPage() {
  const category = CATEGORIES.find((c) => c.id === "converters")!;
  const tools = TOOLS.filter((t) => t.category === "converters");
  return <CategoryHubView category={category} tools={tools} />;
}
