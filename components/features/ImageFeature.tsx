import React from "react";
import Link from "next/link";
import {
  Image as ImageIcon,
  FileArchive,
  Maximize2,
  ImagePlay,
  ImagePlus,
  Sparkles,
  RefreshCw,
  ArrowRight,
  Sliders,
  Check,
} from "lucide-react";

export function ImageFeature() {
  const imageTools = [
    { name: "Image Compressor", desc: "Shrink file size without blur", href: "/image-tools/image-compressor", icon: FileArchive },
    { name: "Image Resizer", desc: "Exact width, height & DPI", href: "/image-tools/image-resizer", icon: Maximize2 },
    { name: "JPG to PNG", desc: "Add transparent alpha layers", href: "/image-tools/jpg-to-png", icon: ImagePlay },
    { name: "PNG to JPG", desc: "Reduce memory footprint", href: "/image-tools/png-to-jpg", icon: ImagePlus },
    { name: "JPG to WebP", desc: "Next-gen web compression", href: "/image-tools/jpg-to-webp", icon: Sparkles },
    { name: "WebP to JPG", desc: "Universal compatibility", href: "/image-tools/webp-to-jpg", icon: RefreshCw },
  ];

  return (
    <section className="py-16 sm:py-24 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Description & Tools */}
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Image Optimization Suite</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Work With Images Faster
            </h2>
            <p className="mt-2.5 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Compress, resize and convert images in seconds without quality degradation or software installations.
            </p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {imageTools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <Link
                    key={tool.name}
                    href={tool.href}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800/80 shadow-2xs hover:shadow-xs transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 truncate">
                          {tool.name}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{tool.desc}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="mt-8">
              <Link
                href="/image-tools"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm hover:shadow-hover transition-all"
              >
                <span>Explore Image Tools</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Right Visual Image Processing Canvas */}
          <div className="lg:col-span-5">
            <div className="relative rounded-3xl bg-slate-50 dark:bg-slate-900 p-6 sm:p-8 border border-emerald-100 dark:border-emerald-900/30 shadow-xl shadow-emerald-500/5">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Live Compression Engine
                  </span>
                </div>
                <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                  -74% Saved
                </span>
              </div>

              {/* Before / After comparison visual */}
              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Original (PNG)</span>
                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">4.8 MB</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div className="w-full h-full bg-slate-400 dark:bg-slate-600 rounded-full" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>Optimized (WebP)</span>
                    <span className="font-mono">1.2 MB</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-emerald-100 dark:bg-emerald-950/60 overflow-hidden">
                    <div className="w-[25%] h-full bg-emerald-500 rounded-full" />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <Check className="w-4 h-4" />
                    <span>Lossless clarity intact</span>
                  </div>
                  <span className="text-[11px] font-mono">0.4s</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
