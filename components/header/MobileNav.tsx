"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  FileText,
  Image as ImageIcon,
  CreditCard,
  Calculator,
  ArrowLeftRight,
  Globe,
  Sparkles,
  Wrench,
  Grid3X3,
  ChevronRight,
  Search,
  Layers,
  Home,
  Zap,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

interface MobileNavProps {
  onOpenSearch?: () => void;
}

export function MobileNav({ onOpenSearch }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setIsOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  const navGroups = [
    {
      title: "Core Tools",
      links: [
        { label: "Home", href: "/", icon: Home },
        { label: "PDF Tools", href: "/pdf-tools", icon: FileText, badge: "Popular" },
        { label: "Image Tools", href: "/image-tools", icon: ImageIcon },
        { label: "Finance", href: "/finance", icon: CreditCard },
        { label: "Calculators", href: "/calculators", icon: Calculator },
        { label: "Converters", href: "/converters", icon: ArrowLeftRight },
      ],
    },
    {
      title: "More",
      links: [
        { label: "Country Tools", href: "/country", icon: Globe },
        { label: "Utility Tools", href: "/utility-tools", icon: Wrench },
        { label: "AI Tools", href: "/ai-tools", icon: Sparkles, badge: "New" },
      ],
    },
  ];

  const iconColors: Record<string, string> = {
    "/": "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400",
    "/pdf-tools": "bg-red-50 dark:bg-red-950/50 text-red-500 dark:text-red-400",
    "/image-tools": "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-500 dark:text-emerald-400",
    "/finance": "bg-blue-50 dark:bg-blue-950/50 text-blue-500 dark:text-blue-400",
    "/calculators": "bg-purple-50 dark:bg-purple-950/50 text-purple-500 dark:text-purple-400",
    "/converters": "bg-amber-50 dark:bg-amber-950/50 text-amber-500 dark:text-amber-400",
    "/country": "bg-pink-50 dark:bg-pink-950/50 text-pink-500 dark:text-pink-400",
    "/utility-tools": "bg-teal-50 dark:bg-teal-950/50 text-teal-500 dark:text-teal-400",
    "/ai-tools": "bg-yellow-50 dark:bg-yellow-950/50 text-yellow-600 dark:text-yellow-400",
  };

  return (
    <div className="lg:hidden flex items-center gap-1.5">
      <ThemeToggle />

      {/* Hamburger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close menu" : "Open menu"}
        aria-expanded={isOpen}
        className="relative p-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <span
          className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ${isOpen ? "opacity-100 rotate-0" : "opacity-0 rotate-90"}`}
        >
          <X className="w-5 h-5" />
        </span>
        <span
          className={`flex items-center justify-center transition-all duration-200 ${isOpen ? "opacity-0 rotate-90" : "opacity-100 rotate-0"}`}
        >
          <Menu className="w-5 h-5" />
        </span>
      </button>

      {/* Backdrop */}
      <div
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-50 w-[88%] max-w-xs bg-white dark:bg-slate-900 flex flex-col transition-transform duration-300 ease-out shadow-2xl ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer Top Bar */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <Link
            href="/"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                Tool<span className="text-blue-600 dark:text-blue-400">qivo</span>
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                100+ Free Online Tools
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search bar */}
        <div className="px-4 pt-3 pb-2">
          <button
            type="button"
            onClick={() => { setIsOpen(false); onOpenSearch?.(); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm border border-slate-200/60 dark:border-slate-700/60 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
          >
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-medium">Search 100+ tools...</span>
            <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-400 font-mono">
              /
            </kbd>
          </button>
        </div>

        {/* Nav Groups */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-3">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.links.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                  const iconCls = isActive
                    ? "bg-blue-500 text-white"
                    : (iconColors[link.href] ?? "bg-slate-100 dark:bg-slate-800 text-slate-500");
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
                          : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconCls}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="flex-1">{link.label}</span>
                      <div className="flex items-center gap-1.5">
                        {link.badge && (
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                              link.badge === "Popular"
                                ? "bg-blue-100 text-blue-600 dark:bg-blue-900/60 dark:text-blue-300"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300"
                            }`}
                          >
                            {link.badge}
                          </span>
                        )}
                        <ChevronRight className={`w-4 h-4 transition-colors ${isActive ? "text-blue-400" : "text-slate-300 dark:text-slate-600"}`} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 pb-6 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5 bg-slate-50/80 dark:bg-slate-900/80">
          <Link
            href="/tools"
            onClick={() => setIsOpen(false)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white shadow-md shadow-blue-500/25 transition-all active:scale-95"
            style={{ background: "linear-gradient(135deg, #2563eb 0%, #4f46e5 60%, #7c3aed 100%)" }}
          >
            <Grid3X3 className="w-4 h-4" />
            <span>Explore All Tools</span>
            <Zap className="w-3.5 h-3.5 text-blue-200" />
          </Link>
          <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400 dark:text-slate-500 pt-1">
            <span>© 2026 Toolqivo</span>
            <Link href="/privacy" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
