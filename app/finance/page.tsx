import React from "react";
import { Metadata } from "next";
import { CATEGORIES } from "@/data/categories";
import { TOOLS } from "@/data/tools";
import { CategoryHubView } from "@/components/tools/CategoryHubView";

export const metadata: Metadata = {
  title: "Free Online Finance Tools & Calculators | Toolqivo",
  description:
    "Calculate loan EMIs, SIP mutual fund growth, GST, salary in-hand pay, and compound interest with Toolqivo.",
};

export default function FinanceHubPage() {
  const category = CATEGORIES.find((c) => c.id === "finance")!;
  const tools = TOOLS.filter((t) => t.category === "finance");

  return <CategoryHubView category={category} tools={tools} />;
}
