import React from "react";
import { Metadata } from "next";
import { CATEGORIES } from "@/data/categories";
import { TOOLS } from "@/data/tools";
import { CategoryHubView } from "@/components/tools/CategoryHubView";

export const metadata: Metadata = {
  title: "Free AI Tools Online – AI Summarizer & AI Rewriter | Toolqivo",
  description: "Use free AI-powered tools to summarize, rewrite and enhance text. Fast, smart and browser-based AI tools.",
  keywords: ["ai tools","ai text summarizer","ai paraphraser","ai rewriter","ai content tools"],
  alternates: { canonical: "https://toolqivo.com/ai-tools" },
  openGraph: {
    title: "Free AI Tools Online – AI Summarizer & AI Rewriter | Toolqivo",
    description: "Use free AI-powered tools to summarize, rewrite and enhance text. Fast, smart and browser-based AI tools.",
    url: "https://toolqivo.com/ai-tools",
    siteName: "Toolqivo",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free AI Tools Online – AI Summarizer & AI Rewriter | Toolqivo",
    description: "Use free AI-powered tools to summarize, rewrite and enhance text. Fast, smart and browser-based AI tools.",
  },
};

export default function AiToolsPage() {
  const category = CATEGORIES.find((c) => c.id === "ai")!;
  const tools = TOOLS.filter((t) => t.category === "ai");
  return <CategoryHubView category={category} tools={tools} />;
}
