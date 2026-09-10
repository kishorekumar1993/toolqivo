import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { ArrowLeft, ArrowRight, Globe, ShieldCheck, Sparkles } from "lucide-react";
import { COUNTRIES } from "@/data/countries";
import { TOOLS } from "@/data/tools";
import { ToolCard } from "@/components/popular/ToolCard";

interface PageProps {
  params: { countryId: string };
}

export async function generateStaticParams() {
  return COUNTRIES.map((c) => ({
    countryId: c.id,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const country = COUNTRIES.find((c) => c.id === params.countryId);
  if (!country) return { title: "Country Not Found | Toolqivo" };

  return {
    title: `${country.name} Online Tools & Calculators | Toolqivo`,
    description: `Access tools and tax calculators tailored for ${country.name} (${country.currency}).`,
  };
}

export default function CountryDetailPage({ params }: PageProps) {
  const country = COUNTRIES.find((c) => c.id === params.countryId);
  if (!country) {
    notFound();
  }

  // Recommended finance and utility tools for this country
  const countryTools = TOOLS.filter((t) => t.category === "finance" || t.category === "calculators").slice(0, 8);

  return (
    <div className="py-12 sm:py-16 bg-slate-50/60 dark:bg-slate-950 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-6">
          <Link href="/" className="hover:text-blue-600">Home</Link>
          <span>/</span>
          <Link href="/country" className="hover:text-blue-600">Country Tools</Link>
          <span>/</span>
          <span className="text-slate-900 dark:text-white font-medium">{country.name}</span>
        </div>

        {/* Hero Header */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 p-6 sm:p-10 border border-slate-200/80 dark:border-slate-800 shadow-xs mb-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <span className="text-4xl sm:text-5xl shrink-0" role="img" aria-label={country.name}>
                {country.flag}
              </span>
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-pink-600 dark:text-pink-400 mb-1">
                  <span>Regional Hub</span>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {country.name} Tools & Calculators
                </h1>
                <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl">
                  {country.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                Currency: {country.currency} ({country.symbol})
              </span>
            </div>
          </div>
        </div>

        {/* Regional Tools Grid */}
        <div className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
            Popular Tools for {country.name}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {countryTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
