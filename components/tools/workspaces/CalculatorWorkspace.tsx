"use client";

import React, { useState } from "react";
import { Calendar, Percent, Activity, Clock, Sparkles } from "lucide-react";
import { Tool } from "@/data/types";

interface CalculatorWorkspaceProps {
  tool: Tool;
}

export function CalculatorWorkspace({ tool }: CalculatorWorkspaceProps) {
  // Age calculator
  const [birthDate, setBirthDate] = useState("2000-01-01");

  // Percentage calculator
  const [pctX, setPctX] = useState<number>(15);
  const [pctY, setPctY] = useState<number>(250);
  const [pctMode, setPctMode] = useState<"whatIs" | "isWhat" | "change">("whatIs");

  // BMI calculator
  const [heightCm, setHeightCm] = useState<number>(175);
  const [weightKg, setWeightKg] = useState<number>(70);
  const [unitMode, setUnitMode] = useState<"metric" | "imperial">("metric");

  // Date difference
  const [startDate, setStartDate] = useState("2026-01-01");
  const [endDate, setEndDate] = useState("2026-12-31");

  // Age calc logic
  const calculateAge = () => {
    if (!birthDate) return { years: 0, months: 0, days: 0, totalDays: 0, nextBdayDays: 0 };
    const birth = new Date(birthDate);
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    let days = now.getDate() - birth.getDate();
    if (days < 0) {
      months -= 1;
      days += 30;
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    const diffTime = Math.abs(now.getTime() - birth.getTime());
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Next birthday
    const nextBday = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
    if (nextBday < now) nextBday.setFullYear(now.getFullYear() + 1);
    const nextBdayDays = Math.ceil((nextBday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      years: Math.max(0, years),
      months: Math.max(0, months),
      days: Math.max(0, days),
      totalDays,
      nextBdayDays,
    };
  };

  const ageData = calculateAge();

  // Percentage calc
  let pctResult = 0;
  if (pctMode === "whatIs") {
    pctResult = (pctX * pctY) / 100;
  } else if (pctMode === "isWhat") {
    pctResult = pctY !== 0 ? (pctX / pctY) * 100 : 0;
  } else {
    pctResult = pctX !== 0 ? ((pctY - pctX) / pctX) * 100 : 0;
  }

  // BMI calc
  const heightMeters = heightCm / 100;
  const bmiScore = heightMeters > 0 ? Number((weightKg / (heightMeters * heightMeters)).toFixed(1)) : 0;

  let bmiCategory = "Normal";
  let bmiColor = "text-emerald-600 bg-emerald-100 dark:bg-emerald-950";
  if (bmiScore < 18.5) {
    bmiCategory = "Underweight";
    bmiColor = "text-amber-600 bg-amber-100 dark:bg-amber-950";
  } else if (bmiScore >= 25 && bmiScore < 30) {
    bmiCategory = "Overweight";
    bmiColor = "text-amber-600 bg-amber-100 dark:bg-amber-950";
  } else if (bmiScore >= 30) {
    bmiCategory = "Obese";
    bmiColor = "text-red-600 bg-red-100 dark:bg-red-950";
  }

  // Date diff calc
  const dStart = new Date(startDate);
  const dEnd = new Date(endDate);
  const diffTimeMs = Math.abs(dEnd.getTime() - dStart.getTime());
  const diffDays = Math.ceil(diffTimeMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const remDays = diffDays % 7;

  return (
    <div className="space-y-6">
      {tool.id === "percentage-calculator" ? (
        /* Percentage Calculator */
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
            {[
              { id: "whatIs", label: "What is X% of Y?" },
              { id: "isWhat", label: "X is what % of Y?" },
              { id: "change", label: "% Change (X to Y)" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPctMode(tab.id as typeof pctMode)}
                className={`py-2 text-xs font-bold rounded-xl transition-all ${
                  pctMode === tab.id
                    ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Value X
                </label>
                <input
                  type="number"
                  value={pctX}
                  onChange={(e) => setPctX(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Value Y
                </label>
                <input
                  type="number"
                  value={pctY}
                  onChange={(e) => setPctY(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono text-sm"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 text-center">
              <span className="text-xs font-semibold text-slate-500 uppercase">Calculated Result</span>
              <p className="text-4xl font-black text-purple-600 dark:text-purple-400 font-mono mt-1">
                {pctResult.toFixed(2)}
                {pctMode !== "whatIs" ? "%" : ""}
              </p>
            </div>
          </div>
        </div>
      ) : tool.id === "bmi-calculator" ? (
        /* BMI Calculator */
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Height (cm)
              </label>
              <input
                type="number"
                value={heightCm}
                onChange={(e) => setHeightCm(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Weight (kg)
              </label>
              <input
                type="number"
                value={weightKg}
                onChange={(e) => setWeightKg(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono text-sm"
              />
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center space-y-3">
            <span className="text-xs font-semibold text-slate-500 uppercase">Your Body Mass Index</span>
            <div className="flex items-center justify-center gap-3">
              <span className="text-4xl sm:text-5xl font-black text-purple-600 font-mono">{bmiScore}</span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${bmiColor}`}>
                {bmiCategory}
              </span>
            </div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Healthy BMI range for adults is typically 18.5 - 24.9. Maintain a balanced diet and regular activity.
            </p>
          </div>
        </div>
      ) : tool.id === "date-difference-calculator" ? (
        /* Date Difference Calculator */
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-900">
              <span className="text-2xl sm:text-3xl font-black text-purple-600 font-mono">{diffDays}</span>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1">Total Days</p>
            </div>
            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900">
              <span className="text-2xl sm:text-3xl font-black text-blue-600 font-mono">{diffWeeks}</span>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1">Weeks</p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900">
              <span className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">{remDays}</span>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1">Remaining Days</p>
            </div>
          </div>
        </div>
      ) : (
        /* Age Calculator (Default) */
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">
              Select Your Birth Date
            </label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="px-5 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-base shadow-xs focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-4 sm:p-5 rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-900">
              <span className="text-3xl sm:text-4xl font-black text-purple-600 dark:text-purple-400 font-mono">
                {ageData.years}
              </span>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1">Years</p>
            </div>
            <div className="p-4 sm:p-5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900">
              <span className="text-3xl sm:text-4xl font-black text-blue-600 dark:text-blue-400 font-mono">
                {ageData.months}
              </span>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1">Months</p>
            </div>
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900">
              <span className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {ageData.days}
              </span>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1">Days</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-slate-500">Total Days Lived:</span>
              <p className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                {ageData.totalDays.toLocaleString()} Days
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-slate-500">Next Birthday In:</span>
              <p className="font-mono font-bold text-purple-600 mt-0.5">
                {ageData.nextBdayDays} Days
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
