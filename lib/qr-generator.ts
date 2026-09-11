/**
 * Standard ISO/IEC 18004 QR Code Generator Engine
 * Pure TypeScript implementation, zero external dependencies.
 * 
 * Features:
 * - Full QR Code Versions 1 to 40 (auto-sizing & manual version selection)
 * - UTF-8 8-bit Byte encoding with international character and emoji support
 * - Reed-Solomon Error Correction (Levels L, M, Q, H)
 * - Optimal mask evaluation across all 8 standard mask patterns (0-7)
 * - 18-bit BCH Version Information coding for Versions 7-40
 * - Center Logo & Image Embedding with custom background pads and auto ECC boost
 * - Custom Eye Styling (Outer Frame & Inner Ball shapes and independent colors)
 * - Gradient Module Rendering (Linear and Radial gradients)
 * - Module Shapes: Classic Square, Smooth Rounded, Modern Dots, Diamond
 * - Call-to-Action Frame Banners ("SCAN ME", "VISIT US", etc.)
 * - High-resolution HTML5 Canvas rendering and scalable vector SVG exports
 * - QR data formatting utilities (URL, Wi-Fi, vCard, WhatsApp, UPI, Email, Phone, SMS, Crypto, Location)
 */

export type QrEcLevel = "L" | "M" | "Q" | "H";

export interface QrGradientOptions {
  enabled: boolean;
  type?: "linear" | "radial";
  color1: string;
  color2: string;
  angle?: number; // In degrees (default 45)
}

export interface QrOptions {
  /** Error correction level (L: ~7%, M: ~15%, Q: ~25%, H: ~30%) */
  ecLevel?: QrEcLevel;
  /** Foreground module color (hex or CSS color) */
  fgColor?: string;
  /** Background color (hex, CSS color, or "transparent") */
  bgColor?: string;
  /** Quiet zone margin in modules (standards recommend >= 4) */
  margin?: number;
  /** Target pixel dimension for render (clamped between 128 and 4096) */
  size?: number;
  /** Module drawing style */
  dotStyle?: "square" | "rounded" | "dots" | "diamond";
  /** Gradient styling */
  gradient?: QrGradientOptions;
  /** Eye outer frame shape (default: square) */
  eyeOuterShape?: "square" | "rounded" | "circle";
  /** Eye inner ball shape (default: square) */
  eyeInnerShape?: "square" | "rounded" | "circle" | "diamond";
  /** Custom color for eye outer frame */
  eyeOuterColor?: string;
  /** Custom color for eye inner ball */
  eyeInnerColor?: string;
  /** Data URL or image source for center logo */
  logoUrl?: string;
  /** Logo size as ratio of QR code width (0.15 to 0.32, default 0.20, recommended max 0.25) */
  logoSizeRatio?: number;
  /** Margin around logo in pixels (default 6) */
  logoMargin?: number;
  /** Background shape for logo cutout */
  logoShape?: "circle" | "rounded" | "square" | "none";
  /** Background color for logo cutout (default "#ffffff") */
  logoBgColor?: string;
  /** Optional CTA frame banner text (e.g. "SCAN ME") */
  frameText?: string;
  /** Background color of frame banner */
  frameColor?: string;
  /** Text color of frame banner */
  frameTextColor?: string;
  /** Frame position */
  framePosition?: "bottom" | "top" | "none";
}

export interface NormalizedQrOptions {
  ecLevel: QrEcLevel;
  fgColor: string;
  bgColor: string;
  margin: number;
  size: number;
  dotStyle: "square" | "rounded" | "dots" | "diamond";
  gradient?: QrGradientOptions;
  eyeOuterShape: "square" | "rounded" | "circle";
  eyeInnerShape: "square" | "rounded" | "circle" | "diamond";
  eyeOuterColor?: string;
  eyeInnerColor?: string;
  logoUrl?: string;
  logoSizeRatio: number;
  logoMargin: number;
  logoShape: "circle" | "rounded" | "square" | "none";
  logoBgColor: string;
  frameText?: string;
  frameColor: string;
  frameTextColor: string;
  framePosition: "bottom" | "top" | "none";
}

/**
 * Safely escape characters for XML and SVG attribute and text insertion.
 */
export function escapeXml(value: string | number | undefined | null): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Sanitize CSS color values to prevent injection or invalid styles.
 */
