"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  QrCode,
  Wifi,
  Globe,
  FileText,
  User,
  Mail,
  Phone,
  Download,
  Copy,
  Check,
  RefreshCw,
  Palette,
  Sliders,
  Sparkles,
  Layers,
  Eye,
  EyeOff,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { Tool } from "@/data/types";
import { downloadFile } from "@/lib/download";
import { renderQrToCanvas, generateQrSvg, QrEcLevel } from "@/lib/qr-generator";

interface QrCodeWorkspaceProps {
  tool: Tool;
}

type QrType = "url" | "wifi" | "text" | "vcard" | "email" | "phone";

const COLOR_PRESETS = [
  { name: "Obsidian Slate", fg: "#0f172a", bg: "#ffffff" },
  { name: "Deep Teal", fg: "#0d9488", bg: "#f0fdfa" },
  { name: "Electric Indigo", fg: "#4f46e5", bg: "#eef2ff" },
  { name: "Royal Purple", fg: "#7c3aed", bg: "#faf5ff" },
  { name: "Rose Crimson", fg: "#e11d48", bg: "#fff1f2" },
  { name: "Midnight Neon", fg: "#06b6d4", bg: "#0f172a" },
];

export function QrCodeWorkspace({ tool }: QrCodeWorkspaceProps) {
  const [activeType, setActiveType] = useState<QrType>("url");

  // Form states for different payloads
  const [url, setUrl] = useState("https://toolqivo.com");
  
  // WiFi
  const [wifiSsid, setWifiSsid] = useState("MyHome_5G");
  const [wifiPass, setWifiPass] = useState("");
  const [wifiAuth, setWifiAuth] = useState<"WPA" | "WEP" | "nopass">("WPA");
  const [wifiHidden, setWifiHidden] = useState(false);
  const [showWifiPass, setShowWifiPass] = useState(false);

  // Text
  const [plainText, setPlainText] = useState("Hello from Toolqivo!");

  // vCard
  const [vFirstName, setVFirstName] = useState("Alex");
  const [vLastName, setVLastName] = useState("Morgan");
  const [vPhone, setVPhone] = useState("+1 555 019 2834");
  const [vEmail, setVEmail] = useState("alex@example.com");
  const [vOrg, setVOrg] = useState("Toolqivo Inc");
  const [vTitle, setVTitle] = useState("Product Lead");
  const [vWebsite, setVWebsite] = useState("https://toolqivo.com");

  // Email
  const [mailTo, setMailTo] = useState("contact@example.com");
  const [mailSubject, setMailSubject] = useState("Hello from QR code");
  const [mailBody, setMailBody] = useState("Hi there, reaching out via Toolqivo QR code.");

  // Phone / SMS
  const [phoneNum, setPhoneNum] = useState("+1 555 019 2834");
  const [phoneMode, setPhoneMode] = useState<"call" | "sms">("call");
  const [smsMessage, setSmsMessage] = useState("Hey! Let's connect.");

  // Styling & Options
  const [fgColor, setFgColor] = useState("#0f172a");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [ecLevel, setEcLevel] = useState<QrEcLevel>("M");
  const [dotStyle, setDotStyle] = useState<"square" | "rounded" | "dots">("square");
  const [qrSize, setQrSize] = useState(400);
  const [quietZone, setQuietZone] = useState(4);

  // Copy status
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Compute final QR payload string
  const getQrPayload = (): string => {
    switch (activeType) {
      case "url": {
        let trimmed = url.trim();
        if (!trimmed) return "https://toolqivo.com";
        if (!/^https?:\/\//i.test(trimmed)) {
          trimmed = "https://" + trimmed;
        }
        return trimmed;
      }
      case "wifi": {
        const ssid = wifiSsid.trim().replace(/([\\;:"])/g, "\\$1");
        const pass = wifiPass.replace(/([\\;:"])/g, "\\$1");
        const auth = wifiAuth;
        return `WIFI:S:${ssid};T:${auth};P:${pass};H:${wifiHidden ? "true" : "false"};;`;
      }
      case "text":
        return plainText || "Toolqivo";
      case "vcard": {
        const lines = [
          "BEGIN:VCARD",
          "VERSION:3.0",
          `N:${vLastName};${vFirstName};;;`,
          `FN:${vFirstName} ${vLastName}`.trim(),
        ];
        if (vOrg) lines.push(`ORG:${vOrg}`);
        if (vTitle) lines.push(`TITLE:${vTitle}`);
        if (vPhone) lines.push(`TEL;TYPE=CELL:${vPhone}`);
        if (vEmail) lines.push(`EMAIL:${vEmail}`);
        if (vWebsite) lines.push(`URL:${vWebsite}`);
        lines.push("END:VCARD");
        return lines.join("\n");
      }
      case "email": {
        const encSubject = encodeURIComponent(mailSubject);
        const encBody = encodeURIComponent(mailBody);
        return `mailto:${mailTo.trim()}?subject=${encSubject}&body=${encBody}`;
      }
      case "phone": {
        if (phoneMode === "sms") {
          return `smsto:${phoneNum.trim()}:${smsMessage}`;
        }
        return `tel:${phoneNum.trim()}`;
      }
      default:
        return "https://toolqivo.com";
    }
  };

  const payload = getQrPayload();

  // Render QR Code live on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      renderQrToCanvas(canvas, payload, {
        ecLevel,
        fgColor,
        bgColor,
        size: qrSize,
        margin: quietZone,
        dotStyle,
      });
    } catch (err) {
      console.error("QR Code Render Error:", err);
    }
  }, [payload, ecLevel, fgColor, bgColor, qrSize, quietZone, dotStyle]);

  // Download PNG
  const downloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) {
        downloadFile(blob, `qr-code-${activeType}.png`);
      }
    }, "image/png");
  };

  // Download SVG
  const downloadSvg = () => {
    try {
      const svgString = generateQrSvg(payload, {
        ecLevel,
        fgColor,
        bgColor,
        size: qrSize,
        margin: quietZone,
      });
      const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      downloadFile(blob, `qr-code-${activeType}.svg`);
    } catch (err) {
      console.error("SVG generation error:", err);
    }
  };

  // Copy Image to Clipboard
  const copyImageToClipboard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        if (navigator.clipboard && window.ClipboardItem) {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          setCopiedImage(true);
          setTimeout(() => setCopiedImage(false), 2000);
        } else {
          // Fallback to copying payload text
          handleCopyPayload();
        }
      }, "image/png");
    } catch (err) {
      handleCopyPayload();
    }
  };

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(payload);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Type Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-200/70 dark:bg-slate-800/80 rounded-2xl border border-slate-300/60 dark:border-slate-700/60">
        {[
          { id: "url", label: "Website URL", icon: Globe },
          { id: "wifi", label: "WiFi Network", icon: Wifi },
          { id: "vcard", label: "Contact Card", icon: User },
          { id: "text", label: "Plain Text", icon: FileText },
          { id: "email", label: "Email", icon: Mail },
          { id: "phone", label: "Phone / SMS", icon: Phone },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeType === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveType(tab.id as QrType)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                isActive
                  ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Grid: Inputs vs Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: Inputs & Customization */}
        <div className="lg:col-span-7 space-y-6">
          {/* Content Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-teal-600" />
                <span>QR Content Data</span>
              </h3>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">
                {activeType.toUpperCase()}
              </span>
            </div>

            {/* URL Input */}
            {activeType === "url" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Website or Link URL
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <Globe className="w-4 h-4" />
                    </div>
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {["https://toolqivo.com", "https://github.com", "https://google.com"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setUrl(preset)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-400"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* WiFi Input */}
            {activeType === "wifi" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Network Name (SSID)
                  </label>
                  <input
                    type="text"
                    value={wifiSsid}
                    onChange={(e) => setWifiSsid(e.target.value)}
                    placeholder="e.g. Office_Guest_WiFi"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Security Type
                    </label>
                    <select
                      value={wifiAuth}
                      onChange={(e) => setWifiAuth(e.target.value as any)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none"
                    >
                      <option value="WPA">WPA / WPA2 / WPA3 (Recommended)</option>
                      <option value="WEP">WEP</option>
                      <option value="nopass">None (Open Network)</option>
                    </select>
                  </div>

                  {wifiAuth !== "nopass" && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Wi-Fi Password
                      </label>
                      <div className="relative">
                        <input
                          type={showWifiPass ? "text" : "password"}
                          value={wifiPass}
                          onChange={(e) => setWifiPass(e.target.value)}
                          placeholder="Password"
                          className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowWifiPass(!showWifiPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showWifiPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={wifiHidden}
                    onChange={(e) => setWifiHidden(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span>This is a hidden network</span>
                </label>
              </div>
            )}

            {/* Plain Text */}
            {activeType === "text" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Plain Text / Notes
                </label>
                <textarea
                  rows={5}
                  value={plainText}
                  onChange={(e) => setPlainText(e.target.value)}
                  placeholder="Enter any text, instructions, or notes..."
                  className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
            )}

            {/* vCard Contact Card */}
            {activeType === "vcard" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={vFirstName}
                      onChange={(e) => setVFirstName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-xs font-medium outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={vLastName}
                      onChange={(e) => setVLastName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-xs font-medium outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={vPhone}
                      onChange={(e) => setVPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-xs font-medium outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={vEmail}
                      onChange={(e) => setVEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-xs font-medium outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Company / Org
                    </label>
                    <input
                      type="text"
                      value={vOrg}
                      onChange={(e) => setVOrg(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-xs font-medium outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Job Title
                    </label>
                    <input
                      type="text"
                      value={vTitle}
                      onChange={(e) => setVTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-xs font-medium outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Website
                    </label>
                    <input
                      type="url"
                      value={vWebsite}
                      onChange={(e) => setVWebsite(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-xs font-medium outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Email Input */}
            {activeType === "email" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Recipient Email
                  </label>
                  <input
                    type="email"
                    value={mailTo}
                    onChange={(e) => setMailTo(e.target.value)}
                    placeholder="recipient@example.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-sm font-medium outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Subject
                  </label>
                  <input
                    type="text"
                    value={mailSubject}
                    onChange={(e) => setMailSubject(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-sm font-medium outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Message Body
                  </label>
                  <textarea
                    rows={3}
                    value={mailBody}
                    onChange={(e) => setMailBody(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-xs outline-none"
                  />
                </div>
              </div>
            )}

            {/* Phone / SMS Input */}
            {activeType === "phone" && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPhoneMode("call")}
                    className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all ${
                      phoneMode === "call"
                        ? "bg-teal-500/10 border-teal-500 text-teal-600 dark:text-teal-400 font-bold"
                        : "border-slate-200 dark:border-slate-700 text-slate-600"
                    }`}
                  >
                    Phone Call (tel:)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhoneMode("sms")}
                    className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all ${
                      phoneMode === "sms"
                        ? "bg-teal-500/10 border-teal-500 text-teal-600 dark:text-teal-400 font-bold"
                        : "border-slate-200 dark:border-slate-700 text-slate-600"
                    }`}
                  >
                    SMS Message (smsto:)
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phoneNum}
                    onChange={(e) => setPhoneNum(e.target.value)}
                    placeholder="+1 555 123 4567"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-sm font-medium outline-none"
                  />
                </div>

                {phoneMode === "sms" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Pre-filled SMS Message
                    </label>
                    <textarea
                      rows={3}
                      value={smsMessage}
                      onChange={(e) => setSmsMessage(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-xs outline-none"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Style & Options Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Palette className="w-4 h-4 text-teal-600" />
              <span>Design & Style Customization</span>
            </h3>

            {/* Color Presets */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                Color Themes
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {COLOR_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => {
                      setFgColor(p.fg);
                      setBgColor(p.bg);
                    }}
                    title={p.name}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-teal-500 transition-all group"
                  >
                    <div
                      className="w-7 h-7 rounded-lg shadow-inner flex items-center justify-center border border-black/10"
                      style={{ backgroundColor: p.bg }}
                    >
                      <div className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: p.fg }} />
                    </div>
                    <span className="text-[10px] text-slate-500 truncate w-full text-center group-hover:text-teal-600">
                      {p.name.split(" ")[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Hex Pickers */}
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Foreground Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-transparent"
                  />
                  <input
                    type="text"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-xs uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Background Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-transparent"
                  />
                  <input
                    type="text"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-xs uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Dot Pattern Style */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                Module Pattern Style
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "square", label: "Classic Square" },
                  { id: "rounded", label: "Smooth Rounded" },
                  { id: "dots", label: "Modern Circular" },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setDotStyle(s.id as any)}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                      dotStyle === s.id
                        ? "border-teal-500 bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold"
                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Correction & Margin */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Error Correction</span>
                  <span className="text-teal-600 font-mono">
                    {ecLevel === "L" ? "Low (~7%)" : ecLevel === "M" ? "Med (~15%)" : ecLevel === "Q" ? "High (~25%)" : "Max (~30%)"}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {(["L", "M", "Q", "H"] as QrEcLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setEcLevel(lvl)}
                      className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        ecLevel === lvl
                          ? "bg-teal-600 text-white border-teal-600"
                          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Quiet Zone Margin</span>
                  <span className="text-teal-600 font-mono">{quietZone} blocks</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="6"
                  value={quietZone}
                  onChange={(e) => setQuietZone(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-600 mt-2"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Preview & Download Card */}
        <div className="lg:col-span-5 sticky top-6 space-y-4">
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md flex flex-col items-center text-center">
            <div className="flex items-center gap-2 mb-4 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-900">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>100% Scannable ISO/IEC 18004 QR Code</span>
            </div>

            {/* QR Canvas Display */}
            <div
              className="p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center transition-all"
              style={{ backgroundColor: bgColor }}
            >
              <canvas
                ref={canvasRef}
                className="max-w-full h-auto rounded-lg"
                style={{ width: "240px", height: "240px" }}
              />
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-3 font-mono">
              <Smartphone className="w-3.5 h-3.5 text-teal-600" />
              <span>Scan with iOS Camera, Android, or any QR scanner</span>
            </div>

            {/* Download Buttons */}
            <div className="w-full grid grid-cols-2 gap-3 mt-6">
              <button
                type="button"
                onClick={downloadPng}
                className="py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download PNG</span>
              </button>
              <button
                type="button"
                onClick={downloadSvg}
                className="py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Layers className="w-4 h-4" />
                <span>Vector SVG</span>
              </button>
            </div>

            {/* Copy Actions */}
            <div className="w-full flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={copyImageToClipboard}
                className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
              >
                {copiedImage ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedImage ? "Image Copied!" : "Copy Image"}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyPayload}
                className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
              >
                {copiedPayload ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Code2Icon />}
                <span>{copiedPayload ? "Copied!" : "Copy Text"}</span>
              </button>
            </div>

            {/* Payload preview box */}
            <div className="w-full mt-5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Encoded Payload
              </span>
              <p className="font-mono text-[11px] text-slate-600 dark:text-slate-300 break-all line-clamp-3">
                {payload}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Code2Icon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  );
}
