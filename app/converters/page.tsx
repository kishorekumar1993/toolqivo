import React from "react";
import { Metadata } from "next";
import { CATEGORIES } from "@/data/categories";
import { TOOLS } from "@/data/tools";
import { CategoryHubView } from "@/components/tools/CategoryHubView";

export const metadata: Metadata = {
  title: "Free Online Unit & Currency Converters | Toolqivo",
  description:
    "Convert units of length, weight, temperature, and exchange rates with Toolqivo.",
};

export default function ConvertersHubPage() {
  const category = CATEGORIES.find((c) => c.id === "converters")!;
  const tools = TOOLS.filter((t) => t.category === "converters");

  return <CategoryHubView category={category} tools={tools} />;
}
