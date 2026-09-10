import React from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { TOOLS } from "@/data/tools";
import { ToolWorkspaceView } from "@/components/tools/ToolWorkspaceView";

interface PageProps {
  params: { slug: string };
}

export async function generateStaticParams() {
  return TOOLS.filter((t) => t.category === "pdf").map((t) => ({
    slug: t.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const tool = TOOLS.find((t) => t.slug === params.slug && t.category === "pdf");
  if (!tool) return { title: "Tool Not Found | Toolqivo" };

  return {
    title: `${tool.name} – Free Online Tool | Toolqivo`,
    description: tool.description,
  };
}

export default function PdfToolDetailPage({ params }: PageProps) {
  const tool = TOOLS.find((t) => t.slug === params.slug && t.category === "pdf");
  if (!tool) {
    notFound();
  }

  return <ToolWorkspaceView tool={tool} />;
}
