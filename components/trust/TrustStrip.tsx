import React from "react";
import { Zap, ShieldCheck, Smartphone, Layers } from "lucide-react";

export function TrustStrip() {
  const valueItems = [
    {
      icon: Layers,
      title: "Growing Tool Library",
      description: "Constantly expanding collection of PDF, image, finance and daily utilities.",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/40",
    },
    {
      icon: Zap,
      title: "Fast & Easy",
      description: "Intuitive workflows with zero learning curve and instant results.",
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950/40",
    },
    {
      icon: ShieldCheck,
      title: "Privacy Friendly",
      description: "Browser-based client processing designed to keep your personal data private.",
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/40",
    },
    {
      icon: Smartphone,
      title: "Works on Any Device",
      description: "Optimized responsive interface for mobile phones, tablets, and desktop computers.",
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/40",
    },
  ];

  return (
    <section className="py-10 sm:py-12 bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-200/70 dark:border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {valueItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="flex items-start gap-4 p-4.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-card transition-all"
              >
                <div
                  className={`p-2.5 rounded-xl ${item.bgColor} ${item.color} shrink-0`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    {item.title}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
