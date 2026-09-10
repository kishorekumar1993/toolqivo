import React from "react";
import { Metadata } from "next";
import { CATEGORIES } from "@/data/categories";
import { TOOLS } from "@/data/tools";
import { CategoryHubView } from "@/components/tools/CategoryHubView";

export const metadata: Metadata = {
  title: "Free Online Utility Tools – QR Code, Password Generator & More | Toolqivo",
  description: "Generate QR codes, strong passwords, format JSON and count words with Toolqivo's free utility tools.",
  keywords: ["utility tools","qr code generator","password generator","json formatter","word counter"],
  alternates: { canonical: "https://toolqivo.com/utility-tools" },
  openGraph: {
    title: "Free Online Utility Tools – QR Code, Password Generator & More | Toolqivo",
    description: "Generate QR codes, strong passwords, format JSON and count words with Toolqivo's free utility tools.",
    url: "https://toolqivo.com/utility-tools",
    siteName: "Toolqivo",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Online Utility Tools – QR Code, Password Generator & More | Toolqivo",
    description: "Generate QR codes, strong passwords, format JSON and count words with Toolqivo's free utility tools.",
  },
};

export default function UtilityToolsPage() {
  const category = CATEGORIES.find((c) => c.id === "utility")!;
  const tools = TOOLS.filter((t) => t.category === "utility");
  return <CategoryHubView category={category} tools={tools} />;
}
