"use client";

import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Sparkles,
  PieChart,
  Layers,
  ArrowRight,
  Download,
  Copy,
  Check,
  Zap,
  ShieldCheck,
  Target,
  Sliders,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Tool } from "@/data/types";
import { downloadFile } from "@/lib/download";

interface SipCalculatorWorkspaceProps {
  tool: Tool;
}

type SipMode = "sip" | "lumpsum" | "stepup" | "goal";

interface YearlySipItem {
  year: number;
  monthlyDeposit: number;
  yearlyDeposit: number;
  totalInvested: number;
  interestEarnedYear: number;
  totalInterest: number;
  futureValue: number;
  realPurchasingPower: number;
}

export function SipCalculatorWorkspace({ tool }: SipCalculatorWorkspaceProps) {
  const [currency, setCurrency] = useState<string>("$");
  const [mode, setMode] = useState<SipMode>("sip");

  // Core Inputs
  const [monthlyInvestment, setMonthlyInvestment] = useState<number>(10000);
  const [lumpsumInvestment, setLumpsumInvestment] = useState<number>(100000);
  const [expectedReturnRate, setExpectedReturnRate] = useState<number>(12);
  const [investmentPeriodYears, setInvestmentPeriodYears] = useState<number>(15);

  // Step-Up SIP
  const [annualStepUpPercent, setAnnualStepUpPercent] = useState<number>(10);

  // Goal Planner
  const [targetWealthGoal, setTargetWealthGoal] = useState<number>(10000000);

  // Inflation Adjuster
  const [adjustInflation, setAdjustInflation] = useState<boolean>(false);
  const [inflationRate, setInflationRate] = useState<number>(6);

  // UI state
  const [copied, setCopied] = useState<boolean>(false);
  const [expandedYear, setExpandedYear] = useState<number | null>(null);

  // Quick Currency Switcher
  const handleCurrencyChange = (newSym: string) => {
    if (newSym === currency) return;
    const oldSym = currency;
    setCurrency(newSym);

    if (newSym === "₹" && oldSym !== "₹") {
      setMonthlyInvestment((prev) => Math.round(prev * 75));
      setLumpsumInvestment((prev) => Math.round(prev * 75));
      setTargetWealthGoal(10000000); // 1 Crore
    } else if (newSym !== "₹" && oldSym === "₹") {
      setMonthlyInvestment((prev) => Math.max(50, Math.round(prev / 75)));
      setLumpsumInvestment((prev) => Math.max(500, Math.round(prev / 75)));
      setTargetWealthGoal(1000000); // 1 Million
    }
  };

  // Quick Amount Selectors
  const quickAmounts = useMemo(() => {
    if (currency === "₹") {
      return [
        { label: "₹2,500", val: 2500 },
        { label: "₹5,000", val: 5000 },
        { label: "₹10,000", val: 10000 },
        { label: "₹25,000", val: 25000 },
        { label: "₹50,000", val: 50000 },
        { label: "₹1 Lakh", val: 100000 },
      ];
    }
    return [
      { label: "$100", val: 100 },
      { label: "$250", val: 250 },
      { label: "$500", val: 500 },
      { label: "$1,000", val: 1000 },
      { label: "$2,500", val: 2500 },
      { label: "$5,000", val: 5000 },
    ];
  }, [currency]);

  // Calculations
  const calculations = useMemo(() => {
    const r = expectedReturnRate / 12 / 100;
    const infRate = inflationRate / 100;
    const years = Math.max(1, investmentPeriodYears);

    let totalInvested = 0;
    let maturityValue = 0;
    const yearlyBreakdown: YearlySipItem[] = [];

    if (mode === "goal") {
      // Calculate required monthly SIP to achieve Target Wealth
      // Target = PMT * [((1+r)^N - 1) / r] * (1+r)
      const totalMonths = years * 12;
      const factor = r > 0 ? ((Math.pow(1 + r, totalMonths) - 1) / r) * (1 + r) : totalMonths;
      const requiredMonthly = Math.round(targetWealthGoal / factor);

      let runningBalance = 0;
      let cumulativeInvested = 0;

      for (let y = 1; y <= years; y++) {
        let yearDeposit = 0;
        let interestYear = 0;

        for (let m = 1; m <= 12; m++) {
          runningBalance = (runningBalance + requiredMonthly) * (1 + r);
          yearDeposit += requiredMonthly;
          cumulativeInvested += requiredMonthly;
        }

        interestYear = Math.round(runningBalance - (cumulativeInvested - yearDeposit));
        const realVal = Math.round(runningBalance / Math.pow(1 + infRate, y));

        yearlyBreakdown.push({
          year: y,
          monthlyDeposit: requiredMonthly,
          yearlyDeposit: yearDeposit,
          totalInvested: cumulativeInvested,
          interestEarnedYear: Math.max(0, interestYear),
          totalInterest: Math.max(0, Math.round(runningBalance - cumulativeInvested)),
          futureValue: Math.round(runningBalance),
          realPurchasingPower: realVal,
        });
      }

      totalInvested = cumulativeInvested;
      maturityValue = Math.round(runningBalance);

      return {
        totalInvested,
        estReturns: Math.max(0, maturityValue - totalInvested),
        maturityValue,
        requiredMonthly,
        yearlyBreakdown,
        investedPercent: Math.round((totalInvested / maturityValue) * 100),
        returnsPercent: 100 - Math.round((totalInvested / maturityValue) * 100),
      };
    } else if (mode === "lumpsum") {
      // One-time compound growth: A = P * (1 + r)^n
      const P = lumpsumInvestment;
      const annualR = expectedReturnRate / 100;
      totalInvested = P;

      for (let y = 1; y <= years; y++) {
        const val = Math.round(P * Math.pow(1 + annualR, y));
        const prevVal = Math.round(P * Math.pow(1 + annualR, y - 1));
        const realVal = Math.round(val / Math.pow(1 + infRate, y));

        yearlyBreakdown.push({
          year: y,
          monthlyDeposit: 0,
          yearlyDeposit: y === 1 ? P : 0,
          totalInvested: P,
          interestEarnedYear: val - prevVal,
          totalInterest: val - P,
          futureValue: val,
          realPurchasingPower: realVal,
        });
      }

      maturityValue = Math.round(P * Math.pow(1 + annualR, years));
    } else if (mode === "stepup") {
      // Step-Up SIP (increases by annualStepUpPercent each year)
      let currentMonthly = monthlyInvestment;
      let runningBalance = 0;
      let cumulativeInvested = 0;

      for (let y = 1; y <= years; y++) {
        let yearDeposit = 0;
        const startBalance = runningBalance;

        for (let m = 1; m <= 12; m++) {
          runningBalance = (runningBalance + currentMonthly) * (1 + r);
          yearDeposit += currentMonthly;
          cumulativeInvested += currentMonthly;
        }

        const realVal = Math.round(runningBalance / Math.pow(1 + infRate, y));

        yearlyBreakdown.push({
          year: y,
          monthlyDeposit: Math.round(currentMonthly),
          yearlyDeposit: yearDeposit,
          totalInvested: cumulativeInvested,
          interestEarnedYear: Math.round(runningBalance - startBalance - yearDeposit),
          totalInterest: Math.max(0, Math.round(runningBalance - cumulativeInvested)),
          futureValue: Math.round(runningBalance),
          realPurchasingPower: realVal,
        });

        // Increase monthly deposit for next year
        currentMonthly = Math.round(currentMonthly * (1 + annualStepUpPercent / 100));
      }

      totalInvested = cumulativeInvested;
      maturityValue = Math.round(runningBalance);
    } else {
      // Standard Regular Monthly SIP
      let runningBalance = 0;
      let cumulativeInvested = 0;

      for (let y = 1; y <= years; y++) {
        let yearDeposit = 0;
        const startBalance = runningBalance;

        for (let m = 1; m <= 12; m++) {
          runningBalance = (runningBalance + monthlyInvestment) * (1 + r);
          yearDeposit += monthlyInvestment;
          cumulativeInvested += monthlyInvestment;
        }

        const realVal = Math.round(runningBalance / Math.pow(1 + infRate, y));

        yearlyBreakdown.push({
          year: y,
          monthlyDeposit: monthlyInvestment,
          yearlyDeposit: yearDeposit,
          totalInvested: cumulativeInvested,
          interestEarnedYear: Math.round(runningBalance - startBalance - yearDeposit),
          totalInterest: Math.max(0, Math.round(runningBalance - cumulativeInvested)),
          futureValue: Math.round(runningBalance),
          realPurchasingPower: realVal,
        });
      }

      totalInvested = cumulativeInvested;
      maturityValue = Math.round(runningBalance);
    }

    const estReturns = Math.max(0, maturityValue - totalInvested);
    const investedPercent = Math.max(1, Math.round((totalInvested / maturityValue) * 100));
    const returnsPercent = 100 - investedPercent;

    return {
      totalInvested,
      estReturns,
      maturityValue,
      yearlyBreakdown,
      investedPercent,
      returnsPercent,
      requiredMonthly: 0,
    };
  }, [
    mode,
    monthlyInvestment,
    lumpsumInvestment,
    expectedReturnRate,
    investmentPeriodYears,
    annualStepUpPercent,
    targetWealthGoal,
    inflationRate,
  ]);

  const copySummary = () => {
    const text =
      `Toolqivo SIP Investment Plan Summary\n` +
      `------------------------------------\n` +
      `Investment Strategy: ${mode.toUpperCase()} Mode\n` +
      (mode === "goal"
        ? `Target Wealth Goal: ${currency} ${targetWealthGoal.toLocaleString()}\nRequired Monthly SIP: ${currency} ${calculations.requiredMonthly.toLocaleString()}\n`
        : mode === "lumpsum"
        ? `One-Time Lumpsum: ${currency} ${lumpsumInvestment.toLocaleString()}\n`
        : `Monthly SIP: ${currency} ${monthlyInvestment.toLocaleString()}\n` +
          (mode === "stepup" ? `Annual Step-Up: ${annualStepUpPercent}%\n` : "")) +
      `Expected Return Rate: ${expectedReturnRate}% p.a.\n` +
      `Duration: ${investmentPeriodYears} Years\n` +
      `Total Invested: ${currency} ${calculations.totalInvested.toLocaleString()}\n` +
      `Estimated Wealth Gains: +${currency} ${calculations.estReturns.toLocaleString()}\n` +
      `Total Maturity Wealth: ${currency} ${calculations.maturityValue.toLocaleString()}\n` +
      (adjustInflation
        ? `Real Purchasing Power (${inflationRate}% inflation): ${currency} ${calculations.yearlyBreakdown[calculations.yearlyBreakdown.length - 1]?.realPurchasingPower.toLocaleString()}\n`
        : "") +
      `Generated 100% privately via Toolqivo Finance Engine.`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const exportCsv = () => {
    const headers = [
      "Year",
      "Monthly Deposit",
      "Yearly Deposit",
      "Cumulative Invested",
      "Interest Earned (Year)",
      "Total Returns to Date",
      "Expected Maturity Value",
      "Inflation Adjusted Value",
    ];

    const rows = calculations.yearlyBreakdown.map((item) => [
      `Year ${item.year}`,
      item.monthlyDeposit,
      item.yearlyDeposit,
      item.totalInvested,
      item.interestEarnedYear,
      item.totalInterest,
      item.futureValue,
      item.realPurchasingPower,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    downloadFile(blob, `Toolqivo-SIP-Growth-Schedule.csv`);
  };

  return (
    <div className="space-y-8">
      {/* Strategy Modes & Currency Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs">
        {/* Strategy Switcher */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "sip", label: "Monthly SIP", icon: TrendingUp },
            { id: "stepup", label: "Step-Up SIP (+Top-up)", icon: Zap },
            { id: "lumpsum", label: "One-Time Lumpsum", icon: DollarSign },
            { id: "goal", label: "Target Goal Planner", icon: Target },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = mode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setMode(item.id as SipMode)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-400"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Currency Switcher */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs font-bold text-slate-500 mr-1">Currency:</span>
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            {["$", "₹", "£", "€", "AED"].map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => handleCurrencyChange(sym)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all ${
                  currency === sym
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {sym}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Interactive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Interactive Input Controls & Sliders */}
        <div className="lg:col-span-7 space-y-6">
          {/* Target Wealth Mode Input */}
          {mode === "goal" && (
            <div className="p-5 sm:p-6 rounded-3xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-blue-600" />
                  <span>Target Wealth Goal</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
                    {currency}
                  </span>
                  <input
                    type="number"
                    min="10000"
                    step="50000"
                    value={targetWealthGoal}
                    onChange={(e) => setTargetWealthGoal(Math.max(1000, Number(e.target.value)))}
                    className="w-36 sm:w-44 pl-7 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-sm text-right focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <input
                type="range"
                min="50000"
                max={currency === "₹" ? 50000000 : 5000000}
                step="50000"
                value={targetWealthGoal}
                onChange={(e) => setTargetWealthGoal(Number(e.target.value))}
                className="w-full h-2.5 bg-blue-200 dark:bg-blue-900 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
          )}

          {/* Investment Amount Input (Monthly or Lumpsum) */}
          {mode !== "goal" && (
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  <span>{mode === "lumpsum" ? "One-Time Investment" : "Monthly SIP Amount"}</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
                    {currency}
                  </span>
                  <input
                    type="number"
                    min="500"
                    step="500"
                    value={mode === "lumpsum" ? lumpsumInvestment : monthlyInvestment}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value));
                      if (mode === "lumpsum") setLumpsumInvestment(val);
                      else setMonthlyInvestment(val);
                    }}
                    className="w-36 sm:w-44 pl-7 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono font-bold text-sm text-right focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <input
                type="range"
                min={mode === "lumpsum" ? 5000 : 500}
                max={
                  mode === "lumpsum"
                    ? currency === "₹" ? 10000000 : 1000000
                    : currency === "₹" ? 200000 : 10000
                }
                step={mode === "lumpsum" ? 5000 : 500}
                value={mode === "lumpsum" ? lumpsumInvestment : monthlyInvestment}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (mode === "lumpsum") setLumpsumInvestment(val);
                  else setMonthlyInvestment(val);
                }}
                className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />

              {/* Quick Pick Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mr-1">
                  Presets:
                </span>
                {quickAmounts.map((q) => (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => {
                      if (mode === "lumpsum") setLumpsumInvestment(q.val * 10);
                      else setMonthlyInvestment(q.val);
                    }}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                      (mode === "lumpsum" ? lumpsumInvestment : monthlyInvestment) === q.val
                        ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                    }`}
                  >
                    {mode === "lumpsum" ? `${currency}${((q.val * 10) / 1000).toFixed(0)}k` : q.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step-Up SIP Configuration */}
          {mode === "stepup" && (
            <div className="p-5 sm:p-6 rounded-3xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 shadow-xs space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-600" />
                  <span>Annual Step-Up Increment (% per year)</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={annualStepUpPercent}
                    onChange={(e) => setAnnualStepUpPercent(Math.max(1, Number(e.target.value)))}
                    className="w-20 pl-3 pr-6 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-sm text-right focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    %
                  </span>
                </div>
              </div>

              <input
                type="range"
                min="5"
                max="30"
                step="1"
                value={annualStepUpPercent}
                onChange={(e) => setAnnualStepUpPercent(Number(e.target.value))}
                className="w-full h-2.5 bg-amber-200 dark:bg-amber-900 rounded-lg appearance-none cursor-pointer accent-amber-600"
              />

              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                Your monthly SIP contribution will automatically increase by{" "}
                <strong>{annualStepUpPercent}%</strong> each year to match salary hikes.
              </p>
            </div>
          )}

          {/* Expected Return Rate */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Expected Return Rate (p.a.)</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="35"
                  step="0.5"
                  value={expectedReturnRate}
                  onChange={(e) => setExpectedReturnRate(Math.max(1, Number(e.target.value)))}
                  className="w-24 pl-3 pr-7 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono font-bold text-sm text-right focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  %
                </span>
              </div>
            </div>

            <input
              type="range"
              min="4"
              max="25"
              step="0.5"
              value={expectedReturnRate}
              onChange={(e) => setExpectedReturnRate(Number(e.target.value))}
              className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mr-1">
                Typical Returns:
              </span>
              {[
                { label: "8% (Debt/FD)", val: 8 },
                { label: "10% (Conservative)", val: 10 },
                { label: "12% (Nifty/Index)", val: 12 },
                { label: "15% (Mid/Small Cap)", val: 15 },
              ].map((r) => (
                <button
                  key={r.label}
                  type="button"
                  onClick={() => setExpectedReturnRate(r.val)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors ${
                    expectedReturnRate === r.val
                      ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Investment Time Period */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-violet-600" />
                <span>Investment Horizon</span>
              </label>
              <span className="text-sm font-black font-mono text-violet-600 dark:text-violet-400">
                {investmentPeriodYears} Years ({investmentPeriodYears * 12} Months)
              </span>
            </div>

            <input
              type="range"
              min="1"
              max="35"
              step="1"
              value={investmentPeriodYears}
              onChange={(e) => setInvestmentPeriodYears(Number(e.target.value))}
              className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-600"
            />

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {[3, 5, 10, 15, 20, 25, 30].map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setInvestmentPeriodYears(yr)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors ${
                    investmentPeriodYears === yr
                      ? "bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 ring-1 ring-violet-500"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  {yr} Yrs
                </button>
              ))}
            </div>
          </div>

          {/* Inflation Adjuster Toggle */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                id="adjustInflation"
                type="checkbox"
                checked={adjustInflation}
                onChange={(e) => setAdjustInflation(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="adjustInflation" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                Adjust for Inflation (Real Purchasing Power)
              </label>
            </div>
            {adjustInflation && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-400">Rate:</span>
                <input
                  type="number"
                  min="2"
                  max="15"
                  value={inflationRate}
                  onChange={(e) => setInflationRate(Number(e.target.value))}
                  className="w-14 px-2 py-0.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-center font-mono"
                />
                <span className="text-xs text-slate-400">%</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Rich KPI Display & Donut Visuals */}
        <div className="lg:col-span-5 space-y-6">
          {/* Main Maturity Headline Card */}
          <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-xl shadow-emerald-600/10 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-extrabold text-emerald-100 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Expected Maturity Wealth</span>
                </span>
                <span className="text-[10px] font-bold bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                  {expectedReturnRate}% p.a.
                </span>
              </div>
              <p className="text-4xl sm:text-5xl font-black font-mono tracking-tight mt-2">
                {currency} {calculations.maturityValue.toLocaleString()}
              </p>
              <p className="text-xs text-emerald-100 mt-1">
                accumulated over {investmentPeriodYears} years
              </p>
            </div>

            {/* Target Goal Mode Badge */}
            {mode === "goal" && (
              <div className="p-3.5 rounded-2xl bg-white/15 backdrop-blur-xs text-xs space-y-1">
                <span className="text-[11px] text-emerald-100 uppercase tracking-wider font-bold block">
                  Required Monthly SIP:
                </span>
                <span className="text-2xl font-black font-mono text-amber-300 block">
                  {currency} {calculations.requiredMonthly?.toLocaleString()} / month
                </span>
              </div>
            )}

            {/* Quick KPI Row */}
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/20 text-xs">
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs">
                <span className="text-[11px] text-emerald-100 block">Total Invested</span>
                <span className="text-base sm:text-lg font-extrabold font-mono text-white">
                  {currency} {calculations.totalInvested.toLocaleString()}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs">
                <span className="text-[11px] text-emerald-100 block">Estimated Gain</span>
                <span className="text-base sm:text-lg font-extrabold font-mono text-amber-300">
                  +{currency} {calculations.estReturns.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Inflation Adjusted Metric */}
            {adjustInflation && (
              <div className="flex items-center justify-between text-xs pt-1 text-emerald-100 border-t border-white/10">
                <span>Real Purchasing Power ({inflationRate}% Inf):</span>
                <span className="font-bold text-white font-mono bg-white/15 px-2 py-0.5 rounded-lg">
                  {currency}{" "}
                  {calculations.yearlyBreakdown[
                    calculations.yearlyBreakdown.length - 1
                  ]?.realPurchasingPower.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Visual Donut Chart */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <PieChart className="w-4 h-4 text-emerald-600" />
              <span>Investment vs Wealth Gain Breakdown</span>
            </span>

            <div className="flex items-center justify-center gap-6">
              {/* SVG Donut Chart */}
              <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  {/* Background Circle (Gains - Emerald) */}
                  <path
                    className="text-emerald-500"
                    strokeWidth="4.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* Principal Invested Segment (Blue) */}
                  <path
                    className="text-blue-600"
                    strokeDasharray={`${calculations.investedPercent}, 100`}
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Gain Multiplier</span>
                  <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                    {(calculations.maturityValue / Math.max(1, calculations.totalInvested)).toFixed(1)}x
                  </span>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-3 text-xs min-w-0">
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 rounded-md bg-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-slate-500 font-semibold block text-[11px]">Amount Invested</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {currency} {calculations.totalInvested.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400 block">({calculations.investedPercent}%)</span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 rounded-md bg-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-slate-500 font-semibold block text-[11px]">Est. Wealth Gain</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      +{currency} {calculations.estReturns.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400 block">({calculations.returnsPercent}%)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={copySummary}
                className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied!" : "Copy Summary"}</span>
              </button>

              <button
                type="button"
                onClick={exportCsv}
                className="py-2.5 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Yearly Growth Schedule Table */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-600" />
              <span>Year-by-Year Wealth Accumulation Schedule</span>
            </span>
            <p className="text-xs text-slate-500 mt-0.5">
              Annual compound growth trajectory showing invested principal vs generated wealth.
            </p>
          </div>
          <button
            type="button"
            onClick={exportCsv}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            title="Download Schedule as CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-4">Year</th>
                <th className="py-3 px-4">Yearly Deposit</th>
                <th className="py-3 px-4">Total Invested</th>
                <th className="py-3 px-4 text-emerald-600">Interest Earned</th>
                <th className="py-3 px-4 text-right">Expected Maturity</th>
                {adjustInflation && <th className="py-3 px-4 text-right">Real Value</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {calculations.yearlyBreakdown.map((item) => (
                <tr key={item.year} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">Year {item.year}</td>
                  <td className="py-3 px-4">{currency} {item.yearlyDeposit.toLocaleString()}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                    {currency} {item.totalInvested.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-emerald-600 font-bold">
                    +{currency} {item.interestEarnedYear.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">
                    {currency} {item.futureValue.toLocaleString()}
                  </td>
                  {adjustInflation && (
                    <td className="py-3 px-4 text-right text-slate-500">
                      {currency} {item.realPurchasingPower.toLocaleString()}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security note */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
        <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
        <p>
          <strong>100% Private Client-Side Calculation:</strong> All compound returns and financial projections are evaluated locally in your browser with zero server data storage.
        </p>
      </div>
    </div>
  );
}