export function sanitizeCssColor(color: string | undefined | null, fallback: string): string {
  if (!color || typeof color !== "string") return fallback;
  const trimmed = color.trim();
  if (trimmed === "transparent") return "transparent";
  // Validate hex (#RGB, #RGBA, #RRGGBB, #RRGGBBAA), rgb/rgba, hsl/hsla, or standard named CSS colors
  if (/^(#[0-9a-fA-F]{3,8}|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(\s*,\s*[\d.]+\s*)?\)|hsla?\(\s*\d+\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?(\s*,\s*[\d.]+\s*)?\)|[a-zA-Z]+)$/.test(trimmed)) {
    return trimmed;
  }
  return fallback;
}

/**
 * Compute the effective error correction level ensuring adequate recovery headroom for logos.
 * - If logo exists and ratio > 0.25 -> automatically upgrades to 'H' (~30% recovery)
 * - If logo exists and base ECC is 'L' or 'M' -> automatically upgrades to 'Q' (~25% recovery)
 */
export function getEffectiveEcLevel(
  ecLevel: QrEcLevel = "M",
  hasLogo: boolean = false,
  logoSizeRatio: number = 0.20
): QrEcLevel {
  if (!hasLogo) return ecLevel;
  if (logoSizeRatio > 0.25) {
    return "H";
  }
  if (ecLevel === "L" || ecLevel === "M") {
    return "Q";
  }
  return ecLevel;
}

/**
 * Validate, clamp, and normalize user-provided QR generation options.
 */
export function normalizeQrOptions(options: QrOptions = {}): NormalizedQrOptions {
  const size = Math.min(4096, Math.max(128, Math.round(Number(options.size) || 400)));
  const margin = Math.min(20, Math.max(4, Math.round(Number(options.margin) || 4)));
  const rawRatio = typeof options.logoSizeRatio === "number" && !isNaN(options.logoSizeRatio)
    ? options.logoSizeRatio
    : 0.20;
  const logoSizeRatio = Math.min(0.32, Math.max(0.15, rawRatio));
  const logoMargin = Math.max(0, Math.min(50, Math.round(Number(options.logoMargin) ?? 6)));

  const baseEcLevel: QrEcLevel = options.ecLevel && ["L", "M", "Q", "H"].includes(options.ecLevel)
    ? options.ecLevel
    : "M";
  const hasLogo = Boolean(options.logoUrl && options.logoUrl.trim().length > 0);
  const ecLevel = getEffectiveEcLevel(baseEcLevel, hasLogo, logoSizeRatio);

  const fgColor = sanitizeCssColor(options.fgColor, "#0f172a");
  const bgColor = sanitizeCssColor(options.bgColor, "#ffffff");
  const logoBgColor = sanitizeCssColor(options.logoBgColor, "#ffffff");
  const frameColor = sanitizeCssColor(options.frameColor, "#0f172a");
  const frameTextColor = sanitizeCssColor(options.frameTextColor, "#ffffff");

  let eyeOuterColor = options.eyeOuterColor ? sanitizeCssColor(options.eyeOuterColor, fgColor) : undefined;
  let eyeInnerColor = options.eyeInnerColor ? sanitizeCssColor(options.eyeInnerColor, fgColor) : undefined;

  let gradient: QrGradientOptions | undefined = undefined;
  if (options.gradient && options.gradient.enabled) {
    gradient = {
      enabled: true,
      type: options.gradient.type === "radial" ? "radial" : "linear",
      color1: sanitizeCssColor(options.gradient.color1, fgColor),
      color2: sanitizeCssColor(options.gradient.color2, fgColor),
      angle: typeof options.gradient.angle === "number" ? options.gradient.angle : 45,
    };
  }

  const dotStyle = options.dotStyle && ["square", "rounded", "dots", "diamond"].includes(options.dotStyle)
    ? options.dotStyle
    : "square";

  const eyeOuterShape = options.eyeOuterShape && ["square", "rounded", "circle"].includes(options.eyeOuterShape)
    ? options.eyeOuterShape
    : "square";

  const eyeInnerShape = options.eyeInnerShape && ["square", "rounded", "circle", "diamond"].includes(options.eyeInnerShape)
    ? options.eyeInnerShape
    : "square";

  const logoShape = options.logoShape && ["circle", "rounded", "square", "none"].includes(options.logoShape)
    ? options.logoShape
    : "rounded";

  const framePosition = options.framePosition && ["bottom", "top", "none"].includes(options.framePosition)
    ? options.framePosition
    : "none";

  return {
    ecLevel,
    fgColor,
    bgColor,
    margin,
    size,
    dotStyle,
    gradient,
    eyeOuterShape,
    eyeInnerShape,
    eyeOuterColor,
    eyeInnerColor,
    logoUrl: options.logoUrl?.trim() || undefined,
    logoSizeRatio,
    logoMargin,
    logoShape,
    logoBgColor,
    frameText: options.frameText?.trim() || undefined,
    frameColor,
    frameTextColor,
    framePosition,
  };
}

const QRMaskPattern = {
  PATTERN000: 0,
  PATTERN001: 1,
  PATTERN010: 2,
  PATTERN011: 3,
  PATTERN100: 4,
  PATTERN101: 5,
  PATTERN110: 6,
  PATTERN111: 7,
};

const QRErrorCorrectionLevel = {
  L: 1,
  M: 0,
  Q: 3,
  H: 2,
};

// =========================================================================
// Galois Field GF(256) Arithmetic
// =========================================================================

const GEN_EXP_TABLE = new Uint8Array(256);
const GEN_LOG_TABLE = new Uint8Array(256);

(function initQrGeneratorMath() {
  for (let i = 0; i < 8; i++) {
    GEN_EXP_TABLE[i] = 1 << i;
  }
  for (let i = 8; i < 256; i++) {
    GEN_EXP_TABLE[i] =
      GEN_EXP_TABLE[i - 4] ^
      GEN_EXP_TABLE[i - 5] ^
      GEN_EXP_TABLE[i - 6] ^
      GEN_EXP_TABLE[i - 8];
  }
  for (let i = 0; i < 255; i++) {
    GEN_LOG_TABLE[GEN_EXP_TABLE[i]] = i;
  }
})();

class QRMath {
  static glog(n: number): number {
    if (n < 1) throw new Error("glog(" + n + ")");
    return GEN_LOG_TABLE[n];
  }

  static gexp(n: number): number {
    while (n < 0) n += 255;
    while (n >= 255) n -= 255;
    return GEN_EXP_TABLE[n];
  }
}

// Polynomial for Reed-Solomon Error Correction
class QRPolynomial {
  num: number[];

  constructor(num: number[], shift: number) {
    if (num.length === undefined) throw new Error("invalid num");
    let offset = 0;
    while (offset < num.length && num[offset] === 0) {
      offset++;
    }
    this.num = new Array(num.length - offset + shift).fill(0);
    for (let i = 0; i < num.length - offset; i++) {
      this.num[i] = num[i + offset];
    }
  }

  get(index: number): number {
    return this.num[index];
  }

  getLength(): number {
    return this.num.length;
  }

  multiply(e: QRPolynomial): QRPolynomial {
    const num = new Array(this.getLength() + e.getLength() - 1).fill(0);
    for (let i = 0; i < this.getLength(); i++) {
      for (let j = 0; j < e.getLength(); j++) {
        if (this.get(i) === 0 || e.get(j) === 0) continue;
        num[i + j] ^= QRMath.gexp(
          QRMath.glog(this.get(i)) + QRMath.glog(e.get(j))
        );
      }
    }
    return new QRPolynomial(num, 0);
  }

  mod(e: QRPolynomial): QRPolynomial {
    let poly: QRPolynomial = this;
    while (poly.getLength() >= e.getLength()) {
      if (poly.get(0) === 0) {
        poly = new QRPolynomial(poly.num.slice(1), 0);
        continue;
      }
      const ratio = QRMath.glog(poly.get(0)) - QRMath.glog(e.get(0));
      const num = new Array(poly.getLength());
      for (let i = 0; i < poly.getLength(); i++) {
        num[i] = poly.get(i);
      }
      for (let i = 0; i < e.getLength(); i++) {
        if (e.get(i) === 0) continue;
        num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
      }
      poly = new QRPolynomial(num, 0);
    }
    return poly;
  }
}

// =========================================================================
// ISO/IEC 18004 Standard Reed-Solomon Block Table (Versions 1 to 40)
// =========================================================================

class QRRSBlock {
  totalCount: number;
  dataCount: number;

  constructor(totalCount: number, dataCount: number) {
    this.totalCount = totalCount;
    this.dataCount = dataCount;
  }

  static RS_BLOCK_TABLE: number[][] = [
    // L, M, Q, H
    // 1
    [1, 26, 19], [1, 26, 16], [1, 26, 13], [1, 26, 9],
    // 2
    [1, 44, 34], [1, 44, 28], [1, 44, 22], [1, 44, 16],
    // 3
    [1, 70, 55], [1, 70, 44], [2, 35, 17], [2, 35, 13],
    // 4
    [1, 100, 80], [2, 50, 32], [2, 50, 24], [4, 25, 9],
    // 5
    [1, 134, 108], [2, 67, 43], [2, 33, 15, 2, 34, 16], [2, 33, 11, 2, 34, 12],
    // 6
    [2, 86, 68], [4, 43, 27], [4, 43, 19], [4, 43, 15],
    // 7
    [2, 98, 78], [4, 49, 31], [2, 32, 14, 4, 33, 15], [4, 39, 13, 1, 40, 14],
    // 8
    [2, 121, 97], [2, 60, 38, 2, 61, 39], [4, 40, 18, 2, 41, 19], [4, 40, 14, 2, 41, 15],
    // 9
    [2, 146, 116], [3, 58, 36, 2, 59, 37], [4, 36, 16, 4, 37, 17], [4, 36, 12, 4, 37, 13],
    // 10
    [2, 86, 68, 2, 87, 69], [4, 69, 43, 1, 70, 44], [6, 43, 19, 2, 44, 20], [6, 43, 15, 2, 44, 16],
    // 11
    [4, 101, 81], [1, 80, 50, 4, 81, 51], [4, 50, 22, 4, 51, 23], [3, 36, 12, 8, 37, 13],
    // 12
    [2, 116, 92, 2, 117, 93], [6, 58, 36, 2, 59, 37], [4, 46, 20, 6, 47, 21], [7, 42, 14, 4, 43, 15],
    // 13
    [4, 133, 107], [8, 59, 37, 1, 60, 38], [8, 44, 20, 4, 45, 21], [12, 33, 11, 4, 34, 12],
    // 14
    [3, 145, 115, 1, 146, 116], [4, 64, 40, 5, 65, 41], [11, 36, 16, 5, 37, 17], [11, 36, 12, 5, 37, 13],
    // 15
    [5, 109, 87, 1, 110, 88], [5, 65, 41, 5, 66, 42], [5, 54, 24, 7, 55, 25], [11, 36, 12, 7, 37, 13],
    // 16
    [5, 122, 98, 1, 123, 99], [7, 73, 45, 3, 74, 46], [15, 43, 19, 2, 44, 20], [3, 45, 15, 13, 46, 16],
    // 17
    [1, 135, 107, 5, 136, 108], [10, 74, 46, 1, 75, 47], [1, 50, 22, 15, 51, 23], [2, 42, 14, 17, 43, 15],
    // 18
    [5, 150, 120, 1, 151, 121], [9, 69, 43, 4, 70, 44], [17, 50, 22, 1, 51, 23], [2, 42, 14, 19, 43, 15],
    // 19
    [3, 141, 113, 4, 142, 114], [3, 70, 44, 11, 71, 45], [17, 47, 21, 4, 48, 22], [9, 39, 13, 16, 40, 14],
    // 20
    [3, 135, 107, 5, 136, 108], [3, 67, 41, 13, 68, 42], [15, 54, 24, 5, 55, 25], [15, 43, 15, 10, 44, 16],
    // 21
    [4, 144, 116, 4, 145, 117], [17, 68, 42], [17, 50, 22, 6, 51, 23], [19, 46, 16, 6, 47, 17],
    // 22
    [2, 139, 111, 7, 140, 112], [17, 74, 46], [7, 54, 24, 16, 55, 25], [34, 37, 13],
    // 23
    [4, 151, 121, 5, 152, 122], [4, 75, 47, 14, 76, 48], [11, 54, 24, 14, 55, 25], [16, 45, 15, 14, 46, 16],
    // 24
    [6, 147, 117, 4, 148, 118], [6, 73, 45, 14, 74, 46], [11, 54, 24, 16, 55, 25], [30, 46, 16, 2, 47, 17],
    // 25
    [8, 132, 106, 4, 133, 107], [8, 75, 47, 13, 76, 48], [7, 54, 24, 22, 55, 25], [22, 45, 15, 13, 46, 16],
    // 26
    [10, 142, 114, 2, 143, 115], [19, 74, 46, 4, 75, 47], [28, 50, 22, 6, 51, 23], [33, 46, 16, 4, 47, 17],
    // 27
    [8, 152, 122, 4, 153, 123], [22, 73, 45, 3, 74, 46], [8, 53, 23, 26, 54, 24], [12, 45, 15, 28, 46, 16],
    // 28
    [3, 147, 117, 10, 148, 118], [3, 73, 45, 23, 74, 46], [4, 54, 24, 31, 55, 25], [11, 45, 15, 31, 46, 16],
    // 29
    [7, 146, 116, 7, 147, 117], [21, 73, 45, 7, 74, 46], [1, 53, 23, 37, 54, 24], [19, 45, 15, 26, 46, 16],
    // 30
    [5, 145, 115, 10, 146, 116], [19, 75, 47, 10, 76, 48], [15, 54, 24, 25, 55, 25], [23, 45, 15, 25, 46, 16],
    // 31
    [13, 145, 115, 3, 146, 116], [2, 74, 46, 29, 75, 47], [42, 54, 24, 1, 55, 25], [23, 45, 15, 28, 46, 16],
    // 32
    [17, 145, 115], [10, 74, 46, 23, 75, 47], [10, 54, 24, 35, 55, 25], [19, 45, 15, 35, 46, 16],
    // 33
    [17, 145, 115, 1, 146, 116], [14, 74, 46, 21, 75, 47], [29, 54, 24, 19, 55, 25], [11, 45, 15, 46, 46, 16],
    // 34
    [13, 145, 115, 6, 146, 116], [14, 74, 46, 23, 75, 47], [44, 54, 24, 7, 55, 25], [59, 46, 16, 1, 47, 17],
    // 35
    [12, 151, 121, 7, 152, 122], [12, 75, 47, 26, 76, 48], [39, 54, 24, 14, 55, 25], [22, 45, 15, 41, 46, 16],
    // 36
    [6, 151, 121, 14, 152, 122], [6, 75, 47, 34, 76, 48], [46, 54, 24, 10, 55, 25], [2, 45, 15, 64, 46, 16],
    // 37
    [17, 152, 122, 4, 153, 123], [29, 74, 46, 14, 75, 47], [49, 54, 24, 10, 55, 25], [24, 45, 15, 46, 46, 16],
    // 38
    [4, 152, 122, 18, 153, 123], [13, 74, 46, 32, 75, 47], [48, 54, 24, 14, 55, 25], [42, 45, 15, 32, 46, 16],
    // 39
    [20, 147, 117, 4, 148, 118], [40, 75, 47, 7, 76, 48], [43, 54, 24, 22, 55, 25], [10, 45, 15, 67, 46, 16],
    // 40
    [19, 148, 118, 6, 149, 119], [18, 75, 47, 31, 76, 48], [34, 54, 24, 34, 55, 25], [20, 45, 15, 61, 46, 16],
  ];

  static getRSBlocks(typeNumber: number, errorCorrectionLevel: number): QRRSBlock[] {
    const rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectionLevel);
    if (rsBlock === undefined) {
      throw new Error("bad rs block @ typeNumber:" + typeNumber + "/errorCorrectionLevel:" + errorCorrectionLevel);
    }
    const length = rsBlock.length / 3;
    const list: QRRSBlock[] = [];
    for (let i = 0; i < length; i++) {
      const count = rsBlock[i * 3 + 0];
      const totalCount = rsBlock[i * 3 + 1];
      const dataCount = rsBlock[i * 3 + 2];
      for (let j = 0; j < count; j++) {
        list.push(new QRRSBlock(totalCount, dataCount));
      }
    }
    return list;
  }

  static getRsBlockTable(typeNumber: number, errorCorrectionLevel: number): number[] | undefined {
    if (typeNumber < 1 || typeNumber > 40) return undefined;
    switch (errorCorrectionLevel) {
      case QRErrorCorrectionLevel.L:
        return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
      case QRErrorCorrectionLevel.M:
        return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
      case QRErrorCorrectionLevel.Q:
        return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
      case QRErrorCorrectionLevel.H:
        return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
      default:
        return undefined;
    }
  }
}

