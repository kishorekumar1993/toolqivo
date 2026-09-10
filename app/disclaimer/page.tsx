import React from "react";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Disclaimer | Toolqivo",
  description: "General disclaimer regarding calculations, conversions, and information on Toolqivo.",
};

export default function DisclaimerPage() {
  return (
    <div className="py-12 sm:py-16 bg-slate-50/60 dark:bg-slate-950 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-6">
          <Link href="/" className="hover:text-blue-600">Home</Link>
          <span>/</span>
          <span className="text-slate-900 dark:text-white font-medium">Disclaimer</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-6">
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Website & Calculator Disclaimer
            </h1>
            <p className="text-xs text-slate-400 mt-1">Effective Date: 2026</p>
          </div>

          <h2 className="text-lg font-bold text-slate-900 dark:text-white">1. Informational Purposes Only</h2>
          <p>
            All calculators, currency converters, tax estimates, and financial projections provided by Toolqivo are designed for informational and educational estimation purposes only. They do not constitute formal legal, accounting, tax, or financial advisory services.
          </p>

          <h2 className="text-lg font-bold text-slate-900 dark:text-white">2. Accuracy & Variations</h2>
          <p>
            While we strive to keep financial formulas, exchange rates, and tax rules up to date according to government publications, actual values may vary based on bank-specific fees, floating interest rate compounding cycles, and changing regional legislations. Always verify critical computations with certified professionals.
          </p>
        </div>
      </div>
    </div>
  );
}
