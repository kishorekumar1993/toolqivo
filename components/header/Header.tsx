"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  ChevronDown,
  Sparkles,
  Globe,
  Wrench,
  Grid3X3,
  ArrowRight,
  Layers,
  FileText,
  Image as ImageIcon,
  CreditCard,
  Calculator,
  ArrowLeftRight,
  Zap,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { MobileNav } from "./MobileNav";

interface HeaderProps {
  onOpenSearch?: () => void;
}

export function Header({ onOpenSearch }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setIsMoreOpen(false);
  }, [pathname]);

  const navLinks = [
    { label: "PDF Tools", href: "/pdf-tools", icon: FileText },
    { label: "Image Tools", href: "/image-tools", icon: ImageIcon },
    { label: "Finance", href: "/finance", icon: CreditCard },
    { label: "Calculators", href: "/calculators", icon: Calculator },
    { label: "Converters", href: "/converters", icon: ArrowLeftRight },
  ];

  const moreLinks = [
    {
      label: "Country Tools",
      href: "/country",
      description: "Localized tax & financial tools by nation",
      icon: Globe,
      gradient: "from-pink-500 to-rose-500",
    },
    {
      label: "AI Tools",
      href: "/ai-tools",
      description: "AI-driven summarizer, rewriter & more",
      icon: Sparkles,
      gradient: "from-amber-400 to-orange-500",
      badge: "New",
    },
    {
      label: "Utility Tools",
      href: "/utility-tools",
      description: "QR generator, password maker & helpers",
      icon: Wrench,
      gradient: "from-teal-400 to-cyan-500",
    },
    {
      label: "All Tools Directory",
      href: "/tools",
      description: "Browse the complete 100+ tool directory",
      icon: Grid3X3,
      gradient: "from-blue-500 to-indigo-600",
    },
  ];

  return (
    <header
      className={`sticky top-0 z-30 w-full transition-all duration-300 ${
        isScrolled
          ? "bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-md shadow-slate-200/50 dark:shadow-slate-950/50 border-b border-slate-200/80 dark:border-slate-800/80"
          : "bg-white/70 dark:bg-slate-950/70 backdrop-blur-md border-b border-slate-100/80 dark:border-slate-800/40"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-6">

            {/* Brand Logo */}
            <Link
              href="/"
              className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl py-1 shrink-0"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/30 group-hover:shadow-blue-500/50 group-hover:scale-105 transition-all duration-200">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[1.1rem] font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Tool<span className="text-blue-600 dark:text-blue-400">qivo</span>
                </span>
                <span className="hidden sm:block text-[10px] text-slate-400 dark:text-slate-500 font-medium tracking-wide mt-0.5">
                  100+ Free Online Tools
                </span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-0.5" aria-label="Main navigation">
              {navLinks.map((link) => {
                const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    {isActive && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-blue-500 rounded-full" />
                    )}
                    {link.label}
                  </Link>
                );
              })}

              {/* More Tools Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  id="more-tools-btn"
                  onClick={() => setIsMoreOpen(!isMoreOpen)}
                  onMouseEnter={() => setIsMoreOpen(true)}
                  aria-expanded={isMoreOpen}
                  aria-haspopup="true"
                  aria-controls="more-tools-menu"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all duration-150"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>More</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      isMoreOpen ? "rotate-180 text-blue-500" : ""
                    }`}
                  />
                </button>

                {/* Mega Menu */}
                {isMoreOpen && (
                  <div
                    id="more-tools-menu"
                    role="menu"
                    onMouseLeave={() => setIsMoreOpen(false)}
                    className="absolute top-full left-0 mt-2 w-80 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl shadow-slate-200/60 dark:shadow-slate-950/80 border border-slate-200/80 dark:border-slate-800 overflow-hidden animate-slide-down z-50"
                  >
                    <div className="px-4 pt-3.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        More Categories
                      </p>
                    </div>
                    <div className="p-2 space-y-0.5">
                      {moreLinks.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            role="menuitem"
                            onClick={() => setIsMoreOpen(false)}
                            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all duration-150 group"
                          >
                            <div
                              className={`w-9 h-9 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-150`}
                            >
                              <Icon className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                  {item.label}
                                </p>
                                {item.badge && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 uppercase tracking-wide">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {item.description}
                              </p>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                          </Link>
                        );
                      })}
                    </div>
                    <div className="p-2 pt-0">
                      <Link
                        href="/tools"
                        onClick={() => setIsMoreOpen(false)}
                        className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200/60 dark:border-slate-700/60 transition-all duration-150 group"
                      >
                        <Grid3X3 className="w-3.5 h-3.5" />
                        View all 100+ tools
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </nav>
          </div>

          {/* Right: Search + Theme + CTA */}
          <div className="hidden lg:flex items-center gap-2.5">

            {/* Search pill */}
            <button
              type="button"
              id="header-search-btn"
              onClick={onOpenSearch}
              className="flex items-center gap-2 pl-3.5 pr-2.5 py-2 rounded-full bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 border border-slate-200/70 dark:border-slate-700/50 text-xs font-medium text-slate-500 dark:text-slate-400 transition-all duration-150 group hover:border-blue-300 dark:hover:border-blue-700"
              title="Search tools (Press /)"
              aria-label="Open search"
            >
              <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors shrink-0" />
              <span className="hidden xl:inline pr-1 whitespace-nowrap">Search tools...</span>
              <kbd className="hidden xl:inline px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-mono text-slate-400 shadow-sm">
                /
              </kbd>
            </button>

            {/* Theme toggle */}
            <ThemeToggle />

            {/* Explore Tools gradient CTA */}
            <Link
              href="/tools"
              id="explore-tools-btn"
              className="relative flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold text-white overflow-hidden group shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/40 hover:-translate-y-px active:translate-y-0 transition-all duration-200"
              style={{ background: "linear-gradient(135deg, #2563eb 0%, #4f46e5 60%, #7c3aed 100%)" }}
            >
              <span
                aria-hidden="true"
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.2) 50%, transparent 65%)" }}
              />
              <Grid3X3 className="w-3.5 h-3.5 relative z-10" />
              <span className="relative z-10">Explore Tools</span>
              <ArrowRight className="w-3.5 h-3.5 relative z-10 group-hover:translate-x-0.5 transition-transform duration-150" />
            </Link>
          </div>

          {/* Mobile nav trigger */}
          <MobileNav onOpenSearch={onOpenSearch} />
        </div>
      </div>
    </header>
  );
}