// Bit Buffer
class QRBitBuffer {
  buffer: number[] = [];
  length: number = 0;

  get(index: number): boolean {
    const bufIndex = Math.floor(index / 8);
    return ((this.buffer[bufIndex] >>> (7 - (index % 8))) & 1) === 1;
  }

  put(num: number, length: number) {
    for (let i = 0; i < length; i++) {
      this.putBit(((num >>> (length - i - 1)) & 1) === 1);
    }
  }

  putBit(bit: boolean) {
    const bufIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= bufIndex) {
      this.buffer.push(0);
    }
    if (bit) {
      this.buffer[bufIndex] |= 0x80 >>> (this.length % 8);
    }
    this.length++;
  }
}

// UTF-8 Byte Data
class QR8BitByte {
  mode: number = 4; // 8-bit Byte mode
  data: string;

  constructor(data: string) {
    this.data = data;
  }

  getLength(): number {
    return this.utf8Encode(this.data).length;
  }

  write(buffer: QRBitBuffer) {
    const bytes = this.utf8Encode(this.data);
    for (let i = 0; i < bytes.length; i++) {
      buffer.put(bytes[i], 8);
    }
  }

  utf8Encode(str: string): number[] {
    if (typeof TextEncoder !== "undefined") {
      return Array.from(new TextEncoder().encode(str));
    }
    const codePoints: number[] = [];
    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      if (c < 0x80) {
        codePoints.push(c);
      } else if (c < 0x800) {
        codePoints.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
      } else if (c < 0xd800 || c >= 0xe000) {
        codePoints.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
      } else {
        i++;
        c = 0x10000 + (((c & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
        codePoints.push(
          0xf0 | (c >> 18),
          0x80 | ((c >> 12) & 0x3f),
          0x80 | ((c >> 6) & 0x3f),
          0x80 | (c & 0x3f)
        );
      }
    }
    return codePoints;
  }
}

// =========================================================================
// Alignment Pattern Position Table (Versions 1 to 40)
// =========================================================================

const PATTERN_POSITION_TABLE: number[][] = [
  [], // 1
  [6, 18], // 2
  [6, 22], // 3
  [6, 26], // 4
  [6, 30], // 5
  [6, 34], // 6
  [6, 22, 38], // 7
  [6, 24, 42], // 8
  [6, 26, 46], // 9
  [6, 28, 50], // 10
  [6, 30, 54], // 11
  [6, 32, 58], // 12
  [6, 34, 62], // 13
  [6, 26, 46, 66], // 14
  [6, 26, 48, 70], // 15
  [6, 26, 50, 74], // 16
  [6, 30, 54, 78], // 17
  [6, 30, 56, 82], // 18
  [6, 30, 58, 86], // 19
  [6, 34, 62, 90], // 20
  [6, 28, 50, 72, 94], // 21
  [6, 26, 50, 74, 98], // 22
  [6, 30, 54, 78, 102], // 23
  [6, 28, 54, 80, 106], // 24
  [6, 32, 58, 84, 110], // 25
  [6, 30, 58, 86, 114], // 26
  [6, 34, 62, 90, 118], // 27
  [6, 26, 50, 74, 98, 122], // 28
  [6, 30, 54, 78, 102, 126], // 29
  [6, 26, 52, 78, 104, 130], // 30
  [6, 30, 56, 82, 108, 134], // 31
  [6, 34, 60, 86, 112, 138], // 32
  [6, 30, 58, 86, 114, 142], // 33
  [6, 34, 62, 90, 118, 146], // 34
  [6, 30, 54, 78, 102, 126, 150], // 35
  [6, 24, 50, 76, 102, 128, 154], // 36
  [6, 28, 54, 80, 106, 132, 158], // 37
  [6, 32, 58, 84, 110, 136, 162], // 38
  [6, 26, 54, 82, 110, 138, 166], // 39
  [6, 30, 58, 86, 114, 142, 170], // 40
];

// =========================================================================
// QRCode Model
// =========================================================================

class QRCodeModel {
  typeNumber: number;
  errorCorrectionLevel: number;
  modules: (boolean | null)[][] = [];
  moduleCount: number = 0;
  dataCache: number[] | null = null;
  dataList: QR8BitByte[] = [];

  constructor(typeNumber: number, errorCorrectionLevel: number) {
    this.typeNumber = typeNumber;
    this.errorCorrectionLevel = errorCorrectionLevel;
  }

  addData(data: string) {
    this.dataList.push(new QR8BitByte(data));
    this.dataCache = null;
  }

  isDark(row: number, col: number): boolean {
    if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
      throw new Error(row + "," + col);
    }
    return this.modules[row][col] === true;
  }

  getModuleCount(): number {
    return this.moduleCount;
  }

  make() {
    // Automatic Version Selection (Versions 1 to 40)
    if (this.typeNumber < 1) {
      let typeNumber = 1;
      for (typeNumber = 1; typeNumber <= 40; typeNumber++) {
        const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, this.errorCorrectionLevel);
        const buffer = new QRBitBuffer();
        let totalDataCount = 0;
        for (let i = 0; i < rsBlocks.length; i++) {
          totalDataCount += rsBlocks[i].dataCount;
        }
        for (let i = 0; i < this.dataList.length; i++) {
          const data = this.dataList[i];
          buffer.put(data.mode, 4);
          buffer.put(data.getLength(), this.getLengthInBits(data.mode, typeNumber));
          data.write(buffer);
        }
        if (buffer.length <= totalDataCount * 8) break;
      }

      if (typeNumber > 40) {
        throw new Error(
          "Payload data exceeds QR Code Version 40 capacity (~2,953 bytes). Please shorten the content or lower error correction."
        );
      }
      this.typeNumber = typeNumber;
    }

    this.makeImpl(false, this.getBestMaskPattern());
  }

  private makeImpl(test: boolean, maskPattern: number) {
    this.moduleCount = this.typeNumber * 4 + 17;
    this.modules = new Array(this.moduleCount);
    for (let row = 0; row < this.moduleCount; row++) {
      this.modules[row] = new Array(this.moduleCount).fill(null);
    }

    this.setupPositionProbePattern(0, 0);
    this.setupPositionProbePattern(this.moduleCount - 7, 0);
    this.setupPositionProbePattern(0, this.moduleCount - 7);
    this.setupPositionAdjustPattern();
    this.setupTimingPattern();
    this.setupTypeInfo(test, maskPattern);

    if (this.typeNumber >= 7) {
      this.setupTypeNumber(test);
    }

    if (this.dataCache === null) {
      this.dataCache = QRCodeModel.createData(
        this.typeNumber,
        this.errorCorrectionLevel,
        this.dataList
      );
    }

    this.mapData(this.dataCache, maskPattern);
  }

