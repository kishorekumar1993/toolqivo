"use client";

import React, { useState, useMemo } from "react";
import {
  ShieldCheck,
  DollarSign,
  Calendar,
  Sparkles,
  PieChart,
  Layers,
  Download,
  Copy,
  Check,
  AlertCircle,
  Award,
  HelpCircle,
} from "lucide-react";
import { Tool } from "@/data/types";
import { downloadFile } from "@/lib/download";

interface PpfCalculatorWorkspaceProps {
  tool: Tool;
}

interface PpfPassbookItem {
  year: number;
  openingBalance: number;
  annualDeposit: number;
  interestCredited: number;
  closingBalance: number;
  loanEligibility: number;
  withdrawalEligibility: number;
}

export function PpfCalculatorWorkspace({ tool }: PpfCalculatorWorkspaceProps) {
  const [currency, setCurrency] = useState<string>("₹");
  const [yearlyDeposit, setYearlyDeposit] = useState<number>(150000);
  const [ppfRate, setPpfRate] = useState<number>(7.1);
  const [extensionYears, setExtensionYears] = useState<number>(15); // 15, 20, 25, 30
  const [copied, setCopied] = useState<boolean>(false);

  // Calculations
  const calculations = useMemo(() => {
    const deposit = Math.min(150000, Math.max(500, yearlyDeposit));
    const r = ppfRate / 100;
    const totalYears = extensionYears;

    let currentBal = 0;
    let totalInvested = 0;
    let totalInterest = 0;
    const passbook: PpfPassbookItem[] = [];

    for (let y = 1; y <= totalYears; y++) {
      const opening = currentBal;
      const interestThisYear = Math.round((opening + deposit) * r);
      const closing = opening + deposit + interestThisYear;

      currentBal = closing;
      totalInvested += deposit;
      totalInterest += interestThisYear;

      // Loan eligibility: from Year 3 to Year 6 (up to 25% of balance at end of 2nd preceding year)
      let loanEligibility = 0;
      if (y >= 3 && y <= 6 && passbook.length >= 2) {
        loanEligibility = Math.round(passbook[y - 3].closingBalance * 0.25);
      }

      // Partial withdrawal eligibility: from Year 7 onwards (up to 50% of balance at end of 4th preceding year or preceding year, whichever is lower)
      let withdrawalEligibility = 0;
      if (y >= 7 && passbook.length >= 4) {
        const bal4thPreceding = passbook[y - 5].closingBalance;
        const balPreceding = passbook[y - 2].closingBalance;
        withdrawalEligibility = Math.round(Math.min(bal4thPreceding, balPreceding) * 0.5);
      }

      passbook.push({
        year: y,
        openingBalance: opening,
        annualDeposit: deposit,
        interestCredited: interestThisYear,
        closingBalance: closing,
        loanEligibility,
        withdrawalEligibility,
      });
    }

    const maturityValue = currentBal;
    const investedPercent = Math.round((totalInvested / maturityValue) * 100);
    const interestPercent = 100 - investedPercent;

    return {
      totalInvested,
      totalInterest,
      maturityValue,
      passbook,
      investedPercent,
      interestPercent,
    };
  }, [yearlyDeposit, ppfRate, extensionYears]);

  const copySummary = () => {
    const text =
      `Toolqivo Public Provident Fund (PPF) Summary\n` +
      `---------------------------------------------\n` +
      `Yearly Contribution: ${currency} ${yearlyDeposit.toLocaleString()} (Max ₹1.5L/yr)\n` +
      `PPF Benchmark Interest Rate: ${ppfRate}% p.a. (Compounded Annually)\n` +
      `Lock-in Tenure: ${extensionYears} Years\n` +
      `Total Invested: ${currency} ${calculations.totalInvested.toLocaleString()}\n` +
      `Total Tax-Free Interest Earned: +${currency} ${calculations.totalInterest.toLocaleString()}\n` +
      `Maturity Payout Value: ${currency} ${calculations.maturityValue.toLocaleString()}\n` +
      `Tax Status: EEE (100% Tax-Exempt under Sec 80C)\n` +
      `Calculated 100% privately via Toolqivo Finance Engine.`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportPassbookCsv = () => {
    const rows = [
      ["Toolqivo PPF Passbook & Maturity Statement"],
      ["Total Invested", calculations.totalInvested],
      ["Interest Rate", `${ppfRate}% p.a.`],
      ["Total Interest Earned", calculations.totalInterest],
      ["Maturity Payout Value", calculations.maturityValue],
      ["Tax Exemption Status", "EEE (Exempt-Exempt-Exempt)"],
      [""],
      [
        "Financial Year",
        "Opening Balance",
        "Annual Deposit",
        "Interest Credited",
        "Closing Balance",
        "Loan Eligibility (25%)",
        "Withdrawal Eligibility (50%)",
      ],
      ...calculations.passbook.map((p) => [
        `Year ${p.year}`,
        p.openingBalance,
        p.annualDeposit,
        p.interestCredited,
        p.closingBalance,
        p.loanEligibility > 0 ? p.loanEligibility : "-",
        p.withdrawalEligibility > 0 ? p.withdrawalEligibility : "-",
      ]),
    ];

    const csvContent = rows.map((r) => r.join(",")).join("\n");
    downloadFile(new Blob([csvContent], { type: "text/csv;" }), "Toolqivo-PPF-Passbook.csv");
  };

  return (
    <div className="space-y-8">
      {/* Top Bar: Extension Tenure & Highlights */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 mr-1">PPF Tenure:</span>
          {[
            { yr: 15, label: "15 Yrs (Default)" },
            { yr: 20, label: "20 Yrs (+5 Ext)" },
            { yr: 25, label: "25 Yrs (+10 Ext)" },
            { yr: 30, label: "30 Yrs (+15 Ext)" },
          ].map((item) => (
            <button
              key={item.yr}
              type="button"
              onClick={() => setExtensionYears(item.yr)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                extensionYears === item.yr
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
            <Award className="w-3.5 h-3.5" />
            <span>EEE Tax-Exempt Status</span>
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Inputs */}
        <div className="lg:col-span-7 space-y-6">
          {/* Yearly Deposit Input */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-blue-600" />
                <span>Yearly PPF Contribution</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
                  {currency}
                </span>
                <input
                  type="number"
                  min="500"
                  max="150000"
                  step="500"
                  value={yearlyDeposit}
                  onChange={(e) => setYearlyDeposit(Number(e.target.value))}
                  className="w-36 sm:w-44 pl-7 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono font-bold text-sm text-right focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <input
              type="range"
              min="500"
              max="150000"
              step="500"
              value={yearlyDeposit}
              onChange={(e) => setYearlyDeposit(Number(e.target.value))}
              className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />

            {/* Quick Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mr-1">
                Presets:
              </span>
              {[10000, 25000, 50000, 75000, 100000, 150000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setYearlyDeposit(val)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                    yearlyDeposit === val
                      ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  {currency} {(val / 1000).toFixed(0)}k {val === 150000 ? "(Max 80C)" : ""}
                </button>
              ))}
            </div>

            {yearlyDeposit >= 150000 && (
              <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                Maximum statutory limit of ₹1,50,000/year under Section 80C applied.
              </p>
            )}
          </div>

          {/* PPF Benchmark Interest Rate */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Government Benchmark PPF Rate</span>
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="5"
                  max="12"
                  step="0.1"
                  value={ppfRate}
                  onChange={(e) => setPpfRate(Number(e.target.value))}
                  className="w-20 pl-2 pr-2 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono font-bold text-sm text-center"
                />
                <span className="font-mono text-xs font-bold text-slate-400">%</span>
              </div>
            </div>

            <input
              type="range"
              min="5"
              max="10"
              step="0.1"
              value={ppfRate}
              onChange={(e) => setPpfRate(Number(e.target.value))}
              className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <p className="text-[11px] text-slate-500">
              Current sovereign rate is <strong>7.1% p.a.</strong>, compounded annually and guaranteed by the Government of India.
            </p>
          </div>

          {/* Rules & Milestone Highlights */}
          <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">
              PPF Liquidity & Statutory Rules
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600 dark:text-slate-400">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-white block mb-0.5">Loan Facility</span>
                Eligible from 3rd to 6th financial year (up to 25% of balance at end of 2nd preceding year).
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-white block mb-0.5">Partial Withdrawal</span>
                Permitted from 7th year onwards (up to 50% of 4th preceding year or preceding year balance).
              </div>
            </div>
          </div>
        </div>

        {/* Right Results Card */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-xl shadow-emerald-600/10 space-y-6">
            <div>
              <span className="text-xs uppercase tracking-wider font-extrabold text-emerald-100 block">
                Total Maturity Wealth (Tax-Free)
              </span>
              <p className="text-4xl sm:text-5xl font-black font-mono tracking-tight mt-2">
                {currency} {calculations.maturityValue.toLocaleString()}
              </p>
              <p className="text-xs text-emerald-100 mt-1">
                accumulated over {extensionYears} years at {ppfRate}% p.a.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/20 text-xs font-mono">
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs">
                <span className="text-[11px] text-emerald-100 block">Total Deposited</span>
                <span className="text-base sm:text-lg font-extrabold text-white">
                  {currency} {calculations.totalInvested.toLocaleString()}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs">
                <span className="text-[11px] text-emerald-100 block">Total Interest</span>
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
                onClick={exportPassbookCsv}
                className="py-2.5 px-3 rounded-xl bg-white text-emerald-700 hover:bg-emerald-50 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Passbook</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Year-by-Year PPF Passbook Table */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>PPF Passbook Statement & Liquidity Milestones</span>
          </span>
          <button
            type="button"
            onClick={exportPassbookCsv}
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
                <th className="py-2.5 px-4">Opening Bal</th>
                <th className="py-2.5 px-4">Deposit</th>
                <th className="py-2.5 px-4 text-emerald-600">Interest Added</th>
                <th className="py-2.5 px-4">Closing Balance</th>
                <th className="py-2.5 px-4 text-amber-600">Loan Limit (25%)</th>
                <th className="py-2.5 px-4 text-cyan-600 text-right">Withdrawal (50%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {calculations.passbook.map((p) => (
                <tr key={p.year} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">Year {p.year}</td>
                  <td className="py-2.5 px-4">{currency} {p.openingBalance.toLocaleString()}</td>
                  <td className="py-2.5 px-4">{currency} {p.annualDeposit.toLocaleString()}</td>
                  <td className="py-2.5 px-4 text-emerald-600 font-bold">
                    +{currency} {p.interestCredited.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 font-black text-slate-900 dark:text-white">
                    {currency} {p.closingBalance.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-amber-600">
                    {p.loanEligibility > 0 ? `${currency} ${p.loanEligibility.toLocaleString()}` : "-"}
                  </td>
                  <td className="py-2.5 px-4 text-cyan-600 text-right">
                    {p.withdrawalEligibility > 0 ? `${currency} ${p.withdrawalEligibility.toLocaleString()}` : "-"}
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
          <strong>100% Private Client-Side Calculation:</strong> All PPF passbook entries and compounding formulas are computed locally on your device with zero data stored.
        </p>
      </div>
    </div>
  );
}
