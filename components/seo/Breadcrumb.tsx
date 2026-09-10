import React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  /** If true renders the JSON-LD BreadcrumbList schema too */
  withSchema?: boolean;
}

export function Breadcrumb({ items, withSchema = true }: BreadcrumbProps) {
  const BASE = "https://toolqivo.com";

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE },
      ...items
        .filter((i) => i.label !== "Home")
        .map((item, idx) => ({
          "@type": "ListItem",
          position: idx + 2,
          name: item.label,
          ...(item.href ? { item: `${BASE}${item.href}` } : {}),
        })),
    ],
  };

  return (
    <>
      {withSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      )}

      <nav aria-label="Breadcrumb" className="mb-5 sm:mb-6">
        <ol className="flex flex-wrap items-center gap-1 text-xs">
          {/* Home always first */}
          <li className="flex items-center gap-1">
            <Link
              href="/"
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors font-medium group"
              aria-label="Home"
            >
              <Home className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Home</span>
            </Link>
          </li>

          {items.map((item, idx) => {
            const isLast = idx === items.length - 1;
            return (
              <li key={idx} className="flex items-center gap-1">
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                {isLast || !item.href ? (
                  <span
                    className="px-2 py-1 rounded-lg text-slate-800 dark:text-slate-100 font-semibold max-w-[180px] truncate"
                    aria-current="page"
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className="px-2 py-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors font-medium max-w-[160px] truncate"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
