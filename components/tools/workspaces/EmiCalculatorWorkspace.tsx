"use client";

import React, { useState, useMemo, useRef } from "react";
import {
  BadgePercent,
  Calendar,
  DollarSign,
  Clock,
  ArrowRight,
  Download,
  FileSpreadsheet,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  PieChart,
  Home,
  Car,
  User,
  GraduationCap,
  Sliders,
  Zap,
  Check,
  Copy,
  RotateCcw,
  Info,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Printer,
} from "lucide-react";
import { Tool } from "@/data/types";
import { downloadFile } from "@/lib/download";

interface EmiCalculatorWorkspaceProps {
  tool: Tool;
}

type LoanType = "home" | "car" | "personal" | "education" | "custom";
type TenureUnit = "years" | "months";
type ViewMode = "yearly" | "monthly";

interface MonthlyScheduleItem {
  monthIndex: number;
  monthName: string;
  year: number;
  openingBalance: number;
  emi: number;
  principalPaid: number;
  interestPaid: number;
  extraPrepayment: number;
  totalPaid: number;
  closingBalance: number;
  loanPaidPercent: number;
}

interface YearlyScheduleItem {
  year: number;
  yearLabel: string;
  openingBalance: number;
  totalEmiPaid: number;
  principalPaid: number;
  interestPaid: number;
  extraPrepayment: number;
  totalPaid: number;
  closingBalance: number;
  loanPaidPercent: number;
  months: MonthlyScheduleItem[];
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const CURRENCIES = [
  { symbol: "$", label: "USD ($)", name: "US Dollar" },
  { symbol: "₹", label: "INR (₹)", name: "Indian Rupee" },
  { symbol: "£", label: "GBP (£)", name: "British Pound" },
  { symbol: "€", label: "EUR (€)", name: "Euro" },
  { symbol: "AED", label: "AED", name: "UAE Dirham" },
  { symbol: "A$", label: "AUD (A$)", name: "Australian Dollar" },
  { symbol: "C$", label: "CAD (C$)", name: "Canadian Dollar" },
  { symbol: "¥", label: "JPY (¥)", name: "Japanese Yen" },
];

export function EmiCalculatorWorkspace({ tool }: EmiCalculatorWorkspaceProps) {
  // Currency state
  const [currency, setCurrency] = useState<string>("$");

  // Loan Type Preset
  const [loanType, setLoanType] = useState<LoanType>("home");

  // Core Inputs
  const [principal, setPrincipal] = useState<number>(500000);
  const [interestRate, setInterestRate] = useState<number>(8.5);
  const [tenureValue, setTenureValue] = useState<number>(20);
  const [tenureUnit, setTenureUnit] = useState<TenureUnit>("years");

  // Advanced Options
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [processingFeePercent, setProcessingFeePercent] = useState<number>(0.5);
  const [startMonth, setStartMonth] = useState<number>(new Date().getMonth());
  const [startYear, setStartYear] = useState<number>(new Date().getFullYear());
  const [extraMonthlyPayment, setExtraMonthlyPayment] = useState<number>(0);
  const [lumpSumAmount, setLumpSumAmount] = useState<number>(0);
  const [lumpSumMonth, setLumpSumMonth] = useState<number>(12);

  // Amortization Schedule UI state
  const [viewMode, setViewMode] = useState<ViewMode>("yearly");
  const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const printRef = useRef<HTMLDivElement>(null);

  // Apply Presets
  const applyPreset = (type: LoanType) => {
    setLoanType(type);
    if (type === "home") {
      setPrincipal(currency === "₹" ? 5000000 : 400000);
      setInterestRate(8.5);
      setTenureValue(20);
      setTenureUnit("years");
    } else if (type === "car") {
      setPrincipal(currency === "₹" ? 1000000 : 35000);
      setInterestRate(8.75);
      setTenureValue(5);
      setTenureUnit("years");
    } else if (type === "personal") {
      setPrincipal(currency === "₹" ? 300000 : 15000);
      setInterestRate(12.0);
      setTenureValue(3);
      setTenureUnit("years");
    } else if (type === "education") {
      setPrincipal(currency === "₹" ? 1500000 : 50000);
      setInterestRate(9.5);
      setTenureValue(7);
      setTenureUnit("years");
    }
  };

  // Switch Currency with appropriate default conversions
  const handleCurrencyChange = (newSymbol: string) => {
    if (newSymbol === currency) return;
    const oldSym = currency;
    setCurrency(newSymbol);

    // Adjust scale if moving between INR and standard USD
    if (newSymbol === "₹" && oldSym !== "₹") {
      setPrincipal((prev) => Math.round(prev * 75));
    } else if (newSymbol !== "₹" && oldSym === "₹") {
      setPrincipal((prev) => Math.max(1000, Math.round(prev / 75)));
    }
  };

  // Quick Amount Selectors based on Currency
  const quickAmounts = useMemo(() => {
    if (currency === "₹") {
      return [
        { label: "₹5 Lakh", val: 500000 },
        { label: "₹10 Lakh", val: 1000000 },
        { label: "₹25 Lakh", val: 2500000 },
        { label: "₹50 Lakh", val: 5000000 },
        { label: "₹75 Lakh", val: 7500000 },
        { label: "₹1 Crore", val: 10000000 },
      ];
    }
    return [
      { label: "$10k", val: 10000 },
      { label: "$25k", val: 25000 },
      { label: "$50k", val: 50000 },
      { label: "$100k", val: 100000 },
      { label: "$250k", val: 250000 },
      { label: "$500k", val: 500000 },
      { label: "$1M", val: 1000000 },
    ];
  }, [currency]);

  // Max principal slider bounds based on currency
  const maxPrincipal = currency === "₹" ? 30000000 : 2000000;
  const principalStep = currency === "₹" ? 50000 : 5000;

  // Total Tenure Months
  const totalTenureMonths = tenureUnit === "years" ? tenureValue * 12 : tenureValue;

  // Calculations: Standard EMI
  const calculations = useMemo(() => {
    const P = Math.max(1, principal);
    const r = interestRate / 12 / 100;
    const N = Math.max(1, totalTenureMonths);

    // Standard EMI formula: E = P * r * (1 + r)^N / ((1 + r)^N - 1)
    let standardEmi = 0;
    if (r > 0) {
      standardEmi = Math.round((P * r * Math.pow(1 + r, N)) / (Math.pow(1 + r, N) - 1));
    } else {
      standardEmi = Math.round(P / N);
    }

    const standardTotalPayment = standardEmi * N;
    const standardTotalInterest = Math.max(0, standardTotalPayment - P);
    const processingFeeAmount = Math.round((P * processingFeePercent) / 100);

    // Build Amortization Schedule (accounting for extra prepayments)
    let currentBalance = P;
    const monthlySchedule: MonthlyScheduleItem[] = [];
    const yearlyMap: Record<number, YearlyScheduleItem> = {};

    let actualMonthsCount = 0;
    let totalInterestWithPrepay = 0;
    let totalPaidWithPrepay = 0;

    let calMonth = startMonth;
    let calYear = startYear;

    for (let m = 1; m <= N && currentBalance > 0.01; m++) {
      actualMonthsCount++;
      const opening = currentBalance;
      const interestForMonth = r > 0 ? Math.round(opening * r) : 0;
      let scheduledPrincipal = standardEmi - interestForMonth;

      if (scheduledPrincipal > opening) {
        scheduledPrincipal = opening;
      }

      // Add extra prepayment if applicable
      let extra = extraMonthlyPayment;
      if (lumpSumAmount > 0 && m === lumpSumMonth) {
        extra += lumpSumAmount;
      }

      // Cap extra prepayment so we don't overpay
      if (scheduledPrincipal + extra > opening) {
        extra = Math.max(0, opening - scheduledPrincipal);
      }

      const totalPrincipalThisMonth = scheduledPrincipal + extra;
      const closing = Math.max(0, opening - totalPrincipalThisMonth);
      const totalMonthPayment = interestForMonth + totalPrincipalThisMonth;

      totalInterestWithPrepay += interestForMonth;
      totalPaidWithPrepay += totalMonthPayment;
      currentBalance = closing;

      const paidPercent = Math.min(100, Math.round(((P - closing) / P) * 100));

      const monthItem: MonthlyScheduleItem = {
        monthIndex: m,
        monthName: MONTH_NAMES[calMonth],
        year: calYear,
        openingBalance: opening,
        emi: standardEmi,
        principalPaid: totalPrincipalThisMonth,
        interestPaid: interestForMonth,
        extraPrepayment: extra,
        totalPaid: totalMonthPayment,
        closingBalance: closing,
        loanPaidPercent: paidPercent,
      };

      monthlySchedule.push(monthItem);

      // Group into Yearly Schedule
      if (!yearlyMap[calYear]) {
        yearlyMap[calYear] = {
          year: calYear,
          yearLabel: `${calYear}`,
          openingBalance: opening,
          totalEmiPaid: 0,
          principalPaid: 0,
          interestPaid: 0,
          extraPrepayment: 0,
          totalPaid: 0,
          closingBalance: closing,
          loanPaidPercent: paidPercent,
          months: [],
        };
      }

      const yItem = yearlyMap[calYear];
      yItem.totalEmiPaid += standardEmi;
      yItem.principalPaid += totalPrincipalThisMonth;
      yItem.interestPaid += interestForMonth;
      yItem.extraPrepayment += extra;
      yItem.totalPaid += totalMonthPayment;
      yItem.closingBalance = closing;
      yItem.loanPaidPercent = paidPercent;
      yItem.months.push(monthItem);

      // Advance Calendar Date
      calMonth++;
      if (calMonth > 11) {
        calMonth = 0;
        calYear++;
      }
    }

    const yearlySchedule = Object.values(yearlyMap);

    // Payoff Date
    const finalMonthObj = monthlySchedule[monthlySchedule.length - 1];
    const payoffDate = finalMonthObj
      ? `${finalMonthObj.monthName} ${finalMonthObj.year}`
      : `${MONTH_NAMES[startMonth]} ${startYear + Math.ceil(N / 12)}`;

    // Prepayment Benefits
    const interestSaved = Math.max(0, standardTotalInterest - totalInterestWithPrepay);
    const monthsSaved = Math.max(0, N - actualMonthsCount);
    const yearsSaved = Math.floor(monthsSaved / 12);
    const remainingMonthsSaved = monthsSaved % 12;

    const principalPercent = Math.round((P / (P + totalInterestWithPrepay)) * 100);
    const interestPercent = 100 - principalPercent;

    return {
      standardEmi,
      standardTotalPayment,
      standardTotalInterest,
      processingFeeAmount,
      totalInterestWithPrepay,
      totalPaidWithPrepay,
      actualMonthsCount,
      payoffDate,
      interestSaved,
      monthsSaved,
      yearsSaved,
      remainingMonthsSaved,
      monthlySchedule,
      yearlySchedule,
      principalPercent,
      interestPercent,
    };
  }, [
    principal,
    interestRate,
    totalTenureMonths,
    processingFeePercent,
    startMonth,
    startYear,
    extraMonthlyPayment,
    lumpSumAmount,
    lumpSumMonth,
  ]);

  const toggleYear = (yr: number) => {
    setExpandedYears((prev) => ({ ...prev, [yr]: !prev[yr] }));
  };

  const copySummary = () => {
    const summaryText =
      `Toolqivo EMI & Loan Calculation Summary\n` +
      `----------------------------------------\n` +
      `Loan Amount: ${currency} ${principal.toLocaleString()}\n` +
      `Interest Rate: ${interestRate}% p.a.\n` +
      `Tenure: ${tenureValue} ${tenureUnit}\n` +
      `Monthly Installment (EMI): ${currency} ${calculations.standardEmi.toLocaleString()}\n` +
      `Total Interest Payable: ${currency} ${calculations.totalInterestWithPrepay.toLocaleString()}\n` +
      `Total Amount Payable: ${currency} ${calculations.totalPaidWithPrepay.toLocaleString()}\n` +
      `Loan Payoff Date: ${calculations.payoffDate}\n` +
      (calculations.interestSaved > 0
        ? `Prepayment Savings: ${currency} ${calculations.interestSaved.toLocaleString()} (Paid off ${calculations.yearsSaved}y ${calculations.remainingMonthsSaved}m earlier)\n`
        : "") +
      `Calculated 100% privately via Toolqivo Finance Engine.`;

    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  // Export Amortization Schedule to CSV
  const exportCsv = () => {
    const headers = [
      "Payment #",
      "Month/Year",
      "Opening Balance",
      "EMI",
      "Principal Paid",
      "Interest Paid",
      "Extra Prepayment",
      "Total Payment",
      "Closing Balance",
      "Loan Paid %",
    ];

    const rows = calculations.monthlySchedule.map((m) => [
      m.monthIndex,
      `${m.monthName} ${m.year}`,
      m.openingBalance,
      m.emi,
      m.principalPaid,
      m.interestPaid,
      m.extraPrepayment,
      m.totalPaid,
      m.closingBalance,
      `${m.loanPaidPercent}%`,
    ]);

    const csvContent =
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    downloadFile(blob, `Toolqivo-EMI-Amortization-Schedule.csv`);
  };

  const printOrDownloadPdf = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="space-y-8" ref={printRef}>
      {/* Header Controls: Currency & Loan Presets */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-bold text-slate-500 shrink-0 mr-1 flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5" />
            <span>Preset:</span>
          </span>
          {[
            { id: "home", label: "Home Loan", icon: Home },
            { id: "car", label: "Car Loan", icon: Car },
            { id: "personal", label: "Personal", icon: User },
            { id: "education", label: "Education", icon: GraduationCap },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = loanType === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => applyPreset(item.id as LoanType)}
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
            {CURRENCIES.slice(0, 5).map((c) => (
              <button
                key={c.symbol}
                type="button"
                onClick={() => handleCurrencyChange(c.symbol)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all ${
                  currency === c.symbol
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
                title={c.name}
              >
                {c.symbol}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Interactive Grid: Sliders & Live Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Interactive Inputs & Sliders */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Principal Loan Amount */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-blue-600" />
                <span>Principal Loan Amount</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-xs font-bold font-mono text-slate-400">
                  {currency}
                </span>
                <input
                  type="number"
                  min="1000"
                  max={maxPrincipal}
                  step={principalStep}
                  value={principal}
                  onChange={(e) => setPrincipal(Math.max(0, Number(e.target.value)))}
                  className="w-36 sm:w-44 pl-7 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono font-bold text-sm text-right focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <input
              type="range"
              min="10000"
              max={maxPrincipal}
              step={principalStep}
              value={principal}
              onChange={(e) => setPrincipal(Number(e.target.value))}
              className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />

            {/* Quick Pill Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mr-1">
                Quick Pick:
              </span>
              {quickAmounts.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => setPrincipal(q.val)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                    principal === q.val
                      ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Interest Rate */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <BadgePercent className="w-4 h-4 text-emerald-600" />
                <span>Interest Rate (% per annum)</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  min="0.5"
                  max="30"
                  step="0.05"
                  value={interestRate}
                  onChange={(e) => setInterestRate(Math.max(0, Number(e.target.value)))}
                  className="w-24 sm:w-28 pl-3 pr-7 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono font-bold text-sm text-right focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <span className="absolute right-3 text-xs font-bold font-mono text-slate-400">
                  %
                </span>
              </div>
            </div>

            <input
              type="range"
              min="1"
              max="25"
              step="0.1"
              value={interestRate}
              onChange={(e) => setInterestRate(Number(e.target.value))}
              className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />

            {/* Step Adjustment Buttons */}
            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center gap-1.5">
                {[
                  { label: "7.5%", val: 7.5 },
                  { label: "8.5%", val: 8.5 },
                  { label: "9.5%", val: 9.5 },
                  { label: "11.0%", val: 11.0 },
                  { label: "13.5%", val: 13.5 },
                ].map((r) => (
                  <button
                    key={r.label}
                    type="button"
                    onClick={() => setInterestRate(r.val)}
                    className={`px-2 py-0.5 text-[11px] font-bold rounded-lg transition-colors ${
                      interestRate === r.val
                        ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setInterestRate((prev) => Math.max(0.5, Number((prev - 0.25).toFixed(2))))}
                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 font-bold text-slate-700 dark:text-slate-300 text-xs"
                >
                  -0.25%
                </button>
                <button
                  type="button"
                  onClick={() => setInterestRate((prev) => Math.min(30, Number((prev + 0.25).toFixed(2))))}
                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 font-bold text-slate-700 dark:text-slate-300 text-xs"
                >
                  +0.25%
                </button>
              </div>
            </div>
          </div>

          {/* 3. Loan Tenure */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-violet-600" />
                <span>Loan Tenure Duration</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      if (tenureUnit === "months") {
                        setTenureValue(Math.max(1, Math.round(tenureValue / 12)));
                        setTenureUnit("years");
                      }
                    }}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                      tenureUnit === "years"
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    Years
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (tenureUnit === "years") {
                        setTenureValue(tenureValue * 12);
                        setTenureUnit("months");
                      }
                    }}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                      tenureUnit === "months"
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    Months
                  </button>
                </div>
                <input
                  type="number"
                  min="1"
                  max={tenureUnit === "years" ? 40 : 480}
                  value={tenureValue}
                  onChange={(e) => setTenureValue(Math.max(1, Number(e.target.value)))}
                  className="w-20 pl-2 pr-2 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono font-bold text-sm text-center focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <input
              type="range"
              min="1"
              max={tenureUnit === "years" ? 35 : 420}
              step="1"
              value={tenureValue}
              onChange={(e) => setTenureValue(Number(e.target.value))}
              className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-600"
            />

            {/* Quick Tenure Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {[1, 3, 5, 7, 10, 15, 20, 25, 30].map((yr) => {
                const targetVal = tenureUnit === "years" ? yr : yr * 12;
                const isSelected = tenureValue === targetVal;
                return (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => setTenureValue(targetVal)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors ${
                      isSelected
                        ? "bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 ring-1 ring-violet-500"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                    }`}
                  >
                    {yr} Yr{yr > 1 ? "s" : ""}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Advanced Options Accordion (Prepayments & Calendar) */}
          <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600">
                  Prepayment Simulator & Loan Start Date
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-blue-600 font-semibold">
                <span>{showAdvanced ? "Hide Options" : "Show Options"}</span>
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {showAdvanced && (
              <div className="space-y-4 pt-3 border-t border-slate-200 dark:border-slate-800 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Start Date */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Loan Start Date</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={startMonth}
                        onChange={(e) => setStartMonth(Number(e.target.value))}
                        className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold"
                      >
                        {MONTH_NAMES.map((m, idx) => (
                          <option key={m} value={idx}>
                            {m}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="2000"
                        max="2050"
                        value={startYear}
                        onChange={(e) => setStartYear(Number(e.target.value))}
                        className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-center"
                      />
                    </div>
                  </div>

                  {/* Processing Fee */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                      Processing Fee (% of Loan)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="5"
                        value={processingFeePercent}
                        onChange={(e) => setProcessingFeePercent(Math.max(0, Number(e.target.value)))}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">
                        % ({currency} {calculations.processingFeeAmount.toLocaleString()})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Prepayment Inputs */}
                <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 space-y-3">
                  <span className="text-xs font-bold text-blue-900 dark:text-blue-200 block">
                    ⚡ Accelerate Loan Payoff with Prepayments
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Extra Monthly Payment
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
                          {currency}
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="500"
                          value={extraMonthlyPayment}
                          onChange={(e) => setExtraMonthlyPayment(Math.max(0, Number(e.target.value)))}
                          placeholder="e.g. 2000"
                          className="w-full pl-7 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        One-Time Lump Sum Prepayment
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
                          {currency}
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="10000"
                          value={lumpSumAmount}
                          onChange={(e) => setLumpSumAmount(Math.max(0, Number(e.target.value)))}
                          placeholder="e.g. 50000"
                          className="w-full pl-7 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Premium KPI Cards & Donut Chart */}
        <div className="lg:col-span-5 space-y-6">
          {/* Main EMI Headline Card */}
          <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white shadow-xl shadow-blue-500/10 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-extrabold text-blue-100 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Monthly Loan EMI</span>
                </span>
                <span className="text-[10px] font-bold bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                  {interestRate}% p.a.
                </span>
              </div>
              <p className="text-4xl sm:text-5xl font-black font-mono tracking-tight mt-2">
                {currency} {calculations.standardEmi.toLocaleString()}
              </p>
              <p className="text-xs text-blue-100 mt-1">
                payable every month for {tenureValue} {tenureUnit}
              </p>
            </div>

            {/* Quick KPI Row */}
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/20 text-xs">
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs">
                <span className="text-[11px] text-blue-100 block">Total Interest</span>
                <span className="text-base sm:text-lg font-extrabold font-mono text-amber-300">
                  {currency} {calculations.totalInterestWithPrepay.toLocaleString()}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs">
                <span className="text-[11px] text-blue-100 block">Total Payment</span>
                <span className="text-base sm:text-lg font-extrabold font-mono text-white">
                  {currency} {calculations.totalPaidWithPrepay.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Payoff Date Badge */}
            <div className="flex items-center justify-between text-xs pt-1 text-blue-100">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-200" />
                <span>Estimated Payoff Date:</span>
              </span>
              <span className="font-bold text-white font-mono bg-white/10 px-2 py-0.5 rounded-lg">
                {calculations.payoffDate}
              </span>
            </div>
          </div>

          {/* Prepayment Savings Alert (if active) */}
          {calculations.interestSaved > 0 && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-1.5 animate-fade-in shadow-xs">
              <div className="flex items-center gap-2 font-bold text-xs">
                <Zap className="w-4 h-4 text-emerald-600" />
                <span>Prepayment Benefit Activated!</span>
              </div>
              <p className="text-xs leading-relaxed">
                You will save{" "}
                <strong className="font-mono text-emerald-700 dark:text-emerald-300">
                  {currency} {calculations.interestSaved.toLocaleString()}
                </strong>{" "}
                in interest and finish your loan{" "}
                <strong>
                  {calculations.yearsSaved > 0 && `${calculations.yearsSaved} Years `}
                  {calculations.remainingMonthsSaved > 0 && `${calculations.remainingMonthsSaved} Months `}
                  earlier
                </strong>
                !
              </p>
            </div>
          )}

          {/* Visual Donut / Breakdown Chart */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <PieChart className="w-4 h-4 text-blue-600" />
              <span>Payment Breakdown</span>
            </span>

            <div className="flex items-center justify-center gap-6">
              {/* SVG Donut Chart */}
              <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  {/* Background Circle */}
                  <path
                    className="text-slate-100 dark:text-slate-800"
                    strokeWidth="4.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* Principal Segment (Blue) */}
                  <path
                    className="text-blue-600"
                    strokeDasharray={`${calculations.principalPercent}, 100`}
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Principal</span>
                  <span className="text-base font-black font-mono text-blue-600 dark:text-blue-400">
                    {calculations.principalPercent}%
                  </span>
                </div>
              </div>

              {/* Legend & Details */}
              <div className="space-y-3 text-xs min-w-0">
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 rounded-md bg-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-slate-500 font-semibold block text-[11px]">Principal Loan</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {currency} {principal.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400 block">({calculations.principalPercent}%)</span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 rounded-md bg-slate-300 dark:bg-slate-700 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-slate-500 font-semibold block text-[11px]">Total Interest</span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                      {currency} {calculations.totalInterestWithPrepay.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400 block">({calculations.interestPercent}%)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Row */}
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
                className="py-2.5 px-3 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Complete Amortization Schedule Section */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              <span>Loan Amortization & Repayment Schedule</span>
            </span>
            <p className="text-xs text-slate-500 mt-0.5">
              Yearly and monthly breakdown showing principal deduction, interest payment, and closing loan balance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode("yearly")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  viewMode === "yearly"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Yearly View
              </button>
              <button
                type="button"
                onClick={() => setViewMode("monthly")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  viewMode === "monthly"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Monthly View
              </button>
            </div>

            <button
              type="button"
              onClick={exportCsv}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              title="Download Excel/CSV Spreadsheet"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 1. YEARLY TABLE VIEW */}
        {viewMode === "yearly" && (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">Year</th>
                  <th className="py-3 px-4">Opening Balance</th>
                  <th className="py-3 px-4">EMI / Total Paid</th>
                  <th className="py-3 px-4 text-blue-600 dark:text-blue-400">Principal Repaid</th>
                  <th className="py-3 px-4 text-amber-600 dark:text-amber-400">Interest Paid</th>
                  <th className="py-3 px-4">Closing Balance</th>
                  <th className="py-3 px-4 text-right">Loan Paid %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {calculations.yearlySchedule.map((y, idx) => {
                  const isExpanded = !!expandedYears[y.year];
                  return (
                    <React.Fragment key={y.year}>
                      <tr
                        onClick={() => toggleYear(y.year)}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                      >
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-blue-500" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span>Year {idx + 1} ({y.year})</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                          {currency} {y.openingBalance.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                          {currency} {y.totalPaid.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-blue-600 dark:text-blue-400">
                          {currency} {y.principalPaid.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-amber-600 dark:text-amber-400">
                          {currency} {y.interestPaid.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-slate-900 dark:text-white">
                          {currency} {y.closingBalance.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className="h-full bg-blue-600 rounded-full"
                                style={{ width: `${y.loanPaidPercent}%` }}
                              />
                            </div>
                            <span className="font-bold text-slate-700 dark:text-slate-300 w-9 text-right">
                              {y.loanPaidPercent}%
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Monthly Sub-Rows for Year */}
                      {isExpanded &&
                        y.months.map((m) => (
                          <tr
                            key={m.monthIndex}
                            className="bg-blue-50/40 dark:bg-blue-950/20 text-[11px] text-slate-600 dark:text-slate-400 font-mono"
                          >
                            <td className="py-2 px-8 text-slate-500">
                              ↳ {m.monthName} {m.year} (#{m.monthIndex})
                            </td>
                            <td className="py-2 px-4">{currency} {m.openingBalance.toLocaleString()}</td>
                            <td className="py-2 px-4 font-bold text-slate-800 dark:text-slate-200">
                              {currency} {m.totalPaid.toLocaleString()}
                            </td>
                            <td className="py-2 px-4 text-blue-600 dark:text-blue-400">
                              {currency} {m.principalPaid.toLocaleString()}
                            </td>
                            <td className="py-2 px-4 text-amber-600 dark:text-amber-400">
                              {currency} {m.interestPaid.toLocaleString()}
                            </td>
                            <td className="py-2 px-4">{currency} {m.closingBalance.toLocaleString()}</td>
                            <td className="py-2 px-4 text-right">{m.loanPaidPercent}%</td>
                          </tr>
                        ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
              {/* Total Footer Row */}
              <tfoot>
                <tr className="bg-slate-100 dark:bg-slate-800 font-mono font-bold text-xs text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-700">
                  <td className="py-3.5 px-4">TOTAL</td>
                  <td className="py-3.5 px-4">-</td>
                  <td className="py-3.5 px-4 font-black">
                    {currency} {calculations.totalPaidWithPrepay.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-blue-600 dark:text-blue-400">
                    {currency} {principal.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-amber-600 dark:text-amber-400">
                    {currency} {calculations.totalInterestWithPrepay.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4">{currency} 0</td>
                  <td className="py-3.5 px-4 text-right">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* 2. FULL MONTHLY TABLE VIEW */}
        {viewMode === "monthly" && (
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase text-[11px] tracking-wider z-10">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Month/Year</th>
                  <th className="py-3 px-4">Opening Balance</th>
                  <th className="py-3 px-4">EMI</th>
                  <th className="py-3 px-4 text-blue-600 dark:text-blue-400">Principal</th>
                  <th className="py-3 px-4 text-amber-600 dark:text-amber-400">Interest</th>
                  {extraMonthlyPayment > 0 || lumpSumAmount > 0 ? (
                    <th className="py-3 px-4 text-emerald-600">Extra Prepay</th>
                  ) : null}
                  <th className="py-3 px-4">Closing Balance</th>
                  <th className="py-3 px-4 text-right">Paid %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {calculations.monthlySchedule.map((m) => (
                  <tr key={m.monthIndex} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-slate-400">{m.monthIndex}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                      {m.monthName} {m.year}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">
                      {currency} {m.openingBalance.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                      {currency} {m.emi.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-blue-600 dark:text-blue-400">
                      {currency} {m.principalPaid.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-amber-600 dark:text-amber-400">
                      {currency} {m.interestPaid.toLocaleString()}
                    </td>
                    {extraMonthlyPayment > 0 || lumpSumAmount > 0 ? (
                      <td className="py-2.5 px-4 text-emerald-600">
                        {m.extraPrepayment > 0 ? `+${currency} ${m.extraPrepayment.toLocaleString()}` : "-"}
                      </td>
                    ) : null}
                    <td className="py-2.5 px-4 text-slate-900 dark:text-white font-semibold">
                      {currency} {m.closingBalance.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right">{m.loanPaidPercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Security & Privacy Guarantee */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
        <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
        <p>
          <strong>100% Private Client-Side Calculation:</strong> Your financial inputs, interest rates, and loan figures are computed locally in your browser with zero server tracking or data storage.
        </p>
      </div>
    </div>
  );
}