  private setupPositionProbePattern(row: number, col: number) {
    for (let r = -1; r <= 7; r++) {
      if (row + r <= -1 || this.moduleCount <= row + r) continue;
      for (let c = -1; c <= 7; c++) {
        if (col + c <= -1 || this.moduleCount <= col + c) continue;
        if (
          (0 <= r && r <= 6 && (c === 0 || c === 6)) ||
          (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
          (2 <= r && r <= 4 && 2 <= c && c <= 4)
        ) {
          this.modules[row + r][col + c] = true;
        } else {
          this.modules[row + r][col + c] = false;
        }
      }
    }
  }

  private getBestMaskPattern(): number {
    let minLostPoint = 0;
    let bestMaskPattern = 0;
    for (let i = 0; i < 8; i++) {
      this.makeImpl(true, i);
      const lostPoint = QRCodeModel.getLostPoint(this);
      if (i === 0 || minLostPoint > lostPoint) {
        minLostPoint = lostPoint;
        bestMaskPattern = i;
      }
    }
    return bestMaskPattern;
  }

  private setupTimingPattern() {
    for (let r = 8; r < this.moduleCount - 8; r++) {
      if (this.modules[r][6] !== null) continue;
      this.modules[r][6] = r % 2 === 0;
    }
    for (let c = 8; c < this.moduleCount - 8; c++) {
      if (this.modules[6][c] !== null) continue;
      this.modules[6][c] = c % 2 === 0;
    }
  }

  private setupPositionAdjustPattern() {
    const pos = QRCodeModel.getPatternPosition(this.typeNumber);
    for (let i = 0; i < pos.length; i++) {
      for (let j = 0; j < pos.length; j++) {
        const row = pos[i];
        const col = pos[j];
        if (this.modules[row][col] !== null) continue;
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            if (
              Math.abs(r) === 2 ||
              Math.abs(c) === 2 ||
              (r === 0 && c === 0)
            ) {
              this.modules[row + r][col + c] = true;
            } else {
              this.modules[row + r][col + c] = false;
            }
          }
        }
      }
    }
  }

  private setupTypeNumber(test: boolean) {
    const bits = QRCodeModel.getBCHTypeNumber(this.typeNumber);
    for (let i = 0; i < 18; i++) {
      const mod = !test && ((bits >> i) & 1) === 1;
      this.modules[Math.floor(i / 3)][(i % 3) + this.moduleCount - 8 - 3] = mod;
    }
    for (let i = 0; i < 18; i++) {
      const mod = !test && ((bits >> i) & 1) === 1;
      this.modules[(i % 3) + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
    }
  }

  private setupTypeInfo(test: boolean, maskPattern: number) {
    const data = (this.errorCorrectionLevel << 3) | maskPattern;
    const bits = QRCodeModel.getBCHTypeInfo(data);

    // vertical
    for (let i = 0; i < 15; i++) {
      const mod = !test && ((bits >> i) & 1) === 1;
      if (i < 6) {
        this.modules[i][8] = mod;
      } else if (i < 8) {
        this.modules[i + 1][8] = mod;
      } else {
        this.modules[this.moduleCount - 15 + i][8] = mod;
      }
    }

    // horizontal
    for (let i = 0; i < 15; i++) {
      const mod = !test && ((bits >> i) & 1) === 1;
      if (i < 8) {
        this.modules[8][this.moduleCount - i - 1] = mod;
      } else if (i < 9) {
        this.modules[8][15 - i - 1 + 1] = mod;
      } else {
        this.modules[8][15 - i - 1] = mod;
      }
    }

    // fixed module
    this.modules[this.moduleCount - 8][8] = !test;
  }

  private mapData(data: number[], maskPattern: number) {
    let inc = -1;
    let row = this.moduleCount - 1;
    let bitIndex = 7;
    let byteIndex = 0;
    const maskFunc = QRCodeModel.getMaskFunc(maskPattern);

    for (let col = this.moduleCount - 1; col > 0; col -= 2) {
      if (col === 6) col--;

      while (true) {
        for (let c = 0; c < 2; c++) {
          if (this.modules[row][col - c] === null) {
            let dark = false;
            if (byteIndex < data.length) {
              dark = ((data[byteIndex] >>> bitIndex) & 1) === 1;
            }
            const mask = maskFunc(row, col - c);
            if (mask) {
              dark = !dark;
            }
            this.modules[row][col - c] = dark;
            bitIndex--;
            if (bitIndex === -1) {
              byteIndex++;
              bitIndex = 7;
            }
          }
        }
        row += inc;
        if (row < 0 || this.moduleCount <= row) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }
  }

  private getLengthInBits(mode: number, type: number): number {
    if (1 <= type && type < 10) {
      return 8;
    } else {
      return 16;
    }
  }

  static createData(typeNumber: number, errorCorrectionLevel: number, dataList: QR8BitByte[]): number[] {
    const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectionLevel);
    const buffer = new QRBitBuffer();

    for (let i = 0; i < dataList.length; i++) {
      const data = dataList[i];
      buffer.put(data.mode, 4);
      buffer.put(
        data.getLength(),
        1 <= typeNumber && typeNumber < 10 ? 8 : 16
      );
      data.write(buffer);
    }

    let totalDataCount = 0;
    for (let i = 0; i < rsBlocks.length; i++) {
      totalDataCount += rsBlocks[i].dataCount;
    }

    if (buffer.length > totalDataCount * 8) {
      throw new Error(
        "Payload overflow: Data requires " + buffer.length + " bits but Version " + typeNumber + " capacity is " + totalDataCount * 8 + " bits."
      );
    }

    if (buffer.length + 4 <= totalDataCount * 8) {
      buffer.put(0, 4);
    }

    while (buffer.length % 8 !== 0) {
      buffer.putBit(false);
    }

    while (true) {
      if (buffer.length >= totalDataCount * 8) break;
      buffer.put(0xec, 8);
      if (buffer.length >= totalDataCount * 8) break;
      buffer.put(0x11, 8);
    }

    return QRCodeModel.createBytes(buffer, rsBlocks);
  }

  static createBytes(buffer: QRBitBuffer, rsBlocks: QRRSBlock[]): number[] {
    let offset = 0;
    let maxDcCount = 0;
    let maxEcCount = 0;
    const dcdata: number[][] = new Array(rsBlocks.length);
    const ecdata: number[][] = new Array(rsBlocks.length);

    for (let r = 0; r < rsBlocks.length; r++) {
      const dcCount = rsBlocks[r].dataCount;
      const ecCount = rsBlocks[r].totalCount - dcCount;
      maxDcCount = Math.max(maxDcCount, dcCount);
      maxEcCount = Math.max(maxEcCount, ecCount);

      dcdata[r] = new Array(dcCount);
      for (let i = 0; i < dcdata[r].length; i++) {
        dcdata[r][i] = 0xff & buffer.buffer[i + offset];
      }
      offset += dcCount;

      const rsPoly = QRCodeModel.getErrorCorrectionPolynomial(ecCount);
      const rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);
      const modPoly = rawPoly.mod(rsPoly);
      ecdata[r] = new Array(rsPoly.getLength() - 1);
      for (let i = 0; i < ecdata[r].length; i++) {
        const modIndex = i + modPoly.getLength() - ecdata[r].length;
        ecdata[r][i] = modIndex >= 0 ? modPoly.get(modIndex) : 0;
      }
    }

    let totalCodeCount = 0;
    for (let i = 0; i < rsBlocks.length; i++) {
      totalCodeCount += rsBlocks[i].totalCount;
    }

    const data = new Array(totalCodeCount);
    let index = 0;

    for (let i = 0; i < maxDcCount; i++) {
      for (let r = 0; r < rsBlocks.length; r++) {
        if (i < dcdata[r].length) {
          data[index++] = dcdata[r][i];
        }
      }
    }

    for (let i = 0; i < maxEcCount; i++) {
      for (let r = 0; r < rsBlocks.length; r++) {
        if (i < ecdata[r].length) {
          data[index++] = ecdata[r][i];
        }
      }
    }

    return data;
  }

  static getErrorCorrectionPolynomial(errorCorrectionLength: number): QRPolynomial {
    let a = new QRPolynomial([1], 0);
    for (let i = 0; i < errorCorrectionLength; i++) {
      a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
    }
    return a;
  }

  static getMaskFunc(maskPattern: number): (i: number, j: number) => boolean {
    switch (maskPattern) {
      case QRMaskPattern.PATTERN000:
        return (i, j) => (i + j) % 2 === 0;
      case QRMaskPattern.PATTERN001:
        return (i, _) => i % 2 === 0;
      case QRMaskPattern.PATTERN010:
        return (_, j) => j % 3 === 0;
      case QRMaskPattern.PATTERN011:
        return (i, j) => (i + j) % 3 === 0;
      case QRMaskPattern.PATTERN100:
        return (i, j) => (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
      case QRMaskPattern.PATTERN101:
        return (i, j) => ((i * j) % 2) + ((i * j) % 3) === 0;
      case QRMaskPattern.PATTERN110:
        return (i, j) => (((i * j) % 2) + ((i * j) % 3)) % 2 === 0;
      case QRMaskPattern.PATTERN111:
        return (i, j) => (((i * j) % 3) + ((i + j) % 2)) % 2 === 0;
      default:
        throw new Error("bad maskPattern:" + maskPattern);
    }
  }

  static getLostPoint(qrCode: QRCodeModel): number {
    const moduleCount = qrCode.getModuleCount();
    let lostPoint = 0;

    // RULE 1 (N1 = 3): Five or more consecutive same-color modules in rows and columns
    // Penalty: 3 points for 5 consecutive modules, plus 1 point for each additional module
    for (let row = 0; row < moduleCount; row++) {
      let sameCount = 0;
      let prevColor: boolean | null = null;
      for (let col = 0; col < moduleCount; col++) {
        const isDark = qrCode.isDark(row, col);
        if (isDark === prevColor) {
          sameCount++;
        } else {
          if (sameCount >= 5) {
            lostPoint += 3 + (sameCount - 5);
          }
          prevColor = isDark;
          sameCount = 1;
        }
      }
      if (sameCount >= 5) {
        lostPoint += 3 + (sameCount - 5);
      }
    }

    for (let col = 0; col < moduleCount; col++) {
      let sameCount = 0;
      let prevColor: boolean | null = null;
      for (let row = 0; row < moduleCount; row++) {
        const isDark = qrCode.isDark(row, col);
        if (isDark === prevColor) {
          sameCount++;
        } else {
          if (sameCount >= 5) {
            lostPoint += 3 + (sameCount - 5);
          }
          prevColor = isDark;
          sameCount = 1;
        }
      }
      if (sameCount >= 5) {
        lostPoint += 3 + (sameCount - 5);
      }
    }

    // RULE 2 (N2 = 3): 2x2 blocks of the same color
    // Penalty: 3 points for each 2x2 block with identical colors
    for (let row = 0; row < moduleCount - 1; row++) {
      for (let col = 0; col < moduleCount - 1; col++) {
        const count =
          (qrCode.isDark(row, col) ? 1 : 0) +
          (qrCode.isDark(row + 1, col) ? 1 : 0) +
          (qrCode.isDark(row, col + 1) ? 1 : 0) +
          (qrCode.isDark(row + 1, col + 1) ? 1 : 0);
        if (count === 0 || count === 4) {
          lostPoint += 3;
        }
      }
    }

    // RULE 3 (N3 = 40): 1:1:3:1:1 finder-like patterns with 4 light modules before or after
    // Patterns: 0 0 0 0 1 0 1 1 1 0 1 or 1 0 1 1 1 0 1 0 0 0 0 (11 modules)
    // Horizontal check
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col <= moduleCount - 11; col++) {
        const d0 = qrCode.isDark(row, col);
        const d1 = qrCode.isDark(row, col + 1);
        const d2 = qrCode.isDark(row, col + 2);
        const d3 = qrCode.isDark(row, col + 3);
        const d4 = qrCode.isDark(row, col + 4);
        const d5 = qrCode.isDark(row, col + 5);
        const d6 = qrCode.isDark(row, col + 6);
        const d7 = qrCode.isDark(row, col + 7);
        const d8 = qrCode.isDark(row, col + 8);
        const d9 = qrCode.isDark(row, col + 9);
        const d10 = qrCode.isDark(row, col + 10);

        // Pattern A: 0 0 0 0 1 0 1 1 1 0 1
        // Pattern B: 1 0 1 1 1 0 1 0 0 0 0
        if (
          (!d0 && !d1 && !d2 && !d3 && d4 && !d5 && d6 && d7 && d8 && !d9 && d10) ||
          (d0 && !d1 && d2 && d3 && d4 && !d5 && d6 && !d7 && !d8 && !d9 && !d10)
        ) {
          lostPoint += 40;
        }
      }
    }

    // Vertical check
    for (let col = 0; col < moduleCount; col++) {
      for (let row = 0; row <= moduleCount - 11; row++) {
        const d0 = qrCode.isDark(row, col);
        const d1 = qrCode.isDark(row + 1, col);
        const d2 = qrCode.isDark(row + 2, col);
        const d3 = qrCode.isDark(row + 3, col);
        const d4 = qrCode.isDark(row + 4, col);
        const d5 = qrCode.isDark(row + 5, col);
        const d6 = qrCode.isDark(row + 6, col);
        const d7 = qrCode.isDark(row + 7, col);
        const d8 = qrCode.isDark(row + 8, col);
        const d9 = qrCode.isDark(row + 9, col);
        const d10 = qrCode.isDark(row + 10, col);

        if (
          (!d0 && !d1 && !d2 && !d3 && d4 && !d5 && d6 && d7 && d8 && !d9 && d10) ||
          (d0 && !d1 && d2 && d3 && d4 && !d5 && d6 && !d7 && !d8 && !d9 && !d10)
        ) {
          lostPoint += 40;
        }
      }
    }

    // RULE 4 (N4 = 10): Proportion of dark modules
    // Penalty: k * 10 where k = floor(|darkPercentage - 50| / 5)
    let darkCount = 0;
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (qrCode.isDark(row, col)) darkCount++;
      }
    }
    const totalCount = moduleCount * moduleCount;
    const darkPercent = (darkCount * 100) / totalCount;
    const k = Math.floor(Math.abs(darkPercent - 50) / 5);
    lostPoint += k * 10;

    return lostPoint;
  }

  static getPatternPosition(typeNumber: number): number[] {
    return PATTERN_POSITION_TABLE[typeNumber - 1] || [];
  }

  static getBCHTypeInfo(data: number): number {
    let d = data << 10;
    while (QRCodeModel.getBCHDigit(d) - QRCodeModel.getBCHDigit(0x537) >= 0) {
      d ^= 0x537 << (QRCodeModel.getBCHDigit(d) - QRCodeModel.getBCHDigit(0x537));
    }
    return ((data << 10) | d) ^ 0x5412;
  }

  static getBCHTypeNumber(data: number): number {
    let d = data << 12;
    while (QRCodeModel.getBCHDigit(d) - QRCodeModel.getBCHDigit(0x1f25) >= 0) {
      d ^= 0x1f25 << (QRCodeModel.getBCHDigit(d) - QRCodeModel.getBCHDigit(0x1f25));
    }
    return (data << 12) | d;
  }

  static getBCHDigit(data: number): number {
    let digit = 0;
    while (data !== 0) {
      digit++;
      data >>>= 1;
    }
    return digit;
  }
}

