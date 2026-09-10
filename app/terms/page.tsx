import React from "react";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Toolqivo",
  description: "Terms and conditions governing the use of Toolqivo online tools and services.",
};

export default function TermsPage() {
  return (
    <div className="py-12 sm:py-16 bg-slate-50/60 dark:bg-slate-950 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-6">
          <Link href="/" className="hover:text-blue-600">Home</Link>
          <span>/</span>
          <span className="text-slate-900 dark:text-white font-medium">Terms of Service</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-6">
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Terms of Service
            </h1>
            <p className="text-xs text-slate-400 mt-1">Effective Date: 2026</p>
          </div>

          <h2 className="text-lg font-bold text-slate-900 dark:text-white">1. Acceptance of Terms</h2>
          <p>
            By accessing and using Toolqivo, you agree to comply with and be bound by these terms. If you do not agree with any part of these terms, please do not use our services.
          </p>

          <h2 className="text-lg font-bold text-slate-900 dark:text-white">2. Acceptable Use</h2>
          <p>
            You agree not to use Toolqivo for any unlawful purposes, including but not limited to transmitting viruses, copyright infringement, or attempting to compromise service availability.
          </p>

          <h2 className="text-lg font-bold text-slate-900 dark:text-white">3. Intellectual Property</h2>
          <p>
            All platform interfaces, branding, software code, and curated databases belong to Toolqivo. You retain full intellectual property ownership of any documents or files you process using our tools.
          </p>
        </div>
      </div>
    </div>
  );
}
