import React from "react";
import Link from "next/link";
import { Globe, ArrowRight, MapPin } from "lucide-react";
import { COUNTRIES } from "@/data/countries";

export function CountrySection() {
  return (
    <section className="py-16 sm:py-24 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-pink-600 dark:text-pink-400 mb-2">
              <Globe className="w-3.5 h-3.5" />
              <span>Global Intelligence</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Tools Built for Your Country
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-xl">
              Get calculators and utilities tailored to local tax rules, currencies, holidays, and everyday regional needs.
            </p>
          </div>

          <Link
            href="/country"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 group"
          >
            <span>All Supported Regions</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* 8 Country Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {COUNTRIES.map((country) => (
            <Link
              key={country.id}
              href={country.route}
              className="group flex flex-col justify-between p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-pink-300 dark:hover:border-pink-900/60 shadow-2xs hover:shadow-card hover:-translate-y-1 transition-all duration-200"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl sm:text-3xl" role="img" aria-label={country.name}>
                    {country.flag}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md">
                    {country.currency} ({country.symbol})
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                  {country.name}
                </h3>

                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                  {country.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-pink-600 dark:text-pink-400">
                <span>Explore {country.name} Tools</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
