"use client";

import React, { useState, useMemo, useRef } from "react";
import {
  AlignLeft,
  Copy,
  Check,
  RotateCcw,
  BookOpen,
  Mic,
  Clock,
  FileText,
  Sparkles,
  BarChart2,
  Sliders,
  Upload,
  Download,
  Share2,
  Layers,
} from "lucide-react";
import { Tool } from "@/data/types";
import { downloadFile } from "@/lib/download";

interface WordCounterWorkspaceProps {
  tool: Tool;
}

const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
  "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
  "below", "between", "both", "but", "by", "can't", "cannot", "could", "couldn't",
  "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
  "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have",
  "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers",
  "herself", "him", "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm",
  "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself", "let's",
  "me", "more", "most", "mustn't", "my", "myself", "no", "nor", "not", "of", "off",
  "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out",
  "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's", "should",
  "shouldn't", "so", "some", "such", "than", "that", "that's", "the", "their",
  "theirs", "them", "themselves", "then", "there", "there's", "these", "they",
  "they'd", "they'll", "they're", "they've", "this", "those", "through", "to", "too",
  "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're",
  "we've", "were", "weren't", "what", "what's", "when", "when's", "where", "where's",
  "which", "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would",
  "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours", "yourself",
  "yourselves"
]);

const SAMPLE_TEXT = `In today's digital era, privacy, speed, and reliability are essential requirements for modern web applications. Toolqivo delivers lightning-fast, client-side online utilities that execute entirely in your web browser. This means your sensitive documents, financial calculations, passwords, and data never leave your personal computer.

By eliminating unnecessary server round-trips, our tools provide instantaneous feedback and zero latency. Whether you are generating secure QR codes, analyzing keyword density, calculating home loan EMIs, or formatting complex JSON trees, Toolqivo is designed to streamline your daily workflow with elegance, clarity, and precision.`;