// =========================================================================
// Public QR Matrix API
// =========================================================================

export interface QrMatrix {
  /** Size in modules (e.g. 21 for Version 1, 177 for Version 40) */
  size: number;
  /** 2D array of booleans where true = dark module, false = light module */
  modules: boolean[][];
  /** Selected QR version (1 to 40) */
  version: number;
}

/**
 * Generate 2D binary matrix for any text payload across QR Versions 1 to 40
 */
export function generateQrMatrix(text: string, ecLevel: QrEcLevel = "M"): QrMatrix {
  const ecMap: Record<QrEcLevel, number> = {
    L: QRErrorCorrectionLevel.L,
    M: QRErrorCorrectionLevel.M,
    Q: QRErrorCorrectionLevel.Q,
    H: QRErrorCorrectionLevel.H,
  };

  const model = new QRCodeModel(0, ecMap[ecLevel] ?? QRErrorCorrectionLevel.M);
  const safeText = (text && text.trim().length > 0) ? text : "https://toolqivo.com";
  model.addData(safeText);
  model.make();

  const size = model.getModuleCount();
  const modules: boolean[][] = [];

  for (let r = 0; r < size; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < size; c++) {
      row.push(model.isDark(r, c));
    }
    modules.push(row);
  }

  return { size, modules, version: model.typeNumber };
}

// =========================================================================
// Image Loader & Cache Helper
// =========================================================================

const imageCache = new Map<string, HTMLImageElement>();

function loadImage(src: string): Promise<HTMLImageElement> {
  if (!src) return Promise.reject(new Error("Empty image src"));
  if (imageCache.has(src)) {
    const cached = imageCache.get(src)!;
    if (cached.complete && cached.naturalWidth > 0) {
      return Promise.resolve(cached);
    }
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const timeout = setTimeout(() => {
      reject(new Error("Image load timed out"));
    }, 2500);

    // Do NOT set crossOrigin on data: or blob: URIs as some browsers reject them
    if (!src.startsWith("data:") && !src.startsWith("blob:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      clearTimeout(timeout);
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = (e) => {
      clearTimeout(timeout);
      reject(e);
    };
    img.src = src;
  });
}

// =========================================================================
// Canvas Drawing Engine
// =========================================================================

function drawModuleShape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  dotStyle: "square" | "rounded" | "dots" | "diamond"
) {
  if (dotStyle === "square") {
    ctx.fillRect(x, y, size + 0.1, size + 0.1);
  } else if (dotStyle === "rounded") {
    const radius = size * 0.35;
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === "function") {
      (ctx as any).roundRect(x + 0.2, y + 0.2, size - 0.4, size - 0.4, radius);
    } else {
      ctx.rect(x, y, size, size);
    }
    ctx.fill();
  } else if (dotStyle === "dots") {
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size * 0.44, 0, Math.PI * 2);
    ctx.fill();
  } else if (dotStyle === "diamond") {
    ctx.beginPath();
    ctx.moveTo(x + size / 2, y);
    ctx.lineTo(x + size, y + size / 2);
    ctx.lineTo(x + size / 2, y + size);
    ctx.lineTo(x, y + size / 2);
    ctx.closePath();
    ctx.fill();
  }
}

