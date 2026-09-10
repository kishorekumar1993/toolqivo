import React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { TOOLS } from "@/data/tools";
import { ToolCard } from "@/components/popular/ToolCard";

export function NewTools() {
  // Select tools flagged as new or representative tools from each major category
  const newAndUseful = [
    TOOLS.find((t) => t.id === "qr-code-generator")!,
    TOOLS.find((t) => t.id === "ai-text-summarizer")!,
    TOOLS.find((t) => t.id === "password-generator")!,
    TOOLS.find((t) => t.id === "jpg-to-webp")!,
    TOOLS.find((t) => t.id === "compound-interest-calculator")!,
    TOOLS.find((t) => t.id === "word-to-pdf")!,
  ].filter(Boolean);

  return (
    <section className="py-16 sm:py-24 bg-slate-50/70 dark:bg-slate-900/40 border-b border-slate-200/80 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Recently Added & Updated</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              New & Useful Tools
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-xl">
              Freshly launched utilities and smart helpers added to the Toolqivo platform.
            </p>
          </div>

          <Link
            href="/tools"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 group"
          >
            <span>See All Additions</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* 6 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {newAndUseful.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </div>
    </section>
  );
}
