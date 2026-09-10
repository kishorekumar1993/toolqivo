import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { BookOpen, ArrowRight, Calendar, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Guides & Articles – Productivity, PDFs & Calculations | Toolqivo",
  description:
    "Learn best practices for file compression, image optimization, mortgage calculations, and digital productivity.",
};

export default function BlogPage() {
  const articles = [
    {
      title: "How to Reduce PDF File Size Without Losing Crisp Visual Quality",
      excerpt: "A complete guide to lossy vs lossless PDF compression, DPI settings, and removing bloated metadata.",
      category: "PDF Guide",
      date: "May 2026",
      readTime: "4 min read",
      slug: "compress-pdf-guide",
    },
    {
      title: "Understanding EMI Calculations: How Loan Interest Actually Works",
      excerpt: "Breaking down the reducing balance method, amortization schedules, and how prepayments save thousands.",
      category: "Finance",
      date: "April 2026",
      readTime: "6 min read",
      slug: "understanding-emi-calculation",
    },
    {
      title: "Why WebP is Replacing PNG and JPG on the Modern Web",
      excerpt: "Explore 30% smaller file sizes, faster Core Web Vitals, and transparent alpha channels with WebP.",
      category: "Image Optimization",
      date: "April 2026",
      readTime: "5 min read",
      slug: "webp-vs-png-jpg",
    },
  ];

  return (
    <div className="py-12 sm:py-16 bg-slate-50/60 dark:bg-slate-950 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-6">
          <Link href="/" className="hover:text-blue-600">Home</Link>
          <span>/</span>
          <span className="text-slate-900 dark:text-white font-medium">Guides & Blog</span>
        </div>

        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Productivity Guides</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Toolqivo Learning Hub
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-300">
            Helpful tutorials, optimization techniques, and calculation breakdowns.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {articles.map((article) => (
            <article
              key={article.slug}
              className="flex flex-col justify-between p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-card hover:-translate-y-1 transition-all group"
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                  {article.category}
                </span>
                <h2 className="mt-3 text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {article.title}
                </h2>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {article.excerpt}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{article.readTime}</span>
                </div>
                <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                  <span>Read Guide</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
