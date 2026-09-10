import React from "react";
import { Metadata } from "next";
import { CATEGORIES } from "@/data/categories";
import { TOOLS } from "@/data/tools";
import { CategoryHubView } from "@/components/tools/CategoryHubView";

export const metadata: Metadata = {
  title: "Free Online Finance Tools – EMI, SIP, Salary & Tax Calculators | Toolqivo",
  description: "Calculate EMI, SIP returns, salary, GST, PPF, FD/RD and more with Toolqivo's free finance tools. Accurate and instant results.",
  keywords: ["finance tools","emi calculator","sip calculator","salary calculator","gst calculator","ppf calculator"],
  alternates: { canonical: "https://toolqivo.com/finance" },
  openGraph: {
    title: "Free Online Finance Tools – EMI, SIP, Salary & Tax Calculators | Toolqivo",
    description: "Calculate EMI, SIP returns, salary, GST, PPF, FD/RD and more with Toolqivo's free finance tools. Accurate and instant results.",
    url: "https://toolqivo.com/finance",
    siteName: "Toolqivo",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Online Finance Tools – EMI, SIP, Salary & Tax Calculators | Toolqivo",
    description: "Calculate EMI, SIP returns, salary, GST, PPF, FD/RD and more with Toolqivo's free finance tools. Accurate and instant results.",
  },
};

export default function FinancePage() {
  const category = CATEGORIES.find((c) => c.id === "finance")!;
  const tools = TOOLS.filter((t) => t.category === "finance");
  return <CategoryHubView category={category} tools={tools} />;
}
