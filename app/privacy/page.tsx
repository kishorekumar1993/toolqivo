import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | Toolqivo",
  description: "Read about how Toolqivo protects your documents and data with privacy-first architecture.",
};

export default function PrivacyPage() {
  return (
    <div className="py-12 sm:py-16 bg-slate-50/60 dark:bg-slate-950 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-6">
          <Link href="/" className="hover:text-blue-600">Home</Link>
          <span>/</span>
          <span className="text-slate-900 dark:text-white font-medium">Privacy Policy</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Privacy-First Commitment</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Toolqivo Privacy Policy
            </h1>
            <p className="text-xs text-slate-400 mt-1">Last Updated: 2026</p>
          </div>

          <h2 className="text-lg font-bold text-slate-900 dark:text-white">1. Client-Side Processing</h2>
          <p>
            Where technically supported by modern web browsers, file manipulations (such as image compression, password generation, date calculations, and basic PDF utilities) execute directly inside your browser using client-side execution. Your files and calculation inputs are not transmitted to or stored on remote servers.
          </p>

          <h2 className="text-lg font-bold text-slate-900 dark:text-white">2. Transient Server Processing</h2>
          <p>
            For specialized tools requiring server capabilities, files are uploaded securely over encrypted SSL/TLS connections, processed in isolated temporary sandboxes, and automatically purged. We do not inspect, retain, or train artificial intelligence models on your documents.
          </p>

          <h2 className="text-lg font-bold text-slate-900 dark:text-white">3. Zero Compulsory Registration</h2>
          <p>
            You can access all standard tools anonymously without providing personal identifiable information, credit cards, or phone numbers.
          </p>

          <h2 className="text-lg font-bold text-slate-900 dark:text-white">4. Cookies & Analytics</h2>
          <p>
            We use minimal cookies strictly necessary for maintaining user preferences (such as light/dark mode selection).
          </p>
        </div>
      </div>
    </div>
  );
}
