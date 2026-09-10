"use client";

import React, { useState } from "react";
import { ArrowLeftRight, Coins, RefreshCw } from "lucide-react";
import { Tool } from "@/data/types";

interface ConverterWorkspaceProps {
  tool: Tool;
}

export function ConverterWorkspace({ tool }: ConverterWorkspaceProps) {
  // Currency converter state
  const [currAmount, setCurrAmount] = useState<number>(100);
  const [fromCurr, setFromCurr] = useState<string>("USD");
  const [toCurr, setToCurr] = useState<string>("EUR");

  // Currency rates (indicative standard forex rates)
  const ratesToUSD: Record<string, number> = {
    USD: 1.0,
    EUR: 1.08,
    GBP: 1.28,
    INR: 0.012,
    AED: 0.272,
    CAD: 0.73,
    AUD: 0.65,
    QAR: 0.275,
    OMR: 2.6,
  };

  const convertCurrency = () => {
    const fromRate = ratesToUSD[fromCurr] || 1;
    const toRate = ratesToUSD[toCurr] || 1;
    const inUSD = currAmount * fromRate;
    return Number((inUSD / toRate).toFixed(2));
  };

  const swapCurrencies = () => {
    setFromCurr(toCurr);
    setToCurr(fromCurr);
  };

  // Unit converter state
  const [unitCategory, setUnitCategory] = useState<"length" | "weight" | "temperature" | "speed">("length");
  const [unitVal, setUnitVal] = useState<number>(10);
  const [fromUnit, setFromUnit] = useState<string>("meters");
  const [toUnit, setToUnit] = useState<string>("feet");

  // Unit conversion factors relative to standard base (meters, kg, km/h)
  const lengthFactors: Record<string, number> = {
    meters: 1,
    feet: 0.3048,
    inches: 0.0254,
    kilometers: 1000,
    miles: 1609.34,
    centimeters: 0.01,
  };

  const weightFactors: Record<string, number> = {
    kilograms: 1,
    pounds: 0.453592,
    grams: 0.001,
    ounces: 0.0283495,
  };

  const speedFactors: Record<string, number> = {
    "km/h": 1,
    mph: 1.60934,
    "m/s": 3.6,
    knots: 1.852,
  };

  const convertUnit = () => {
    if (unitCategory === "temperature") {
      if (fromUnit === "Celsius" && toUnit === "Fahrenheit") return (unitVal * 9) / 5 + 32;
      if (fromUnit === "Fahrenheit" && toUnit === "Celsius") return ((unitVal - 32) * 5) / 9;
      if (fromUnit === "Celsius" && toUnit === "Kelvin") return unitVal + 273.15;
      if (fromUnit === "Kelvin" && toUnit === "Celsius") return unitVal - 273.15;
      return unitVal;
    }

    const dict =
      unitCategory === "length"
        ? lengthFactors
        : unitCategory === "weight"
        ? weightFactors
        : speedFactors;

    const baseVal = unitVal * (dict[fromUnit] || 1);
    const result = baseVal / (dict[toUnit] || 1);
    return Number(result.toFixed(4));
  };

  return (
    <div className="space-y-6">
      {tool.id === "currency-converter" ? (
        /* Currency Converter */
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Enter Amount
              </label>
              <input
                type="number"
                value={currAmount}
                onChange={(e) => setCurrAmount(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono text-base"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-5">
                <label className="block text-xs font-semibold text-slate-500 mb-1">From</label>
                <select
                  value={fromCurr}
                  onChange={(e) => setFromCurr(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-bold text-sm"
                >
                  {Object.keys(ratesToUSD).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 flex justify-center">
                <button
                  type="button"
                  onClick={swapCurrencies}
                  className="p-2.5 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-amber-100 text-slate-700 dark:text-slate-200 transition-colors"
                  title="Swap currencies"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="sm:col-span-5">
                <label className="block text-xs font-semibold text-slate-500 mb-1">To</label>
                <select
                  value={toCurr}
                  onChange={(e) => setToCurr(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-bold text-sm"
                >
                  {Object.keys(ratesToUSD).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 text-center">
              <span className="text-xs font-semibold text-slate-500 uppercase">Converted Value</span>
              <p className="text-3xl sm:text-4xl font-black text-amber-600 dark:text-amber-400 font-mono mt-1">
                {currAmount.toLocaleString()} {fromCurr} = {convertCurrency().toLocaleString()} {toCurr}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Indicative market exchange rates.</p>
            </div>
          </div>
        </div>
      ) : (
        /* Unit Converter */
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Unit category tabs */}
          <div className="grid grid-cols-4 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
            {(["length", "weight", "temperature", "speed"] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setUnitCategory(cat);
                  if (cat === "length") {
                    setFromUnit("meters");
                    setToUnit("feet");
                  } else if (cat === "weight") {
                    setFromUnit("kilograms");
                    setToUnit("pounds");
                  } else if (cat === "temperature") {
                    setFromUnit("Celsius");
                    setToUnit("Fahrenheit");
                  } else {
                    setFromUnit("km/h");
                    setToUnit("mph");
                  }
                }}
                className={`py-2 text-xs font-bold rounded-xl capitalize transition-all ${
                  unitCategory === cat
                    ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Input Value
              </label>
              <input
                type="number"
                value={unitVal}
                onChange={(e) => setUnitVal(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">From Unit</label>
                <select
                  value={fromUnit}
                  onChange={(e) => setFromUnit(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-bold text-xs capitalize"
                >
                  {unitCategory === "length" &&
                    Object.keys(lengthFactors).map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  {unitCategory === "weight" &&
                    Object.keys(weightFactors).map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  {unitCategory === "speed" &&
                    Object.keys(speedFactors).map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  {unitCategory === "temperature" && (
                    <>
                      <option value="Celsius">Celsius (°C)</option>
                      <option value="Fahrenheit">Fahrenheit (°F)</option>
                      <option value="Kelvin">Kelvin (K)</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">To Unit</label>
                <select
                  value={toUnit}
                  onChange={(e) => setToUnit(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-bold text-xs capitalize"
                >
                  {unitCategory === "length" &&
                    Object.keys(lengthFactors).map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  {unitCategory === "weight" &&
                    Object.keys(weightFactors).map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  {unitCategory === "speed" &&
                    Object.keys(speedFactors).map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  {unitCategory === "temperature" && (
                    <>
                      <option value="Fahrenheit">Fahrenheit (°F)</option>
                      <option value="Celsius">Celsius (°C)</option>
                      <option value="Kelvin">Kelvin (K)</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 text-center">
              <span className="text-xs font-semibold text-slate-500 uppercase">Converted Result</span>
              <p className="text-3xl font-black text-amber-600 dark:text-amber-400 font-mono mt-1">
                {unitVal} {fromUnit} = {convertUnit()} {toUnit}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
