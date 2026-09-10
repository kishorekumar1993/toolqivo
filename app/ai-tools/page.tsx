import React from "react";
import { Metadata } from "next";
import { CATEGORIES } from "@/data/categories";
import { TOOLS } from "@/data/tools";
import { CategoryHubView } from "@/components/tools/CategoryHubView";

export const metadata: Metadata = {
  title: "Free AI Online Tools – Text Summarizer & Paraphraser | Toolqivo",
  description:
    "Accelerate your writing, summarizing and coding workflow with Toolqivo smart AI utilities.",
};

export default function AiToolsHubPage() {
  const category = CATEGORIES.find((c) => c.id === "ai")!;
  const tools = TOOLS.filter((t) => t.category === "ai");

  return <CategoryHubView category={category} tools={tools} />;
}
