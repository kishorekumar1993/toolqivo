import React from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { TOOLS } from "@/data/tools";
import { ToolWorkspaceView } from "@/components/tools/ToolWorkspaceView";

interface PageProps { params: { slug: string }; }

const BASE = "https://toolqivo.com";

export async function generateStaticParams() {
  return TOOLS.filter((t) => t.category === "ai").map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const tool = TOOLS.find((t) => t.slug === params.slug && t.category === "ai");
  if (!tool) return { title: "Tool Not Found | Toolqivo" };
  const title = `${tool.name} - Free AI Tool Online | Toolqivo`;
  const url = `${BASE}${tool.route}`;
  return {
    title,
    description: tool.description,
    keywords: [tool.name, ...tool.keywords, "free ai tool", "toolqivo"],
    alternates: { canonical: url },
    openGraph: { title, description: tool.description, url, siteName: "Toolqivo", type: "website", locale: "en_US" },
    twitter: { card: "summary_large_image", title, description: tool.description },
  };
}

export default function AiToolDetailPage({ params }: PageProps) {
  const tool = TOOLS.find((t) => t.slug === params.slug && t.category === "ai");
  if (!tool) notFound();
  return <ToolWorkspaceView tool={tool} />;
}