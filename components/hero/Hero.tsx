import React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, TrendingUp } from "lucide-react";
import { HeroSearch } from "./HeroSearch";
import { HeroVisual } from "./HeroVisual";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-10 pb-14 sm:pt-14 sm:pb-20 lg:pt-16 lg:pb-24 bg-gradient-to-b from-blue-50/60 via-white to-white dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950 border-b border-slate-100 dark:border-slate-800/60">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-72 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(59,130,246,0.13),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(59,130,246,0.09),rgba(0,0,0,0))] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center max-w-3xl mx-auto">

          {/* Top Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/80 dark:bg-blue-950/70 border border-blue-200/80 dark:border-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-5 sm:mb-6">
            <Sparkles className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
            <span>Fast, Free &amp; Privacy-Friendly Online Tools</span>
          </div>

          {/* H1 — tighter on mobile */}
          <h1 className="text-[2.1rem] leading-[1.1] sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight">
            Simple Tools.{" "}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-500 bg-clip-text text-transparent">
              Smarter Results.
            </span>
          </h1>

          {/* Sub-heading */}
          <p className="mt-4 text-base sm:text-xl font-medium text-slate-600 dark:text-slate-300 leading-relaxed px-2 sm:px-0">
            Everything you need to work smarter, calculate faster, and get things done online.
          </p>

          {/* Description — hidden on very small screens */}
          <p className="hidden sm:block mt-2.5 text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Free online tools for PDFs, images, finance, calculations, conversions and more — fast, simple and easy to use.
          </p>

          {/* Search */}
          <div className="mt-7 sm:mt-8">
            <HeroSearch />
          </div>

          {/* CTAs */}
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/tools"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm shadow-md hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-px active:translate-y-0 transition-all duration-200"
            >
              <span>Explore All Tools</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#popular-tools"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm transition-all border border-slate-200/80 dark:border-slate-700/80"
            >
              <TrendingUp className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              <span>Popular Tools</span>
            </a>
          </div>
        </div>

        {/* Visual */}
        <div className="mt-10 sm:mt-14 lg:mt-16">
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}
