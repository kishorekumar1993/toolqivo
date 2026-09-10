"use client";

import React, { useState, useMemo } from "react";
import {
  BarChart3,
  DollarSign,
  Calendar,
  Sparkles,
  PieChart,
  Layers,
  Download,
  Copy,
  Check,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { Tool } from "@/data/types";
import { downloadFile } from "@/lib/download";

interface CompoundInterestWorkspaceProps {
  tool: Tool;
}

type CompoundingFreq = "annually" | "semiAnnually" | "quarterly" | "monthly" | "daily";
type ContributionTiming = "end" | "beginning";

export function CompoundInterestWorkspace({ tool }: CompoundInterestWorkspaceProps) {
  const [currency, setCurrency] = useState<string>("$");

  // Inputs
  const [principal, setPrincipal] = useState<number>(50000);
  const [monthlyContribution, setMonthlyContribution] = useState<number>(1000);
  const [annualRate, setAnnualRate] = useState<number>(10);
  const [years, setYears] = useState<number>(15);
  const [compoundingFreq, setCompoundingFreq] = useState<CompoundingFreq>("monthly");
  const [timing, setTiming] = useState<ContributionTiming>("end");

  // Inflation
  const [adjustInflation, setAdjustInflation] = useState<boolean>(false);
  const [inflationRate, setInflationRate] = useState<number>(4);

  const [copied, setCopied] = useState<boolean>(false);

  const freqMap: Record<CompoundingFreq, { n: number; label: string }> = {
    daily: { n: 365, label: "Daily" },
    monthly: { n: 12, label: "Monthly" },
    quarterly: { n: 4, label: "Quarterly" },
    semiAnnually: { n: 2, label: "Semi-Annually" },
    annually: { n: 1, label: "Annually" },
  };

  // Calculations
  const calculations = useMemo(() => {
    const P = Math.max(0, principal);
    const PMT = Math.max(0, monthlyContribution);
    const r = annualRate / 100;
    const n = freqMap[compoundingFreq].n;
    const t = Math.max(1, years);
    const inf = inflationRate / 100;

    let balance = P;
    let totalInvested = P;

    const schedule: Array<{
      year: number;
      startingBalance: number;
      depositThisYear: number;
      interestEarnedThisYear: number;
      endingBalance: number;
      totalInvested: number;
      realValue: number;
    }> = [];

    // Monthly compound simulation
    for (let y = 1; y <= t; y++) {
      const yearStartBal = balance;
      let yearDeposit = 0;

      for (let m = 1; m <= 12; m++) {
        if (timing === "beginning") {
          balance += PMT;
          yearDeposit += PMT;
          totalInvested += PMT;
        }

        // Apply monthly interest proportional to compounding frequency
        const monthlyRate = Math.pow(1 + r / n, n / 12) - 1;
        balance *= 1 + monthlyRate;

        if (timing === "end") {
          balance += PMT;
          yearDeposit += PMT;
          totalInvested += PMT;
        }
      }

      const interestThisYear = Math.round(balance - yearStartBal - yearDeposit);
      const realVal = Math.round(balance / Math.pow(1 + inf, y));

      schedule.push({
        year: y,
        startingBalance: Math.round(yearStartBal),
        depositThisYear: yearDeposit,
        interestEarnedThisYear: Math.max(0, interestThisYear),
        endingBalance: Math.round(balance),
        totalInvested: totalInvested,
        realValue: realVal,
      });
    }

    const futureValue = Math.round(balance);
    const totalInterest = Math.max(0, futureValue - totalInvested);
    const principalPercent = Math.max(1, Math.round((totalInvested / futureValue) * 100));
    const interestPercent = 100 - principalPercent;

    return {
      totalInvested,
      totalInterest,
      futureValue,
      principalPercent,
      interestPercent,
      schedule,
    };
  }, [principal, monthlyContribution, annualRate, years, compoundingFreq, timing, inflationRate]);

  const copySummary = () => {
    const text =
      `Toolqivo Compound Interest Growth Summary\n` +
      `-----------------------------------------\n` +
      `Initial Principal: ${currency} ${principal.toLocaleString()}\n` +
      `Monthly Contribution: ${currency} ${monthlyContribution.toLocaleString()}\n` +
      `Interest Rate: ${annualRate}% p.a. (Compounded ${freqMap[compoundingFreq].label})\n` +
      `Investment Horizon: ${years} Years\n` +
      `Total Deposited: ${currency} ${calculations.totalInvested.toLocaleString()}\n` +
      `Total Compound Interest: +${currency} ${calculations.totalInterest.toLocaleString()}\n` +
      `Future Portfolio Value: ${currency} ${calculations.futureValue.toLocaleString()}\n` +
      `Calculated 100% privately via Toolqivo Finance Engine.`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportCsv = () => {
    const rows = [
      ["Toolqivo Compound Interest Growth Statement"],
      ["Initial Principal", calculations.totalInvested],
      ["Rate of Return", `${annualRate}%`],
      ["Compounding Frequency", freqMap[compoundingFreq].label],
      ["Future Portfolio Value", calculations.futureValue],
      ["Total Compound Interest", calculations.totalInterest],
      [""],
      [
        "Year",
        "Starting Balance",
        "Deposit in Year",
        "Interest Earned",
        "Ending Balance",
        "Cumulative Invested",
        "Real Value (Inflation Adjusted)",
      ],
      ...calculations.schedule.map((s) => [
        `Year ${s.year}`,
        s.startingBalance,
        s.depositThisYear,
        s.interestEarnedThisYear,
        s.endingBalance,
        s.totalInvested,
        s.realValue,
      ]),
    ];

    const csvContent = rows.map((r) => r.join(",")).join("\n");
    downloadFile(new Blob([csvContent], { type: "text/csv;" }), "Toolqivo-Compound-Interest-Schedule.csv");
  };

  return (
    <div className="space-y-8">
      {/* Top Bar: Compounding Frequency & Currency */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-bold text-slate-500 mr-1 shrink-0">Compounding:</span>
          {(["annually", "quarterly", "monthly", "daily"] as CompoundingFreq[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setCompoundingFreq(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                compoundingFreq === f
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              }`}
            >
              {freqMap[f].label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          {["$", "₹", "€", "£", "AED"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setCurrency(s)}
              className={`px-2.5 py-1 text-xs font-bold font-mono rounded-lg transition-all ${
                currency === s ? "bg-blue-600 text-white shadow-xs" : "text-slate-500"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Inputs */}
        <div className="lg:col-span-7 space-y-6">
          {/* Initial Principal */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-blue-600" />
                <span>Initial Investment Principal</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
                  {currency}
                </span>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  value={principal}
                  onChange={(e) => setPrincipal(Math.max(0, Number(e.target.value)))}
                  className="w-36 sm:w-44 pl-7 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono font-bold text-sm text-right focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <input
              type="range"
              min="0"
              max={currency === "₹" ? 5000000 : 500000}
              step={currency === "₹" ? 25000 : 2500}
              value={principal}
              onChange={(e) => setPrincipal(Number(e.target.value))}
              className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          {/* Regular Monthly Contribution */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Regular Monthly Contribution</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
                  {currency}
                </span>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={monthlyContribution}
                  onChange={(e) => setMonthlyContribution(Math.max(0, Number(e.target.value)))}
                  className="w-32 sm:w-36 pl-7 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono font-bold text-sm text-right focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <input
              type="range"
              min="0"
              max={currency === "₹" ? 200000 : 10000}
              step={currency === "₹" ? 1000 : 100}
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(Number(e.target.value))}
              className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />

            <div className="flex items-center justify-between text-xs pt-1 text-slate-500">
              <span>Deposited at:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTiming("end")}
                  className={`px-2 py-0.5 rounded font-bold ${
                    timing === "end" ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700" : "text-slate-400"
                  }`}
                >
                  End of Month
                </button>
                <button
                  type="button"
                  onClick={() => setTiming("beginning")}
                  className={`px-2 py-0.5 rounded font-bold ${
                    timing === "beginning" ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700" : "text-slate-400"
                  }`}
                >
                  Beginning of Month
                </button>
              </div>
            </div>
          </div>

          {/* Interest Rate & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-slate-800 dark:text-slate-200">
                <span>Annual Return Rate</span>
                <span className="font-mono text-emerald-600 text-sm">{annualRate}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="25"
                step="0.5"
                value={annualRate}
                onChange={(e) => setAnnualRate(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-slate-800 dark:text-slate-200">
                <span>Investment Horizon</span>
                <span className="font-mono text-violet-600 text-sm">{years} Years</span>
              </div>
              <input
                type="range"
                min="1"
                max="40"
                step="1"
                value={years}
                onChange={(e) => setYears(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-600"
              />
            </div>
          </div>
        </div>

        {/* Right Results Card */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-700 text-white shadow-xl shadow-blue-500/10 space-y-6">
            <div>
              <span className="text-xs uppercase tracking-wider font-extrabold text-blue-100 block">
                Future Portfolio Balance
              </span>
              <p className="text-4xl sm:text-5xl font-black font-mono tracking-tight mt-2">
                {currency} {calculations.futureValue.toLocaleString()}
              </p>
              <p className="text-xs text-blue-100 mt-1">
                over {years} years at {annualRate}% annual compound return
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/20 text-xs font-mono">
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs">
                <span className="text-[11px] text-blue-100 block">Total Deposited</span>
                <span className="text-base sm:text-lg font-extrabold text-white">
                  {currency} {calculations.totalInvested.toLocaleString()}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs">
                <span className="text-[11px] text-blue-100 block">Compound Interest</span>
                <span className="text-base sm:text-lg font-extrabold text-amber-300">
                  +{currency} {calculations.totalInterest.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={copySummary}
                className="py-2.5 px-3 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied!" : "Copy Summary"}</span>
              </button>

              <button
                type="button"
                onClick={exportCsv}
                className="py-2.5 px-3 rounded-xl bg-white text-blue-700 hover:bg-blue-50 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Year-by-Year Growth Table */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Compound Growth Amortization Schedule</span>
          </span>
          <button
            type="button"
            onClick={exportCsv}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase font-bold text-[11px]">
                <th className="py-2.5 px-4">Year</th>
                <th className="py-2.5 px-4">Starting Bal</th>
                <th className="py-2.5 px-4">Deposits</th>
                <th className="py-2.5 px-4 text-amber-600">Interest Earned</th>
                <th className="py-2.5 px-4 text-right">Ending Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {calculations.schedule.map((s) => (
                <tr key={s.year} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">Year {s.year}</td>
                  <td className="py-2.5 px-4">{currency} {s.startingBalance.toLocaleString()}</td>
                  <td className="py-2.5 px-4">+{currency} {s.depositThisYear.toLocaleString()}</td>
                  <td className="py-2.5 px-4 text-amber-600 font-bold">+{currency} {s.interestEarnedThisYear.toLocaleString()}</td>
                  <td className="py-2.5 px-4 text-right font-black text-slate-900 dark:text-white">
                    {currency} {s.endingBalance.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
        <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
        <p>
          <strong>100% Private Client-Side Calculation:</strong> All compound interest projections and exponential curves are calculated locally with zero data transfer.
        </p>
      </div>
    </div>
  );
}
