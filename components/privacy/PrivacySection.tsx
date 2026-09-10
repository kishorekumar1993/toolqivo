import React from "react";
import Link from "next/link";
import { ShieldCheck, Cpu, Lock, UserCheck, ArrowRight } from "lucide-react";

export function PrivacySection() {
  const points = [
    {
      icon: Cpu,
      title: "Browser-Based Processing",
      description:
        "Where supported, tools process files directly inside your browser memory using client-side WebAssembly, avoiding unnecessary uploads.",
    },
    {
      icon: Lock,
      title: "Simple & Secure",
      description:
        "We do not store your documents permanently. Any transient server processing operations are deleted automatically after processing.",
    },
    {
      icon: UserCheck,
      title: "No Unnecessary Data Collection",
      description:
        "Use calculators, converters, and file utilities freely without forced registrations, credit cards, or tracking cookies.",
    },
  ];

  return (
    <section className="py-16 sm:py-24 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-8 sm:p-12 lg:p-16 shadow-2xl relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold mb-4">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>Privacy & Trust Architecture</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
              Your Files. Your Privacy.
            </h2>

            <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
              Toolqivo is designed with privacy in mind. Wherever possible, file processing can happen directly in your browser without sending files to a server.
            </p>
          </div>

          {/* 3 Privacy Pillars */}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
            {points.map((point) => {
              const Icon = point.icon;
              return (
                <div
                  key={point.title}
                  className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1.5">{point.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {point.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* CTA */}
          <div className="mt-8 relative z-10">
            <Link
              href="/privacy"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-semibold text-xs sm:text-sm shadow-sm transition-all group"
            >
              <span>Learn About Privacy</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
