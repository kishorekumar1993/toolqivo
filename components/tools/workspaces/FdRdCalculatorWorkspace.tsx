"use client";

import React, { useState, useMemo } from "react";
import {
  Landmark,
  Repeat,
  DollarSign,
  Calendar,
  Sparkles,
  PieChart,
  Layers,
  Download,
  Copy,
  Check,
  ShieldCheck,
  Award,
} from "lucide-react";
import { Tool } from "@/data/types";
import { downloadFile } from "@/lib/download";

interface FdRdCalculatorWorkspaceProps {
  tool: Tool;
}

type DepositType = "fd" | "rd";
type PayoutType = "cumulative" | "monthly" | "quarterly" | "halfYearly" | "annually";
type CompoundingFreq = "monthly" | "quarterly" | "halfYearly" | "annually";

export function FdRdCalculatorWorkspace({ tool }: FdRdCalculatorWorkspaceProps) {
  const [currency, setCurrency] = useState<string>("₹");
  const [depositType, setDepositType] = useState<DepositType>(
    tool.id === "rd-calculator" ? "rd" : "fd"
  );

  // Inputs
  const [depositAmount, setDepositAmount] = useState<number>(
    tool.id === "rd-calculator" ? 5000 : 100000
  );
  const [interestRate, setInterestRate] = useState<number>(7.1);
  const [tenureYears, setTenureYears] = useState<number>(3);
  const [tenureMonths, setTenureMonths] = useState<number>(0);

  // Senior Citizen & Payout Options
  const [isSeniorCitizen, setIsSeniorCitizen] = useState<boolean>(false);
  const [payoutType, setPayoutType] = useState<PayoutType>("cumulative");
  const [compoundingFreq, setCompoundingFreq] = useState<CompoundingFreq>("quarterly");

  const [copied, setCopied] = useState<boolean>(false);

  // Effective Interest Rate (Senior citizens get +0.50% bonus)
  const effectiveRate = isSeniorCitizen ? interestRate + 0.5 : interestRate;

  // Total Tenure in Years
  const totalYears = tenureYears + tenureMonths / 12;
  const totalMonths = tenureYears * 12 + tenureMonths;

  // Currency Switch
  const handleCurrencyChange = (sym: string) => {
    if (sym === currency) return;
    setCurrency(sym);
    if (sym === "$" && currency === "₹") {
      setDepositAmount((prev) => Math.max(100, Math.round(prev / 75)));
    } else if (sym === "₹" && currency !== "₹") {
      setDepositAmount((prev) => Math.round(prev * 75));
    }
  };

  // Calculations
  const calculations = useMemo(() => {
    const P = Math.max(0, depositAmount);
    const r = effectiveRate / 100;
    const t = Math.max(0.083, totalYears);

    // Compounding frequency n
    const freqMap: Record<CompoundingFreq, number> = {
      monthly: 12,
      quarterly: 4,
      halfYearly: 2,
      annually: 1,
    };
    const n = freqMap[compoundingFreq];

    let maturityAmount = 0;
    let totalDeposited = 0;
    let totalInterest = 0;
    let periodicPayout = 0;

    const schedule: Array<{
      period: string;
      deposit: number;
      interestEarned: number;
      balance: number;
    }> = [];

    if (depositType === "fd") {
      totalDeposited = P;

      if (payoutType === "cumulative") {
        // Compound Interest: A = P * (1 + r/n)^(n*t)
        maturityAmount = Math.round(P * Math.pow(1 + r / n, n * t));
        totalInterest = maturityAmount - totalDeposited;
      } else {
        // Non-Cumulative Payouts
        const payoutFreq =
          payoutType === "monthly"
            ? 12
            : payoutType === "quarterly"
            ? 4
            : payoutType === "halfYearly"
            ? 2
            : 1;

        periodicPayout = Math.round((P * r) / payoutFreq);
        totalInterest = Math.round(periodicPayout * payoutFreq * t);
        maturityAmount = P; // Principal returned at end
      }

      // Generate Year-by-Year Schedule
      for (let y = 1; y <= Math.ceil(t); y++) {
        const timeFraction = Math.min(y, t);
        const bal =
          payoutType === "cumulative"
            ? Math.round(P * Math.pow(1 + r / n, n * timeFraction))
            : P;
        const prevBal =
          y === 1
            ? P
            : payoutType === "cumulative"
            ? Math.round(P * Math.pow(1 + r / n, n * Math.min(y - 1, t)))
            : P;
        const interestYr =
          payoutType === "cumulative"
            ? bal - prevBal
            : Math.round(P * r * (timeFraction - (y - 1)));

        schedule.push({
          period: `Year ${y}`,
          deposit: y === 1 ? P : 0,
          interestEarned: interestYr,
          balance: bal,
        });
      }
    } else {
      // RECURRING DEPOSIT (RD)
      // Standard Banking RD Formula (compounded quarterly):
      // Total Months = N
      // M = P * [ (1 + i)^n - 1 ] / (1 - (1+i)^(-1/3)) where i = r/4
      const N = Math.max(1, totalMonths);
      totalDeposited = P * N;

      // RD Monthly Installment compound formula
      let rdBalance = 0;
      let cumDeposit = 0;

      for (let m = 1; m <= N; m++) {
        cumDeposit += P;
        // Each installment earns interest for remaining months
        const monthsRemaining = N - m + 1;
        const quarters = monthsRemaining / 3;
        const installmentMaturity = P * Math.pow(1 + r / 4, quarters);
        rdBalance += installmentMaturity;
      }

      maturityAmount = Math.round(rdBalance);
      totalInterest = Math.max(0, maturityAmount - totalDeposited);

      // Schedule by year
      for (let y = 1; y <= Math.ceil(t); y++) {
        const monthsInYear = Math.min(12, N - (y - 1) * 12);
        const yrDeposit = P * monthsInYear;
        schedule.push({
          period: `Year ${y}`,
          deposit: yrDeposit,
          interestEarned: Math.round((totalInterest / N) * monthsInYear),
          balance: Math.round(P * Math.min(y * 12, N) + (totalInterest / N) * Math.min(y * 12, N)),
        });
      }
    }

    const depositedPercent = Math.max(1, Math.round((totalDeposited / (maturityAmount || totalDeposited)) * 100));
    const interestPercent = 100 - depositedPercent;

    return {
      totalDeposited,
      totalInterest,
      maturityAmount,
      periodicPayout,
      depositedPercent,
      interestPercent,
      schedule,
    };
  }, [
    depositType,
    depositAmount,
    effectiveRate,
    totalYears,
    totalMonths,
    payoutType,
    compoundingFreq,
  ]);

  const copySummary = () => {
    const text =
      `Toolqivo ${depositType.toUpperCase()} Investment Summary\n` +
      `-----------------------------------------\n` +
      `Scheme: ${depositType === "fd" ? "Fixed Deposit (FD)" : "Recurring Deposit (RD)"}\n` +
      `${depositType === "fd" ? "Deposit Principal" : "Monthly Installment"}: ${currency} ${depositAmount.toLocaleString()}\n` +
      `Interest Rate: ${effectiveRate}% p.a. ${isSeniorCitizen ? "(Senior Citizen +0.5%)" : ""}\n` +
      `Tenure: ${tenureYears} Years ${tenureMonths > 0 ? `${tenureMonths} Months` : ""}\n` +
      `Total Invested: ${currency} ${calculations.totalDeposited.toLocaleString()}\n` +
      `Interest Earned: +${currency} ${calculations.totalInterest.toLocaleString()}\n` +
      `Maturity Payout Value: ${currency} ${calculations.maturityAmount.toLocaleString()}\n` +
      `Calculated 100% privately via Toolqivo Finance Engine.`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportCsv = () => {
    const rows = [
      [`Toolqivo ${depositType.toUpperCase()} Deposit Schedule`],
      ["Total Invested", calculations.totalDeposited],
      ["Interest Rate", `${effectiveRate}%`],
      ["Total Interest Earned", calculations.totalInterest],
      ["Maturity Payout", calculations.maturityAmount],
      [""],
      ["Period", "Deposit", "Interest Earned", "Closing Balance"],
      ...calculations.schedule.map((s) => [s.period, s.deposit, s.interestEarned, s.balance]),
    ];

    const csvContent = rows.map((r) => r.join(",")).join("\n");
    downloadFile(new Blob([csvContent], { type: "text/csv;" }), `Toolqivo-${depositType.toUpperCase()}-Schedule.csv`);
  };

  return (
    <div className="space-y-8">
      {/* Top Bar: FD vs RD Toggle & Currency */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setDepositType("fd");
              setDepositAmount(100000);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              depositType === "fd"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            }`}
          >
            <Landmark className="w-4 h-4" />
            <span>Fixed Deposit (FD)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setDepositType("rd");
              setDepositAmount(5000);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              depositType === "rd"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            }`}
          >
            <Repeat className="w-4 h-4" />
            <span>Recurring Deposit (RD)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Senior Citizen Checkbox */}
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <input
              type="checkbox"
              checked={isSeniorCitizen}
              onChange={(e) => setIsSeniorCitizen(e.target.checked)}
              className="w-3.5 h-3.5 text-blue-600 rounded cursor-pointer"
            />
            <span>Senior Citizen (+0.5% p.a.)</span>
          </label>

          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            {["₹", "$", "€", "£", "AED"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleCurrencyChange(s)}
                className={`px-2 py-0.5 text-xs font-bold font-mono rounded ${
                  currency === s ? "bg-blue-600 text-white" : "text-slate-500"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Inputs */}
        <div className="lg:col-span-7 space-y-6">
          {/* Deposit Amount */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-blue-600" />
                <span>{depositType === "fd" ? "Total Deposit Amount" : "Monthly Installment"}</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
                  {currency}
                </span>
                <input
                  type="number"
                  min="500"
                  step="500"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Math.max(0, Number(e.target.value)))}
                  className="w-36 sm:w-44 pl-7 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono font-bold text-sm text-right focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <input
              type="range"
              min={depositType === "fd" ? 10000 : 500}
              max={depositType === "fd" ? 5000000 : 100000}
              step={depositType === "fd" ? 10000 : 500}
              value={depositAmount}
              onChange={(e) => setDepositAmount(Number(e.target.value))}
              className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          {/* Interest Rate */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-600" />
                <span>Interest Rate (% p.a.)</span>
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="3"
                  max="15"
                  step="0.05"
                  value={interestRate}
                  onChange={(e) => setInterestRate(Math.max(0, Number(e.target.value)))}
                  className="w-20 pl-2 pr-2 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono font-bold text-sm text-center"
                />
                <span className="font-mono text-xs font-bold text-slate-400">%</span>
              </div>
            </div>

            <input
              type="range"
              min="3"
              max="12"
              step="0.1"
              value={interestRate}
              onChange={(e) => setInterestRate(Number(e.target.value))}
              className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />

            {isSeniorCitizen && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                Senior Citizen Rate Applied: <strong>{effectiveRate}% p.a.</strong> (+0.50% extra)
              </p>
            )}
          </div>

          {/* Tenure */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-violet-600" />
                <span>Tenure Duration</span>
              </label>
              <span className="font-mono font-bold text-violet-600 text-sm">
                {tenureYears} Years {tenureMonths > 0 && `${tenureMonths} Months`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">Years</span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={tenureYears}
                  onChange={(e) => setTenureYears(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-600"
                />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">Months</span>
                <input
                  type="range"
                  min="0"
                  max="11"
                  value={tenureMonths}
                  onChange={(e) => setTenureMonths(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-600"
                />
              </div>
            </div>
          </div>

          {/* FD Payout Options (if FD) */}
          {depositType === "fd" && (
            <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Interest Payout Option
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: "cumulative", label: "Cumulative (On Maturity)" },
                  { id: "monthly", label: "Monthly Payout" },
                  { id: "quarterly", label: "Quarterly Payout" },
                  { id: "halfYearly", label: "Half-Yearly Payout" },
                  { id: "annually", label: "Annual Payout" },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPayoutType(p.id as PayoutType)}
                    className={`p-2.5 rounded-xl text-left border text-xs font-bold transition-all ${
                      payoutType === p.id
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Results Card */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white shadow-xl shadow-blue-500/10 space-y-6">
            <div>
              <span className="text-xs uppercase tracking-wider font-extrabold text-blue-100 block">
                {payoutType === "cumulative" ? "Maturity Payout Value" : "Periodic Interest Payout"}
              </span>
              <p className="text-4xl sm:text-5xl font-black font-mono tracking-tight mt-2">
                {currency}{" "}
                {payoutType === "cumulative"
                  ? calculations.maturityAmount.toLocaleString()
                  : `${calculations.periodicPayout.toLocaleString()} / ${payoutType.replace("halfYearly", "6 mo")}`}
              </p>
              <p className="text-xs text-blue-100 mt-1">
                over {tenureYears} years at {effectiveRate}% p.a.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/20 text-xs font-mono">
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs">
                <span className="text-[11px] text-blue-100 block">Total Invested</span>
                <span className="text-base sm:text-lg font-extrabold text-white">
                  {currency} {calculations.totalDeposited.toLocaleString()}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs">
                <span className="text-[11px] text-blue-100 block">Interest Earned</span>
                <span className="text-base sm:text-lg font-extrabold text-amber-300">
                  +{currency} {calculations.totalInterest.toLocaleString()}
                </span>
              </div>
            </div>

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

      {/* Schedule Table */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Deposit Accumulation Schedule</span>
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
                <th className="py-2.5 px-4">Period</th>
                <th className="py-2.5 px-4">Deposit</th>
                <th className="py-2.5 px-4 text-amber-600">Interest Earned</th>
                <th className="py-2.5 px-4 text-right">Closing Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {calculations.schedule.map((s, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">{s.period}</td>
                  <td className="py-2.5 px-4">{currency} {s.deposit.toLocaleString()}</td>
                  <td className="py-2.5 px-4 text-amber-600 font-bold">+{currency} {s.interestEarned.toLocaleString()}</td>
                  <td className="py-2.5 px-4 text-right font-black text-slate-900 dark:text-white">
                    {currency} {s.balance.toLocaleString()}
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
          <strong>100% Private Client-Side Calculation:</strong> All deposit maturity schedules and quarterly compounding figures are evaluated locally with zero server tracking.
        </p>
      </div>
    </div>
  );
}
