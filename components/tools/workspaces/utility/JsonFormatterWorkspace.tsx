"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Code2,
  Check,
  Copy,
  AlertCircle,
  Wrench,
  Download,
  Upload,
  FileCode,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Minimize2,
  Maximize2,
  ListTree,
  FileText,
  Search,
  ArrowUpDown,
} from "lucide-react";
import { Tool } from "@/data/types";
import { downloadFile } from "@/lib/download";

interface JsonFormatterWorkspaceProps {
  tool: Tool;
}

const SAMPLE_DATA = {
  user: {
    id: "usr_92819a0f",
    name: "Alex Morgan",
    email: "alex.morgan@toolqivo.com",
    active: true,
    roles: ["admin", "developer"],
    preferences: {
      theme: "dark",
      notifications: { email: true, push: false },
      language: "en-US",
    },
    metrics: {
      loginCount: 142,
      lastLogin: "2026-09-10T14:30:00Z",
      accountBalance: 1250.75,
    },
  },
  status: "success",
  code: 200,
};

export function JsonFormatterWorkspace({ tool }: JsonFormatterWorkspaceProps) {
  const [jsonInput, setJsonInput] = useState(() => JSON.stringify(SAMPLE_DATA, null, 2));
  const [activeTab, setActiveTab] = useState<"code" | "tree">("code");
  const [copied, setCopied] = useState(false);
  const [parsedData, setParsedData] = useState<any>(SAMPLE_DATA);
  const [errorInfo, setErrorInfo] = useState<{ message: string; line?: number; col?: number } | null>(null);
  const [indentSpaces, setIndentSpaces] = useState<2 | 4 | "tab">(2);
  const [repairSuccess, setRepairSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate and parse JSON whenever input changes
  useEffect(() => {
    if (!jsonInput.trim()) {
      setParsedData(null);
      setErrorInfo(null);
      return;
    }

    try {
      const parsed = JSON.parse(jsonInput);
      setParsedData(parsed);
      setErrorInfo(null);
    } catch (err: any) {
      const msg = err?.message || "Invalid JSON syntax";
      // Attempt to extract line and col from browser error (e.g. "at position 42" or "line 3 column 5")
      let line: number | undefined;
      let col: number | undefined;

      const lineColMatch = msg.match(/line (\d+) column (\d+)/i);
      if (lineColMatch) {
        line = parseInt(lineColMatch[1], 10);
        col = parseInt(lineColMatch[2], 10);
      } else {
        const posMatch = msg.match(/at position (\d+)/i);
        if (posMatch) {
          const pos = parseInt(posMatch[1], 10);
          const linesUpTo = jsonInput.slice(0, pos).split("\n");
          line = linesUpTo.length;
          col = linesUpTo[linesUpTo.length - 1].length + 1;
        }
      }

      setErrorInfo({ message: msg, line, col });
    }
  }, [jsonInput]);

  // Format with indentation
  const formatJson = (indent: 2 | 4 | "tab") => {
    setIndentSpaces(indent);
    try {
      const parsed = JSON.parse(jsonInput);
      const spaceVal = indent === "tab" ? "\t" : indent;
      setJsonInput(JSON.stringify(parsed, null, spaceVal));
      setErrorInfo(null);
    } catch (err: any) {
      setErrorInfo({ message: err?.message || "Cannot format invalid JSON" });
    }
  };

  // Minify
  const minifyJson = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      setJsonInput(JSON.stringify(parsed));
      setErrorInfo(null);
    } catch (err: any) {
      setErrorInfo({ message: err?.message || "Cannot minify invalid JSON" });
    }
  };

  // Sort Keys Alphabetically
  const sortKeysAlphabetically = () => {
    try {
      const sortObj = (obj: any): any => {
        if (Array.isArray(obj)) return obj.map(sortObj);
        if (obj !== null && typeof obj === "object") {
          return Object.keys(obj)
            .sort()
            .reduce((acc: any, key) => {
              acc[key] = sortObj(obj[key]);
              return acc;
            }, {});
        }
        return obj;
      };

      const parsed = JSON.parse(jsonInput);
      const sorted = sortObj(parsed);
      const spaceVal = indentSpaces === "tab" ? "\t" : indentSpaces;
      setJsonInput(JSON.stringify(sorted, null, spaceVal));
      setErrorInfo(null);
    } catch (err: any) {
      setErrorInfo({ message: err?.message || "Cannot sort invalid JSON" });
    }
  };

  // Smart Auto-Fix / Repair
  const repairJson = () => {
    try {
      let raw = jsonInput;

      // 1. Remove single-line and multi-line comments
      raw = raw.replace(/\/\/.*$/gm, "");
      raw = raw.replace(/\/\*[\s\S]*?\*\//g, "");

      // 2. Fix single quoted keys or values: replace 'val' with "val" safely
      raw = raw.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"');

      // 3. Fix unquoted keys: { foo: "bar" } -> { "foo": "bar" }
      raw = raw.replace(/([{,]\s*)([a-zA-Z0-9_$-]+)(\s*:)/g, '$1"$2"$3');

      // 4. Fix trailing commas in arrays and objects: [1, 2,] -> [1, 2]
      raw = raw.replace(/,(\s*[}\]])/g, "$1");

      const parsed = JSON.parse(raw);
      const spaceVal = indentSpaces === "tab" ? "\t" : indentSpaces;
      setJsonInput(JSON.stringify(parsed, null, spaceVal));
      setRepairSuccess(true);
      setErrorInfo(null);
      setTimeout(() => setRepairSuccess(false), 3000);
    } catch (err: any) {
      setErrorInfo({
        message: "Auto-fix could not resolve all syntax issues. Please inspect the highlighted error line.",
      });
    }
  };

  // Copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(jsonInput);
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
        setJsonInput(content);
      }
    };
    reader.readAsText(file);
  };

  // File Download
  const handleDownload = () => {
    const blob = new Blob([jsonInput], { type: "application/json;charset=utf-8" });
    downloadFile(blob, "formatted.json");
  };

  // Metrics calculation
  const jsonMetrics = useMemo(() => {
    const bytes = new Blob([jsonInput]).size;
    const kb = (bytes / 1024).toFixed(2);
    const lineCount = jsonInput ? jsonInput.split("\n").length : 0;

    let nodeCount = 0;
    const countNodes = (obj: any) => {
      nodeCount++;
      if (Array.isArray(obj)) {
        obj.forEach(countNodes);
      } else if (obj !== null && typeof obj === "object") {
        Object.values(obj).forEach(countNodes);
      }
    };
    if (parsedData) countNodes(parsedData);

    return { bytes, kb, lineCount, nodeCount };
  }, [jsonInput, parsedData]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Left: View Mode Tabs & Formatting */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("code")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "code"
                  ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Editor Code</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("tree")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "tree"
                  ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              <ListTree className="w-3.5 h-3.5" />
              <span>Tree View</span>
            </button>
          </div>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

          {/* Indentation dropdown / buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => formatJson(2)}
              className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Format (2 spaces)</span>
            </button>
            <button
              type="button"
              onClick={() => formatJson(4)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
            >
              4 spaces
            </button>
            <button
              type="button"
              onClick={minifyJson}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
            >
              Minify
            </button>
            <button
              type="button"
              onClick={sortKeysAlphabetically}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1"
              title="Sort all object keys A-Z"
            >
              <ArrowUpDown className="w-3 h-3" />
              <span>Sort Keys</span>
            </button>
            <button
              type="button"
              onClick={repairJson}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold flex items-center gap-1"
              title="Fix trailing commas, single quotes, unquoted keys"
            >
              <Wrench className="w-3 h-3" />
              <span>Auto-Fix</span>
            </button>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json,.txt"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            title="Upload JSON File"
          >
            <Upload className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            title="Download JSON File"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>
          <button
            type="button"
            onClick={() => setJsonInput("")}
            className="px-2.5 py-1.5 rounded-xl text-xs text-slate-400 hover:text-red-500 font-medium"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Repair Alert Notification */}
      {repairSuccess && (
        <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-500" />
          <span>JSON successfully repaired! Trailing commas, single quotes, and key formatting normalized.</span>
        </div>
      )}

      {/* Error Callout */}
      {errorInfo && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs space-y-1.5">
          <div className="flex items-center gap-2 font-bold">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>JSON Syntax Error</span>
            {errorInfo.line && (
              <span className="font-mono bg-red-200/60 dark:bg-red-900/60 px-2 py-0.5 rounded text-[11px]">
                Line {errorInfo.line} {errorInfo.col ? `: Col ${errorInfo.col}` : ""}
              </span>
            )}
          </div>
          <p className="font-mono text-[11px] text-red-600 dark:text-red-400 pl-6 break-words">
            {errorInfo.message}
          </p>
        </div>
      )}

      {/* Main Workspace Area */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        {activeTab === "code" ? (
          /* Code / Raw Editor */
          <div className="relative font-mono text-xs sm:text-sm">
            <textarea
              rows={16}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder="Paste or type your JSON data here..."
              className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/70 font-mono text-xs sm:text-sm leading-relaxed focus:ring-2 focus:ring-teal-500 outline-none resize-y text-slate-800 dark:text-slate-200 selection:bg-teal-500/20"
              spellCheck={false}
            />
          </div>
        ) : (
          /* Interactive Collapsible Tree Inspector */
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/70 min-h-[350px] max-h-[550px] overflow-auto font-mono text-xs">
            {parsedData !== null && parsedData !== undefined ? (
              <TreeNode label="root" value={parsedData} isRoot />
            ) : (
              <div className="py-16 text-center text-slate-400 text-xs">
                {errorInfo ? "Fix syntax error to inspect JSON tree." : "Enter valid JSON to view interactive tree hierarchy."}
              </div>
            )}
          </div>
        )}

        {/* Bottom Status Bar */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${errorInfo ? "bg-red-500" : "bg-emerald-500"}`} />
              {errorInfo ? "Invalid JSON" : "Valid JSON"}
            </span>
            <span>Lines: {jsonMetrics.lineCount}</span>
            <span>Size: {jsonMetrics.kb} KB ({jsonMetrics.bytes} B)</span>
            {parsedData && <span>Nodes: {jsonMetrics.nodeCount}</span>}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setJsonInput(JSON.stringify(SAMPLE_DATA, null, 2))}
              className="text-teal-600 hover:underline font-medium text-xs"
            >
              Load Sample Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Collapsible JSON Tree Node Component
function TreeNode({
  label,
  value,
  isRoot = false,
}: {
  label: string;
  value: any;
  isRoot?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(true);

  const isArray = Array.isArray(value);
  const isObject = value !== null && typeof value === "object" && !isArray;
  const isExpandable = isArray || isObject;

  if (!isExpandable) {
    let typeClass = "text-emerald-600 dark:text-emerald-400";
    let formattedVal = String(value);

    if (typeof value === "string") {
      typeClass = "text-teal-600 dark:text-teal-400";
      formattedVal = `"${value}"`;
    } else if (typeof value === "number") {
      typeClass = "text-blue-600 dark:text-blue-400";
    } else if (typeof value === "boolean") {
      typeClass = "text-purple-600 dark:text-purple-400";
    } else if (value === null) {
      typeClass = "text-slate-400 italic";
      formattedVal = "null";
    }

    return (
      <div className="flex items-center py-0.5 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 rounded px-1.5">
        <span className="text-slate-600 dark:text-slate-400 mr-2 font-bold">{label}:</span>
        <span className={`break-all ${typeClass}`}>{formattedVal}</span>
      </div>
    );
  }

  const keys = isArray ? value : Object.keys(value);
  const count = keys.length;

  return (
    <div className="py-0.5">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 py-1 px-1.5 rounded hover:bg-slate-100/50 dark:hover:bg-slate-800/40 cursor-pointer select-none"
      >
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        )}
        <span className="font-bold text-slate-700 dark:text-slate-300">
          {label}
        </span>
        <span className="text-[10px] text-slate-400 font-mono">
          {isArray ? `Array [${count}]` : `Object {${count}}`}
        </span>
      </div>

      {isOpen && (
        <div className="pl-4 border-l border-slate-200 dark:border-slate-800 ml-2 mt-0.5 space-y-0.5">
          {isArray
            ? value.map((item: any, idx: number) => (
                <TreeNode key={idx} label={`[${idx}]`} value={item} />
              ))
            : Object.entries(value).map(([k, v]) => (
                <TreeNode key={k} label={k} value={v} />
              ))}
        </div>
      )}
    </div>
  );
}