export function WordCounterWorkspace({ tool }: WordCounterWorkspaceProps) {
  const [text, setText] = useState(SAMPLE_TEXT);
  const [copied, setCopied] = useState(false);
  const [filterStopWords, setFilterStopWords] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Core metrics calculation
  const stats = useMemo(() => {
    const raw = text;
    const trimmed = raw.trim();

    const wordsArray = trimmed ? trimmed.split(/\s+/).filter(Boolean) : [];
    const wordCount = wordsArray.length;
    const charCount = raw.length;
    const charNoSpaces = raw.replace(/\s/g, "").length;

    // Sentences: match ending punctuations
    const sentenceMatches = trimmed ? trimmed.match(/[^.!?]+[.!?]+(\s|$)/g) : null;
    const sentenceCount = sentenceMatches ? sentenceMatches.length : trimmed.length > 0 ? 1 : 0;

    // Paragraphs: split by 2 or more newlines or non-empty lines
    const paragraphs = raw.split(/\n+/).filter((p) => p.trim().length > 0);
    const paragraphCount = paragraphs.length;

    // Lines
    const lineCount = raw ? raw.split(/\r\n|\r|\n/).length : 0;

    // Reading & Speaking times
    const readingTimeSec = Math.round((wordCount / 225) * 60);
    const speakingTimeSec = Math.round((wordCount / 130) * 60);

    // Flesch Reading Ease score estimation
    // 206.835 - 1.015 * (total words / total sentences) - 84.6 * (total syllables / total words)
    let syllableCount = 0;
    wordsArray.forEach((w) => {
      const clean = w.toLowerCase().replace(/[^a-z]/g, "");
      if (clean.length <= 3) {
        syllableCount += 1;
      } else {
        const matches = clean.match(/[aeiouy]{1,2}/g);
        syllableCount += matches ? matches.length : 1;
      }
    });

    let readingEase = 100;
    let readingLevel = "Very Easy (5th Grade)";
    if (wordCount > 0 && sentenceCount > 0) {
      const asl = wordCount / sentenceCount;
      const asw = syllableCount / wordCount;
      readingEase = Math.round(206.835 - 1.015 * asl - 84.6 * asw);
      readingEase = Math.max(0, Math.min(100, readingEase));

      if (readingEase >= 90) readingLevel = "Very Easy (5th Grade)";
      else if (readingEase >= 80) readingLevel = "Easy (6th Grade)";
      else if (readingEase >= 70) readingLevel = "Fairly Easy (7th Grade)";
      else if (readingEase >= 60) readingLevel = "Standard (8th-9th Grade)";
      else if (readingEase >= 50) readingLevel = "Fairly Difficult (10th-12th Grade)";
      else if (readingEase >= 30) readingLevel = "Difficult (College Level)";
      else readingLevel = "Very Difficult (Academic/Postgrad)";
    }

    // Top Keywords & density
    const wordFreq: Record<string, number> = {};
    wordsArray.forEach((w) => {
      const clean = w.toLowerCase().replace(/[^a-z0-9_-]/g, "");
      if (!clean || clean.length < 2) return;
      if (filterStopWords && STOP_WORDS.has(clean)) return;
      wordFreq[clean] = (wordFreq[clean] || 0) + 1;
    });

    const topKeywords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([kw, count]) => ({
        word: kw,
        count,
        percent: ((count / Math.max(1, wordCount)) * 100).toFixed(1),
      }));

    return {
      wordCount,
      charCount,
      charNoSpaces,
      sentenceCount,
      paragraphCount,
      lineCount,
      readingTimeSec,
      speakingTimeSec,
      readingEase,
      readingLevel,
      topKeywords,
    };
  }, [text, filterStopWords]);

  // Format seconds to human string (e.g. 1m 20s)
  const formatDuration = (sec: number) => {
    if (sec < 60) return `${sec} sec`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s > 0 ? `${m}m ${s}s` : `${m} min`;
  };

  // Text Case Transformations
  const transformCase = (type: string) => {
    switch (type) {
      case "upper":
        setText(text.toUpperCase());
        break;
      case "lower":
        setText(text.toLowerCase());
        break;
      case "title":
        setText(
          text.replace(
            /\w\S*/g,
            (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()
          )
        );
        break;
      case "sentence":
        setText(
          text
            .toLowerCase()
            .replace(/(^\s*\w|[.!?]\s*\w)/g, (c) => c.toUpperCase())
        );
        break;
      case "cleanSpaces":
        setText(text.replace(/[ \t]+/g, " ").replace(/\n\s+\n/g, "\n\n").trim());
        break;
      case "removeBreaks":
        setText(text.replace(/\r?\n|\r/g, " ").replace(/\s+/g, " ").trim());
        break;
    }
  };

  // Copy
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result;
      if (typeof content === "string") {
        setText(content);
      }
    };
    reader.readAsText(file);
  };

  // File Download
  const handleDownload = () => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    downloadFile(blob, "word-counter-text.txt");
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top Quick Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Words", val: stats.wordCount.toLocaleString(), color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-500/10 border-teal-500/20" },
          { label: "Characters", val: stats.charCount.toLocaleString(), color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
          { label: "No Spaces", val: stats.charNoSpaces.toLocaleString(), color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
          { label: "Sentences", val: stats.sentenceCount.toLocaleString(), color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
          { label: "Paragraphs", val: stats.paragraphCount.toLocaleString(), color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
          { label: "Reading Time", val: formatDuration(stats.readingTimeSec), color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
        ].map((item) => (
          <div
            key={item.label}
            className={`p-4 rounded-2xl border ${item.bg} text-center flex flex-col justify-center`}
          >
            <span className={`text-xl sm:text-2xl font-black font-mono ${item.color}`}>
              {item.val}
            </span>
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mt-0.5">
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Main Editor Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        {/* Editor Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>Format:</span>
            </span>
            <button
              type="button"
              onClick={() => transformCase("sentence")}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300"
            >
              Sentence case
            </button>
            <button
              type="button"
              onClick={() => transformCase("title")}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300"
            >
              Title Case
            </button>
            <button
              type="button"
              onClick={() => transformCase("upper")}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300"
            >
              UPPERCASE
            </button>
            <button
              type="button"
              onClick={() => transformCase("lower")}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300"
            >
              lowercase
            </button>
            <button
              type="button"
              onClick={() => transformCase("cleanSpaces")}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300"
              title="Clean redundant spaces"
            >
              Trim Spaces
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".txt,.md"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 text-slate-700 dark:text-slate-300"
              title="Upload text file"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 text-slate-700 dark:text-slate-300"
              title="Download as .txt"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1 shadow-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
            <button
              type="button"
              onClick={() => setText("")}
              className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-red-500"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Text Area */}
        <textarea
          rows={10}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Start typing or paste your content here to instantly analyze words, characters, reading level, and keyword frequency..."
          className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-sm sm:text-base leading-relaxed focus:ring-2 focus:ring-teal-500 outline-none resize-y"
        />

        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
          <div className="flex items-center gap-4">
            <span>Lines: {stats.lineCount}</span>
            <span>Avg. word length: {stats.wordCount > 0 ? (stats.charNoSpaces / stats.wordCount).toFixed(1) : 0} chars</span>
            <span>Avg. sentence: {stats.sentenceCount > 0 ? (stats.wordCount / stats.sentenceCount).toFixed(1) : 0} words</span>
          </div>
          <button
            type="button"
            onClick={() => setText(SAMPLE_TEXT)}
            className="text-teal-600 hover:underline font-medium"
          >
            Load Sample Text
          </button>
        </div>
      </div>

      {/* Deep Analysis & Keyword Density Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Readability & Timing Metrics */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-teal-600" />
            <span>Readability & Speech Estimation</span>
          </h3>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 block">Flesch Reading Ease</span>
                <span className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  {stats.readingEase} / 100
                </span>
              </div>
              <span className="text-xs px-3 py-1 rounded-full font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                {stats.readingLevel}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-600 rounded-full transition-all duration-300"
                style={{ width: `${stats.readingEase}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-semibold">Silent Reading Time</span>
              </div>
              <span className="text-lg font-black text-slate-800 dark:text-slate-200 font-mono">
                {formatDuration(stats.readingTimeSec)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Based on 225 wpm</span>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <Mic className="w-4 h-4 text-purple-500" />
                <span className="text-xs font-semibold">Speaking Speech Time</span>
              </div>
              <span className="text-lg font-black text-slate-800 dark:text-slate-200 font-mono">
                {formatDuration(stats.speakingTimeSec)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Based on 130 wpm</span>
            </div>
          </div>

          {/* Social Media Character Limits */}
          <div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
              Social Media Character Targets
            </span>
            <div className="space-y-2.5">
              {[
                { name: "X (Twitter) Post", max: 280 },
                { name: "Google SEO Title", max: 60 },
                { name: "Google Meta Description", max: 160 },
                { name: "Instagram Caption", max: 2200 },
              ].map((platform) => {
                const pct = Math.min(100, Math.round((stats.charCount / platform.max) * 100));
                const isOver = stats.charCount > platform.max;
                return (
                  <div key={platform.name} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-400">{platform.name}</span>
                      <span className={`font-mono text-[11px] ${isOver ? "text-red-500 font-bold" : "text-slate-500"}`}>
                        {stats.charCount} / {platform.max}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${isOver ? "bg-red-500" : "bg-teal-500"} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top Keywords & Density */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-teal-600" />
              <span>Keyword Density Breakdown</span>
            </h3>
            <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
              <input
                type="checkbox"
                checked={filterStopWords}
                onChange={(e) => setFilterStopWords(e.target.checked)}
                className="rounded text-teal-600 focus:ring-teal-500"
              />
              <span>Filter stop words</span>
            </label>
          </div>

          {stats.topKeywords.length > 0 ? (
            <div className="space-y-2">
              {stats.topKeywords.map((item, idx) => (
                <div
                  key={item.word}
                  className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 text-center text-xs font-mono text-slate-400 font-bold">
                      #{idx + 1}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 font-mono">
                      {item.word}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">
                      {item.count} {item.count === 1 ? "time" : "times"}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 font-mono font-bold text-xs">
                      {item.percent}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              No prominent keywords detected. Add more text to analyze density.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
