import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { Globe, ArrowRight } from "lucide-react";
import { COUNTRIES } from "@/data/countries";

export const metadata: Metadata = {
  title: "Country-Specific Calculators & Regional Tools | Toolqivo",
  description:
    "Explore localized tax, financial, and utility tools for India, USA, UK, Canada, Australia, UAE, Qatar, Oman.",
};

export default function CountryHubPage() {
  return (
    <div className="py-12 sm:py-16 bg-slate-50/60 dark:bg-slate-950 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-6">
          <Link href="/" className="hover:text-blue-600">Home</Link>
          <span>/</span>
          <span className="text-slate-900 dark:text-white font-medium">Country Tools</span>
        </div>

        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-pink-600 dark:text-pink-400 mb-2">
            <Globe className="w-3.5 h-3.5" />
            <span>Global Regional Directory</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Tools Built For Your Country
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-300">
            Select your country to access calculators and tools tailored to your local tax laws, currency, and regulations.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {COUNTRIES.map((country) => (
            <Link
              key={country.id}
              href={country.route}
              className="group p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-card hover:-translate-y-1 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl" role="img" aria-label={country.name}>
                  {country.flag}
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {country.currency} ({country.symbol})
                </span>
              </div>

              <h2 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                {country.name}
              </h2>

              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">
                {country.description}
              </p>

              <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-pink-600 dark:text-pink-400">
                <span>View Regional Tools</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
