import React from "react";
import Link from "next/link";
import {
  CreditCard,
  BadgePercent,
  TrendingUp,
  Receipt,
  DollarSign,
  Landmark,
  Repeat,
  ShieldCheck,
  BarChart3,
  ArrowRight,
} from "lucide-react";

export function FinanceFeature() {
  const financeCalculators = [
    {
      name: "EMI Calculator",
      desc: "Loan EMIs, total interest payout & amortization schedules",
      icon: BadgePercent,
      href: "/finance/emi-calculator",
      badge: "Popular",
    },
    {
      name: "SIP Calculator",
      desc: "Mutual fund wealth compounding and expected returns",
      icon: TrendingUp,
      href: "/finance/sip-calculator",
      badge: "Popular",
    },
    {
      name: "Salary Calculator",
      desc: "Gross to in-hand take home pay after tax deductions",
      icon: DollarSign,
      href: "/finance/salary-calculator",
    },
    {
      name: "GST Calculator",
      desc: "Inclusive and exclusive sales tax and GST calculations",
      icon: Receipt,
      href: "/finance/gst-calculator",
    },
    {
      name: "FD Calculator",
      desc: "Fixed Deposit interest payout and maturity sum",
      icon: Landmark,
      href: "/finance/fd-calculator",
    },
    {
      name: "RD Calculator",
      desc: "Recurring Deposit systematic monthly savings returns",
      icon: Repeat,
      href: "/finance/rd-calculator",
    },
    {
      name: "PPF Calculator",
      desc: "15-year Public Provident Fund growth and tax benefits",
      icon: ShieldCheck,
      href: "/finance/ppf-calculator",
    },
    {
      name: "Compound Interest",
      desc: "Exponential compounding with monthly or yearly deposits",
      icon: BarChart3,
      href: "/finance/compound-interest-calculator",
    },
  ];

  return (
    <section className="py-16 sm:py-24 bg-slate-50/70 dark:bg-slate-900/40 border-b border-slate-200/80 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2">
            <CreditCard className="w-3.5 h-3.5" />
            <span>Financial Precision</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Make Better Financial Decisions
          </h2>
          <p className="mt-2.5 text-sm sm:text-base text-slate-600 dark:text-slate-300">
            Simple calculators for loans, investments, savings, and taxes built with clear charts and accurate formulas.
          </p>
        </div>

        {/* 8 Finance Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {financeCalculators.map((calc) => {
            const Icon = calc.icon;
            return (
              <Link
                key={calc.name}
                href={calc.href}
                className="group flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-hover hover:-translate-y-1 transition-all duration-200"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    {calc.badge && (
                      <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full">
                        {calc.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {calc.name}
                  </h3>

                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                    {calc.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
                  <span>Calculate Now</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-10 text-center">
          <Link
            href="/finance"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm hover:shadow-hover transition-all"
          >
            <span>Explore All Finance Tools</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