function drawFinderEye(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cellSize: number,
  outerShape: "square" | "rounded" | "circle" = "square",
  innerShape: "square" | "rounded" | "circle" | "diamond" = "square",
  outerColor?: string,
  innerColor?: string,
  defaultColor = "#0f172a",
  bgColor = "#ffffff"
) {
  const eyeOuterSize = cellSize * 7;
  const eyeInnerSize = cellSize * 3;
  const outerCol = outerColor || defaultColor;
  const innerCol = innerColor || outerColor || defaultColor;

  ctx.save();

  // Draw Outer Frame
  ctx.fillStyle = outerCol;
  if (outerShape === "circle") {
    ctx.beginPath();
    ctx.arc(x + eyeOuterSize / 2, y + eyeOuterSize / 2, eyeOuterSize / 2, 0, Math.PI * 2);
    ctx.fill();

    // Cutout hollow ring
    ctx.fillStyle = bgColor === "transparent" ? "#ffffff" : bgColor;
    ctx.beginPath();
    ctx.arc(x + eyeOuterSize / 2, y + eyeOuterSize / 2, (cellSize * 5) / 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (outerShape === "rounded") {
    ctx.beginPath();
    const r = cellSize * 2;
    if (typeof (ctx as any).roundRect === "function") {
      (ctx as any).roundRect(x, y, eyeOuterSize, eyeOuterSize, r);
    } else {
      ctx.rect(x, y, eyeOuterSize, eyeOuterSize);
    }
    ctx.fill();

    // Cutout hollow ring
    ctx.fillStyle = bgColor === "transparent" ? "#ffffff" : bgColor;
    ctx.beginPath();
    const innerR = cellSize * 1.2;
    if (typeof (ctx as any).roundRect === "function") {
      (ctx as any).roundRect(x + cellSize, y + cellSize, cellSize * 5, cellSize * 5, innerR);
    } else {
      ctx.rect(x + cellSize, y + cellSize, cellSize * 5, cellSize * 5);
    }
    ctx.fill();
  } else {
    // Square
    ctx.fillRect(x, y, eyeOuterSize, eyeOuterSize);
    ctx.fillStyle = bgColor === "transparent" ? "#ffffff" : bgColor;
    ctx.fillRect(x + cellSize, y + cellSize, cellSize * 5, cellSize * 5);
  }

  // Draw Inner Ball (centered at x + 2*cellSize, y + 2*cellSize)
  ctx.fillStyle = innerCol;
  const ballX = x + cellSize * 2;
  const ballY = y + cellSize * 2;

  if (innerShape === "circle") {
    ctx.beginPath();
    ctx.arc(ballX + eyeInnerSize / 2, ballY + eyeInnerSize / 2, eyeInnerSize / 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (innerShape === "rounded") {
    ctx.beginPath();
    const r = cellSize * 0.8;
    if (typeof (ctx as any).roundRect === "function") {
      (ctx as any).roundRect(ballX, ballY, eyeInnerSize, eyeInnerSize, r);
    } else {
      ctx.rect(ballX, ballY, eyeInnerSize, eyeInnerSize);
    }
    ctx.fill();
  } else if (innerShape === "diamond") {
    ctx.beginPath();
    ctx.moveTo(ballX + eyeInnerSize / 2, ballY);
    ctx.lineTo(ballX + eyeInnerSize, ballY + eyeInnerSize / 2);
    ctx.lineTo(ballX + eyeInnerSize / 2, ballY + eyeInnerSize);
    ctx.lineTo(ballX, ballY + eyeInnerSize / 2);
    ctx.closePath();
    ctx.fill();
  } else {
    // Square
    ctx.fillRect(ballX, ballY, eyeInnerSize, eyeInnerSize);
  }

  ctx.restore();
}

/**
 * Render standard or styled QR Code directly to an HTML5 Canvas
 */
export async function renderQrToCanvas(
  canvas: HTMLCanvasElement,
  text: string,
  options: QrOptions = {}
): Promise<void> {
  const norm = normalizeQrOptions(options);
  const {
    ecLevel,
    fgColor,
    bgColor,
    margin,
    size,
    dotStyle,
    gradient,
    eyeOuterShape,
    eyeInnerShape,
    eyeOuterColor,
    eyeInnerColor,
    logoUrl,
    logoSizeRatio,
    logoMargin,
    logoShape,
    logoBgColor,
    frameText,
    frameColor,
    frameTextColor,
    framePosition,
  } = norm;

  const qr = generateQrMatrix(text, ecLevel);
  const matrixSize = qr.size;
  const fullModuleCount = matrixSize + margin * 2;

  // Calculate Frame dimensions
  const hasFrame = Boolean(frameText && framePosition !== "none");
  const frameHeight = hasFrame ? Math.round(size * 0.16) : 0;
  const qrAreaSize = size;
  const totalHeight = qrAreaSize + (hasFrame ? frameHeight : 0);

  // Set physical Canvas dimensions
  canvas.width = size;
  canvas.height = totalHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Background
  if (bgColor === "transparent") {
    ctx.clearRect(0, 0, size, totalHeight);
  } else {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, totalHeight);
  }

  const cellSize = qrAreaSize / fullModuleCount;
  const qrOffsetY = hasFrame && framePosition === "top" ? frameHeight : 0;

  // Setup fill style (Gradient or Solid)
  let bodyFillStyle: string | CanvasGradient = fgColor;
  if (gradient && gradient.enabled) {
    if (gradient.type === "radial") {
      const grad = ctx.createRadialGradient(
        size / 2,
        qrOffsetY + qrAreaSize / 2,
        size * 0.05,
        size / 2,
        qrOffsetY + qrAreaSize / 2,
        size * 0.6
      );
      grad.addColorStop(0, gradient.color1);
      grad.addColorStop(1, gradient.color2);
      bodyFillStyle = grad;
    } else {
      // Linear gradient with angle
      const rad = ((gradient.angle ?? 45) * Math.PI) / 180;
      const x0 = size / 2 - (Math.cos(rad) * size) / 2;
      const y0 = qrOffsetY + qrAreaSize / 2 - (Math.sin(rad) * qrAreaSize) / 2;
      const x1 = size / 2 + (Math.cos(rad) * size) / 2;
      const y1 = qrOffsetY + qrAreaSize / 2 + (Math.sin(rad) * qrAreaSize) / 2;
      const grad = ctx.createLinearGradient(x0, y0, x1, y1);
      grad.addColorStop(0, gradient.color1);
      grad.addColorStop(1, gradient.color2);
      bodyFillStyle = grad;
    }
  }

  // Preload logo image if provided
  let logoImg: HTMLImageElement | null = null;
  if (logoUrl) {
    try {
      logoImg = await loadImage(logoUrl);
    } catch {
      console.warn("Could not load QR logo image:", logoUrl);
    }
  }

  // Determine logo cutout box in module coordinates
  const shouldCutoutLogo = Boolean(logoUrl && logoImg);
  const logoTotalPx = qrAreaSize * logoSizeRatio;
  const logoBoxModules = Math.ceil(logoTotalPx / cellSize);
  const centerModule = Math.floor(matrixSize / 2);
  const logoHalfMod = Math.floor(logoBoxModules / 2);
  const logoModMin = centerModule - logoHalfMod;
  const logoModMax = centerModule + logoHalfMod;

  // Draw Body Modules (excluding finder eye regions and logo center cutout)
  ctx.fillStyle = bodyFillStyle;

  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (!qr.modules[r][c]) continue;

      // Skip finder pattern zones (7x7 plus 1 module separator)
      const isTopLeftFinder = r < 8 && c < 8;
      const isTopRightFinder = r < 8 && c >= matrixSize - 8;
      const isBottomLeftFinder = r >= matrixSize - 8 && c < 8;
      if (isTopLeftFinder || isTopRightFinder || isBottomLeftFinder) {
        continue;
      }

      // Skip modules behind logo only when logo is loaded
      if (shouldCutoutLogo && r >= logoModMin && r <= logoModMax && c >= logoModMin && c <= logoModMax) {
        continue;
      }

      const x = (c + margin) * cellSize;
      const y = qrOffsetY + (r + margin) * cellSize;

      drawModuleShape(ctx, x, y, cellSize, dotStyle);
    }
  }

  // Draw 3 Finder Pattern Eyes with custom shapes & colors
  const defaultEyeColor = gradient && gradient.enabled ? gradient.color1 : fgColor;

  // Top-Left Eye
  drawFinderEye(
    ctx,
    margin * cellSize,
    qrOffsetY + margin * cellSize,
    cellSize,
    eyeOuterShape,
    eyeInnerShape,
    eyeOuterColor,
    eyeInnerColor,
    defaultEyeColor,
    bgColor
  );

  // Top-Right Eye
  drawFinderEye(
    ctx,
    (matrixSize - 7 + margin) * cellSize,
    qrOffsetY + margin * cellSize,
    cellSize,
    eyeOuterShape,
    eyeInnerShape,
    eyeOuterColor,
    eyeInnerColor,
    defaultEyeColor,
    bgColor
  );

  // Bottom-Left Eye
  drawFinderEye(
    ctx,
    margin * cellSize,
    qrOffsetY + (matrixSize - 7 + margin) * cellSize,
    cellSize,
    eyeOuterShape,
    eyeInnerShape,
    eyeOuterColor,
    eyeInnerColor,
    defaultEyeColor,
    bgColor
  );

  // Draw Center Logo with background cutout pad
  if (logoUrl && logoImg) {
    const centerX = size / 2;
    const centerY = qrOffsetY + qrAreaSize / 2;
    const padSize = logoTotalPx + logoMargin * 2;
    const halfPad = padSize / 2;

    ctx.save();

    // Logo Background Pad
    if (logoShape !== "none") {
      ctx.fillStyle = logoBgColor;
      ctx.shadowColor = "rgba(0, 0, 0, 0.12)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 2;

      ctx.beginPath();
      if (logoShape === "circle") {
        ctx.arc(centerX, centerY, halfPad, 0, Math.PI * 2);
      } else if (logoShape === "rounded") {
        const r = padSize * 0.22;
        if (typeof (ctx as any).roundRect === "function") {
          (ctx as any).roundRect(centerX - halfPad, centerY - halfPad, padSize, padSize, r);
        } else {
          ctx.rect(centerX - halfPad, centerY - halfPad, padSize, padSize);
        }
      } else {
        ctx.rect(centerX - halfPad, centerY - halfPad, padSize, padSize);
      }
      ctx.fill();
      ctx.shadowColor = "transparent";
    }

    // Clip logo to shape if requested
    if (logoShape === "circle") {
      ctx.beginPath();
      ctx.arc(centerX, centerY, logoTotalPx / 2, 0, Math.PI * 2);
      ctx.clip();
    } else if (logoShape === "rounded") {
      ctx.beginPath();
      const r = logoTotalPx * 0.18;
      if (typeof (ctx as any).roundRect === "function") {
        (ctx as any).roundRect(centerX - logoTotalPx / 2, centerY - logoTotalPx / 2, logoTotalPx, logoTotalPx, r);
      } else {
        ctx.rect(centerX - logoTotalPx / 2, centerY - logoTotalPx / 2, logoTotalPx, logoTotalPx);
      }
      ctx.clip();
    }

    // Draw Image scaled proportionally
    const imgAspect = logoImg.naturalWidth / (logoImg.naturalHeight || 1);
    let dw = logoTotalPx;
    let dh = logoTotalPx;
    if (imgAspect > 1) {
      dh = logoTotalPx / imgAspect;
    } else {
      dw = logoTotalPx * imgAspect;
    }

    ctx.drawImage(logoImg, centerX - dw / 2, centerY - dh / 2, dw, dh);
    ctx.restore();
  }

  // Draw Frame Banner ("SCAN ME")
  if (hasFrame) {
    const isTop = framePosition === "top";
    const fy = isTop ? 0 : qrAreaSize;
    const bannerH = frameHeight;

    ctx.save();
    ctx.fillStyle = frameColor;
    ctx.fillRect(0, fy, size, bannerH);

    ctx.fillStyle = frameTextColor;
    ctx.font = `bold ${Math.round(bannerH * 0.38)}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(frameText!.toUpperCase(), size / 2, fy + bannerH / 2);
    ctx.restore();
  }
}

// =========================================================================
// SVG Generator Engine
// =========================================================================

/**
 * Generate Scalable Vector Graphics (SVG) string for QR Code with logos & styles.
 * All attributes, gradient definitions, and text nodes are fully XML-escaped.
 */
export function generateQrSvg(text: string, options: QrOptions = {}): string {
  const norm = normalizeQrOptions(options);
  const {
    ecLevel,
    fgColor,
    bgColor,
    margin,
    size,
    dotStyle,
    gradient,
    eyeOuterShape,
    eyeInnerShape,
    eyeOuterColor,
    eyeInnerColor,
    logoUrl,
    logoSizeRatio,
    logoMargin,
    logoShape,
    logoBgColor,
    frameText,
    frameColor,
    frameTextColor,
    framePosition,
  } = norm;

  const qr = generateQrMatrix(text, ecLevel);
  const matrixSize = qr.size;
  const fullModuleCount = matrixSize + margin * 2;

  const hasFrame = Boolean(frameText && framePosition !== "none");
  const frameHeight = hasFrame ? Math.round(size * 0.16) : 0;
  const totalHeight = size + (hasFrame ? frameHeight : 0);
  const cellSize = size / fullModuleCount;
  const qrOffsetY = hasFrame && framePosition === "top" ? frameHeight : 0;

  // Determine logo cutout box
  const logoTotalPx = size * logoSizeRatio;
  const logoBoxModules = Math.ceil(logoTotalPx / cellSize);
  const centerModule = Math.floor(matrixSize / 2);
  const logoHalfMod = Math.floor(logoBoxModules / 2);
  const logoModMin = centerModule - logoHalfMod;
  const logoModMax = centerModule + logoHalfMod;

  // Safe XML-escaped colors and strings
  const safeFgColor = escapeXml(fgColor);
  const safeBgColor = escapeXml(bgColor);
  const safeLogoBgColor = escapeXml(logoBgColor);
  const safeFrameColor = escapeXml(frameColor);
  const safeFrameTextColor = escapeXml(frameTextColor);
  const safeFrameText = escapeXml(frameText ? frameText.toUpperCase() : "");
  const safeLogoUrl = logoUrl ? escapeXml(logoUrl) : "";

  // SVG Defs (Gradients & Filters)
  let defs = "";
  let fillAttr = `fill="${safeFgColor}"`;

  if (gradient && gradient.enabled) {
    const safeColor1 = escapeXml(gradient.color1);
    const safeColor2 = escapeXml(gradient.color2);

    if (gradient.type === "radial") {
      defs += `
    <radialGradient id="qrGrad" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="${safeColor1}" />
      <stop offset="100%" stop-color="${safeColor2}" />
    </radialGradient>`;
    } else {
      const angle = gradient.angle ?? 45;
      const rad = (angle * Math.PI) / 180;
      const x1 = Math.round(50 - Math.cos(rad) * 50);
      const y1 = Math.round(50 - Math.sin(rad) * 50);
      const x2 = Math.round(50 + Math.cos(rad) * 50);
      const y2 = Math.round(50 + Math.sin(rad) * 50);
      defs += `
    <linearGradient id="qrGrad" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
      <stop offset="0%" stop-color="${safeColor1}" />
      <stop offset="100%" stop-color="${safeColor2}" />
    </linearGradient>`;
    }
    fillAttr = 'fill="url(#qrGrad)"';
  }

  // Background rect
  const bgRect =
    bgColor !== "transparent"
      ? `<rect width="${size}" height="${totalHeight}" fill="${safeBgColor}" />`
      : "";

  // Modules path / elements
  let bodyElements = "";
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (!qr.modules[r][c]) continue;

      // Skip finder zones
      if ((r < 8 && c < 8) || (r < 8 && c >= matrixSize - 8) || (r >= matrixSize - 8 && c < 8)) {
        continue;
      }

      // Skip logo cutout
      if (logoUrl && r >= logoModMin && r <= logoModMax && c >= logoModMin && c <= logoModMax) {
        continue;
      }

      const x = (c + margin) * cellSize;
      const y = qrOffsetY + (r + margin) * cellSize;

      if (dotStyle === "dots") {
        bodyElements += `<circle cx="${(x + cellSize / 2).toFixed(2)}" cy="${(y + cellSize / 2).toFixed(2)}" r="${(cellSize * 0.44).toFixed(2)}" />`;
      } else if (dotStyle === "rounded") {
        bodyElements += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${cellSize.toFixed(2)}" height="${cellSize.toFixed(2)}" rx="${(cellSize * 0.35).toFixed(2)}" />`;
      } else if (dotStyle === "diamond") {
        bodyElements += `<polygon points="${(x + cellSize / 2).toFixed(2)},${y.toFixed(2)} ${(x + cellSize).toFixed(2)},${(y + cellSize / 2).toFixed(2)} ${(x + cellSize / 2).toFixed(2)},${(y + cellSize).toFixed(2)} ${x.toFixed(2)},${(y + cellSize / 2).toFixed(2)}" />`;
      } else {
        bodyElements += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${cellSize.toFixed(2)}" height="${cellSize.toFixed(2)}" />`;
      }
    }
  }

  // Finder Eyes Helper for SVG
  const defaultEyeCol = gradient && gradient.enabled ? gradient.color1 : fgColor;
  const outerCol = escapeXml(eyeOuterColor || defaultEyeCol);
  const innerCol = escapeXml(eyeInnerColor || eyeOuterColor || defaultEyeCol);
  const actualBgCol = escapeXml(bgColor === "transparent" ? "#ffffff" : bgColor);

  const renderSvgEye = (ex: number, ey: number) => {
    const x = ex * cellSize;
    const y = qrOffsetY + ey * cellSize;
    const outerDim = 7 * cellSize;
    const innerHollow = 5 * cellSize;
    const ballDim = 3 * cellSize;
    const ballX = x + 2 * cellSize;
    const ballY = y + 2 * cellSize;

    let res = "";

    // Outer frame
    if (eyeOuterShape === "circle") {
      res += `<circle cx="${(x + outerDim / 2).toFixed(2)}" cy="${(y + outerDim / 2).toFixed(2)}" r="${(outerDim / 2).toFixed(2)}" fill="${outerCol}" />`;
      res += `<circle cx="${(x + outerDim / 2).toFixed(2)}" cy="${(y + outerDim / 2).toFixed(2)}" r="${(innerHollow / 2).toFixed(2)}" fill="${actualBgCol}" />`;
    } else if (eyeOuterShape === "rounded") {
      res += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${outerDim.toFixed(2)}" height="${outerDim.toFixed(2)}" rx="${(cellSize * 2).toFixed(2)}" fill="${outerCol}" />`;
      res += `<rect x="${(x + cellSize).toFixed(2)}" y="${(y + cellSize).toFixed(2)}" width="${innerHollow.toFixed(2)}" height="${innerHollow.toFixed(2)}" rx="${(cellSize * 1.2).toFixed(2)}" fill="${actualBgCol}" />`;
    } else {
      res += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${outerDim.toFixed(2)}" height="${outerDim.toFixed(2)}" fill="${outerCol}" />`;
      res += `<rect x="${(x + cellSize).toFixed(2)}" y="${(y + cellSize).toFixed(2)}" width="${innerHollow.toFixed(2)}" height="${innerHollow.toFixed(2)}" fill="${actualBgCol}" />`;
    }

    // Inner ball
    if (eyeInnerShape === "circle") {
      res += `<circle cx="${(ballX + ballDim / 2).toFixed(2)}" cy="${(ballY + ballDim / 2).toFixed(2)}" r="${(ballDim / 2).toFixed(2)}" fill="${innerCol}" />`;
    } else if (eyeInnerShape === "rounded") {
      res += `<rect x="${ballX.toFixed(2)}" y="${ballY.toFixed(2)}" width="${ballDim.toFixed(2)}" height="${ballDim.toFixed(2)}" rx="${(cellSize * 0.8).toFixed(2)}" fill="${innerCol}" />`;
    } else if (eyeInnerShape === "diamond") {
      res += `<polygon points="${(ballX + ballDim / 2).toFixed(2)},${ballY.toFixed(2)} ${(ballX + ballDim).toFixed(2)},${(ballY + ballDim / 2).toFixed(2)} ${(ballX + ballDim / 2).toFixed(2)},${(ballY + ballDim).toFixed(2)} ${ballX.toFixed(2)},${(ballY + ballDim / 2).toFixed(2)}" fill="${innerCol}" />`;
    } else {
      res += `<rect x="${ballX.toFixed(2)}" y="${ballY.toFixed(2)}" width="${ballDim.toFixed(2)}" height="${ballDim.toFixed(2)}" fill="${innerCol}" />`;
    }

    return res;
  };

  const eyesSvg =
    renderSvgEye(margin, margin) +
    renderSvgEye(matrixSize - 7 + margin, margin) +
    renderSvgEye(margin, matrixSize - 7 + margin);

  // Logo SVG
  let logoSvg = "";
  if (safeLogoUrl) {
    const cx = size / 2;
    const cy = qrOffsetY + size / 2;
    const padSize = logoTotalPx + logoMargin * 2;
    const halfPad = padSize / 2;

    if (logoShape !== "none") {
      if (logoShape === "circle") {
        logoSvg += `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${halfPad.toFixed(2)}" fill="${safeLogoBgColor}" />`;
      } else if (logoShape === "rounded") {
        logoSvg += `<rect x="${(cx - halfPad).toFixed(2)}" y="${(cy - halfPad).toFixed(2)}" width="${padSize.toFixed(2)}" height="${padSize.toFixed(2)}" rx="${(padSize * 0.22).toFixed(2)}" fill="${safeLogoBgColor}" />`;
      } else {
        logoSvg += `<rect x="${(cx - halfPad).toFixed(2)}" y="${(cy - halfPad).toFixed(2)}" width="${padSize.toFixed(2)}" height="${padSize.toFixed(2)}" fill="${safeLogoBgColor}" />`;
      }
    }

    logoSvg += `<image href="${safeLogoUrl}" x="${(cx - logoTotalPx / 2).toFixed(2)}" y="${(cy - logoTotalPx / 2).toFixed(2)}" width="${logoTotalPx.toFixed(2)}" height="${logoTotalPx.toFixed(2)}" preserveAspectRatio="xMidYMid meet" />`;
  }

  // Frame SVG
  let frameSvg = "";
  if (hasFrame) {
    const isTop = framePosition === "top";
    const fy = isTop ? 0 : size;
    frameSvg += `<rect x="0" y="${fy}" width="${size}" height="${frameHeight}" fill="${safeFrameColor}" />`;
    frameSvg += `<text x="${size / 2}" y="${fy + frameHeight / 2}" fill="${safeFrameTextColor}" font-family="system-ui, -apple-system, sans-serif" font-weight="bold" font-size="${Math.round(frameHeight * 0.38)}" text-anchor="middle" dominant-baseline="central">${safeFrameText}</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${totalHeight}" width="${size}" height="${totalHeight}">
  <defs>${defs}
  </defs>
  ${bgRect}
  <g ${fillAttr}>
    ${bodyElements}
  </g>
  ${eyesSvg}
  ${logoSvg}
  ${frameSvg}
</svg>`;
}

