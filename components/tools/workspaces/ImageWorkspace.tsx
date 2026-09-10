"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  Download,
  Sliders,
  Check,
  RefreshCw,
  ImageIcon,
  Maximize2,
  FileCheck,
  Sparkles,
} from "lucide-react";
import { Tool } from "@/data/types";
import { downloadFile } from "@/lib/download";

interface ImageWorkspaceProps {
  tool: Tool;
}

export function ImageWorkspace({ tool }: ImageWorkspaceProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [originalWidth, setOriginalWidth] = useState<number>(0);
  const [originalHeight, setOriginalHeight] = useState<number>(0);
  const [originalSize, setOriginalSize] = useState<number>(0);

  // Compression & resize states
  const [quality, setQuality] = useState<number>(75);
  const [targetWidth, setTargetWidth] = useState<number>(0);
  const [targetHeight, setTargetHeight] = useState<number>(0);
  const [keepAspectRatio, setKeepAspectRatio] = useState<boolean>(true);
  const [targetFormat, setTargetFormat] = useState<string>("image/jpeg");

  // Output states
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [processedSize, setProcessedSize] = useState<number>(0);
  const [outputFileName, setOutputFileName] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set default format based on tool
  useEffect(() => {
    if (tool.id === "jpg-to-png") setTargetFormat("image/png");
    else if (tool.id === "png-to-jpg" || tool.id === "webp-to-jpg") setTargetFormat("image/jpeg");
    else if (tool.id === "jpg-to-webp") setTargetFormat("image/webp");
    else setTargetFormat("image/jpeg");
  }, [tool.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    loadFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      loadFile(file);
    }
  };

  const loadFile = (file: File) => {
    setSelectedFile(file);
    setOriginalSize(file.size);
    setProcessedUrl(null);
    setProcessedBlob(null);
    setProcessedSize(0);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setOriginalWidth(img.width);
        setOriginalHeight(img.height);
        setTargetWidth(img.width);
        setTargetHeight(img.height);
        setImagePreview(event.target?.result as string);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleWidthChange = (val: number) => {
    setTargetWidth(val);
    if (keepAspectRatio && originalWidth > 0) {
      setTargetHeight(Math.round((val / originalWidth) * originalHeight));
    }
  };

  const handleHeightChange = (val: number) => {
    setTargetHeight(val);
    if (keepAspectRatio && originalHeight > 0) {
      setTargetWidth(Math.round((val / originalHeight) * originalWidth));
    }
  };

  const processImage = () => {
    if (!imagePreview) return;
    setIsProcessing(true);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const w = targetWidth || img.width;
      const h = targetHeight || img.height;
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setIsProcessing(false);
        return;
      }

      // If output is jpeg and has transparency, fill white background
      if (targetFormat === "image/jpeg") {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, w, h);
      }

      ctx.drawImage(img, 0, 0, w, h);

      const mimeType = targetFormat;
      const q = quality / 100;

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setIsProcessing(false);
            return;
          }
          const url = URL.createObjectURL(blob);
          setProcessedUrl(url);
          setProcessedBlob(blob);
          setProcessedSize(blob.size);

          const ext =
            mimeType === "image/png"
              ? "png"
              : mimeType === "image/webp"
              ? "webp"
              : "jpg";
          const baseName = selectedFile?.name.replace(/\.[^/.]+$/, "") || "toolqivo-image";
          setOutputFileName(`${baseName}-optimized.${ext}`);
          setIsProcessing(false);
        },
        mimeType,
        q
      );
    };
    img.src = imagePreview;
  };

  const formatKB = (bytes: number) => {
    if (bytes === 0) return "0 KB";
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + " MB";
    return (bytes / 1024).toFixed(1) + " KB";
  };

  const savingsPercent =
    originalSize > 0 && processedSize > 0
      ? Math.round(((originalSize - processedSize) / originalSize) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Upload Dropzone */}
      {!imagePreview ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="p-10 sm:p-14 text-center rounded-3xl border-2 border-dashed border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50/70 cursor-pointer transition-all group"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
            <Upload className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Choose an image to {tool.name.toLowerCase()}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Supports PNG, JPG, WebP, GIF, BMP. Fully processed in your browser for maximum privacy.
          </p>
          <div className="mt-5">
            <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-colors">
              <ImageIcon className="w-4 h-4" />
              Select From Device
            </span>
          </div>
        </div>
      ) : (
        /* Workspace Active Layout */
        <div className="space-y-6">
          {/* Top File Summary Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                IMG
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
                  {selectedFile?.name}
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  {originalWidth} × {originalHeight} px • {formatKB(originalSize)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setImagePreview(null);
                setSelectedFile(null);
                setProcessedUrl(null);
                setProcessedBlob(null);
              }}
              className="text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors"
            >
              Choose different image
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Control Sidebar */}
            <div className="lg:col-span-6 space-y-5">
              {/* Quality Slider (for Compression) */}
              {(tool.id === "compress-image" ||
                tool.id === "jpg-to-png" ||
                tool.id === "png-to-jpg" ||
                tool.id === "jpg-to-webp" ||
                tool.id === "webp-to-jpg") && (
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Compression Quality</span>
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-md">
                      {quality}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Smallest Size (10%)</span>
                    <span>Balanced (75%)</span>
                    <span>Best Quality (100%)</span>
                  </div>
                </div>
              )}

              {/* Dimensions Input (for Resizing) */}
              {tool.id === "resize-image" && (
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Target Dimensions (Pixels)</span>
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Width (px)</label>
                      <input
                        type="number"
                        value={targetWidth || ""}
                        onChange={(e) => handleWidthChange(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Height (px)</label>
                      <input
                        type="number"
                        value={targetHeight || ""}
                        onChange={(e) => handleHeightChange(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={keepAspectRatio}
                      onChange={(e) => setKeepAspectRatio(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Maintain aspect ratio</span>
                  </label>

                  {/* Preset Dimension Buttons */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Presets</span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: "75%", scale: 0.75 },
                        { label: "50%", scale: 0.5 },
                        { label: "25%", scale: 0.25 },
                        { label: "1920×1080", w: 1920, h: 1080 },
                        { label: "1080×1080 (Square)", w: 1080, h: 1080 },
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            if (preset.scale) {
                              setTargetWidth(Math.round(originalWidth * preset.scale));
                              setTargetHeight(Math.round(originalHeight * preset.scale));
                            } else if (preset.w && preset.h) {
                              setTargetWidth(preset.w);
                              setTargetHeight(preset.h);
                            }
                          }}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-500 transition-colors"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button
                type="button"
                onClick={processImage}
                disabled={isProcessing}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Image...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Apply & Optimize</span>
                  </>
                )}
              </button>
            </div>

            {/* Preview & Results Panel */}
            <div className="lg:col-span-6 space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Image Preview</p>
                <div className="relative max-h-64 sm:max-h-72 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-2">
                  <img
                    src={processedUrl || imagePreview}
                    alt="Preview"
                    className="max-h-60 max-w-full object-contain rounded-lg shadow-2xs"
                  />
                </div>
              </div>

              {/* Processed Results Card */}
              {processedBlob && (
                <div className="p-5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 animate-fade-in space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      Processing Complete!
                    </span>
                    {savingsPercent > 0 ? (
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                        -{savingsPercent}% Saved
                      </span>
                    ) : (
                      <span className="text-xs font-mono text-emerald-600 font-bold">Optimized</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-emerald-200 dark:border-emerald-800/60">
                    <div>
                      <span className="text-slate-500">Original Size:</span>
                      <p className="font-mono font-bold text-slate-700 dark:text-slate-300">{formatKB(originalSize)}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Optimized Size:</span>
                      <p className="font-mono font-bold text-emerald-600">{formatKB(processedSize)}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (processedBlob) {
                        downloadFile(processedBlob, outputFileName);
                      }
                    }}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download {outputFileName}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
