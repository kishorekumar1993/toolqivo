"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ShieldCheck, Zap, Sparkles, Share2, Check } from "lucide-react";
import { Tool } from "@/data/types";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import { TOOLS } from "@/data/tools";
import { ToolCard } from "@/components/popular/ToolCard";
import { Breadcrumb } from "@/components/seo/Breadcrumb";

// Dedicated Workspace Engines
import { ImageWorkspace } from "./workspaces/ImageWorkspace";
import { PdfWorkspace } from "./workspaces/PdfWorkspace";
import { FinanceWorkspace } from "./workspaces/FinanceWorkspace";
import { CalculatorWorkspace } from "./workspaces/CalculatorWorkspace";
import { ConverterWorkspace } from "./workspaces/ConverterWorkspace";
import { UtilityWorkspace } from "./workspaces/UtilityWorkspace";
import { AiWorkspace } from "./workspaces/AiWorkspace";

interface ToolWorkspaceViewProps {
  tool: Tool;
}

export function ToolWorkspaceView({ tool }: ToolWorkspaceViewProps) {
  const [copiedLink, setCopiedLink] = useState(false);

  const copyToolLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const relatedTools = TOOLS.filter(
    (t) => t.category === tool.category && t.id !== tool.id
  ).slice(0, 4);

  // Map category to its hub route
  const categoryRouteMap: Record<string, string> = {
    pdf: "/pdf-tools",
    image: "/image-tools",
    finance: "/finance",
    calculators: "/calculators",
    converters: "/converters",
    country: "/country",
    utility: "/utility-tools",
    ai: "/ai-tools",
  };
  const categoryRoute = categoryRouteMap[tool.category] ?? "/tools";
  const categoryLabel =
    tool.category === "pdf" ? "PDF Tools"
    : tool.category === "image" ? "Image Tools"
    : tool.category === "ai" ? "AI Tools"
    : tool.category === "utility" ? "Utility Tools"
    : tool.category.charAt(0).toUpperCase() + tool.category.slice(1);

  const renderActiveWorkspace = () => {
    switch (tool.category) {
      case "image":
        return <ImageWorkspace tool={tool} />;
      case "pdf":
        return <PdfWorkspace tool={tool} />;
      case "finance":
      case "country":
        return <FinanceWorkspace tool={tool} />;
      case "calculators":
        return <CalculatorWorkspace tool={tool} />;
      case "converters":
        return <ConverterWorkspace tool={tool} />;
      case "utility":
        return <UtilityWorkspace tool={tool} />;
      case "ai":
        return <AiWorkspace tool={tool} />;
      default:
        return <UtilityWorkspace tool={tool} />;
    }
  };

  const getBadgeColors = () => {
    switch (tool.category) {
      case "pdf":
        return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50";
      case "image":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50";
      case "finance":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50";
      case "calculators":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/50";
      case "converters":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50";
      default:
        return "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-900/50";
    }
  };

  return (
    <div className="py-8 sm:py-12 bg-slate-50/60 dark:bg-slate-950 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <Breadcrumb
            items={[
              { label: categoryLabel, href: categoryRoute },
              { label: tool.name },
            ]}
          />

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={copyToolLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 shadow-2xs transition-colors"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedLink ? "Copied!" : "Share"}</span>
            </button>
          </div>
        </div>

        {/* Tool Header Card */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-13 h-13 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs border border-blue-100 dark:border-blue-900/50">
                <DynamicIcon name={tool.iconName} className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    {tool.name}
                  </h1>
                  <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getBadgeColors()}`}>
                    {tool.category}
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                  {tool.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Client-Side Safe</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[11px] font-medium text-blue-600 dark:text-blue-400">
                <Zap className="w-3.5 h-3.5" />
                <span>Instant</span>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Tool Studio Workspace */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 p-6 sm:p-10 border border-slate-200/80 dark:border-slate-800 shadow-sm mb-12">
          {renderActiveWorkspace()}
        </div>

        {/* Related Tools */}
        {relatedTools.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                More {tool.category.toUpperCase()} Tools You Might Need
              </h2>
              <Link href={`/${tool.category}-tools`} className="text-xs font-semibold text-blue-600 hover:underline">
                View all {tool.category} tools →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {relatedTools.map((relTool) => (
                <ToolCard key={relTool.id} tool={relTool} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
