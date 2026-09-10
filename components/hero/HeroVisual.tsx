"use client";

import React from "react";
import {
  FileText,
  Image as ImageIcon,
  CreditCard,
  Calculator,
  ArrowLeftRight,
  Sparkles,
  Wrench,
  CheckCircle2,
  Lock,
  Zap,
} from "lucide-react";

export function HeroVisual() {
  return (
    <div className="relative w-full max-w-xl mx-auto lg:max-w-none flex items-center justify-center p-2 sm:p-6 select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 sm:w-96 h-72 sm:h-96 bg-gradient-to-tr from-blue-400/20 via-indigo-400/20 to-purple-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main SaaS Mockup Canvas */}
      <div className="relative w-full rounded-2xl sm:rounded-3xl bg-gradient-to-b from-white/90 to-slate-50/90 dark:from-slate-900/90 dark:to-slate-950/90 border border-slate-200/80 dark:border-slate-800 shadow-2xl shadow-blue-500/10 dark:shadow-black/40 p-4 sm:p-6 backdrop-blur-xl">
        {/* Workspace Window Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400/80" />
            <div className="w-3 h-3 rounded-full bg-amber-400/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <Lock className="w-3 h-3 text-emerald-500" />
            <span>toolqivo.com/studio</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md">
            <Zap className="w-3 h-3" />
            <span>Instant</span>
          </div>
        </div>

        {/* Central Ecosystem Grid & Connected Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Card 1: PDF Studio */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-red-100 dark:border-red-900/30 shadow-xs hover:border-red-300 dark:hover:border-red-800 transition-all group">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-500 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 rounded">
                PDF
              </span>
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Compress & Merge</p>
            <p className="text-[11px] text-slate-400 mt-0.5">High fidelity output</p>
          </div>

          {/* Card 2: Image Studio */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-emerald-100 dark:border-emerald-900/30 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-800 transition-all group">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-500 flex items-center justify-center">
                <ImageIcon className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                Image
              </span>
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Resize & Convert</p>
            <p className="text-[11px] text-slate-400 mt-0.5">WebP, PNG & JPG</p>
          </div>

          {/* Card 3: Finance Engine */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-blue-100 dark:border-blue-900/30 shadow-xs hover:border-blue-300 dark:hover:border-blue-800 transition-all group">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-500 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded">
                Finance
              </span>
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100">EMI & SIP Pro</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Amortization tables</p>
          </div>

          {/* Card 4: Precision Calculators */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-purple-100 dark:border-purple-900/30 shadow-xs hover:border-purple-300 dark:hover:border-purple-800 transition-all group">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-500 flex items-center justify-center">
                <Calculator className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded">
                Math
              </span>
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Age & Percent</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Accurate formulas</p>
          </div>

          {/* Card 5: Smart Converters */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-amber-100 dark:border-amber-900/30 shadow-xs hover:border-amber-300 dark:hover:border-amber-800 transition-all group">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-500 flex items-center justify-center">
                <ArrowLeftRight className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">
                Convert
              </span>
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Units & Currency</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Real-time ratios</p>
          </div>

          {/* Card 6: AI Intelligence */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-yellow-100 dark:border-yellow-900/30 shadow-xs hover:border-yellow-300 dark:hover:border-yellow-800 transition-all group">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-yellow-50 dark:bg-yellow-950/50 text-yellow-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/40 px-1.5 py-0.5 rounded">
                AI Fast
              </span>
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Summarize & Edit</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Instant key takeaways</p>
          </div>
        </div>

        {/* Unified Ecosystem Status Bar */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
            <span className="font-medium">100% Client-Side Ready</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Zero Server Wait</span>
        </div>
      </div>

      {/* Floating Modern Accent Badge */}
      <div className="hidden sm:flex absolute -bottom-3 -right-3 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl items-center gap-2 text-xs font-semibold animate-pulse-subtle">
        <Sparkles className="w-3.5 h-3.5 text-yellow-400 dark:text-amber-500" />
        <span>One Unified Platform</span>
      </div>
    </div>
  );
}
