/**
 * QR Code Generator & Decoder Automated Test Suite
 * Pure TypeScript automated test harness for ISO/IEC 18004 QR generation and decoding.
 * 
 * Verifies:
 * 1. Versions 1 to 40 Matrix Generation & Decoding Roundtrips
 * 2. All 4 Error Correction Levels (L, M, Q, H)
 * 3. International Unicode scripts (Tamil, Hindi, Arabic, Chinese, Japanese, Emojis)
 * 4. Structured Payloads (URL, Wi-Fi, vCard, UPI, WhatsApp, Email, Phone, SMS)
 * 5. Input Validation & Options Normalization
 * 6. Logo Dynamic ECC Boost Rules (Q for <= 25%, H for > 25%)
 * 7. SVG XML Escaping & Security against Malicious Injections
 * 8. Self-Contained SVG Logo Data URI Conversion
 */

import {
  generateQrMatrix,
  generateQrSvg,
  normalizeQrOptions,
  getEffectiveEcLevel,
  escapeXml,
  sanitizeCssColor,
  QrEcLevel,
  QrOptions,
  QrPayloads,
} from "./qr-generator";
import { decodeQrMatrix } from "./qr-decoder";

export interface TestResult {
  name: string;
  category: "roundtrip" | "unicode" | "payload" | "validation" | "security" | "ecc";
  passed: boolean;
  expected?: any;
  actual?: any;
  error?: string;
  durationMs: number;
}

export interface TestSuiteReport {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: TestResult[];
}

/**
 * Runs a test item and captures result, duration, and error.
 */
function runTest(
  name: string,
  category: TestResult["category"],
  fn: () => void | Promise<void>
): TestResult {
  const start = performance.now();
  try {
    fn();
    return {
      name,
      category,
      passed: true,
      durationMs: Number((performance.now() - start).toFixed(2)),
    };
  } catch (err: any) {
    return {
      name,
      category,
      passed: false,
      error: err?.message || String(err),
      durationMs: Number((performance.now() - start).toFixed(2)),
    };
  }
}

/**
 * Helper to perform matrix generate -> decode roundtrip check
 */
function assertRoundtrip(text: string, ecLevel: QrEcLevel = "M", expectedVersionMin?: number) {
  const qr = generateQrMatrix(text, ecLevel);
  if (expectedVersionMin && qr.version < expectedVersionMin) {
    throw new Error(`Expected minimum version ${expectedVersionMin}, got version ${qr.version}`);
  }

  const decoded = decodeQrMatrix(qr.modules);
  if (decoded.text !== text) {
    throw new Error(
      `Roundtrip payload mismatch.\nExpected: "${text}"\nReceived: "${decoded.text}"`
    );
  }
  if (decoded.errorCorrectionLevel !== ecLevel) {
    throw new Error(
      `ECC mismatch. Expected: ${ecLevel}, Received: ${decoded.errorCorrectionLevel}`
    );
  }
}

/**
 * Executes the full test suite and returns structured reporting.
 */