/**
 * Converts an image source URL or Blob URL to a self-contained Data URI.
 */
export async function convertImageToDataUrl(src: string): Promise<string> {
  if (!src || src.startsWith("data:")) return src;
  if (typeof window === "undefined") return src;

  try {
    const img = await loadImage(src);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || 200;
    canvas.height = img.naturalHeight || 200;
    const ctx = canvas.getContext("2d");
    if (!ctx) return src;
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/png");
  } catch (err) {
    console.warn("Could not convert image to Data URL:", err);
    return src;
  }
}

/**
 * Generates an SVG string where any external or blob logo image is converted into
 * a self-contained Base64 Data URI, ensuring downloaded SVGs are 100% portable.
 */
export async function exportSelfContainedQrSvg(text: string, options: QrOptions = {}): Promise<string> {
  const norm = normalizeQrOptions(options);
  if (!norm.logoUrl || norm.logoUrl.startsWith("data:")) {
    return generateQrSvg(text, norm);
  }

  try {
    const embeddedDataUrl = await convertImageToDataUrl(norm.logoUrl);
    return generateQrSvg(text, { ...norm, logoUrl: embeddedDataUrl });
  } catch (err) {
    console.warn("Failed embedding logo as Data URL for SVG:", err);
    return generateQrSvg(text, norm);
  }
}

