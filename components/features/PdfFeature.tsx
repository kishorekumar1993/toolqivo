import React from "react";
import Link from "next/link";
import {
  FileText,
  Minimize2,
  Layers,
  Scissors,
  RotateCw,
  FileImage,
  FilePlus2,
  FileCode2,
  Table,
  ArrowRight,
  Shield,
  Zap,
} from "lucide-react";

export function PdfFeature() {
  const pdfShortcuts = [
    { name: "Compress PDF", desc: "Reduce file size", href: "/pdf-tools/compress-pdf", icon: Minimize2 },
    { name: "Merge PDF", desc: "Combine documents", href: "/pdf-tools/merge-pdf", icon: Layers },
    { name: "Split PDF", desc: "Extract pages", href: "/pdf-tools/split-pdf", icon: Scissors },
    { name: "Rotate PDF", desc: "Change orientation", href: "/pdf-tools/rotate-pdf", icon: RotateCw },
    { name: "PDF to JPG", desc: "Extract images", href: "/pdf-tools/pdf-to-jpg", icon: FileImage },
    { name: "JPG to PDF", desc: "Convert photos", href: "/pdf-tools/jpg-to-pdf", icon: FilePlus2 },
    { name: "PDF to Word", desc: "Editable DOCX", href: "/pdf-tools/pdf-to-word", icon: FileText },
    { name: "Word to PDF", desc: "Convert DOC to PDF", href: "/pdf-tools/word-to-pdf", icon: FileCode2 },
    { name: "PDF to Excel", desc: "Extract tables", href: "/pdf-tools/pdf-to-excel", icon: Table },
    { name: "Excel to PDF", desc: "Spreadsheet to PDF", href: "/pdf-tools/excel-to-pdf", icon: Table },
  ];

  return (
    <section className="py-16 sm:py-24 bg-gradient-to-b from-blue-50/70 via-sky-50/40 to-white dark:from-slate-900/90 dark:via-blue-950/20 dark:to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Visual Studio Workspace */}
          <div className="lg:col-span-5 order-2 lg:order-1">
            <div className="relative rounded-3xl bg-white dark:bg-slate-900 p-6 sm:p-8 border border-red-100 dark:border-red-900/30 shadow-xl shadow-red-500/5">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">PDF Studio Suite</h4>
                    <p className="text-[11px] text-slate-400">Zero file size limits</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Private & Safe
                </span>
              </div>

              {/* Interactive Mock Action Zone */}
              <div className="mt-6 space-y-3">
                <div className="p-4 rounded-2xl border-2 border-dashed border-red-200 dark:border-red-900/40 bg-red-50/30 dark:bg-red-950/20 text-center">
                  <FileText className="w-8 h-8 text-red-500 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Fast Document Processing
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Drag and drop or select files to process instantly
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">Instant Speed</p>
                      <p className="text-[10px] text-slate-400">Under 2 seconds</p>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-500 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">Client Safe</p>
                      <p className="text-[10px] text-slate-400">Processed in browser</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content & Shortcuts */}
          <div className="lg:col-span-7 order-1 lg:order-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 mb-2">
              <FileText className="w-3.5 h-3.5" />
              <span>Full Suite PDF Tools</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Powerful PDF Tools, Made Simple
            </h2>
            <p className="mt-2.5 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Handle everyday PDF tasks without complicated software, intrusive ads, or file upload queues.
            </p>

            {/* 10 PDF Tool Shortcuts Grid */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {pdfShortcuts.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-red-300 dark:hover:border-red-900/80 shadow-2xs hover:shadow-xs transition-all group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 truncate">
                        {item.name}
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">{item.desc}</p>
                  </Link>
                );
              })}
            </div>

            {/* CTA */}
            <div className="mt-8">
              <Link
                href="/pdf-tools"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm shadow-sm hover:shadow-hover transition-all"
              >
                <span>Explore PDF Tools</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
