export type ToolCategoryId =
  | "pdf"
  | "image"
  | "finance"
  | "calculators"
  | "converters"
  | "country"
  | "utility"
  | "ai";

export interface Tool {
  id: string;
  name: string;
  slug: string;
  category: ToolCategoryId;
  description: string;
  iconName: string; // Lucide icon identifier
  keywords: string[];
  aliases: string[];
  countries?: string[]; // ISO country codes or country names if specific
  popular?: boolean;
  featured?: boolean;
  isNew?: boolean;
  badge?: string;
  route: string;
}

export interface ToolCategory {
  id: ToolCategoryId;
  name: string;
  slug: string;
  description: string;
  iconName: string;
  color: string;
  bgLight: string;
  bgDark: string;
  textAccent: string;
  borderAccent: string;
  toolCount: string;
  route: string;
}

export interface CountryProfile {
  id: string;
  name: string;
  code: string;
  flag: string; // Unicode flag emoji or SVG indicator
  currency: string;
  symbol: string;
  description: string;
  popularTools: string[];
  route: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}
