"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, X, ArrowRight, CornerDownLeft, Sparkles } from "lucide-react";
import { searchTools } from "@/lib/search";
import { Tool } from "@/data/types";
import { DynamicIcon } from "@/components/ui/DynamicIcon";

interface HeroSearchProps {
  autoFocus?: boolean;
}

export function HeroSearch({ autoFocus = false }: HeroSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Tool[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Popular chips below search
  const popularChips = [
    { label: "Compress PDF", href: "/pdf-tools/compress-pdf" },
    { label: "Merge PDF", href: "/pdf-tools/merge-pdf" },
    { label: "Image Compressor", href: "/image-tools/image-compressor" },
    { label: "EMI Calculator", href: "/finance/emi-calculator" },
    { label: "SIP Calculator", href: "/finance/sip-calculator" },
    { label: "Age Calculator", href: "/calculators/age-calculator" },
    { label: "Unit Converter", href: "/converters/unit-converter" },
  ];

  // Hotkey listener for "/"
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement !== inputRef.current &&
        !["INPUT", "TEXTAREA"].includes((document.activeElement as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Update search results on query change
  useEffect(() => {
    if (query.trim().length > 0) {
      const matches = searchTools(query, 6);
      setResults(matches);
      setIsOpen(true);
      setSelectedIndex(-1);
    } else {
      setResults([]);
      setIsOpen(false);
      setSelectedIndex(-1);
    }
  }, [query]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation inside search dropdown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen && results.length > 0) {
        setIsOpen(true);
        setSelectedIndex(0);
      } else {
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && results[selectedIndex]) {
        router.push(results[selectedIndex].route);
        setIsOpen(false);
      } else if (results.length > 0) {
        router.push(results[0].route);
        setIsOpen(false);
      } else if (query.trim()) {
        router.push(`/tools?search=${encodeURIComponent(query.trim())}`);
        setIsOpen(false);
      }
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case "pdf":
        return "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400";
      case "image":
        return "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400";
      case "finance":
        return "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400";
      case "calculators":
        return "bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400";
      case "converters":
        return "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400";
      case "country":
        return "bg-pink-50 text-pink-600 dark:bg-pink-950/50 dark:text-pink-400";
      case "utility":
        return "bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400";
      default:
        return "bg-yellow-50 text-yellow-600 dark:bg-yellow-950/50 dark:text-yellow-400";
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto relative" ref={containerRef}>
      {/* Search Input Box */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur opacity-25 group-focus-within:opacity-75 transition duration-300 pointer-events-none" />
        <div className="relative flex items-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-700/90 shadow-lg shadow-blue-500/5 dark:shadow-none transition-all">
          <div className="pl-4.5 sm:pl-5 text-slate-400 dark:text-slate-500 flex items-center justify-center">
            <Search className="w-5 h-5 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors" />
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (query.trim()) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search for a tool... (e.g. merge pdf, emi calculator, image resizer)"
            autoFocus={autoFocus}
            className="w-full py-4 pl-3.5 pr-24 sm:pr-28 text-sm sm:text-base font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 bg-transparent rounded-2xl focus:outline-none"
            aria-label="Search online tools"
            aria-expanded={isOpen}
            aria-autocomplete="list"
          />

          <div className="absolute right-3 flex items-center gap-1.5">
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setResults([]);
                  setIsOpen(false);
                  inputRef.current?.focus();
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Clear search query"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (query.trim()) {
                  if (results.length > 0) router.push(results[0].route);
                  else router.push(`/tools?search=${encodeURIComponent(query.trim())}`);
                  setIsOpen(false);
                } else {
                  inputRef.current?.focus();
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1"
            >
              <span className="hidden sm:inline">Search</span>
              <kbd className="text-[10px] font-mono opacity-80 bg-blue-700 px-1 py-0.2 rounded sm:ml-0.5">
                /
              </kbd>
            </button>
          </div>
        </div>
      </div>

      {/* Autocomplete Suggestions Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 animate-slide-down max-h-96 overflow-y-auto">
          {results.length > 0 ? (
            <div>
              <div className="flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <span>Matching Tools ({results.length})</span>
                <span className="text-[10px] lowercase text-slate-400">
                  press <CornerDownLeft className="inline w-3 h-3" /> to open
                </span>
              </div>
              <div className="space-y-1 mt-1">
                {results.map((tool, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <Link
                      key={tool.id}
                      href={tool.route}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 shrink-0">
                          <DynamicIcon name={tool.iconName} className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                              {tool.name}
                            </p>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${getCategoryBadgeClass(
                                tool.category
                              )}`}
                            >
                              {tool.category}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {tool.description}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-500 dark:text-slate-400">
              <p className="text-sm font-medium">No direct tools found matching &quot;{query}&quot;</p>
              <p className="text-xs mt-1 text-slate-400 dark:text-slate-500">
                Try searching for &quot;PDF&quot;, &quot;EMI&quot;, &quot;Resize&quot;, or &quot;Convert&quot;.
              </p>
              <Link
                href={`/tools?search=${encodeURIComponent(query)}`}
                onClick={() => setIsOpen(false)}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                <span>Browse all tools directory</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Popular Chips Row — horizontally scrollable on mobile */}
      <div className="mt-4 flex items-center gap-2 text-xs overflow-x-auto scrollbar-none pb-1 sm:flex-wrap sm:justify-center sm:overflow-visible">
        <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0">Popular:</span>
        {popularChips.map((chip) => (
          <Link
            key={chip.label}
            href={chip.href}
            className="shrink-0 inline-flex items-center px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-600 dark:hover:text-blue-400 text-slate-600 dark:text-slate-300 font-medium transition-colors border border-slate-200/70 dark:border-slate-700/60"
          >
            {chip.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