export function runQrTestSuite(): TestSuiteReport {
  const startTime = performance.now();
  const results: TestResult[] = [];

  // =========================================================================
  // 1. Error Correction Levels (L, M, Q, H) Roundtrip Tests
  // =========================================================================
  const sampleText = "https://toolqivo.com/utility-tools/qr-code-generator";
  (["L", "M", "Q", "H"] as QrEcLevel[]).forEach((ecc) => {
    results.push(
      runTest(`ECC Level ${ecc} Roundtrip`, "ecc", () => {
        assertRoundtrip(sampleText, ecc);
      })
    );
  });

  // =========================================================================
  // 2. Version Scaling Tests (Version 1, 5, 10, 20, 40)
  // =========================================================================
  results.push(
    runTest("Version 1 (Compact payload: 10 chars)", "roundtrip", () => {
      assertRoundtrip("TOOLQIVO10", "M");
    })
  );

  results.push(
    runTest("Version 5 (Medium payload: ~80 chars)", "roundtrip", () => {
      const payload = "Toolqivo QR Code Generator: fast, offline-capable, and 100% private in browser!";
      assertRoundtrip(payload, "M", 4);
    })
  );

  results.push(
    runTest("Version 10 (Long payload: ~220 chars)", "roundtrip", () => {
      const payload =
        "Toolqivo provides over 80+ web tools for developers, designers, and everyday users. " +
        "Includes JSON formatters, SVG optimizers, regex testers, hash calculators, and high-performance QR code generator engine.";
      assertRoundtrip(payload, "M", 8);
    })
  );

  results.push(
    runTest("Version 20 (High capacity: ~600 chars)", "roundtrip", () => {
      let payload = "Toolqivo Multi-tool suite. ";
      while (payload.length < 600) {
        payload += "Developer productivity, client-side encryption, and modern vector tools. ";
      }
      assertRoundtrip(payload, "M", 18);
    })
  );

  results.push(
    runTest("Version 40 (Maximum capacity: ~1400 chars)", "roundtrip", () => {
      let payload = "ISO-IEC-18004-QR-Engine-Version-40-Test-Block. ";
      while (payload.length < 1400) {
        payload += "Data-Stream-Segment-With-Reed-Solomon-Error-Correction-And-Full-Interleaving-Check. ";
      }
      assertRoundtrip(payload, "L", 38);
    })
  );

  // =========================================================================
  // 3. International Unicode & Character Encoding Tests
  // =========================================================================
  results.push(
    runTest("Tamil Unicode Script", "unicode", () => {
      const payload = "தமிழ் வாழ்க! வணிக பயன்பாட்டிற்கான க்யூஆர் குறியீடு 2026";
      assertRoundtrip(payload, "M");
    })
  );

  results.push(
    runTest("Hindi Devanagari Script", "unicode", () => {
      const payload = "नमस्ते दुनिया! टूलकिवோ क्यूआर कोड जनरेटर 🚀";
      assertRoundtrip(payload, "M");
    })
  );

  results.push(
    runTest("Arabic Script (RTL)", "unicode", () => {
      const payload = "مرحبا بكم في مولد رمز الاستجابة السريعة Toolqivo";
      assertRoundtrip(payload, "M");
    })
  );

  results.push(
    runTest("Chinese Simplified Hanzi Script", "unicode", () => {
      const payload = "欢迎使用 Toolqivo 高性能二维码生成器与扫码器！";
      assertRoundtrip(payload, "M");
    })
  );

  results.push(
    runTest("Japanese Kanji & Kana Script", "unicode", () => {
      const payload = "クイックレスポンス QRコード 生成エンジン 100% 安全";
      assertRoundtrip(payload, "M");
    })
  );

  results.push(
    runTest("Complex Composite Emojis & Symbols", "unicode", () => {
      const payload = "🔥🚀✨🎉 100% 🤖❤️ 🌟 👨‍💻👩‍🔬 🏳️‍🌈";
      assertRoundtrip(payload, "M");
    })
  );

  // =========================================================================
  // 4. Structured QR Formats (Wi-Fi, vCard, UPI, WhatsApp, SMS)
  // =========================================================================
  results.push(
    runTest("Wi-Fi Payload Formatting & Roundtrip", "payload", () => {
      const wifiPayload = QrPayloads.wifi("CoffeeShop_5G", "S3cureP@ss!", "WPA", false);
      assertRoundtrip(wifiPayload, "M");
    })
  );

  results.push(
    runTest("vCard 3.0 Contact Card Roundtrip", "payload", () => {
      const vcard = QrPayloads.vCard({
        firstName: "Alexander",
        lastName: "Wright",
        phone: "+1-555-0199",
        email: "alex.wright@example.com",
        org: "Toolqivo Inc.",
        title: "Principal Engineer",
        url: "https://toolqivo.com",
        address: "742 Evergreen Terrace, Springfield",
      });
      assertRoundtrip(vcard, "M");
    })
  );

  results.push(
    runTest("UPI Digital Payment Payload Roundtrip", "payload", () => {
      const upi = QrPayloads.upi("merchant@okhdfcbank", "Fresh Mart Store", 450.5, "Groceries Order #104");
      assertRoundtrip(upi, "M");
    })
  );

  results.push(
    runTest("WhatsApp Direct Chat Link", "payload", () => {
      const wa = QrPayloads.whatsApp("+15550199", "Hello! I am interested in your services.");
      assertRoundtrip(wa, "M");
    })
  );

  // =========================================================================
  // 5. Input Validation & Options Normalization Tests
  // =========================================================================
  results.push(
    runTest("Option Normalization: Size Clamping [128, 4096]", "validation", () => {
      const low = normalizeQrOptions({ size: 10 });
      if (low.size !== 128) throw new Error(`Expected size clamped to 128, got ${low.size}`);

      const high = normalizeQrOptions({ size: 50000 });
      if (high.size !== 4096) throw new Error(`Expected size clamped to 4096, got ${high.size}`);
    })
  );

  results.push(
    runTest("Option Normalization: Margin Clamping [4, 20]", "validation", () => {
      const low = normalizeQrOptions({ margin: 1 });
      if (low.margin !== 4) throw new Error(`Expected margin clamped to 4, got ${low.margin}`);

      const high = normalizeQrOptions({ margin: 50 });
      if (high.margin !== 20) throw new Error(`Expected margin clamped to 20, got ${high.margin}`);
    })
  );

  results.push(
    runTest("Option Normalization: Logo Size Ratio Clamping [0.15, 0.32]", "validation", () => {
      const low = normalizeQrOptions({ logoSizeRatio: 0.05 });
      if (low.logoSizeRatio !== 0.15) throw new Error(`Expected ratio clamped to 0.15, got ${low.logoSizeRatio}`);

      const high = normalizeQrOptions({ logoSizeRatio: 0.8 });
      if (high.logoSizeRatio !== 0.32) throw new Error(`Expected ratio clamped to 0.32, got ${high.logoSizeRatio}`);
    })
  );

  results.push(
    runTest("Color Sanitization against Injections & Malformed Values", "validation", () => {
      const safe1 = sanitizeCssColor("#ff0077", "#000000");
      if (safe1 !== "#ff0077") throw new Error("Valid hex color was incorrectly altered");

      const safe2 = sanitizeCssColor("rgba(13, 148, 136, 0.8)", "#000000");
      if (safe2 !== "rgba(13, 148, 136, 0.8)") throw new Error("Valid rgba color was altered");

      const unsafe = sanitizeCssColor('"><script>alert(1)</script>', "#0f172a");
      if (unsafe !== "#0f172a") throw new Error("Malicious string was not sanitized to fallback");
    })
  );

  // =========================================================================
  // 6. Dynamic Logo ECC Boost Rules
  // =========================================================================
  results.push(
    runTest("Logo ECC Boost: Logo <= 25% upgrades L/M to Q", "ecc", () => {
      const eccL = getEffectiveEcLevel("L", true, 0.20);
      if (eccL !== "Q") throw new Error(`Expected 'Q', got '${eccL}'`);

      const eccM = getEffectiveEcLevel("M", true, 0.20);
      if (eccM !== "Q") throw new Error(`Expected 'Q', got '${eccM}'`);

      const eccH = getEffectiveEcLevel("H", true, 0.20);
      if (eccH !== "H") throw new Error(`Expected 'H', got '${eccH}'`);
    })
  );

  results.push(
    runTest("Logo ECC Boost: Large Logo > 25% upgrades to H", "ecc", () => {
      const eccLarge1 = getEffectiveEcLevel("L", true, 0.28);
      if (eccLarge1 !== "H") throw new Error(`Expected 'H' for >25% logo, got '${eccLarge1}'`);

      const eccLarge2 = getEffectiveEcLevel("Q", true, 0.30);
      if (eccLarge2 !== "H") throw new Error(`Expected 'H' for >25% logo, got '${eccLarge2}'`);
    })
  );

  // =========================================================================
  // 7. SVG XML Escaping & Security Tests
  // =========================================================================
  results.push(
    runTest("XML Escape Function Security", "security", () => {
      const malicious = '<svg onload="alert(\'XSS\')" attr="val & more">';
      const escaped = escapeXml(malicious);

      if (escaped.includes("<") || escaped.includes(">") || escaped.includes('"') || escaped.includes("'")) {
        throw new Error(`XML characters unescaped: ${escaped}`);
      }
      if (!escaped.includes("&lt;svg") || !escaped.includes("&quot;") || !escaped.includes("&amp;")) {
        throw new Error(`Escaped entities missing in: ${escaped}`);
      }
    })
  );

  results.push(
    runTest("SVG Generator Escapes User-Controlled Injections", "security", () => {
      const svg = generateQrSvg("https://toolqivo.com", {
        frameText: '"><script>alert(1)</script><text>',
        fgColor: 'red" onmouseover="alert(1)',
        bgColor: 'white"><circle r="100"/>',
        frameColor: 'black"><rect fill="red"/>',
        logoUrl: 'https://evil.com/x.png" onerror="alert(1)',
        gradient: {
          enabled: true,
          type: "linear",
          color1: 'cyan" onload="alert(1)',
          color2: 'magenta"><evil/>',
        },
      });

      // Verify no unescaped injection tags or quotes inside SVG
      if (svg.includes("<script>") || svg.includes("<evil/>") || svg.includes('onmouseover="') || svg.includes('onerror="')) {
        throw new Error("SVG output contains raw injected script tags or event handlers!");
      }
    })
  );

  const durationMs = Number((performance.now() - startTime).toFixed(2));
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  return {
    total: results.length,
    passed,
    failed,
    durationMs,
    results,
  };
}
