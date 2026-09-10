import React from "react";
import { Metadata } from "next";
import { CATEGORIES } from "@/data/categories";
import { TOOLS } from "@/data/tools";
import { CategoryHubView } from "@/components/tools/CategoryHubView";

export const metadata: Metadata = {
  title: "Free Online Utility Tools – QR Code, Passwords & Formatting | Toolqivo",
  description:
    "Practical daily online tools: QR code generator, password generator, word counter, and JSON formatter.",
};

export default function UtilityToolsHubPage() {
  const category = CATEGORIES.find((c) => c.id === "utility")!;
  const tools = TOOLS.filter((t) => t.category === "utility");

  return <CategoryHubView category={category} tools={tools} />;
}
