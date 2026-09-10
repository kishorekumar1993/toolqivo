import { MetadataRoute } from "next";
import { TOOLS } from "@/data/tools";
import { CATEGORIES } from "@/data/categories";
import { COUNTRIES } from "@/data/countries";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://toolqivo.com";

  // Static routes
  const staticRoutes = [
    "",
    "/tools",
    "/pdf-tools",
    "/image-tools",
    "/finance",
    "/calculators",
    "/converters",
    "/country",
    "/ai-tools",
    "/utility-tools",
    "/blog",
    "/about",
    "/contact",
    "/privacy",
    "/terms",
    "/disclaimer",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: route === "" ? 1.0 : 0.8,
  }));

  // Tool detail routes
  const toolRoutes = TOOLS.map((tool) => ({
    url: `${baseUrl}${tool.route}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: tool.popular ? 0.9 : 0.7,
  }));

  // Country detail routes
  const countryRoutes = COUNTRIES.map((c) => ({
    url: `${baseUrl}${c.route}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...toolRoutes, ...countryRoutes];
}
