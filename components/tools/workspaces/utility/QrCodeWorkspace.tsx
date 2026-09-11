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
  Palette,
  Sliders,
  Sparkles,
  Layers,
  Eye,
  EyeOff,
  ShieldCheck,
  Smartphone,
  Upload,
  Image as ImageIcon,
  Trash2,
  ScanLine,
  ExternalLink,
  MessageCircle,
  CreditCard,
  MapPin,
  Flame,
  Maximize2,
  FileCode,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowRight,
  HelpCircle,
  RefreshCw,
} from "lucide-react";
import { Tool } from "@/data/types";
import { downloadFile } from "@/lib/download";
import {
  renderQrToCanvas,
  generateQrSvg,
  exportSelfContainedQrSvg,
  getEffectiveEcLevel,
  QrEcLevel,
  QrOptions,
  QrPayloads,
} from "@/lib/qr-generator";
import {
  decodeQrFromCanvas,
  parseQrPayload,
  ParsedQrPayload,
  DetectedQrType,
} from "@/lib/qr-decoder";
import { runQrTestSuite, TestSuiteReport } from "@/lib/qr-test-suite";

interface QrCodeWorkspaceProps {
  tool: Tool;
}

type MainTab = "generator" | "scanner" | "tests";
type QrType = "url" | "wifi" | "vcard" | "text" | "email" | "phone" | "whatsapp" | "upi" | "location";

