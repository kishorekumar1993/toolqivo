import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { Layers, ShieldCheck, Zap, Globe, Sparkles, Heart } from "lucide-react";

export const metadata: Metadata = {
  title: "About Toolqivo – Simple Tools. Smarter Results.",
  description:
    "Learn about Toolqivo's mission to provide fast, privacy-friendly, free online tools to millions worldwide.",
};

export default function AboutPage() {
  return (
    <div className="py-12 sm:py-16 bg-slate-50/60 dark:bg-slate-950 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-6">
          <Link href="/" className="hover:text-blue-600">Home</Link>
          <span>/</span>
          <span className="text-slate-900 dark:text-white font-medium">About Toolqivo</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Our Platform Mission</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              About Toolqivo
            </h1>
            <p className="mt-4 text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Toolqivo was founded with one straightforward goal: to build a clean, unified platform for everyday digital utilities without paywalls, bloated software, or privacy compromises.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <ShieldCheck className="w-6 h-6 text-emerald-500 mb-2" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Privacy First</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                We design client-side processing wherever possible so your files never leave your device.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <Zap className="w-6 h-6 text-blue-500 mb-2" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Instant Speed</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Zero artificial waiting queues or subscription upsells. Work gets done immediately.
              </p>
            </div>
          </div>

          <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">A Global Standard</h2>
            <p>
              Whether you are compressing a critical legal contract, calculating your home loan EMI, resizing marketing images, or checking tax deductions in your country, Toolqivo is built to deliver precision and ease.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