// =========================================================================
// QR Payload Data Formatters
// =========================================================================

export const QrPayloads = {
  url(url: string): string {
    const trimmed = url.trim();
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      return `https://${trimmed}`;
    }
    return trimmed;
  },

  email(email: string, subject: string = "", body: string = ""): string {
    const params: string[] = [];
    if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
    if (body) params.push(`body=${encodeURIComponent(body)}`);
    return `mailto:${email.trim()}${params.length ? "?" + params.join("&") : ""}`;
  },

  phone(phoneNumber: string): string {
    return `tel:${phoneNumber.trim().replace(/[\s-]/g, "")}`;
  },

  sms(phoneNumber: string, message: string = ""): string {
    const cleanPhone = phoneNumber.trim().replace(/[\s-]/g, "");
    return message ? `sms:${cleanPhone}?body=${encodeURIComponent(message)}` : `sms:${cleanPhone}`;
  },

  wifi(
    ssid: string,
    password: string = "",
    authType: "WPA" | "WEP" | "nopass" = "WPA",
    hidden: boolean = false
  ): string {
    const escapeWifi = (s: string) => s.replace(/([\\;,:"])/g, "\\$1");
    return `WIFI:T:${authType};S:${escapeWifi(ssid)};P:${escapeWifi(password)};H:${hidden ? "true" : "false"};;`;
  },

  vCard(contact: {
    firstName: string;
    lastName?: string;
    phone?: string;
    email?: string;
    org?: string;
    title?: string;
    url?: string;
    address?: string;
  }): string {
    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `N:${contact.lastName || ""};${contact.firstName || ""};;;`,
      `FN:${[contact.firstName, contact.lastName].filter(Boolean).join(" ")}`,
    ];
    if (contact.org) lines.push(`ORG:${contact.org}`);
    if (contact.title) lines.push(`TITLE:${contact.title}`);
    if (contact.phone) lines.push(`TEL;TYPE=CELL:${contact.phone}`);
    if (contact.email) lines.push(`EMAIL:${contact.email}`);
    if (contact.url) lines.push(`URL:${contact.url}`);
    if (contact.address) lines.push(`ADR:;;${contact.address};;;;`);
    lines.push("END:VCARD");
    return lines.join("\n");
  },

  whatsApp(phoneNumber: string, message: string = ""): string {
    const cleanNumber = phoneNumber.replace(/[^0-9]/g, "");
    return message
      ? `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`
      : `https://wa.me/${cleanNumber}`;
  },

  upi(
    vpa: string,
    payeeName: string = "",
    amount?: number,
    transactionNote: string = ""
  ): string {
    const params = [`pa=${encodeURIComponent(vpa.trim())}`];
    if (payeeName) params.push(`pn=${encodeURIComponent(payeeName.trim())}`);
    if (amount && amount > 0) params.push(`am=${amount.toFixed(2)}`);
    params.push("cu=INR");
    if (transactionNote) params.push(`tn=${encodeURIComponent(transactionNote.trim())}`);
    return `upi://pay?${params.join("&")}`;
  },

  crypto(currency: "BTC" | "ETH" | "USDT", address: string, amount?: number): string {
    const cleanAddr = address.trim();
    if (currency === "BTC") {
      return amount && amount > 0 ? `bitcoin:${cleanAddr}?amount=${amount}` : `bitcoin:${cleanAddr}`;
    }
    if (currency === "ETH") {
      return amount && amount > 0 ? `ethereum:${cleanAddr}?value=${amount}` : `ethereum:${cleanAddr}`;
    }
    return cleanAddr;
  },

  location(lat: number, lng: number): string {
    return `https://maps.google.com/local?q=${lat},${lng}`;
  },
};
