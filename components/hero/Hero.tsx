import React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, TrendingUp } from "lucide-react";
import { HeroSearch } from "./HeroSearch";
import { HeroVisual } from "./HeroVisual";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-8 pb-16 lg:pt-14 lg:pb-24 bg-gradient-to-b from-blue-50/50 via-white to-white dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950 border-b border-slate-100 dark:border-slate-800/60">
      {/* Background radial highlight */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(59,130,246,0.12),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(59,130,246,0.08),rgba(0,0,0,0))] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center max-w-3xl mx-auto">
          {/* Subtle Top Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/80 dark:bg-blue-950/70 border border-blue-200/80 dark:border-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-6 shadow-xs animate-fade-in">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Fast, Free & Privacy-Friendly Online Tools</span>
          </div>

          {/* Main H1 Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.12]">
            Simple Tools.{" "}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 bg-clip-text text-transparent">
              Smarter Results.
            </span>
          </h1>

          {/* Supporting Heading */}
          <p className="mt-4 text-lg sm:text-xl font-medium text-slate-700 dark:text-slate-200 leading-relaxed">
            Everything you need to work smarter, calculate faster, and get things done online.
          </p>

          {/* Detailed Description */}
          <p className="mt-2.5 text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-normal">
            Free online tools for PDFs, images, finance, calculations, conversions, utilities and more — designed to be fast, simple and easy to use.
          </p>

          {/* Search Box Component */}
          <div className="mt-8">
            <HeroSearch />
          </div>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/tools"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm shadow-md hover:shadow-hover transition-all"
            >
              <span>Explore All Tools</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href="#popular-tools"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm transition-all border border-slate-200/80 dark:border-slate-700/80"
            >
              <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Popular Tools</span>
            </a>
          </div>
        </div>

        {/* Ecosystem Visual Container */}
        <div className="mt-12 lg:mt-16">
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}
