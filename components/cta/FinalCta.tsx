import React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Layers } from "lucide-react";

export function FinalCta() {
  return (
    <section className="py-16 sm:py-20 bg-slate-50/80 dark:bg-slate-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white p-8 sm:p-14 lg:p-16 shadow-2xl shadow-blue-500/20 text-center">
          {/* Subtle grid backdrop */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

          {/* Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/15 border border-white/20 text-blue-100 text-xs font-semibold mb-6">
              <Layers className="w-3.5 h-3.5" />
              <span>Ready Whenever You Are</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
              One Platform. Hundreds of Useful Tools.
            </h2>

            <p className="mt-4 text-sm sm:text-base text-blue-100 leading-relaxed max-w-xl mx-auto">
              Find the tool you need and get things done faster. No subscriptions, no hassles, just instant productivity.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/tools"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white hover:bg-blue-50 text-blue-900 font-bold text-sm sm:text-base shadow-lg hover:shadow-xl hover:scale-102 active:scale-98 transition-all"
              >
                <span>Explore All Tools</span>
                <ArrowRight className="w-4 h-4 text-blue-600" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
