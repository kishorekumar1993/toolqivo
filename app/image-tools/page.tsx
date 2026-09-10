import React from "react";
import { Metadata } from "next";
import { CATEGORIES } from "@/data/categories";
import { TOOLS } from "@/data/tools";
import { CategoryHubView } from "@/components/tools/CategoryHubView";

export const metadata: Metadata = {
  title: "Free Online Image Tools – Compress, Resize & Convert | Toolqivo",
  description:
    "Compress, resize and convert images to WebP, PNG, JPG with Toolqivo. Instant and losslessly optimized.",
};

export default function ImageToolsPage() {
  const category = CATEGORIES.find((c) => c.id === "image")!;
  const tools = TOOLS.filter((t) => t.category === "image");

  return <CategoryHubView category={category} tools={tools} />;
}