// Contrast ratio helpers to evaluate QR scannability
function getHexLuminance(hex: string): number {
  const clean = hex.replace("#", "");
  if (clean.length !== 6 && clean.length !== 3) return 0.5;
  const r = parseInt(clean.length === 3 ? clean[0] + clean[0] : clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.length === 3 ? clean[1] + clean[1] : clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.length === 3 ? clean[2] + clean[2] : clean.slice(4, 6), 16) / 255;
  const a = [r, g, b].map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrastRatio(fg: string, bg: string): number {
  const l1 = getHexLuminance(fg);
  const l2 = getHexLuminance(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

// Built-in vector SVG presets converted to clean Data URIs for logo embedding
const PRESET_LOGOS = [
  {
    id: "toolqivo",
    name: "Toolqivo",
    color: "#0d9488",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="24" fill="#0d9488"/><path d="M30 35 L70 35 M50 35 L50 72" stroke="#ffffff" stroke-width="12" stroke-linecap="round"/><circle cx="70" cy="65" r="8" fill="#38bdf8"/></svg>`,
  },
  {
    id: "globe",
    name: "Website",
    color: "#2563eb",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="24" fill="#2563eb"/><circle cx="50" cy="50" r="30" fill="none" stroke="#ffffff" stroke-width="6"/><ellipse cx="50" cy="50" rx="14" ry="30" fill="none" stroke="#ffffff" stroke-width="6"/><line x1="20" y1="50" x2="80" y2="50" stroke="#ffffff" stroke-width="6"/></svg>`,
  },
  {
    id: "wifi",
    name: "Wi-Fi",
    color: "#059669",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="24" fill="#059669"/><path d="M22 38 A40 40 0 0 1 78 38 M32 50 A26 26 0 0 1 68 50 M42 62 A12 12 0 0 1 58 62" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round"/><circle cx="50" cy="74" r="5" fill="#ffffff"/></svg>`,
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    color: "#25D366",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="24" fill="#25D366"/><path d="M50 20 A30 30 0 0 0 24 64 L20 80 L37 76 A30 30 0 1 0 50 20 Z" fill="#ffffff"/><path d="M40 36 C38 36 36 38 36 41 C36 47 43 56 49 61 C53 64 58 64 61 62 L65 57 C66 55 65 53 63 52 L57 49 C55 48 54 49 53 50 L51 52 C48 50 45 47 44 44 L46 42 C47 41 47 39 46 38 L43 36 C42 36 41 36 40 36 Z" fill="#25D366"/></svg>`,
  },
  {
    id: "instagram",
    name: "Instagram",
    color: "#E1306C",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><defs><linearGradient id="ig" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#fdf497"/><stop offset="30%" stop-color="#fd5949"/><stop offset="60%" stop-color="#d6249f"/><stop offset="100%" stop-color="#285AEB"/></linearGradient></defs><rect width="100" height="100" rx="24" fill="url(#ig)"/><rect x="25" y="25" width="50" height="50" rx="14" fill="none" stroke="#ffffff" stroke-width="6"/><circle cx="50" cy="50" r="12" fill="none" stroke="#ffffff" stroke-width="6"/><circle cx="65" cy="35" r="3.5" fill="#ffffff"/></svg>`,
  },
  {
    id: "youtube",
    name: "YouTube",
    color: "#FF0000",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="24" fill="#FF0000"/><path d="M26 36 C26 30 30 28 50 28 C70 28 74 30 74 36 C74 44 74 56 74 64 C74 70 70 72 50 72 C30 72 26 70 26 64 Z" fill="#ffffff"/><polygon points="44,40 62,50 44,60" fill="#FF0000"/></svg>`,
  },
  {
    id: "github",
    name: "GitHub",
    color: "#181717",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="24" fill="#181717"/><path d="M50 20 A30 30 0 0 0 40 78 C42 78 42 77 42 76 L42 71 C34 73 32 68 32 68 C31 65 29 64 29 64 C26 62 29 62 29 62 C32 62 34 65 34 65 C37 70 41 68 43 67 C43 65 44 63 45 62 C38 61 31 59 31 47 C31 44 32 41 34 39 C33 38 32 35 34 30 C34 30 37 29 42 33 C45 32 48 32 50 32 C52 32 55 32 58 33 C63 29 66 30 66 30 C68 35 67 38 66 39 C68 41 69 44 69 47 C69 59 62 61 55 62 C56 63 58 66 58 70 L58 76 C58 77 58 78 60 78 A30 30 0 0 0 50 20 Z" fill="#ffffff"/></svg>`,
  },
  {
    id: "location",
    name: "Location",
    color: "#ea580c",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="24" fill="#ea580c"/><path d="M50 24 A18 18 0 0 0 32 42 C32 55 50 76 50 76 C50 76 68 55 68 42 A18 18 0 0 0 50 24 Z" fill="#ffffff"/><circle cx="50" cy="42" r="7" fill="#ea580c"/></svg>`,
  },
];

function svgToDataUri(svgString: string): string {
  if (typeof window !== "undefined" && typeof window.btoa === "function") {
    try {
      return `data:image/svg+xml;base64,${window.btoa(unescape(encodeURIComponent(svgString)))}`;
    } catch {
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
    }
  }
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
}

const GRADIENT_THEMES = [
  { name: "Solid Slate", solid: true, fg1: "#0f172a", fg2: "#0f172a", bg: "#ffffff" },
  { name: "Deep Teal", solid: false, fg1: "#0d9488", fg2: "#0284c7", bg: "#f0fdfa" },
  { name: "Electric Indigo", solid: false, fg1: "#4f46e5", fg2: "#06b6d4", bg: "#f8fafc" },
  { name: "Royal Purple", solid: false, fg1: "#7c3aed", fg2: "#ec4899", bg: "#faf5ff" },
  { name: "Sunset Crimson", solid: false, fg1: "#ea580c", fg2: "#e11d48", bg: "#fff7ed" },
  { name: "Midnight Neon", solid: false, fg1: "#00f2fe", fg2: "#4facfe", bg: "#0b1120" },
  { name: "Emerald Mint", solid: false, fg1: "#059669", fg2: "#10b981", bg: "#ecfdf5" },
  { name: "Cyberpunk Pink", solid: false, fg1: "#d946ef", fg2: "#8b5cf6", bg: "#ffffff" },
];

export function QrCodeWorkspace({ tool }: QrCodeWorkspaceProps) {
  const [mainTab, setMainTab] = useState<MainTab>("generator");
  const [activeType, setActiveType] = useState<QrType>("url");

  // Payload form states
  const [url, setUrl] = useState("https://toolqivo.com");

  // WiFi
  const [wifiSsid, setWifiSsid] = useState("Office_Fast_5G");
  const [wifiPass, setWifiPass] = useState("");
  const [wifiAuth, setWifiAuth] = useState<"WPA" | "WEP" | "nopass">("WPA");
  const [wifiHidden, setWifiHidden] = useState(false);
  const [showWifiPass, setShowWifiPass] = useState(false);

  // vCard
  const [vFirstName, setVFirstName] = useState("Sarah");
  const [vLastName, setVLastName] = useState("Connor");
  const [vPhone, setVPhone] = useState("+1 555 019 2834");
  const [vEmail, setVEmail] = useState("sarah@example.com");
  const [vOrg, setVOrg] = useState("Toolqivo Tech");
  const [vTitle, setVTitle] = useState("Design Lead");
  const [vWebsite, setVWebsite] = useState("https://toolqivo.com");
  const [vAddress, setVAddress] = useState("San Francisco, CA");

  // Plain Text
  const [plainText, setPlainText] = useState("Scan to explore Toolqivo free utility suite!");

  // Email
  const [mailTo, setMailTo] = useState("support@toolqivo.com");
  const [mailSubject, setMailSubject] = useState("Customer Inquiry");
  const [mailBody, setMailBody] = useState("Hello Toolqivo team, I would like to inquire about...");

  // Phone & SMS
  const [phoneNum, setPhoneNum] = useState("+1 555 019 2834");
  const [phoneMode, setPhoneMode] = useState<"call" | "sms">("call");
  const [smsMessage, setSmsMessage] = useState("Hi, connecting via QR code!");

  // WhatsApp
  const [waNumber, setWaNumber] = useState("+1 555 019 2834");
  const [waMessage, setWaMessage] = useState("Hello! I found your QR code on Toolqivo.");

  // UPI
  const [upiVpa, setUpiVpa] = useState("toolqivo@okhdfcbank");
  const [upiName, setUpiName] = useState("Toolqivo");
  const [upiAmount, setUpiAmount] = useState<number | undefined>(undefined);
  const [upiNote, setUpiNote] = useState("Services Payment");

  // Location
  const [locLat, setLocLat] = useState("37.7749");
  const [locLng, setLocLng] = useState("-122.4194");

  // Customization & Design States
  const [useGradient, setUseGradient] = useState(false);
  const [fgColor, setFgColor] = useState("#0f172a");
  const [fgColor2, setFgColor2] = useState("#0d9488");
  const [gradientAngle, setGradientAngle] = useState(45);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [isTransparentBg, setIsTransparentBg] = useState(false);
  const [ecLevel, setEcLevel] = useState<QrEcLevel>("M");
  const [dotStyle, setDotStyle] = useState<"square" | "rounded" | "dots" | "diamond">("rounded");

  // Eye Customization
  const [eyeOuterShape, setEyeOuterShape] = useState<"square" | "rounded" | "circle">("rounded");
  const [eyeInnerShape, setEyeInnerShape] = useState<"square" | "rounded" | "circle" | "diamond">("rounded");
  const [customEyeColor, setCustomEyeColor] = useState(false);
  const [eyeOuterColor, setEyeOuterColor] = useState("#0d9488");
  const [eyeInnerColor, setEyeInnerColor] = useState("#0f172a");

  // Logo / Image States
  const [logoDataUri, setLogoDataUri] = useState<string | null>(svgToDataUri(PRESET_LOGOS[0].svg));
  const [logoSizeRatio, setLogoSizeRatio] = useState(0.20);
  const [logoMargin, setLogoMargin] = useState(6);
  const [logoShape, setLogoShape] = useState<"circle" | "rounded" | "square" | "none">("rounded");
  const [logoBgColor, setLogoBgColor] = useState("#ffffff");

  // Frame Banner
  const [frameEnabled, setFrameEnabled] = useState(false);
  const [frameText, setFrameText] = useState("SCAN ME");
  const [framePosition, setFramePosition] = useState<"bottom" | "top">("bottom");
  const [frameColor, setFrameColor] = useState("#0f172a");
  const [frameTextColor, setFrameTextColor] = useState("#ffffff");

  // Export resolution
  const [exportSize, setExportSize] = useState<500 | 1000 | 2000 | 4000>(1000);

  // Status feedback
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [copiedSvg, setCopiedSvg] = useState(false);
  const [isRendering, setIsRendering] = useState(false);

  // Scanner Tab States
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [decodedData, setDecodedData] = useState<ParsedQrPayload | null>(null);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [scannerPreview, setScannerPreview] = useState<string | null>(null);
  const [scannerStatus, setScannerStatus] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [copiedScanText, setCopiedScanText] = useState(false);
  const [importSuccessToast, setImportSuccessToast] = useState(false);

  // Engine Test Suite States
  const [testReport, setTestReport] = useState<TestSuiteReport | null>(null);
  const [activeTestCategory, setActiveTestCategory] = useState<string>("all");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanFileInputRef = useRef<HTMLInputElement>(null);

  // Compute final QR payload string
  const getQrPayload = (): string => {
    switch (activeType) {
      case "url":
        return QrPayloads.url(url);
      case "wifi":
        return QrPayloads.wifi(wifiSsid, wifiPass, wifiAuth, wifiHidden);
      case "vcard":
        return QrPayloads.vCard({
          firstName: vFirstName,
          lastName: vLastName,
          phone: vPhone,
          email: vEmail,
          org: vOrg,
          title: vTitle,
          url: vWebsite,
          address: vAddress,
        });
      case "text":
        return plainText || "Toolqivo";
      case "email":
        return QrPayloads.email(mailTo, mailSubject, mailBody);
      case "phone":
        return phoneMode === "sms"
          ? QrPayloads.sms(phoneNum, smsMessage)
          : QrPayloads.phone(phoneNum);
      case "whatsapp":
        return QrPayloads.whatsApp(waNumber, waMessage);
      case "upi":
        return QrPayloads.upi(upiVpa, upiName, upiAmount, upiNote);
      case "location":
        return QrPayloads.location(parseFloat(locLat) || 0, parseFloat(locLng) || 0);
      default:
        return "https://toolqivo.com";
    }
  };

  const payload = getQrPayload();

  // Determine effective ECC level (Auto-boost if logo is attached: Q for <= 25%, H for > 25%)
  const effectiveEcc: QrEcLevel = getEffectiveEcLevel(ecLevel, Boolean(logoDataUri), logoSizeRatio);

  // Build options object
  const getQrOptions = (targetSize: number = 400): QrOptions => ({
    ecLevel: effectiveEcc,
    fgColor,
    bgColor: isTransparentBg ? "transparent" : bgColor,
    size: targetSize,
    margin: 4,
    dotStyle,
    gradient: useGradient
      ? {
        enabled: true,
        type: "linear",
        color1: fgColor,
        color2: fgColor2,
        angle: gradientAngle,
      }
      : undefined,
    eyeOuterShape,
    eyeInnerShape,
    eyeOuterColor: customEyeColor ? eyeOuterColor : undefined,
    eyeInnerColor: customEyeColor ? eyeInnerColor : undefined,
    logoUrl: logoDataUri || undefined,
    logoSizeRatio,
    logoMargin,
    logoShape,
    logoBgColor,
    frameText: frameEnabled ? frameText : undefined,
    frameColor,
    frameTextColor,
    framePosition: frameEnabled ? framePosition : "none",
  });

  // Re-render live canvas preview whenever any option changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let isMounted = true;
    setIsRendering(true);

    renderQrToCanvas(canvas, payload, getQrOptions(400))
      .catch((err) => console.error("Live QR Render Error:", err))
      .finally(() => {
        if (isMounted) setIsRendering(false);
      });

    return () => {
      isMounted = false;
    };
  }, [
    payload,
    effectiveEcc,
    fgColor,
    fgColor2,
    useGradient,
    gradientAngle,
    bgColor,
    isTransparentBg,
    dotStyle,
    eyeOuterShape,
    eyeInnerShape,
    customEyeColor,
    eyeOuterColor,
    eyeInnerColor,
    logoDataUri,
    logoSizeRatio,
    logoMargin,
    logoShape,
    logoBgColor,
    frameEnabled,
    frameText,
    framePosition,
    frameColor,
    frameTextColor,
  ]);

  // Handle Logo Upload from local files
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file (PNG, JPG, SVG, WebP)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUri = event.target?.result as string;
      if (dataUri) {
        setLogoDataUri(dataUri);
      }
    };
    reader.readAsDataURL(file);
  };

  // Helper to render high-res canvas offscreen for export
  const renderOffscreenCanvas = async (res: number): Promise<HTMLCanvasElement> => {
    const offscreen = document.createElement("canvas");
    await renderQrToCanvas(offscreen, payload, getQrOptions(res));
    return offscreen;
  };

  // Download High-Resolution PNG
  const downloadPng = async () => {
    try {
      const offscreen = await renderOffscreenCanvas(exportSize);
      offscreen.toBlob((blob) => {
        if (blob) {
          downloadFile(blob, `qrcode-${activeType}-${exportSize}px.png`, {
            mimeType: "image/png",
          });
        }
      }, "image/png");
    } catch (err) {
      console.error("PNG Download Error:", err);
    }
  };

  // Download High-Resolution JPEG
  const downloadJpg = async () => {
    try {
      const offscreen = await renderOffscreenCanvas(exportSize);
      offscreen.toBlob((blob) => {
        if (blob) {
          downloadFile(blob, `qrcode-${activeType}-${exportSize}px.jpg`, {
            mimeType: "image/jpeg",
          });
        }
      }, "image/jpeg", 0.95);
    } catch (err) {
      console.error("JPG Download Error:", err);
    }
  };

  // Download Modern WebP
  const downloadWebp = async () => {
    try {
      const offscreen = await renderOffscreenCanvas(exportSize);
      offscreen.toBlob((blob) => {
        if (blob) {
          downloadFile(blob, `qrcode-${activeType}-${exportSize}px.webp`, {
            mimeType: "image/webp",
          });
        }
      }, "image/webp", 0.95);
    } catch (err) {
      console.error("WebP Download Error:", err);
    }
  };

  // Download Vector SVG (Self-Contained with Embedded Data URL Logos)
  const downloadSvg = async () => {
    try {
      const svgString = await exportSelfContainedQrSvg(payload, getQrOptions(exportSize));
      const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      downloadFile(blob, `qrcode-${activeType}-vector.svg`, {
        mimeType: "image/svg+xml",
      });
    } catch (err) {
      console.error("SVG generation error:", err);
    }
  };

  // Copy PNG image to clipboard
  const copyImageToClipboard = async () => {
    try {
      const offscreen = await renderOffscreenCanvas(800);
      offscreen.toBlob(async (blob) => {
        if (!blob) return;
        if (navigator.clipboard && window.ClipboardItem) {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          setCopiedImage(true);
          setTimeout(() => setCopiedImage(false), 2000);
        } else {
          handleCopyPayload();
        }
      }, "image/png");
    } catch (err) {
      handleCopyPayload();
    }
  };

  // Copy SVG Code
  const copySvgCode = async () => {
    try {
      const svgString = await exportSelfContainedQrSvg(payload, getQrOptions(exportSize));
      await navigator.clipboard.writeText(svgString);
      setCopiedSvg(true);
      setTimeout(() => setCopiedSvg(false), 2000);
    } catch (err) {
      console.error("Copy SVG Error:", err);
    }
  };

  // Copy text payload
  const handleCopyPayload = () => {
    navigator.clipboard.writeText(payload);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  // Scanner image processor: real client-side QR decoder
  const processScanFile = (file: File | Blob) => {
    if (!file.type.startsWith("image/")) {
      setScannerError("Please provide a valid image file (PNG, JPG, WebP, SVG, GIF).");
      return;
    }

    const reader = new FileReader();
    setIsScanning(true);
    setScannerError(null);
    setDecodedData(null);
    setScannedResult(null);
    setScannerStatus("Loading image into scanner...");

    reader.onload = (event) => {
      const src = event.target?.result as string;
      setScannerPreview(src);

      const img = new Image();
      img.onload = async () => {
        try {
          setScannerStatus("Scanning and decoding QR data...");
          const scanCanvas = document.createElement("canvas");
          scanCanvas.width = img.naturalWidth;
          scanCanvas.height = img.naturalHeight;
          const ctx = scanCanvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) throw new Error("Could not initialize 2D canvas context for scanner.");
          ctx.drawImage(img, 0, 0);

          const result = await decodeQrFromCanvas(scanCanvas);
          setDecodedData(result.parsed);
          setScannedResult(result.text);
          setScannerStatus(
            `Decoded successfully (${result.method === "native-barcodedetector" ? "Hardware Acceleration" : "Pure TS Engine"})`
          );
        } catch (err: any) {
          console.warn("QR Decode error:", err);
          setScannerError(
            err?.message ||
            "No readable QR code found in this image. Make sure the QR code is clearly visible, well-lit, and in focus."
          );
          setScannerStatus(null);
        } finally {
          setIsScanning(false);
        }
      };
      img.onerror = () => {
        setIsScanning(false);
        setScannerError("Could not render uploaded image file.");
        setScannerStatus(null);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  // Scanner file input change
  const handleScanImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processScanFile(file);
    }
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processScanFile(file);
    }
  };

  // Paste from clipboard handler
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (mainTab !== "scanner") return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const blob = items[i].getAsFile();
          if (blob) {
            processScanFile(blob);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [mainTab]);

  // Import scanned QR payload directly into Generator
  const handleImportToGenerator = () => {
    if (!decodedData) return;
    const type = decodedData.type;
    const text = decodedData.rawText;

    if (type === "url") {
      setActiveType("url");
      setUrl(decodedData.actionUrl || text);
    } else if (type === "wifi") {
      setActiveType("wifi");
      if (decodedData.details["Network Name (SSID)"]) setWifiSsid(decodedData.details["Network Name (SSID)"]);
      if (decodedData.details["Password"]) setWifiPass(decodedData.details["Password"]);
      if (decodedData.details["Security Type"]) {
        const sec = decodedData.details["Security Type"].toUpperCase();
        setWifiAuth(sec.includes("WEP") ? "WEP" : sec.includes("NOPASS") || sec.includes("NONE") ? "nopass" : "WPA");
      }
      if (decodedData.details["Hidden Network"] === "Yes") setWifiHidden(true);
    } else if (type === "upi") {
      setActiveType("upi");
      if (decodedData.details["Payee VPA"]) setUpiVpa(decodedData.details["Payee VPA"]);
      if (decodedData.details["Payee Name"]) setUpiName(decodedData.details["Payee Name"]);
      if (decodedData.details["Note / Description"]) setUpiNote(decodedData.details["Note / Description"]);
    } else if (type === "whatsapp") {
      setActiveType("whatsapp");
      if (decodedData.details["Phone Number"]) setWaNumber(decodedData.details["Phone Number"]);
      if (decodedData.details["Prefilled Message"]) setWaMessage(decodedData.details["Prefilled Message"]);
    } else if (type === "email") {
      setActiveType("email");
      if (decodedData.details["Recipient Email"]) setMailTo(decodedData.details["Recipient Email"]);
      if (decodedData.details["Subject"]) setMailSubject(decodedData.details["Subject"]);
      if (decodedData.details["Body"]) setMailBody(decodedData.details["Body"]);
    } else if (type === "phone" || type === "sms") {
      setActiveType("phone");
      setPhoneMode(type === "sms" ? "sms" : "call");
      if (decodedData.details["Phone Number"]) setPhoneNum(decodedData.details["Phone Number"]);
      if (decodedData.details["SMS Message"]) setSmsMessage(decodedData.details["SMS Message"]);
    } else if (type === "location" && (decodedData.details["Latitude"] || decodedData.details["Longitude"])) {
      setActiveType("location");
      if (decodedData.details["Latitude"]) setLocLat(decodedData.details["Latitude"]);
      if (decodedData.details["Longitude"]) setLocLng(decodedData.details["Longitude"]);
    } else {
      setActiveType("text");
      setPlainText(text);
    }

    setMainTab("generator");
    setImportSuccessToast(true);
    setTimeout(() => setImportSuccessToast(false), 3500);
  };

  return (
    <div className="space-y-8">
      {/* Workspace Header Mode Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-3xl bg-slate-100/80 dark:bg-slate-850/80 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Professional QR Code Studio
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Generate custom branded QR codes with embedded logos, gradients, and custom eyes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-750 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMainTab("generator")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${mainTab === "generator"
                ? "bg-teal-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Create & Style QR</span>
          </button>
          <button
            type="button"
            onClick={() => setMainTab("scanner")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${mainTab === "scanner"
                ? "bg-teal-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
          >
            <ScanLine className="w-3.5 h-3.5" />
            <span>Read QR Image</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMainTab("tests");
              if (!testReport) {
                setTestReport(runQrTestSuite());
              }
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${mainTab === "tests"
                ? "bg-teal-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Engine Tests</span>
          </button>
        </div>
      </div>

      {mainTab === "generator" ? (
        <>
          {/* Content Type Selector Tabs */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-200/70 dark:bg-slate-800/80 rounded-2xl border border-slate-300/60 dark:border-slate-700/60">
            {[
              { id: "url", label: "Website URL", icon: Globe },
              { id: "wifi", label: "Wi-Fi Network", icon: Wifi },
              { id: "vcard", label: "Contact Card", icon: User },
              { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
              { id: "upi", label: "UPI / Pay", icon: CreditCard },
              { id: "text", label: "Plain Text", icon: FileText },
              { id: "email", label: "Email", icon: Mail },
              { id: "phone", label: "Phone / SMS", icon: Phone },
              { id: "location", label: "Location", icon: MapPin },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeType === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveType(tab.id as QrType)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${isActive
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

          {/* Main Workspace Layout: Form vs Live Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Form & Design Options */}
            <div className="lg:col-span-7 space-y-6">
              {/* Content Details Card */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-teal-600" />
                    <span>Payload Data</span>
                  </h3>
                  <span className="text-[11px] text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50 px-2.5 py-0.5 rounded-full font-mono uppercase font-bold">
                    {activeType}
                  </span>
                </div>

                {/* URL Input */}
                {activeType === "url" && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Website or Destination URL
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
                      {url.trim().length > 0 && !/^https?:\/\//i.test(url.trim()) && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Tip: Prefix with <code>https://</code> for standard automatic browser opening.</span>
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {["https://toolqivo.com", "https://github.com", "https://google.com"].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setUrl(preset)}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors"
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
                        placeholder="e.g. Home_WiFi_5G"
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
                            Password
                          </label>
                          <div className="relative">
                            <input
                              type={showWifiPass ? "text" : "password"}
                              value={wifiPass}
                              onChange={(e) => setWifiPass(e.target.value)}
                              placeholder="Enter Wi-Fi password"
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
                          {wifiAuth === "WPA" && wifiPass.length > 0 && wifiPass.length < 8 && (
                            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                              WPA/WPA2 passwords should be at least 8 characters.
                            </p>
                          )}
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

                {/* WhatsApp Input */}
                {activeType === "whatsapp" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        WhatsApp Phone Number (with country code)
                      </label>
                      <input
                        type="tel"
                        value={waNumber}
                        onChange={(e) => setWaNumber(e.target.value)}
                        placeholder="e.g. +1 555 123 4567"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-sm font-medium outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Pre-filled Greeting Message
                      </label>
                      <textarea
                        rows={3}
                        value={waMessage}
                        onChange={(e) => setWaMessage(e.target.value)}
                        placeholder="Type pre-filled WhatsApp message..."
                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-sm outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* UPI Payment Input */}
                {activeType === "upi" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          UPI VPA ID
                        </label>
                        <input
                          type="text"
                          value={upiVpa}
                          onChange={(e) => setUpiVpa(e.target.value)}
                          placeholder="e.g. name@upi"
                          className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-sm font-medium outline-none"
                        />
                        {upiVpa.trim().length > 0 && !upiVpa.includes("@") && (
                          <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                            UPI ID typically has the format username@bank (e.g. name@okhdfcbank).
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Payee / Business Name
                        </label>
                        <input
                          type="text"
                          value={upiName}
                          onChange={(e) => setUpiName(e.target.value)}
                          placeholder="e.g. Toolqivo Store"
                          className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-sm font-medium outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Amount (INR ₹) (Optional)
                        </label>
                        <input
                          type="number"
                          value={upiAmount ?? ""}
                          onChange={(e) => setUpiAmount(e.target.value ? parseFloat(e.target.value) : undefined)}
                          placeholder="Leave empty for open amount"
                          className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-sm font-medium outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Payment Note
                        </label>
                        <input
                          type="text"
                          value={upiNote}
                          onChange={(e) => setUpiNote(e.target.value)}
                          className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-sm font-medium outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* vCard Input */}
                {activeType === "vcard" && (
                  <div className="space-y-3">
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
                          Organization
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

                {/* Plain Text */}
                {activeType === "text" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Plain Text or Note
                    </label>
                    <textarea
                      rows={4}
                      value={plainText}
                      onChange={(e) => setPlainText(e.target.value)}
                      placeholder="Enter any text message, coupon code, or note..."
                      className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
                )}

                {/* Location */}
                {activeType === "location" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Latitude
                      </label>
                      <input
                        type="text"
                        value={locLat}
                        onChange={(e) => setLocLat(e.target.value)}
                        placeholder="37.7749"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-xs font-medium outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Longitude
                      </label>
                      <input
                        type="text"
                        value={locLng}
                        onChange={(e) => setLocLng(e.target.value)}
                        placeholder="-122.4194"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-xs font-medium outline-none"
                      />
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
                      {mailTo.trim().length > 0 && !mailTo.includes("@") && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                          Please enter a valid email address with an @ domain.
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Subject Line
                      </label>
                      <input
                        type="text"
                        value={mailSubject}
                        onChange={(e) => setMailSubject(e.target.value)}
                        placeholder="Enter email subject"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-sm font-medium outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Phone / SMS Input */}
                {activeType === "phone" && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPhoneMode("call")}
                        className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all ${phoneMode === "call"
                            ? "bg-teal-500/10 border-teal-500 text-teal-600 dark:text-teal-400 font-bold"
                            : "border-slate-200 dark:border-slate-700 text-slate-600"
                          }`}
                      >
                        Direct Call (tel:)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhoneMode("sms")}
                        className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all ${phoneMode === "sms"
                            ? "bg-teal-500/10 border-teal-500 text-teal-600 dark:text-teal-400 font-bold"
                            : "border-slate-200 dark:border-slate-700 text-slate-600"
                          }`}
                      >
                        SMS Text (sms:)
                      </button>
                    </div>
                    <input
                      type="tel"
                      value={phoneNum}
                      onChange={(e) => setPhoneNum(e.target.value)}
                      placeholder="+1 555 123 4567"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-sm font-medium outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Logo / Image Embed Card */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-teal-600" />
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Center Image & Logo Embedding
                    </h3>
                  </div>
                  {logoDataUri && (
                    <button
                      type="button"
                      onClick={() => setLogoDataUri(null)}
                      className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 font-semibold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Image</span>
                    </button>
                  )}
                </div>

                {/* Upload or Choose Preset */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                    Upload Custom Image / Brand Logo
                  </label>

                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleLogoUpload}
                      accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-3 px-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-teal-500 dark:hover:border-teal-400 bg-slate-50/60 dark:bg-slate-800/40 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2 transition-all"
                    >
                      <Upload className="w-4 h-4 text-teal-600" />
                      <span>Upload Logo File (PNG, JPG, SVG, WebP)</span>
                    </button>
                  </div>
                </div>

                {/* Preset Vector Logos */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                    Or Select a Preset Icon
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {PRESET_LOGOS.map((preset) => {
                      const dataUri = svgToDataUri(preset.svg);
                      const isSelected = logoDataUri === dataUri;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setLogoDataUri(dataUri)}
                          title={preset.name}
                          className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${isSelected
                              ? "border-teal-500 bg-teal-500/10 shadow-sm"
                              : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                            }`}
                        >
                          <div
                            className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center"
                            dangerouslySetInnerHTML={{ __html: preset.svg }}
                          />
                          <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 truncate w-full text-center">
                            {preset.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Logo Customization Settings */}
                {logoDataUri && (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-750 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          <span>Logo Size Ratio</span>
                          <span className="text-teal-600 font-mono">{Math.round(logoSizeRatio * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.15"
                          max="0.30"
                          step="0.01"
                          value={logoSizeRatio}
                          onChange={(e) => setLogoSizeRatio(parseFloat(e.target.value))}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Logo Background Cutout Shape
                        </label>
                        <div className="grid grid-cols-4 gap-1">
                          {(["circle", "rounded", "square", "none"] as const).map((shape) => (
                            <button
                              key={shape}
                              type="button"
                              onClick={() => setLogoShape(shape)}
                              className={`py-1.5 rounded-lg text-xs font-semibold capitalize border transition-all ${logoShape === shape
                                  ? "bg-teal-600 text-white border-teal-600"
                                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                                }`}
                            >
                              {shape}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 p-2.5 rounded-xl border border-teal-200 dark:border-teal-900">
                      <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                      <span>
                        Logo mode automatically boosts error correction to Level Q (&le; 25%) or Level H (&gt; 25%) for reliable optical scanning.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Design, Gradients & Eye Styles Card */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-teal-600" />
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Color Schemes & Gradients
                    </h3>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useGradient}
                      onChange={(e) => setUseGradient(e.target.checked)}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span>Gradient Modules</span>
                  </label>
                </div>

                {/* Color Palettes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                    Curated Color Themes
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {GRADIENT_THEMES.map((theme) => (
                      <button
                        key={theme.name}
                        type="button"
                        onClick={() => {
                          setFgColor(theme.fg1);
                          setFgColor2(theme.fg2);
                          setUseGradient(!theme.solid);
                          setBgColor(theme.bg);
                          setIsTransparentBg(false);
                        }}
                        className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-750 hover:border-teal-500 transition-all text-left"
                      >
                        <div
                          className="w-6 h-6 rounded-lg shadow-inner flex-shrink-0"
                          style={{
                            background: theme.solid
                              ? theme.fg1
                              : `linear-gradient(135deg, ${theme.fg1}, ${theme.fg2})`,
                          }}
                        />
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">
                          {theme.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Color Pickers */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {useGradient ? "Gradient Start" : "Foreground Color"}
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
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-xs uppercase"
                      />
                    </div>
                  </div>

                  {useGradient && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Gradient End
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={fgColor2}
                          onChange={(e) => setFgColor2(e.target.value)}
                          className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-transparent"
                        />
                        <input
                          type="text"
                          value={fgColor2}
                          onChange={(e) => setFgColor2(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-xs uppercase"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Background Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={bgColor}
                        disabled={isTransparentBg}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-transparent disabled:opacity-40"
                      />
                      <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isTransparentBg}
                          onChange={(e) => setIsTransparentBg(e.target.checked)}
                          className="rounded text-teal-600"
                        />
                        <span>Clear</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Contrast Validation Warning */}
                {(() => {
                  const ratio = getContrastRatio(fgColor, isTransparentBg ? "#ffffff" : bgColor);
                  if (ratio >= 3.0) return null;
                  return (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                      <div>
                        <span className="font-bold">Low Color Contrast ({ratio.toFixed(1)}:1)</span>: Camera scanners recommend a minimum 3.0:1 contrast ratio between foreground and background.
                      </div>
                    </div>
                  );
                })()}

                {/* Module Pattern Styles */}
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                    Module Pattern Style
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: "square", label: "Classic Square" },
                      { id: "rounded", label: "Smooth Rounded" },
                      { id: "dots", label: "Modern Circular" },
                      { id: "diamond", label: "Classy Diamond" },
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setDotStyle(s.id as any)}
                        className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${dotStyle === s.id
                            ? "border-teal-500 bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold"
                            : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                          }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Eye Frame & Ball Shapes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Finder Eye Outer Frame
                      </label>
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Standard / Modern</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: "square", label: "Square", badge: "Standard" },
                        { id: "rounded", label: "Rounded", badge: "Smooth" },
                        { id: "circle", label: "Circle", badge: "Exp" },
                      ].map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setEyeOuterShape(s.id as any)}
                          className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all flex flex-col items-center justify-center ${eyeOuterShape === s.id
                              ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                              : "border-slate-200 dark:border-slate-750 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                            }`}
                        >
                          <span>{s.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Finder Eye Inner Ball
                      </label>
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Standard / Shapes</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { id: "square", label: "Square" },
                        { id: "rounded", label: "Rounded" },
                        { id: "circle", label: "Circle" },
                        { id: "diamond", label: "Diamond" },
                      ].map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setEyeInnerShape(s.id as any)}
                          className={`py-1.5 px-1 rounded-lg text-xs font-semibold border transition-all flex flex-col items-center justify-center ${eyeInnerShape === s.id
                              ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                              : "border-slate-200 dark:border-slate-750 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                            }`}
                        >
                          <span>{s.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Call to Action Frame Banner Card */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-teal-600" />
                    <span>Call-to-Action Frame Banner</span>
                  </h3>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={frameEnabled}
                      onChange={(e) => setFrameEnabled(e.target.checked)}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span>Add Frame</span>
                  </label>
                </div>

                {frameEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Banner Text
                      </label>
                      <input
                        type="text"
                        value={frameText}
                        onChange={(e) => setFrameText(e.target.value)}
                        placeholder="SCAN ME"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Banner Position
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setFramePosition("bottom")}
                          className={`py-1.5 rounded-xl text-xs font-bold border ${framePosition === "bottom"
                              ? "bg-teal-600 text-white border-teal-600"
                              : "border-slate-200 dark:border-slate-700 text-slate-600"
                            }`}
                        >
                          Bottom
                        </button>
                        <button
                          type="button"
                          onClick={() => setFramePosition("top")}
                          className={`py-1.5 rounded-xl text-xs font-bold border ${framePosition === "top"
                              ? "bg-teal-600 text-white border-teal-600"
                              : "border-slate-200 dark:border-slate-700 text-slate-600"
                            }`}
                        >
                          Top
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Live QR Preview & High-Res Export */}
            <div className="lg:col-span-5 sticky top-6 space-y-4">
              <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md flex flex-col items-center text-center">
                <div className="flex items-center gap-2 mb-4 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-900">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>100% Scannable ISO/IEC 18004 Engine</span>
                </div>

                {/* QR Canvas Display */}
                <div
                  className="p-4 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-750 flex items-center justify-center transition-all relative overflow-hidden"
                  style={{ backgroundColor: isTransparentBg ? "#f8fafc" : bgColor }}
                >
                  <canvas
                    ref={canvasRef}
                    className="max-w-full h-auto rounded-xl"
                    style={{ width: "260px", height: "auto" }}
                  />
                  {isRendering && (
                    <div className="absolute inset-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xs flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-3 font-mono">
                  <Smartphone className="w-3.5 h-3.5 text-teal-600" />
                  <span>Compatible with iOS Camera, Android & All Barcode Scanners</span>
                </div>

                {/* Export Resolution Selector */}
                <div className="w-full mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                    <span>Export Quality & Resolution</span>
                    <span className="text-teal-600 font-mono font-bold">{exportSize} x {exportSize} px</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { res: 500, label: "500px" },
                      { res: 1000, label: "1K High" },
                      { res: 2000, label: "2K Ultra" },
                      { res: 4000, label: "4K Print" },
                    ].map((item) => (
                      <button
                        key={item.res}
                        type="button"
                        onClick={() => setExportSize(item.res as any)}
                        className={`py-1.5 rounded-xl text-xs font-bold border transition-all ${exportSize === item.res
                            ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm"
                            : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                          }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Primary Download Buttons */}
                <div className="w-full grid grid-cols-2 gap-3 mt-4">
                  <button
                    type="button"
                    onClick={downloadPng}
                    className="py-3 px-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PNG</span>
                  </button>
                  <button
                    type="button"
                    onClick={downloadSvg}
                    className="py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <Layers className="w-4 h-4" />
                    <span>Vector SVG</span>
                  </button>
                </div>

                {/* Secondary Download Formats */}
                <div className="w-full grid grid-cols-2 gap-2 mt-2">
                  <button
                    type="button"
                    onClick={downloadJpg}
                    className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    <span>JPG Format</span>
                  </button>
                  <button
                    type="button"
                    onClick={downloadWebp}
                    className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    <span>WebP Format</span>
                  </button>
                </div>

                {/* Quick Copy Action Bar */}
                <div className="w-full grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={copyImageToClipboard}
                    className="py-2 px-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px] transition-all flex items-center justify-center gap-1"
                  >
                    {copiedImage ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedImage ? "Copied!" : "Copy Image"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={copySvgCode}
                    className="py-2 px-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px] transition-all flex items-center justify-center gap-1"
                  >
                    {copiedSvg ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <FileCode className="w-3.5 h-3.5" />}
                    <span>{copiedSvg ? "SVG Copied!" : "Copy SVG"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyPayload}
                    className="py-2 px-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px] transition-all flex items-center justify-center gap-1"
                  >
                    {copiedPayload ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPayload ? "Text Copied!" : "Copy Text"}</span>
                  </button>
                </div>

                {/* Encoded payload info */}
                <div className="w-full mt-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Live Encoded Payload
                  </span>
                  <p className="font-mono text-[11px] text-slate-600 dark:text-slate-300 break-all line-clamp-3">
                    {payload}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : mainTab === "scanner" ? (
        /* Scanner / Reader Tab */
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Scanner Upload & Drop Zone Card */}
          <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 mx-auto flex items-center justify-center">
              <ScanLine className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                Read & Decode QR Code from Image
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                Upload any QR code image, screenshot, or photo from your device. Decodes instantly client-side with zero data leaving your browser.
              </p>
            </div>

            <input
              type="file"
              ref={scanFileInputRef}
              onChange={handleScanImageUpload}
              accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
              className="hidden"
            />

            <div
              onClick={() => scanFileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`p-8 sm:p-10 border-2 border-dashed rounded-3xl cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${isDragging
                  ? "border-teal-500 bg-teal-500/10 scale-[1.01]"
                  : "border-slate-300 dark:border-slate-700 hover:border-teal-500 dark:hover:border-teal-400 bg-slate-50/50 dark:bg-slate-800/30"
                }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center shadow-inner">
                {isScanning ? (
                  <Loader2 className="w-7 h-7 animate-spin text-teal-600" />
                ) : (
                  <Upload className="w-7 h-7 text-teal-600" />
                )}
              </div>

              <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                <span className="font-bold text-teal-600 dark:text-teal-400">Click to upload QR image</span> or drag and drop here
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  Supports PNG, JPG, JPEG, WebP, GIF & SVG formats &bull; Paste screenshot directly with <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[10px]">Ctrl + V</kbd>
                </p>
              </div>
            </div>

            {/* Scanning Status Loader */}
            {isScanning && (
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-teal-600 animate-pulse pt-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{scannerStatus || "Analyzing image and decoding QR bitstream..."}</span>
              </div>
            )}

            {/* Scanner Error Alert */}
            {scannerError && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-left space-y-2">
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-xs">
                  <XCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Could Not Decode QR Code</span>
                </div>
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  {scannerError}
                </p>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                  <span className="font-semibold">Tips:</span> Ensure the QR code has clear lighting, high contrast, all 3 corner finder patterns visible, and is not overly blurry.
                </div>
              </div>
            )}
          </div>

          {/* Decoded QR Results Card */}
          {decodedData && (
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-teal-500/30 dark:border-teal-500/30 shadow-lg space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        QR Code Decoded
                      </h4>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300">
                        {decodedData.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {scannerStatus || "Successfully decoded QR payload"}
                    </p>
                  </div>
                </div>

                {/* Primary Action Button if URL, UPI, WhatsApp, etc. */}
                {decodedData.actionUrl && (
                  <a
                    href={decodedData.actionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 self-start sm:self-auto"
                  >
                    <span>{decodedData.actionLabel || "Open Link"}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {/* Grid: Image preview + Structured details */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                {scannerPreview && (
                  <div className="md:col-span-4 space-y-2 text-center">
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 inline-block">
                      <img
                        src={scannerPreview}
                        alt="Scanned QR Source"
                        className="max-h-44 mx-auto rounded-xl object-contain shadow-sm"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">
                      Uploaded Source
                    </p>
                  </div>
                )}

                <div className={`${scannerPreview ? "md:col-span-8" : "md:col-span-12"} space-y-4`}>
                  {/* Structured Details Breakdown */}
                  {Object.keys(decodedData.details).length > 0 && (
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-750 overflow-hidden text-left divide-y divide-slate-100 dark:divide-slate-800">
                      {Object.entries(decodedData.details).map(([key, val]) => (
                        <div key={key} className="p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                          <span className="font-semibold text-slate-500 dark:text-slate-400">
                            {key}
                          </span>
                          <span className="font-medium text-slate-800 dark:text-slate-200 break-all select-all font-mono">
                            {val}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Raw Text / Payload Box */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-750 text-left space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Raw Decoded Content
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {decodedData.rawText.length} characters
                      </span>
                    </div>
                    <p className="font-mono text-xs text-slate-800 dark:text-slate-200 break-all line-clamp-4 select-all">
                      {decodedData.rawText}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(decodedData.rawText);
                        setCopiedScanText(true);
                        setTimeout(() => setCopiedScanText(false), 2000);
                      }}
                      className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs text-slate-700 dark:text-slate-300 transition-all flex items-center gap-2"
                    >
                      {copiedScanText ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      <span>{copiedScanText ? "Copied to Clipboard!" : "Copy Decoded Text"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleImportToGenerator}
                      className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs transition-all shadow-sm flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-teal-400 dark:text-teal-600" />
                      <span>Import into QR Studio & Redesign</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDecodedData(null);
                        setScannedResult(null);
                        setScannerPreview(null);
                        setScannerError(null);
                        setScannerStatus(null);
                      }}
                      className="py-2.5 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-500 transition-all"
                    >
                      Scan Another
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Engine Test Suite Tab */
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-teal-600" />
                  <span>Automated QR Generator & Engine Test Suite</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Executes pure matrix generate &rarr; decode roundtrips across all QR versions, error correction levels, and scripts.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setTestReport(runQrTestSuite())}
                className="py-2.5 px-5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md hover:shadow-teal-500/20 transition-all flex items-center gap-2 self-start sm:self-auto"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Run All Engine Tests</span>
              </button>
            </div>

            {testReport && (
              <>
                {/* Summary Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-750">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Test Cases</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{testReport.total}</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900">
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Passed</p>
                    <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{testReport.passed}</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900">
                    <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">Failed</p>
                    <p className="text-2xl font-black text-rose-700 dark:text-rose-300 mt-1">{testReport.failed}</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-900">
                    <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">Execution Time</p>
                    <p className="text-2xl font-black text-cyan-700 dark:text-cyan-300 mt-1">{testReport.durationMs} ms</p>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  {[
                    { id: "all", label: "All Tests" },
                    { id: "roundtrip", label: "Versions & Scaling" },
                    { id: "ecc", label: "ECC & Logo Boost" },
                    { id: "unicode", label: "Unicode & Scripts" },
                    { id: "payload", label: "Structured Formats" },
                    { id: "validation", label: "Input Validation" },
                    { id: "security", label: "SVG XML Security" },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveTestCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${activeTestCategory === cat.id
                          ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                        }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Individual Test Cards List */}
                <div className="space-y-2.5">
                  {testReport.results
                    .filter((r) => activeTestCategory === "all" || r.category === activeTestCategory)
                    .map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${item.passed
                            ? "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800"
                            : "bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-900"
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          {item.passed ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
                          )}
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.name}</p>
                            {item.error && (
                              <p className="text-[11px] font-mono text-rose-600 dark:text-rose-400 mt-0.5">
                                {item.error}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                            {item.category}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            {item.durationMs}ms
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Import to Studio Confirmation Toast */}
      {importSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xl flex items-center gap-3 border border-slate-700 dark:border-slate-300 animate-in fade-in slide-in-from-bottom-5">
          <Sparkles className="w-5 h-5 text-teal-400 dark:text-teal-600" />
          <div className="text-xs">
            <p className="font-bold">Imported into QR Studio!</p>
            <p className="text-slate-300 dark:text-slate-600 text-[11px]">
              Your scanned QR data is ready for custom styling, branding, and re-export.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
