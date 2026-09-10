"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  KeyRound,
  RefreshCw,
  Copy,
  Check,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Sliders,
  History,
  Lock,
  Layers,
  ChevronRight,
  Info,
} from "lucide-react";
import { Tool } from "@/data/types";

interface PasswordWorkspaceProps {
  tool: Tool;
}

type GeneratorMode = "random" | "passphrase" | "pin";

const MEMORABLE_WORDS = [
  "falcon", "orbit", "cipher", "summit", "beacon", "galaxy", "silver", "shadow",
  "timber", "crystal", "canyon", "velvet", "harbor", "zenith", "aurora", "breeze",
  "cascade", "dynamo", "echo", "flame", "glacier", "horizon", "island", "jungle",
  "karma", "legend", "mirage", "nebula", "oasis", "pioneer", "quantum", "radiant",
  "stellar", "tropic", "upland", "vortex", "whisper", "zenon", "anchor", "blaze",
  "comet", "drifter", "ember", "frost", "gravity", "haven", "ignite", "journey",
  "kinetic", "lunar", "matrix", "nexus", "omega", "pulse", "quasar", "ripple",
  "solstice", "titan", "unity", "voyage", "wave", "yield", "zephyr", "apex",
];

export function PasswordWorkspace({ tool }: PasswordWorkspaceProps) {
  const [mode, setMode] = useState<GeneratorMode>("random");

  // Random Password Options
  const [length, setLength] = useState(18);
  const [incUpper, setIncUpper] = useState(true);
  const [incLower, setIncLower] = useState(true);
  const [incNumbers, setIncNumbers] = useState(true);
  const [incSymbols, setIncSymbols] = useState(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(true); // 0, O, l, 1, I
  const [customSymbols, setCustomSymbols] = useState("!@#$%^&*()_+-=[]{}|;:,.<>?");

  // Passphrase Options
  const [wordCount, setWordCount] = useState(4);
  const [separator, setSeparator] = useState("-");
  const [capitalizeWords, setCapitalizeWords] = useState(true);
  const [includeNumberInPassphrase, setIncludeNumberInPassphrase] = useState(true);

  // PIN Options
  const [pinLength, setPinLength] = useState(6);

  // Bulk generation count (1 = single, 5, 10)
  const [bulkCount, setBulkCount] = useState<1 | 5 | 10>(1);

  // Generated results & history
  const [currentPassword, setCurrentPassword] = useState("");
  const [bulkPasswords, setBulkPasswords] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedMain, setCopiedMain] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  // Cryptographically secure random integer in [0, max)
  const getCryptoRandomInt = (max: number): number => {
    if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
      const array = new Uint32Array(1);
      window.crypto.getRandomValues(array);
      return array[0] % max;
    }
    return Math.floor(Math.random() * max);
  };

  // Generate a single password based on current mode
  const generateOne = (): string => {
    if (mode === "pin") {
      let pin = "";
      for (let i = 0; i < pinLength; i++) {
        pin += getCryptoRandomInt(10).toString();
      }
      return pin;
    }

    if (mode === "passphrase") {
      const chosenWords: string[] = [];
      for (let i = 0; i < wordCount; i++) {
        let w = MEMORABLE_WORDS[getCryptoRandomInt(MEMORABLE_WORDS.length)];
        if (capitalizeWords) {
          w = w.charAt(0).toUpperCase() + w.slice(1);
        }
        chosenWords.push(w);
      }
      let res = chosenWords.join(separator);
      if (includeNumberInPassphrase) {
        res += separator + (getCryptoRandomInt(900) + 100);
      }
      return res;
    }

    // Random mode
    let upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let lower = "abcdefghijklmnopqrstuvwxyz";
    let numbers = "0123456789";
    let symbols = customSymbols || "!@#$%^&*()_+-=[]{}|;:,.<>?";

    if (excludeAmbiguous) {
      upper = upper.replace(/[OI]/g, "");
      lower = lower.replace(/[ol]/g, "");
      numbers = numbers.replace(/[01]/g, "");
    }

    let charPool = "";
    const mandatoryChars: string[] = [];

    if (incUpper && upper.length > 0) {
      charPool += upper;
      mandatoryChars.push(upper[getCryptoRandomInt(upper.length)]);
    }
    if (incLower && lower.length > 0) {
      charPool += lower;
      mandatoryChars.push(lower[getCryptoRandomInt(lower.length)]);
    }
    if (incNumbers && numbers.length > 0) {
      charPool += numbers;
      mandatoryChars.push(numbers[getCryptoRandomInt(numbers.length)]);
    }
    if (incSymbols && symbols.length > 0) {
      charPool += symbols;
      mandatoryChars.push(symbols[getCryptoRandomInt(symbols.length)]);
    }

    if (!charPool) {
      charPool = "abcdefghijklmnopqrstuvwxyz";
    }

    const result: string[] = [...mandatoryChars];
    const remaining = Math.max(0, length - mandatoryChars.length);

    for (let i = 0; i < remaining; i++) {
      result.push(charPool[getCryptoRandomInt(charPool.length)]);
    }

    // Shuffle result array (Fisher-Yates)
    for (let i = result.length - 1; i > 0; i--) {
      const j = getCryptoRandomInt(i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }

    return result.slice(0, length).join("");
  };

  // Generate all
  const generate = () => {
    const main = generateOne();
    setCurrentPassword(main);

    if (bulkCount > 1) {
      const batch: string[] = [main];
      for (let i = 1; i < bulkCount; i++) {
        batch.push(generateOne());
      }
      setBulkPasswords(batch);
    } else {
      setBulkPasswords([]);
    }

    // Update history (keep unique top 6)
    setHistory((prev) => {
      const filtered = prev.filter((p) => p !== main);
      return [main, ...filtered].slice(0, 6);
    });
  };

  useEffect(() => {
    generate();
  }, [
    mode,
    length,
    incUpper,
    incLower,
    incNumbers,
    incSymbols,
    excludeAmbiguous,
    wordCount,
    separator,
    capitalizeWords,
    includeNumberInPassphrase,
    pinLength,
    bulkCount,
  ]);

  // Copy helper
  const copyToClipboard = (text: string, index?: number) => {
    navigator.clipboard.writeText(text);
    if (typeof index === "number") {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } else {
      setCopiedMain(true);
      setTimeout(() => setCopiedMain(false), 2000);
    }
  };

  const copyAllBulk = () => {
    navigator.clipboard.writeText(bulkPasswords.join("\n"));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  // Strength and entropy estimation
  const analysis = useMemo(() => {
    if (!currentPassword) {
      return { entropy: 0, strength: "Weak", crackTime: "Instantly", color: "bg-red-500", percent: 10 };
    }

    let pool = 0;
    if (/[a-z]/.test(currentPassword)) pool += 26;
    if (/[A-Z]/.test(currentPassword)) pool += 26;
    if (/[0-9]/.test(currentPassword)) pool += 10;
    if (/[^a-zA-Z0-9]/.test(currentPassword)) pool += 32;
    if (mode === "passphrase") pool = 7776; // Diceware scale

    const entropy = Math.round(
      mode === "passphrase"
        ? (wordCount + (includeNumberInPassphrase ? 1 : 0)) * 12.9
        : currentPassword.length * (Math.log2(Math.max(2, pool)))
    );

    let strength = "Very Weak";
    let crackTime = "Instantly";
    let color = "bg-red-500";
    let percent = 15;

    if (entropy >= 100) {
      strength = "Military Grade (Unbreakable)";
      crackTime = "Trillions of Centuries";
      color = "bg-emerald-500";
      percent = 100;
    } else if (entropy >= 80) {
      strength = "Very Strong";
      crackTime = "Millions of Years";
      color = "bg-teal-500";
      percent = 85;
    } else if (entropy >= 60) {
      strength = "Strong";
      crackTime = "Centuries";
      color = "bg-blue-500";
      percent = 65;
    } else if (entropy >= 45) {
      strength = "Fair / Moderate";
      crackTime = "A few months";
      color = "bg-amber-500";
      percent = 45;
    } else if (entropy >= 30) {
      strength = "Weak";
      crackTime = "A few hours";
      color = "bg-orange-500";
      percent = 25;
    }

    return { entropy, strength, crackTime, color, percent };
  }, [currentPassword, mode, wordCount, includeNumberInPassphrase]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Mode Switcher */}
      <div className="flex items-center justify-center">
        <div className="inline-flex p-1.5 bg-slate-200/70 dark:bg-slate-800/80 rounded-2xl border border-slate-300/60 dark:border-slate-700/60 gap-1">
          {[
            { id: "random", label: "Random Password", icon: KeyRound },
            { id: "passphrase", label: "Memorable Passphrase", icon: Sparkles },
            { id: "pin", label: "Numeric PIN", icon: Lock },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = mode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMode(tab.id as GeneratorMode)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  active
                    ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Password Showcase Box */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="relative">
          <div className="w-full min-h-[64px] px-5 py-4 pr-32 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/60 flex items-center">
            <span className="font-mono text-lg sm:text-2xl font-black text-teal-600 dark:text-teal-400 break-all select-all tracking-wide">
              {currentPassword}
            </span>
          </div>

          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            <button
              type="button"
              onClick={generate}
              className="p-2.5 rounded-xl text-slate-400 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              title="Regenerate Password"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => copyToClipboard(currentPassword)}
              className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              {copiedMain ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedMain ? "Copied!" : "Copy"}</span>
            </button>
          </div>
        </div>

        {/* Real-time Strength Meter */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span className="text-slate-700 dark:text-slate-300">Security Strength:</span>
              <span className="font-bold text-teal-600 dark:text-teal-400">{analysis.strength}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-500 font-mono">
              <span>{analysis.entropy} bits entropy</span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span>Crack time: ~{analysis.crackTime}</span>
            </div>
          </div>

          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${analysis.color}`}
              style={{ width: `${analysis.percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Configuration Controls */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-teal-600" />
          <span>Generator Settings</span>
        </h3>

        {/* RANDOM MODE CONTROLS */}
        {mode === "random" && (
          <div className="space-y-6">
            {/* Length Slider */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                <span>Password Length</span>
                <span className="font-mono font-bold text-teal-600 dark:text-teal-400 text-sm">
                  {length} characters
                </span>
              </div>
              <input
                type="range"
                min="6"
                max="64"
                value={length}
                onChange={(e) => setLength(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                <span>6 min</span>
                <span>16 standard</span>
                <span>32 strong</span>
                <span>64 max</span>
              </div>
            </div>

            {/* Checkbox Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={incUpper}
                  onChange={(e) => setIncUpper(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Uppercase Letters</span>
                  <span className="text-[11px] text-slate-400 font-mono">A, B, C, D...</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={incLower}
                  onChange={(e) => setIncLower(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Lowercase Letters</span>
                  <span className="text-[11px] text-slate-400 font-mono">a, b, c, d...</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={incNumbers}
                  onChange={(e) => setIncNumbers(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Numbers & Digits</span>
                  <span className="text-[11px] text-slate-400 font-mono">0, 1, 2, 3, 4, 5...</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={incSymbols}
                  onChange={(e) => setIncSymbols(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Special Symbols</span>
                  <span className="text-[11px] text-slate-400 font-mono">! @ # $ % ^ & *</span>
                </div>
              </label>
            </div>

            {/* Avoid Ambiguous Characters */}
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={excludeAmbiguous}
                onChange={(e) => setExcludeAmbiguous(e.target.checked)}
                className="rounded text-teal-600 focus:ring-teal-500"
              />
              <span>
                Exclude ambiguous lookalike characters (<code className="font-mono text-teal-600">0, O, l, 1, I</code>)
              </span>
            </label>
          </div>
        )}

        {/* PASSPHRASE CONTROLS */}
        {mode === "passphrase" && (
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                <span>Number of Words</span>
                <span className="font-mono font-bold text-teal-600 dark:text-teal-400 text-sm">
                  {wordCount} words
                </span>
              </div>
              <input
                type="range"
                min="3"
                max="8"
                value={wordCount}
                onChange={(e) => setWordCount(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Word Separator
                </label>
                <div className="flex gap-2">
                  {[
                    { label: "Hyphen (-)", val: "-" },
                    { label: "Underscore (_)", val: "_" },
                    { label: "Period (.)", val: "." },
                    { label: "Space ( )", val: " " },
                  ].map((s) => (
                    <button
                      key={s.val}
                      type="button"
                      onClick={() => setSeparator(s.val)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        separator === s.val
                          ? "bg-teal-600 text-white border-teal-600"
                          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {s.label.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={capitalizeWords}
                    onChange={(e) => setCapitalizeWords(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span>Capitalize each word</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeNumberInPassphrase}
                    onChange={(e) => setIncludeNumberInPassphrase(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span>Append random 3-digit number</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* PIN CONTROLS */}
        {mode === "pin" && (
          <div className="space-y-4">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              PIN Digit Length
            </label>
            <div className="flex gap-3">
              {[4, 6, 8, 10].map((digits) => (
                <button
                  key={digits}
                  type="button"
                  onClick={() => setPinLength(digits)}
                  className={`flex-1 py-3 rounded-2xl text-sm font-bold border transition-all ${
                    pinLength === digits
                      ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                      : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {digits} Digits
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bulk Batch Generator Option */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Batch Generation</span>
            <span className="text-[11px] text-slate-400">Generate multiple passwords at once</span>
          </div>
          <div className="flex items-center gap-1.5">
            {([1, 5, 10] as (1 | 5 | 10)[]).map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setBulkCount(num)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  bulkCount === num
                    ? "bg-teal-500/10 border-teal-500 text-teal-600 dark:text-teal-400 font-bold"
                    : "border-slate-200 dark:border-slate-700 text-slate-500"
                }`}
              >
                {num === 1 ? "Single" : `${num} Passwords`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bulk Results List if batch count > 1 */}
      {bulkCount > 1 && bulkPasswords.length > 0 && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-600" />
              <span>Batch Generated Passwords ({bulkPasswords.length})</span>
            </h4>
            <button
              type="button"
              onClick={copyAllBulk}
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedAll ? "All Copied!" : "Copy All"}</span>
            </button>
          </div>

          <div className="space-y-2">
            {bulkPasswords.map((pwd, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40"
              >
                <span className="font-mono text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 break-all select-all">
                  {pwd}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(pwd, idx)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all shrink-0 ml-3"
                  title="Copy password"
                >
                  {copiedIndex === idx ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History Log */}
      {history.length > 1 && (
        <div className="p-6 rounded-3xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
            <History className="w-3.5 h-3.5" />
            <span>Recent Passwords in This Session</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {history.slice(1, 5).map((pwd, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 text-xs"
              >
                <span className="font-mono text-slate-600 dark:text-slate-400 truncate max-w-[200px]">
                  {pwd}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(pwd)}
                  className="text-slate-400 hover:text-teal-600 font-semibold text-[11px]"
                >
                  Copy
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
