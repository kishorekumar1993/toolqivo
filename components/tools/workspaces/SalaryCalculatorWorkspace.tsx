"use client";

import React, { useState, useMemo } from "react";
import {
  DollarSign,
  Receipt,
  FileText,
  Download,
  Copy,
  Check,
  Zap,
  ShieldCheck,
  PieChart,
  HelpCircle,
  Sliders,
  ChevronDown,
  ChevronUp,
  Award,
} from "lucide-react";
import { Tool } from "@/data/types";
import { downloadFile } from "@/lib/download";

interface SalaryCalculatorWorkspaceProps {
  tool: Tool;
}

type TaxRegime = "new" | "old" | "compare";

export function SalaryCalculatorWorkspace({ tool }: SalaryCalculatorWorkspaceProps) {
  const [currency, setCurrency] = useState<string>("₹");
  const [regime, setRegime] = useState<TaxRegime>("compare");

  // Core Earnings Input
  const [annualCtc, setAnnualCtc] = useState<number>(1200000);
  const [basicSalaryPercent, setBasicSalaryPercent] = useState<number>(50);
  const [hraPercent, setHraPercent] = useState<number>(40);

  // Deductions (for Old Regime)
  const [showDeductions, setShowDeductions] = useState<boolean>(false);
  const [sec80C, setSec80C] = useState<number>(150000); // PPF, ELSS, EPF, LIC (max 1.5L)
  const [sec80D, setSec80D] = useState<number>(25000); // Health insurance
  const [annualRentPaid, setAnnualRentPaid] = useState<number>(180000); // For HRA exemption
  const [isMetroCity, setIsMetroCity] = useState<boolean>(true);
  const [nps80CCD1B, setNps80CCD1B] = useState<number>(50000); // NPS additional 50k
  const [homeLoanInterest24b, setHomeLoanInterest24b] = useState<number>(0); // Max 2L

  // Other components
  const [monthlyProfTax, setMonthlyProfTax] = useState<number>(200);

  const [copied, setCopied] = useState<boolean>(false);

  // Switch Currency
  const handleCurrencyChange = (newSym: string) => {
    if (newSym === currency) return;
    const oldSym = currency;
    setCurrency(newSym);
    if (newSym === "$" && oldSym === "₹") {
      setAnnualCtc(Math.max(20000, Math.round(annualCtc / 75)));
    } else if (newSym === "₹" && oldSym !== "₹") {
      setAnnualCtc(Math.round(annualCtc * 75));
    }
  };

  // Calculations
  const calculations = useMemo(() => {
    const grossCTC = Math.max(1000, annualCtc);

    // Salary Structure Breakdown
    const basicAnnual = Math.round((grossCTC * basicSalaryPercent) / 100);
    const hraAnnual = Math.round((basicAnnual * hraPercent) / 100);
    const annualEmployeePf = Math.round(Math.min(basicAnnual * 0.12, 216000));
    const annualEmployerPf = annualEmployeePf;
    const annualProfTax = monthlyProfTax * 12;

    const specialAllowanceAnnual = Math.max(
      0,
      grossCTC - basicAnnual - hraAnnual - annualEmployerPf
    );

    const grossTaxableEarnings = basicAnnual + hraAnnual + specialAllowanceAnnual;

    // 1. NEW TAX REGIME (FY 2024-25 / FY 2025-26)
    // Slabs:
    // 0 - 3,00,000 : Nil
    // 3,00,001 - 7,00,000 : 5%
    // 7,00,001 - 10,00,000 : 10%
    // 10,00,001 - 12,00,000 : 15%
    // 12,00,001 - 15,00,000 : 20%
    // Above 15,00,000 : 30%
    // Standard Deduction: ₹75,000
    // Section 87A Rebate: Full tax rebate if Net Taxable Income <= ₹7,00,000
    const newStdDeduction = currency === "₹" ? 75000 : Math.round(grossTaxableEarnings * 0.05);
    const newTaxableIncome = Math.max(0, grossTaxableEarnings - newStdDeduction);

    let newTaxRaw = 0;
    if (currency === "₹") {
      if (newTaxableIncome > 1500000) {
        newTaxRaw += (newTaxableIncome - 1500000) * 0.3;
        newTaxRaw += 300000 * 0.2;
        newTaxRaw += 200000 * 0.15;
        newTaxRaw += 300000 * 0.1;
        newTaxRaw += 400000 * 0.05;
      } else if (newTaxableIncome > 1200000) {
        newTaxRaw += (newTaxableIncome - 1200000) * 0.2;
        newTaxRaw += 200000 * 0.15;
        newTaxRaw += 300000 * 0.1;
        newTaxRaw += 400000 * 0.05;
      } else if (newTaxableIncome > 1000000) {
        newTaxRaw += (newTaxableIncome - 1000000) * 0.15;
        newTaxRaw += 300000 * 0.1;
        newTaxRaw += 400000 * 0.05;
      } else if (newTaxableIncome > 700000) {
        newTaxRaw += (newTaxableIncome - 700000) * 0.1;
        newTaxRaw += 400000 * 0.05;
      } else if (newTaxableIncome > 300000) {
        newTaxRaw += (newTaxableIncome - 300000) * 0.05;
      }

      // Section 87A rebate for income <= 7 Lakh
      if (newTaxableIncome <= 700000) {
        newTaxRaw = 0;
      }
    } else {
      // Generic International Progressive Tax
      if (newTaxableIncome > 100000) {
        newTaxRaw += (newTaxableIncome - 100000) * 0.28;
        newTaxRaw += 50000 * 0.2;
        newTaxRaw += 30000 * 0.12;
      } else if (newTaxableIncome > 50000) {
        newTaxRaw += (newTaxableIncome - 50000) * 0.2;
        newTaxRaw += 30000 * 0.12;
      } else if (newTaxableIncome > 20000) {
        newTaxRaw += (newTaxableIncome - 20000) * 0.12;
      }
    }

    const newCess = Math.round(newTaxRaw * 0.04);
    const newTotalTax = Math.round(newTaxRaw + newCess);
    const newAnnualInHand = grossTaxableEarnings - newTotalTax - annualEmployeePf - annualProfTax;
    const newMonthlyInHand = Math.round(newAnnualInHand / 12);

    // 2. OLD TAX REGIME
    // Slabs:
    // 0 - 2,50,000 : Nil
    // 2,50,001 - 5,00,000 : 5%
    // 5,00,001 - 10,00,000 : 20%
    // Above 10,00,000 : 30%
    // Standard Deduction: ₹50,000
    // HRA Exemption: Min of (Actual HRA, Rent paid - 10% basic, 50% basic for metro / 40% non-metro)
    // 80C up to 1.5L, 80D up to 50k, 80CCD(1B) up to 50k, Home loan 24b up to 2L
    const oldStdDeduction = currency === "₹" ? 50000 : Math.round(grossTaxableEarnings * 0.04);

    let hraExemption = 0;
    if (annualRentPaid > 0) {
      const rentMinusTen = Math.max(0, annualRentPaid - basicAnnual * 0.1);
      const metroFactor = isMetroCity ? 0.5 : 0.4;
      hraExemption = Math.min(hraAnnual, rentMinusTen, basicAnnual * metroFactor);
    }

    const totalOldDeductions =
      oldStdDeduction +
      hraExemption +
      Math.min(sec80C, 150000) +
      Math.min(sec80D, 50000) +
      Math.min(nps80CCD1B, 50000) +
      Math.min(homeLoanInterest24b, 200000);

    const oldTaxableIncome = Math.max(0, grossTaxableEarnings - totalOldDeductions);

    let oldTaxRaw = 0;
    if (currency === "₹") {
      if (oldTaxableIncome > 1000000) {
        oldTaxRaw += (oldTaxableIncome - 1000000) * 0.3;
        oldTaxRaw += 500000 * 0.2;
        oldTaxRaw += 250000 * 0.05;
      } else if (oldTaxableIncome > 500000) {
        oldTaxRaw += (oldTaxableIncome - 500000) * 0.2;
        oldTaxRaw += 250000 * 0.05;
      } else if (oldTaxableIncome > 250000) {
        oldTaxRaw += (oldTaxableIncome - 250000) * 0.05;
      }

      // Section 87A rebate for old regime (<= 5 Lakh)
      if (oldTaxableIncome <= 500000) {
        oldTaxRaw = 0;
      }
    } else {
      oldTaxRaw = Math.round(newTaxRaw * 0.92);
    }

    const oldCess = Math.round(oldTaxRaw * 0.04);
    const oldTotalTax = Math.round(oldTaxRaw + oldCess);
    const oldAnnualInHand = grossTaxableEarnings - oldTotalTax - annualEmployeePf - annualProfTax;
    const oldMonthlyInHand = Math.round(oldAnnualInHand / 12);

    // Winner comparison
    const newSavesMore = newTotalTax <= oldTotalTax;
    const taxDifference = Math.abs(newTotalTax - oldTotalTax);

    const activeTax = regime === "old" ? oldTotalTax : newTotalTax;
    const activeInHandAnnual = regime === "old" ? oldAnnualInHand : newAnnualInHand;
    const activeInHandMonthly = regime === "old" ? oldMonthlyInHand : newMonthlyInHand;

    const inHandPercent = Math.round((activeInHandAnnual / grossCTC) * 100);
    const taxPercent = Math.round((activeTax / grossCTC) * 100);
    const pfPercent = 100 - inHandPercent - taxPercent;

    return {
      grossCTC,
      basicAnnual,
      hraAnnual,
      specialAllowanceAnnual,
      annualEmployeePf,
      annualEmployerPf,
      annualProfTax,
      newTotalTax,
      newAnnualInHand,
      newMonthlyInHand,
      oldTotalTax,
      oldAnnualInHand,
      oldMonthlyInHand,
      newSavesMore,
      taxDifference,
      activeTax,
      activeInHandAnnual,
      activeInHandMonthly,
      inHandPercent,
      taxPercent,
      pfPercent,
    };
  }, [
    annualCtc,
    basicSalaryPercent,
    hraPercent,
    currency,
    monthlyProfTax,
    sec80C,
    sec80D,
    annualRentPaid,
    isMetroCity,
    nps80CCD1B,
    homeLoanInterest24b,
    regime,
  ]);

  const copySummary = () => {
    const text =
      `Toolqivo In-Hand Salary & Tax Breakdown\n` +
      `--------------------------------------\n` +
      `Annual CTC: ${currency} ${calculations.grossCTC.toLocaleString()}\n` +
      `Monthly Take-Home In-Hand: ${currency} ${calculations.activeInHandMonthly.toLocaleString()} / month\n` +
      `Annual Net In-Hand: ${currency} ${calculations.activeInHandAnnual.toLocaleString()}\n` +
      `Estimated Annual Income Tax: ${currency} ${calculations.activeTax.toLocaleString()}\n` +
      `Annual Provident Fund (EPF): ${currency} ${calculations.annualEmployeePf.toLocaleString()}\n` +
      `Recommended Regime: ${
        calculations.newSavesMore ? "New Tax Regime" : "Old Tax Regime"
      } (Saves ${currency} ${calculations.taxDifference.toLocaleString()} in tax)\n` +
      `100% Calculated Privately via Toolqivo Finance Engine.`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportSalarySlipCsv = () => {
    const rows = [
      ["Toolqivo Monthly Salary & Payslip Statement"],
      ["Annual CTC", `${currency} ${calculations.grossCTC}`],
      ["Monthly CTC", `${currency} ${Math.round(calculations.grossCTC / 12)}`],
      [""],
      ["EARNINGS COMPONENT", "MONTHLY", "ANNUAL"],
      ["Basic Salary", Math.round(calculations.basicAnnual / 12), calculations.basicAnnual],
      ["House Rent Allowance (HRA)", Math.round(calculations.hraAnnual / 12), calculations.hraAnnual],
      [
        "Special Allowance",
        Math.round(calculations.specialAllowanceAnnual / 12),
        calculations.specialAllowanceAnnual,
      ],
      [""],
      ["DEDUCTIONS COMPONENT", "MONTHLY", "ANNUAL"],
      ["Income Tax (TDS)", Math.round(calculations.activeTax / 12), calculations.activeTax],
      [
        "Employee Provident Fund (EPF)",
        Math.round(calculations.annualEmployeePf / 12),
        calculations.annualEmployeePf,
      ],
      ["Professional Tax", monthlyProfTax, calculations.annualProfTax],
      [""],
      [
        "NET IN-HAND TAKE HOME",
        calculations.activeInHandMonthly,
        calculations.activeInHandAnnual,
      ],
    ];

    const csvContent = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    downloadFile(blob, "Toolqivo-Monthly-Salary-Slip.csv");
  };

  return (
    <div className="space-y-8">
      {/* Top Bar: Regime Selectors & Currency */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs">
        {/* Regime Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "compare", label: "Compare Both Regimes" },
            { id: "new", label: "New Tax Regime" },
            { id: "old", label: "Old Tax Regime (With Deductions)" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setRegime(item.id as TaxRegime)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                regime === item.id
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-400"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Currency Switcher */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs font-bold text-slate-500 mr-1">Currency:</span>
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            {["₹", "$", "£", "€", "AED"].map((sym) => (
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

      {/* Main Grid: Inputs & KPI Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Input Controls & Sliders */}
        <div className="lg:col-span-7 space-y-6">
          {/* Annual CTC Input */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-blue-600" />
                <span>Annual Cost to Company (CTC Package)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
                  {currency}
                </span>
                <input
                  type="number"
                  min="50000"
                  step="50000"
                  value={annualCtc}
                  onChange={(e) => setAnnualCtc(Math.max(1000, Number(e.target.value)))}
                  className="w-36 sm:w-44 pl-7 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono font-bold text-sm text-right focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <input
              type="range"
              min={currency === "₹" ? 200000 : 20000}
              max={currency === "₹" ? 10000000 : 500000}
              step={currency === "₹" ? 50000 : 5000}
              value={annualCtc}
              onChange={(e) => setAnnualCtc(Number(e.target.value))}
              className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />

            {/* Quick CTC Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mr-1">
                Packages:
              </span>
              {(currency === "₹"
                ? [
                    { label: "₹6 Lakh", val: 600000 },
                    { label: "₹10 Lakh", val: 1000000 },
                    { label: "₹15 Lakh", val: 1500000 },
                    { label: "₹25 Lakh", val: 2500000 },
                    { label: "₹50 Lakh", val: 5000000 },
                  ]
                : [
                    { label: "$40k", val: 40000 },
                    { label: "$70k", val: 70000 },
                    { label: "$100k", val: 100000 },
                    { label: "$150k", val: 150000 },
                    { label: "$250k", val: 250000 },
                  ]
              ).map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setAnnualCtc(p.val)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                    annualCtc === p.val
                      ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Salary Component Structure */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-emerald-600" />
              <span>Salary Component Splits</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  <span>Basic Pay</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {basicSalaryPercent}% ({currency}{" "}
                    {Math.round(calculations.basicAnnual / 12).toLocaleString()}/mo)
                  </span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="60"
                  value={basicSalaryPercent}
                  onChange={(e) => setBasicSalaryPercent(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  <span>HRA Allowance</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {hraPercent}% of Basic ({currency}{" "}
                    {Math.round(calculations.hraAnnual / 12).toLocaleString()}/mo)
                  </span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="50"
                  value={hraPercent}
                  onChange={(e) => setHraPercent(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* Tax Deductions Accordion (Section 80C, 80D, HRA) */}
          <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-4">
            <button
              type="button"
              onClick={() => setShowDeductions(!showDeductions)}
              className="w-full flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600">
                  Tax Deductions & Exemption Inputs (Old Regime)
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-blue-600 font-semibold">
                <span>{showDeductions ? "Hide Deductions" : "Show Deductions"}</span>
                {showDeductions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {showDeductions && (
              <div className="space-y-4 pt-3 border-t border-slate-200 dark:border-slate-800 animate-fade-in text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Section 80C */}
                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Section 80C (PPF, EPF, ELSS, LIC)
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-slate-400 font-bold">
                        {currency}
                      </span>
                      <input
                        type="number"
                        max="150000"
                        value={sec80C}
                        onChange={(e) => setSec80C(Number(e.target.value))}
                        className="w-full pl-7 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                      />
                    </div>
                  </div>

                  {/* Section 80D */}
                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Section 80D (Health Insurance / Mediclaim)
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-slate-400 font-bold">
                        {currency}
                      </span>
                      <input
                        type="number"
                        max="50000"
                        value={sec80D}
                        onChange={(e) => setSec80D(Number(e.target.value))}
                        className="w-full pl-7 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                      />
                    </div>
                  </div>

                  {/* Annual Rent Paid */}
                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Annual Rent Paid (HRA Exemption)
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-slate-400 font-bold">
                        {currency}
                      </span>
                      <input
                        type="number"
                        value={annualRentPaid}
                        onChange={(e) => setAnnualRentPaid(Number(e.target.value))}
                        className="w-full pl-7 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                      />
                    </div>
                  </div>

                  {/* NPS 80CCD(1B) */}
                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      NPS Contribution (80CCD 1B)
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-slate-400 font-bold">
                        {currency}
                      </span>
                      <input
                        type="number"
                        max="50000"
                        value={nps80CCD1B}
                        onChange={(e) => setNps80CCD1B(Number(e.target.value))}
                        className="w-full pl-7 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Key Figures & Comparison */}
        <div className="lg:col-span-5 space-y-6">
          {/* Main In-Hand Take Home Card */}
          <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white shadow-xl shadow-blue-500/10 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-extrabold text-blue-100 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>Estimated Monthly In-Hand</span>
                </span>
                <span className="text-[10px] font-bold bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                  Net Take Home
                </span>
              </div>
              <p className="text-4xl sm:text-5xl font-black font-mono tracking-tight mt-2">
                {currency} {calculations.activeInHandMonthly.toLocaleString()}
              </p>
              <p className="text-xs text-blue-100 mt-1">credited to bank every month</p>
            </div>

            {/* Quick KPI Row */}
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/20 text-xs">
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs">
                <span className="text-[11px] text-blue-100 block">Annual Take Home</span>
                <span className="text-base sm:text-lg font-extrabold font-mono text-white">
                  {currency} {calculations.activeInHandAnnual.toLocaleString()}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs">
                <span className="text-[11px] text-blue-100 block">Estimated Income Tax</span>
                <span className="text-base sm:text-lg font-extrabold font-mono text-amber-300">
                  -{currency} {calculations.activeTax.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Regime Recommendation Badge */}
            <div className="p-3.5 rounded-2xl bg-white/15 backdrop-blur-xs text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-300">
                <Award className="w-4 h-4" />
                <span>
                  {calculations.newSavesMore ? "New Regime Recommended" : "Old Regime Recommended"}
                </span>
              </div>
              <p className="text-[11px] text-blue-100 leading-relaxed">
                You save{" "}
                <strong className="font-mono text-white">
                  {currency} {calculations.taxDifference.toLocaleString()}
                </strong>{" "}
                more tax under the {calculations.newSavesMore ? "New Tax Regime" : "Old Tax Regime"}.
              </p>
            </div>
          </div>

          {/* Regime Side-by-Side Comparison Box */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-blue-600" />
              <span>Tax Regime Comparison</span>
            </span>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* New Regime Card */}
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  calculations.newSavesMore
                    ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 ring-1 ring-blue-500"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                }`}
              >
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-bold text-slate-800 dark:text-slate-200">New Regime</span>
                  {calculations.newSavesMore && (
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.5 rounded">
                      Best
                    </span>
                  )}
                </div>
                <div className="space-y-1 font-mono text-[11px]">
                  <div className="text-slate-500">
                    Tax: <span className="font-bold text-red-500">-{currency}{calculations.newTotalTax.toLocaleString()}</span>
                  </div>
                  <div className="text-slate-900 dark:text-white font-bold">
                    In-Hand: {currency}{calculations.newMonthlyInHand.toLocaleString()}/mo
                  </div>
                </div>
              </div>

              {/* Old Regime Card */}
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  !calculations.newSavesMore
                    ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 ring-1 ring-emerald-500"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                }`}
              >
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-bold text-slate-800 dark:text-slate-200">Old Regime</span>
                  {!calculations.newSavesMore && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded">
                      Best
                    </span>
                  )}
                </div>
                <div className="space-y-1 font-mono text-[11px]">
                  <div className="text-slate-500">
                    Tax: <span className="font-bold text-red-500">-{currency}{calculations.oldTotalTax.toLocaleString()}</span>
                  </div>
                  <div className="text-slate-900 dark:text-white font-bold">
                    In-Hand: {currency}{calculations.oldMonthlyInHand.toLocaleString()}/mo
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
                onClick={exportSalarySlipCsv}
                className="py-2.5 px-3 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Payslip</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Salary Statement Slip */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span>Simulated Monthly Salary Slip & Component Breakdown</span>
            </span>
            <p className="text-xs text-slate-500 mt-0.5">
              Detailed line-item statement showing gross salary earnings and statutory deductions.
            </p>
          </div>
          <button
            type="button"
            onClick={exportSalarySlipCsv}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            title="Download Payslip as CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Earnings Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 border-b border-slate-200 dark:border-slate-800 font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider text-[11px]">
              Earnings
            </div>
            <div className="p-4 space-y-3 font-mono divide-y divide-slate-100 dark:divide-slate-800">
              <div className="flex justify-between pt-2">
                <span className="text-slate-500">Basic Salary:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {currency} {Math.round(calculations.basicAnnual / 12).toLocaleString()} /mo
                </span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-500">House Rent Allowance (HRA):</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {currency} {Math.round(calculations.hraAnnual / 12).toLocaleString()} /mo
                </span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-500">Special Allowance:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {currency} {Math.round(calculations.specialAllowanceAnnual / 12).toLocaleString()} /mo
                </span>
              </div>
              <div className="flex justify-between pt-2 font-bold text-emerald-600 text-sm">
                <span>Gross Monthly Earnings:</span>
                <span>
                  {currency} {Math.round(calculations.grossCTC / 12).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Deductions Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
            <div className="bg-red-50 dark:bg-red-950/40 px-4 py-3 border-b border-slate-200 dark:border-slate-800 font-bold text-red-800 dark:text-red-300 uppercase tracking-wider text-[11px]">
              Deductions
            </div>
            <div className="p-4 space-y-3 font-mono divide-y divide-slate-100 dark:divide-slate-800">
              <div className="flex justify-between pt-2">
                <span className="text-slate-500">Income Tax (TDS):</span>
                <span className="font-bold text-red-500">
                  -{currency} {Math.round(calculations.activeTax / 12).toLocaleString()} /mo
                </span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-500">Employee Provident Fund (EPF):</span>
                <span className="font-bold text-red-500">
                  -{currency} {Math.round(calculations.annualEmployeePf / 12).toLocaleString()} /mo
                </span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-500">Professional Tax:</span>
                <span className="font-bold text-red-500">
                  -{currency} {monthlyProfTax} /mo
                </span>
              </div>
              <div className="flex justify-between pt-2 font-bold text-blue-600 text-sm">
                <span>Net Monthly Take-Home:</span>
                <span>
                  {currency} {calculations.activeInHandMonthly.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security note */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
        <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
        <p>
          <strong>100% Private Client-Side Calculation:</strong> Your CTC, tax exemptions, and salary inputs are computed entirely in your browser with zero data shared or stored on any server.
        </p>
      </div>
    </div>
  );
}
