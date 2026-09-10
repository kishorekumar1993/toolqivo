"use client";

import React, { useState, useMemo } from "react";
import {
  Receipt,
  Plus,
  Trash2,
  Download,
  Copy,
  Check,
  DollarSign,
  FileText,
  ShieldCheck,
  Layers,
  Sparkles,
  Calculator,
} from "lucide-react";
import { Tool } from "@/data/types";
import { downloadFile } from "@/lib/download";

interface GstCalculatorWorkspaceProps {
  tool: Tool;
}

type GstMode = "quick" | "invoice";
type GstType = "exclusive" | "inclusive";
type StateType = "intra" | "inter";

interface InvoiceItem {
  id: string;
  name: string;
  qty: number;
  rate: number;
  gstRate: number;
  discount: number;
}

const GST_SLABS = [
  { rate: 0, label: "0% (Exempt)" },
  { rate: 3, label: "3% (Gold/Jewels)" },
  { rate: 5, label: "5% (Essentials)" },
  { rate: 12, label: "12% (Standard)" },
  { rate: 18, label: "18% (Services/Tech)" },
  { rate: 28, label: "28% (Luxury)" },
];

export function GstCalculatorWorkspace({ tool }: GstCalculatorWorkspaceProps) {
  const [currency, setCurrency] = useState<string>("₹");
  const [mode, setMode] = useState<GstMode>("quick");
  const [gstType, setGstType] = useState<GstType>("exclusive");
  const [stateType, setStateType] = useState<StateType>("intra");

  // Quick Mode Inputs
  const [amount, setAmount] = useState<number>(25000);
  const [selectedRate, setSelectedRate] = useState<number>(18);
  const [isCustomRate, setIsCustomRate] = useState<boolean>(false);
  const [customRate, setCustomRate] = useState<number>(18);

  // Invoice Mode Items
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: "1", name: "Web Development Services", qty: 1, rate: 45000, gstRate: 18, discount: 0 },
    { id: "2", name: "Cloud Server Hosting", qty: 2, rate: 4500, gstRate: 18, discount: 5 },
    { id: "3", name: "SSL Security Certificate", qty: 1, rate: 2500, gstRate: 18, discount: 0 },
  ]);

  const [copied, setCopied] = useState<boolean>(false);

  const effectiveRate = isCustomRate ? customRate : selectedRate;

  // Calculations for Quick Mode
  const quickCalc = useMemo(() => {
    const rawAmt = Math.max(0, amount);
    let netBase = 0;
    let taxAmount = 0;
    let total = 0;

    if (gstType === "exclusive") {
      netBase = rawAmt;
      taxAmount = Math.round((rawAmt * effectiveRate) / 100);
      total = netBase + taxAmount;
    } else {
      total = rawAmt;
      netBase = Math.round((rawAmt * 100) / (100 + effectiveRate));
      taxAmount = total - netBase;
    }

    const cgst = stateType === "intra" ? Math.round(taxAmount / 2) : 0;
    const sgst = stateType === "intra" ? taxAmount - cgst : 0;
    const igst = stateType === "inter" ? taxAmount : 0;

    return {
      netBase,
      taxAmount,
      total,
      cgst,
      sgst,
      igst,
    };
  }, [amount, effectiveRate, gstType, stateType]);

  // Calculations for Invoice Mode
  const invoiceCalc = useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let grandTotal = 0;

    const computedItems = items.map((item) => {
      const gross = item.qty * item.rate;
      const discountAmt = Math.round((gross * item.discount) / 100);
      const taxable = gross - discountAmt;
      const tax = Math.round((taxable * item.gstRate) / 100);
      const totalItem = taxable + tax;

      subtotal += gross;
      totalDiscount += discountAmt;
      totalTax += tax;
      grandTotal += totalItem;

      return {
        ...item,
        gross,
        discountAmt,
        taxable,
        tax,
        totalItem,
      };
    });

    const cgst = stateType === "intra" ? Math.round(totalTax / 2) : 0;
    const sgst = stateType === "intra" ? totalTax - cgst : 0;
    const igst = stateType === "inter" ? totalTax : 0;

    return {
      computedItems,
      subtotal,
      totalDiscount,
      taxableAmount: subtotal - totalDiscount,
      totalTax,
      grandTotal,
      cgst,
      sgst,
      igst,
    };
  }, [items, stateType]);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2, 7),
        name: `Item ${prev.length + 1}`,
        qty: 1,
        rate: 1000,
        gstRate: 18,
        discount: 0,
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const copySummary = () => {
    const text =
      mode === "quick"
        ? `Toolqivo GST Calculation Summary\n` +
          `-------------------------------\n` +
          `Type: GST ${gstType.toUpperCase()} (${effectiveRate}%)\n` +
          `Net Base Amount: ${currency} ${quickCalc.netBase.toLocaleString()}\n` +
          (stateType === "intra"
            ? `CGST (${effectiveRate / 2}%): ${currency} ${quickCalc.cgst.toLocaleString()}\n` +
              `SGST (${effectiveRate / 2}%): ${currency} ${quickCalc.sgst.toLocaleString()}\n`
            : `IGST (${effectiveRate}%): ${currency} ${quickCalc.igst.toLocaleString()}\n`) +
          `Total GST Tax: +${currency} ${quickCalc.taxAmount.toLocaleString()}\n` +
          `Final Total Amount: ${currency} ${quickCalc.total.toLocaleString()}\n` +
          `Calculated via Toolqivo GST Suite.`
        : `Toolqivo GST Tax Invoice Summary\n` +
          `-------------------------------\n` +
          `Items Count: ${items.length}\n` +
          `Subtotal: ${currency} ${invoiceCalc.subtotal.toLocaleString()}\n` +
          `Discount: -${currency} ${invoiceCalc.totalDiscount.toLocaleString()}\n` +
          `Taxable Value: ${currency} ${invoiceCalc.taxableAmount.toLocaleString()}\n` +
          `Total GST: +${currency} ${invoiceCalc.totalTax.toLocaleString()}\n` +
          `Grand Invoice Total: ${currency} ${invoiceCalc.grandTotal.toLocaleString()}\n` +
          `Calculated via Toolqivo GST Suite.`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportInvoiceCsv = () => {
    if (mode === "quick") {
      const rows = [
        ["Toolqivo GST Calculation Summary"],
        ["Base Amount", quickCalc.netBase],
        ["GST Rate", `${effectiveRate}%`],
        ["CGST", quickCalc.cgst],
        ["SGST", quickCalc.sgst],
        ["IGST", quickCalc.igst],
        ["Total Tax", quickCalc.taxAmount],
        ["Grand Total", quickCalc.total],
      ];
      const csv = rows.map((r) => r.join(",")).join("\n");
      downloadFile(new Blob([csv], { type: "text/csv;" }), "Toolqivo-GST-Summary.csv");
    } else {
      const headers = [
        "Item Name",
        "Quantity",
        "Unit Rate",
        "Discount %",
        "Taxable Amount",
        "GST Rate %",
        "Tax Amount",
        "Total Item Amount",
      ];
      const rows = invoiceCalc.computedItems.map((i) => [
        `"${i.name}"`,
        i.qty,
        i.rate,
        `${i.discount}%`,
        i.taxable,
        `${i.gstRate}%`,
        i.tax,
        i.totalItem,
      ]);
      rows.push(["", "", "", "", "", "Subtotal", invoiceCalc.subtotal]);
      rows.push(["", "", "", "", "", "Total Discount", invoiceCalc.totalDiscount]);
      rows.push(["", "", "", "", "", "Taxable Amount", invoiceCalc.taxableAmount]);
      rows.push(["", "", "", "", "", "Total GST Tax", invoiceCalc.totalTax]);
      rows.push(["", "", "", "", "", "Grand Total", invoiceCalc.grandTotal]);

      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      downloadFile(new Blob([csv], { type: "text/csv;" }), "Toolqivo-GST-Tax-Invoice.csv");
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Bar: Mode Switcher & Tax Type */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs">
        {/* Mode Switcher */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "quick", label: "Quick Amount GST", icon: Calculator },
            { id: "invoice", label: "Multi-Item Invoice Builder", icon: Receipt },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = mode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setMode(item.id as GstMode)}
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

        {/* State Supply Type & Currency */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setStateType("intra")}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                stateType === "intra"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Intra-State (CGST + SGST)
            </button>
            <button
              type="button"
              onClick={() => setStateType("inter")}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                stateType === "inter"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Inter-State (IGST)
            </button>
          </div>

          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            {["₹", "$", "€", "£", "AED"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setCurrency(s)}
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

      {/* QUICK MODE */}
      {mode === "quick" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-6">
            {/* Amount Input */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  <span>Transaction Amount</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
                    {currency}
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
                    className="w-36 sm:w-44 pl-7 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono font-bold text-sm text-right focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Exclusive vs Inclusive Mode Toggle */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setGstType("exclusive")}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                    gstType === "exclusive"
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500 shadow-xs"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <div className="font-bold">GST Exclusive</div>
                  <div className="text-[10px] opacity-75 mt-0.5">Add Tax on Base Price</div>
                </button>

                <button
                  type="button"
                  onClick={() => setGstType("inclusive")}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                    gstType === "inclusive"
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500 shadow-xs"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <div className="font-bold">GST Inclusive</div>
                  <div className="text-[10px] opacity-75 mt-0.5">Extract Tax from MRP Price</div>
                </button>
              </div>
            </div>

            {/* GST Tax Slabs */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <span>Choose GST Tax Slab</span>
                </span>
                <span className="text-xs font-bold font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg">
                  {effectiveRate}% Rate
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {GST_SLABS.map((slab) => {
                  const isSelected = !isCustomRate && selectedRate === slab.rate;
                  return (
                    <button
                      key={slab.rate}
                      type="button"
                      onClick={() => {
                        setIsCustomRate(false);
                        setSelectedRate(slab.rate);
                      }}
                      className={`py-3 px-2 rounded-xl text-center border font-bold text-xs transition-all ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-600 text-white shadow-xs"
                          : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                      }`}
                    >
                      <div className="text-sm font-black">{slab.rate}%</div>
                      <div className="text-[10px] opacity-80 mt-0.5 truncate">{slab.label.split(" ")[1]}</div>
                    </button>
                  );
                })}
              </div>

              {/* Custom Rate Input */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <label className="font-semibold text-slate-600 dark:text-slate-400">
                  Custom GST Percentage Rate:
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={customRate}
                    onChange={(e) => {
                      setIsCustomRate(true);
                      setCustomRate(Number(e.target.value));
                    }}
                    className="w-20 px-2.5 py-1 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-right"
                  />
                  <span className="font-bold text-slate-400">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Quick Results Card */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white shadow-xl shadow-blue-500/10 space-y-6">
              <div>
                <span className="text-xs uppercase tracking-wider font-extrabold text-blue-100 block">
                  {gstType === "exclusive" ? "Total Price (Incl. GST)" : "Net Base Price (Excl. GST)"}
                </span>
                <p className="text-4xl sm:text-5xl font-black font-mono tracking-tight mt-2">
                  {currency} {gstType === "exclusive" ? quickCalc.total.toLocaleString() : quickCalc.netBase.toLocaleString()}
                </p>
                <p className="text-xs text-blue-100 mt-1">
                  calculated at {effectiveRate}% GST rate
                </p>
              </div>

              {/* Breakdown Details */}
              <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-xs space-y-2.5 text-xs font-mono">
                <div className="flex justify-between text-blue-100">
                  <span>Net Base Amount:</span>
                  <span className="font-bold text-white">{currency} {quickCalc.netBase.toLocaleString()}</span>
                </div>

                {stateType === "intra" ? (
                  <>
                    <div className="flex justify-between text-amber-200">
                      <span>CGST ({(effectiveRate / 2)}%):</span>
                      <span className="font-bold">+{currency} {quickCalc.cgst.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-amber-200">
                      <span>SGST / UTGST ({(effectiveRate / 2)}%):</span>
                      <span className="font-bold">+{currency} {quickCalc.sgst.toLocaleString()}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-amber-200">
                    <span>IGST ({effectiveRate}%):</span>
                    <span className="font-bold">+{currency} {quickCalc.igst.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between font-bold text-white pt-2 border-t border-white/20 text-sm">
                  <span>Total GST Tax:</span>
                  <span className="text-amber-300">+{currency} {quickCalc.taxAmount.toLocaleString()}</span>
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
                  onClick={exportInvoiceCsv}
                  className="py-2.5 px-3 rounded-xl bg-white text-blue-700 hover:bg-blue-50 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INVOICE MODE */}
      {mode === "invoice" && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-blue-600" />
                <span>Line Items in Invoice</span>
              </span>
              <button
                type="button"
                onClick={addItem}
                className="py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase text-[11px]">
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3 w-20">Qty</th>
                    <th className="py-2.5 px-3 w-28">Rate ({currency})</th>
                    <th className="py-2.5 px-3 w-24">Disc %</th>
                    <th className="py-2.5 px-3 w-24">GST %</th>
                    <th className="py-2.5 px-3 text-right">Taxable</th>
                    <th className="py-2.5 px-3 text-right">Tax</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                    <th className="py-2.5 px-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {invoiceCalc.computedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateItem(item.id, "name", e.target.value)}
                          className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent font-sans"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => updateItem(item.id, "qty", Number(e.target.value))}
                          className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent font-mono text-center"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min="0"
                          value={item.rate}
                          onChange={(e) => updateItem(item.id, "rate", Number(e.target.value))}
                          className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent font-mono text-right"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discount}
                          onChange={(e) => updateItem(item.id, "discount", Number(e.target.value))}
                          className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent font-mono text-center"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={item.gstRate}
                          onChange={(e) => updateItem(item.id, "gstRate", Number(e.target.value))}
                          className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent font-mono text-center"
                        >
                          {GST_SLABS.map((s) => (
                            <option key={s.rate} value={s.rate}>
                              {s.rate}%
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-700 dark:text-slate-300">
                        {currency} {item.taxable.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right text-amber-600 font-bold">
                        +{currency} {item.tax.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right font-black text-slate-900 dark:text-white">
                        {currency} {item.totalItem.toLocaleString()}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          disabled={items.length <= 1}
                          className="p-1 text-slate-400 hover:text-red-500 disabled:opacity-30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Invoice Total Footer */}
            <div className="flex flex-col sm:flex-row items-end justify-between pt-4 border-t border-slate-200 dark:border-slate-800 gap-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copySummary}
                  className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied!" : "Copy Invoice"}</span>
                </button>
                <button
                  type="button"
                  onClick={exportInvoiceCsv}
                  className="py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Invoice CSV</span>
                </button>
              </div>

              <div className="w-full sm:w-72 space-y-1.5 font-mono text-xs text-right">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span>{currency} {invoiceCalc.subtotal.toLocaleString()}</span>
                </div>
                {invoiceCalc.totalDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span>-{currency} {invoiceCalc.totalDiscount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-700 dark:text-slate-300 font-bold">
                  <span>Taxable Value:</span>
                  <span>{currency} {invoiceCalc.taxableAmount.toLocaleString()}</span>
                </div>
                {stateType === "intra" ? (
                  <>
                    <div className="flex justify-between text-amber-600">
                      <span>Total CGST:</span>
                      <span>+{currency} {invoiceCalc.cgst.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-amber-600">
                      <span>Total SGST:</span>
                      <span>+{currency} {invoiceCalc.sgst.toLocaleString()}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-amber-600">
                    <span>Total IGST:</span>
                    <span>+{currency} {invoiceCalc.igst.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-slate-900 dark:text-white text-base pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span>Grand Total:</span>
                  <span className="text-blue-600 dark:text-blue-400">
                    {currency} {invoiceCalc.grandTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security note */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
        <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
        <p>
          <strong>100% Private Client-Side Calculation:</strong> All GST rates, invoice prices, and tax computations are calculated locally without storing or sending data to any external server.
        </p>
      </div>
    </div>
  );
}
