import React from "react";
import { Metadata } from "next";
import { CATEGORIES } from "@/data/categories";
import { TOOLS } from "@/data/tools";
import { CategoryHubView } from "@/components/tools/CategoryHubView";

export const metadata: Metadata = {
  title: "Free Online PDF Tools – Compress, Merge, Split & Convert | Toolqivo",
  description:
    "Edit, compress, merge, convert and manage PDF documents easily with Toolqivo. 100% free and client-side safe.",
};

export default function PdfToolsPage() {
  const category = CATEGORIES.find((c) => c.id === "pdf")!;
  const tools = TOOLS.filter((t) => t.category === "pdf");

  return <CategoryHubView category={category} tools={tools} />;
}
