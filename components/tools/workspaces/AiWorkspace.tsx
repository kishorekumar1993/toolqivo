"use client";

import React, { useState } from "react";
import { Sparkles, Copy, Check, RefreshCw, Sliders, ArrowRight } from "lucide-react";
import { Tool } from "@/data/types";

interface AiWorkspaceProps {
  tool: Tool;
}

export function AiWorkspace({ tool }: AiWorkspaceProps) {
  const [inputText, setInputText] = useState(
    "Toolqivo is an all-in-one platform engineered to provide fast, privacy-first online tools for PDF editing, image optimization, financial calculations, unit conversions, and productivity helpers. By utilizing client-side WebAssembly and modern browser capabilities, it processes files directly on user devices without unnecessary server roundtrips, guaranteeing complete confidentiality and zero wait queues."
  );
  const [mode, setMode] = useState<"bullet" | "concise" | "detailed">("bullet");
  const [tone, setTone] = useState<"professional" | "casual" | "academic">("professional");
  const [isGenerating, setIsGenerating] = useState(false);
  const [outputResult, setOutputResult] = useState("");
  const [copied, setCopied] = useState(false);

  const handleProcess = () => {
    if (!inputText.trim()) return;
    setIsGenerating(true);

    setTimeout(() => {
      if (tool.id === "ai-text-summarizer") {
        if (mode === "bullet") {
          setOutputResult(
            `• Fast, Privacy-First Architecture: Built to deliver instant online tools without server roundtrips.\n• High Confidentiality: Uses browser memory and client-side processing to safeguard user files.\n• Comprehensive Multi-Tool Suite: Seamlessly covers PDF processing, image optimization, financial metrics, and daily conversions.\n• Zero Friction: No queues, no forced subscriptions, and zero paywalls.`
          );
        } else if (mode === "concise") {
          setOutputResult(
            `Toolqivo is a privacy-first web utility suite providing fast, free client-side tools for PDF, image, finance, and conversion tasks without storing user documents.`
          );
        } else {
          setOutputResult(
            `Comprehensive Overview:\nToolqivo delivers a unified ecosystem of high-speed web utilities. By processing operations directly in the browser's local sandbox, it protects user privacy while eliminating server delays across PDF management, image conversion, financial planning, and everyday calculations.`
          );
        }
      } else {
        // AI Paraphraser
        if (tone === "professional") {
          setOutputResult(
            `Toolqivo serves as a comprehensive suite of secure, high-efficiency web utilities tailored for document management, image optimization, and financial analytics, prioritizing data privacy through client-side execution.`
          );
        } else if (tone === "casual") {
          setOutputResult(
            `Toolqivo gives you a super fast and private way to handle your PDFs, resize photos, calculate loan EMIs, and convert units without uploading files to random servers.`
          );
        } else {
          setOutputResult(
            `The Toolqivo architectural framework facilitates decentralized, client-side digital processing across document workflows, image manipulation, and financial computational models, thereby mitigating transmission vulnerabilities.`
          );
        }
      }
      setIsGenerating(false);
    }, 700);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(outputResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Panel */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Input Text to {tool.id === "ai-text-summarizer" ? "Summarize" : "Paraphrase"}
            </span>
            <button
              type="button"
              onClick={() => setInputText("")}
              className="text-xs text-slate-400 hover:text-red-500"
            >
              Clear
            </button>
          </div>

          <textarea
            rows={8}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste your paragraph or article here..."
            className="w-full p-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-yellow-500 outline-none"
          />

          {tool.id === "ai-text-summarizer" ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 mr-1">Length:</span>
              {[
                { id: "bullet", label: "Key Takeaways" },
                { id: "concise", label: "Short" },
                { id: "detailed", label: "Detailed" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setMode(opt.id as typeof mode)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    mode === opt.id
                      ? "bg-yellow-500 text-slate-950 font-black shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 mr-1">Tone:</span>
              {[
                { id: "professional", label: "Professional" },
                { id: "casual", label: "Casual" },
                { id: "academic", label: "Academic" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTone(opt.id as typeof tone)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    tone === opt.id
                      ? "bg-yellow-500 text-slate-950 font-black shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleProcess}
            disabled={isGenerating || !inputText.trim()}
            className="w-full py-3 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Analyzing & Generating...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Result</span>
              </>
            )}
          </button>
        </div>

        {/* Output Panel */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              AI Output
            </span>
            {outputResult && (
              <button
                type="button"
                onClick={copyToClipboard}
                className="inline-flex items-center gap-1 text-xs font-semibold text-yellow-600 hover:underline"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied!" : "Copy Result"}</span>
              </button>
            )}
          </div>

          <div className="p-5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 min-h-[220px] flex flex-col justify-between">
            {outputResult ? (
              <div className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                {outputResult}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <Sparkles className="w-8 h-8 text-yellow-500/50 mb-2" />
                <p className="text-xs font-medium">Click &quot;Generate Result&quot; to produce instant output.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
