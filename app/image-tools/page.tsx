import React from "react";
import { Metadata } from "next";
import { CATEGORIES } from "@/data/categories";
import { TOOLS } from "@/data/tools";
import { CategoryHubView } from "@/components/tools/CategoryHubView";

export const metadata: Metadata = {
  title: "Free Online Image Tools – Compress, Resize & Convert Images | Toolqivo",
  description: "Compress, resize, convert and edit images online for free. Fast and browser-based image tools with no upload required.",
  keywords: ["image tools","image compressor","image resizer","jpg to png","png to jpg","image converter"],
  alternates: { canonical: "https://toolqivo.com/image-tools" },
  openGraph: {
    title: "Free Online Image Tools – Compress, Resize & Convert Images | Toolqivo",
    description: "Compress, resize, convert and edit images online for free. Fast and browser-based image tools with no upload required.",
    url: "https://toolqivo.com/image-tools",
    siteName: "Toolqivo",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Online Image Tools – Compress, Resize & Convert Images | Toolqivo",
    description: "Compress, resize, convert and edit images online for free. Fast and browser-based image tools with no upload required.",
  },
};

export default function ImageToolsPage() {
  const category = CATEGORIES.find((c) => c.id === "image")!;
  const tools = TOOLS.filter((t) => t.category === "image");
  return <CategoryHubView category={category} tools={tools} />;
}
