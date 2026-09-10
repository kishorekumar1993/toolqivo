import React from "react";
import Link from "next/link";
import { ArrowUpRight, Zap, Shield } from "lucide-react";
import { Tool } from "@/data/types";
import { DynamicIcon } from "@/components/ui/DynamicIcon";

interface ToolCardProps {
  tool: Tool;
}

export function ToolCard({ tool }: ToolCardProps) {
  const getCategoryConfig = (category: string) => {
    switch (category) {
      case "pdf":
        return {
          badgeLabel: "PDF",
          iconBg: "bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400 border border-red-100 dark:border-red-900/40",
          hoverBorder: "hover:border-red-300 dark:hover:border-red-700/60 hover:shadow-red-500/5",
          badge: "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200/80 dark:border-red-900/50",
          btnHover: "group-hover:bg-red-600 group-hover:text-white group-hover:border-red-600",
        };
      case "image":
        return {
          badgeLabel: "IMAGE",
          iconBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40",
          hoverBorder: "hover:border-emerald-300 dark:hover:border-emerald-700/60 hover:shadow-emerald-500/5",
          badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900/50",
          btnHover: "group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600",
        };
      case "finance":
        return {
          badgeLabel: "FINANCE",
          iconBg: "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40",
          hoverBorder: "hover:border-blue-300 dark:hover:border-blue-700/60 hover:shadow-blue-500/5",
          badge: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/50",
          btnHover: "group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600",
        };
      case "calculators":
        return {
          badgeLabel: "CALC",
          iconBg: "bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40",
          hoverBorder: "hover:border-purple-300 dark:hover:border-purple-700/60 hover:shadow-purple-500/5",
          badge: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/80 dark:border-purple-900/50",
          btnHover: "group-hover:bg-purple-600 group-hover:text-white group-hover:border-purple-600",
        };
      case "converters":
        return {
          badgeLabel: "CONVERT",
          iconBg: "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40",
          hoverBorder: "hover:border-amber-300 dark:hover:border-amber-700/60 hover:shadow-amber-500/5",
          badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/50",
          btnHover: "group-hover:bg-amber-600 group-hover:text-white group-hover:border-amber-600",
        };
      case "utility":
        return {
          badgeLabel: "UTILITY",
          iconBg: "bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400 border border-teal-100 dark:border-teal-900/40",
          hoverBorder: "hover:border-teal-300 dark:hover:border-teal-700/60 hover:shadow-teal-500/5",
          badge: "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200/80 dark:border-teal-900/50",
          btnHover: "group-hover:bg-teal-600 group-hover:text-white group-hover:border-teal-600",
        };
      case "ai":
        return {
          badgeLabel: "AI",
          iconBg: "bg-yellow-50 text-yellow-600 dark:bg-yellow-950/60 dark:text-yellow-400 border border-yellow-100 dark:border-yellow-900/40",
          hoverBorder: "hover:border-yellow-300 dark:hover:border-yellow-700/60 hover:shadow-yellow-500/5",
          badge: "bg-yellow-50 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300 border border-yellow-200/80 dark:border-yellow-900/50",
          btnHover: "group-hover:bg-yellow-500 group-hover:text-slate-950 group-hover:border-yellow-500",
        };
      default:
        return {
          badgeLabel: "TOOL",
          iconBg: "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40",
          hoverBorder: "hover:border-blue-300 dark:hover:border-blue-700/60 hover:shadow-blue-500/5",
          badge: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/50",
          btnHover: "group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600",
        };
    }
  };

  const config = getCategoryConfig(tool.category);

  return (
    <Link
      href={tool.route}
      className={`group relative flex flex-col justify-between p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-xs hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 ${config.hoverBorder}`}
    >
      <div>
        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <div
            className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl ${config.iconBg} flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform duration-300`}
          >
            <DynamicIcon name={tool.iconName} className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>

          <div className="flex items-center gap-1.5">
            {tool.isNew && (
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow-xs">
                New
              </span>
            )}
            {tool.popular && (
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60">
                Popular
              </span>
            )}
            <span
              className={`text-[10px] font-black tracking-wider px-2.5 py-0.5 rounded-full uppercase ${config.badge}`}
            >
              {config.badgeLabel}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
          {tool.name}
        </h3>

        {/* Description */}
        <p className="mt-1.5 text-[11px] sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
          {tool.description}
        </p>
      </div>

      {/* Bottom Action Row */}
      <div className="mt-4 sm:mt-6 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
          <Zap className="w-3 h-3 text-amber-500" />
          <span>Instant &amp; Free</span>
        </div>

        <span
          className={`inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs transition-all duration-200 ${config.btnHover}`}
        >
          <span>Use Tool</span>
          <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </Link>
  );
}
