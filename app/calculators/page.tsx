import React from "react";
import { Metadata } from "next";
import { CATEGORIES } from "@/data/categories";
import { TOOLS } from "@/data/tools";
import { CategoryHubView } from "@/components/tools/CategoryHubView";

export const metadata: Metadata = {
  title: "Free Everyday Online Calculators | Toolqivo",
  description:
    "Everyday calculators for age, percentage, BMI, and date difference calculations on Toolqivo.",
};

export default function CalculatorsHubPage() {
  const category = CATEGORIES.find((c) => c.id === "calculators")!;
  const tools = TOOLS.filter((t) => t.category === "calculators");

  return <CategoryHubView category={category} tools={tools} />;
}
