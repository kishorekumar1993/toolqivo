/**
 * Toolqivo Spatial PDF Layout, Image & Text Extraction Engine
 * 100% Client-Side with zero server upload.
 * 
 * Extracts spatial coordinates, font metrics, line clustering,
 * multi-column reading order, typography (fonts, sizes, bold, italic, alignment, indentation),
 * table structures, and high-fidelity embedded images (ImageBitmaps, JPEG, PNG),
 * converting them into Microsoft Word Document Models with exact layout and alignment fidelity.
 */

import { getPdfJs } from "./loader";
import { DocumentModel, DocxParagraphBlock, DocxTableBlock, DocxImageBlock, DocxBlock, DocxSection, DocxTextRun, DocxParagraphBorders, DocxTableRow } from "../document/docx";

export interface PdfVectorLine {
  x: number;
  topY: number;
  width: number;
  height: number;
  color?: string;
  orientation: "h" | "v";
}

export interface PdfFilledBox {
  x: number;
  topY: number;
  width: number;
  height: number;
  bgColor: string;
}

export interface PdfTextItem {
  str: string;
  x: number;
  y: number; // PDF bottom-up coordinate
  topY: number; // Page top-down coordinate
  width: number;
  height: number;
  fontSize: number;
  fontName: string;
  fontFamily: string;
  isBold: boolean;
  isItalic: boolean;
  isUnderline?: boolean;
  color?: string; // hex e.g. "2563EB"
}

export interface PdfSpatialLine {
  y: number; // PDF coordinate
  topY: number; // Top-down coordinate
  minX: number;
  maxX: number;
  fontSize: number;
  fontFamily: string;
  isBold: boolean;
  isItalic: boolean;
  isUnderline?: boolean;
  color?: string;
  text: string;
  isHeading?: boolean;
  headingLevel?: number;
  isListItem?: boolean;
  alignment: "left" | "center" | "right" | "justify";
  leftIndent?: number;
  items: PdfTextItem[];
}

export interface ExtractedPdfContent {
  text: string;
  pageCount: number;
  method: "pdfjs" | "content-stream" | "binary-fallback";
  model?: DocumentModel;
}

/**
 * Normalizes PDF font descriptor names into standard Microsoft Word font families
 */
function normalizeFontFamily(rawName: string): string {
  if (!rawName) return "Calibri";
  let clean = rawName.replace(/^[A-Z]{6}\+/, ""); // Remove PDF subset prefix (e.g. "ABCDEF+")
  clean = clean.replace(/[-_](Bold|Italic|BoldItalic|Regular|Roman|Light|Medium|Semibold|Black|Heavy|MT|PS|W\d+|Display|Text)/gi, "");
  clean = clean.replace(/PSMT|MT|PS|Pro/gi, "");
  clean = clean.replace(/[,;].*$/, ""); // Remove fallback list e.g. "Arial, Helvetica, sans-serif" -> "Arial"
  clean = clean.replace(/([a-z])([A-Z])/g, "$1 $2"); // e.g. "TimesNewRoman" -> "Times New Roman"
  clean = clean.trim();

  if (/times|roman|georgia|garamond|cambria|serif|baskerville|palatino|bookman/i.test(clean)) {
    if (/georgia/i.test(clean)) return "Georgia";
    if (/cambria/i.test(clean)) return "Cambria";
    if (/garamond/i.test(clean)) return "Garamond";
    if (/palatino/i.test(clean)) return "Palatino Linotype";
    if (/bookman/i.test(clean)) return "Bookman Old Style";
    return "Times New Roman";
  }
  if (/arial|helvetica|liberation\s*sans|nimbus\s*sans|arimo|freesans/i.test(clean)) return "Arial";
  if (/calibri|carlito|aptos/i.test(clean)) return "Calibri";
  if (/courier|mono|consolas|menlo|monaco|lucida\s*console|source\s*code/i.test(clean)) {
    if (/consolas/i.test(clean)) return "Consolas";
    return "Courier New";
  }
  if (/verdana|dejavu\s*sans/i.test(clean)) return "Verdana";
  if (/trebuchet/i.test(clean)) return "Trebuchet MS";
  if (/segoe/i.test(clean)) return "Segoe UI";
  if (/roboto/i.test(clean)) return "Roboto";
  if (/open\s*sans/i.test(clean)) return "Open Sans";
  if (/lato/i.test(clean)) return "Lato";
  if (/montserrat/i.test(clean)) return "Montserrat";
  if (/poppins/i.test(clean)) return "Poppins";
  if (/tahoma/i.test(clean)) return "Tahoma";
  if (/century\s*gothic/i.test(clean)) return "Century Gothic";
  if (/franklin\s*gothic/i.test(clean)) return "Franklin Gothic Medium";
  if (/sans-serif|sans/i.test(clean)) return "Arial";

  return clean || "Calibri";
}

/**
 * Decodes standard PDF literal string escapes: \n, \r, \t, \b, \f, \(, \), \\, and \ddd octal
 */
function decodePdfLiteralString(str: string): string {
  return str
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\b/g, "\b")
    .replace(/\\f/g, "\f")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\\\r?\n/g, "");
}

/**
 * Decodes PDF hexadecimal string: <48656C6C6F> or UTF-16BE <FEFF...>
 */
function decodePdfHexString(hex: string): string {
  const clean = hex.replace(/[^0-9a-fA-F]/g, "");
  if (!clean) return "";
  const padded = clean.length % 2 !== 0 ? clean + "0" : clean;
  const bytes = new Uint8Array(padded.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(padded.substr(i * 2, 2), 16);
  }

  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    let result = "";
    for (let i = 2; i < bytes.length - 1; i += 2) {
      result += String.fromCharCode((bytes[i] << 8) | bytes[i + 1]);
    }
    return result;
  }

  return new TextDecoder("latin1").decode(bytes);
}

function parseJpegDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  let offset = 2;
  while (offset < bytes.length - 8) {
    if (bytes[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = bytes[offset + 1];
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      const height = (bytes[offset + 5] << 8) | bytes[offset + 6];
      const width = (bytes[offset + 7] << 8) | bytes[offset + 8];
      if (width > 0 && height > 0) {
        return { width, height };
      }
    }
    const len = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (len <= 0) break;
    offset += 2 + len;
  }
  return null;
}

/**
 * Extract native JPEG images from raw PDF byte stream with authentic dimensions (Strict Fallback only)
 */
function extractImagesFromPdfBytes(buffer: ArrayBuffer): DocxImageBlock[] {
  const images: DocxImageBlock[] = [];
  const bytes = new Uint8Array(buffer);

  let pos = 0;
  while (pos < bytes.length - 10) {
    if (bytes[pos] === 0xff && bytes[pos + 1] === 0xd8) {
      const start = pos;
      pos += 2;
      let foundEnd = false;
      while (pos < bytes.length - 1) {
        if (bytes[pos] === 0xff && bytes[pos + 1] === 0xd9) {
          const end = pos + 2;
          const imgLen = end - start;
          if (imgLen > 4096 && imgLen < 20 * 1024 * 1024) {
            const imgData = bytes.slice(start, end);
            const dim = parseJpegDimensions(imgData);
            const maxW = 460;
            let w = dim ? dim.width : 380;
            let h = dim ? dim.height : 240;

            if (w > maxW) {
              const scale = maxW / w;
              w = maxW;
              h = Math.round(h * scale);
            }

            images.push({
              type: "image",
              data: imgData,
              mimeType: "image/jpeg",
              width: w,
              height: h,
              position: "inline",
              altText: `Extracted Graphic ${images.length + 1}`,
            });
          }
          foundEnd = true;
          pos = end;
          break;
        }
        pos++;
      }
      if (!foundEnd) pos++;
    } else {
      pos++;
    }
  }

  return images;
}

/**
 * Extract text strings from a decompressed PDF content stream operator block (Fallback)
 */
function extractTextFromContentStream(streamText: string): string {
  const textBlocks: string[] = [];
  const btMatches = streamText.match(/BT[\s\S]*?ET/g);
  if (!btMatches) return "";

  for (const block of btMatches) {
    const lines: string[] = [];
    let currentLine = "";

    const tokenRegex = /\((?:[^()\\]|\\.)*\)\s*(?:Tj|'|")|<[0-9a-fA-F\s]+>\s*(?:Tj|'|")|\[(?:[^[\]()]|\((?:[^()\\]|\\.)*\)|<[0-9a-fA-F\s]+>)*\]\s*TJ|T\*|(?:\d+(?:\.\d+)?\s+){2}T[dD]/g;

    let match: RegExpExecArray | null;
    while ((match = tokenRegex.exec(block)) !== null) {
      const op = match[0].trim();

      if (op === "T*" || /T[dD]$/.test(op)) {
        if (currentLine.trim()) lines.push(currentLine.trim());
        currentLine = "";
        continue;
      }

      if (op.endsWith("TJ")) {
        const arrayContent = op.slice(1, op.lastIndexOf("]"));
        const itemRegex = /\((?:[^()\\]|\\.)*\)|<[0-9a-fA-F\s]+>|(-?\d+(?:\.\d+)?)/g;
        let itemMatch: RegExpExecArray | null;
        while ((itemMatch = itemRegex.exec(arrayContent)) !== null) {
          const item = itemMatch[0];
          if (item.startsWith("(") && item.endsWith(")")) {
            const raw = item.slice(1, -1);
            currentLine += decodePdfLiteralString(raw);
          } else if (item.startsWith("<") && item.endsWith(">")) {
            const raw = item.slice(1, -1);
            currentLine += decodePdfHexString(raw);
          } else {
            const offset = parseFloat(item);
            if (offset < -120) {
              currentLine += " ";
            }
          }
        }
      } else if (op.startsWith("(") && (op.endsWith("Tj") || op.endsWith("'") || op.endsWith('"'))) {
        const lastParen = op.lastIndexOf(")");
        const raw = op.slice(1, lastParen);
        currentLine += decodePdfLiteralString(raw) + " ";
      } else if (op.startsWith("<") && (op.endsWith("Tj") || op.endsWith("'") || op.endsWith('"'))) {
        const lastAngle = op.lastIndexOf(">");
        const raw = op.slice(1, lastAngle);
        currentLine += decodePdfHexString(raw) + " ";
      }
    }

    if (currentLine.trim()) lines.push(currentLine.trim());
    if (lines.length > 0) {
      textBlocks.push(lines.join(" "));
    }
  }

  return textBlocks.join("\n\n");
}

/**
 * Decompresses a raw deflate or zlib stream buffer
 */
async function decompressFlate(data: Uint8Array): Promise<string> {
  if (typeof DecompressionStream !== "undefined") {
    try {
      const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      return await new Response(stream).text();
    } catch {
      try {
        const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate"));
        return await new Response(stream).text();
      } catch { }
    }
  }
  return new TextDecoder("latin1").decode(data);
}

/**
 * Native client-side PDF stream scanner and content parser (Secondary Fallback)
 */
async function extractTextViaStreams(buffer: ArrayBuffer): Promise<{ text: string; pageCount: number }> {
  const bytes = new Uint8Array(buffer);
  const latinText = new TextDecoder("latin1").decode(bytes);

  const pageMatches = latinText.match(/\/Type\s*\/Page[^s]/g);
  const pageCount = pageMatches ? Math.max(1, pageMatches.length) : 1;

  const pageTexts: string[] = [];
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(latinText)) !== null) {
    const streamStart = match.index + match[0].indexOf("\n") + 1;
    const streamLen = match[1].length;
    const rawStreamBytes = bytes.subarray(streamStart, streamStart + streamLen);

    try {
      const dictSub = latinText.substring(Math.max(0, match.index - 300), match.index);
      const isFlate = dictSub.includes("/FlateDecode") || dictSub.includes("/Fl");

      let decodedStr = "";
      if (isFlate) {
        decodedStr = await decompressFlate(rawStreamBytes);
      } else {
        decodedStr = match[1];
      }

      if (decodedStr && decodedStr.includes("BT")) {
        const extracted = extractTextFromContentStream(decodedStr);
        if (extracted.trim()) {
          pageTexts.push(extracted.trim());
        }
      }
    } catch (streamErr) {
      console.warn("PDF stream parse error:", streamErr);
    }
  }

  if (pageTexts.length > 0) {
    return { text: pageTexts.join("\n\n"), pageCount };
  }

  const asciiMatches = latinText.match(/[\x20-\x7E\xA0-\xFF\n\r]{6,}/g) || [];
  const filtered = asciiMatches
    .filter((s) => !s.startsWith("/") && !s.includes("endobj") && !s.includes("xref") && !s.includes("stream"))
    .join("\n")
    .replace(/\s+/g, " ")
    .trim();

  return { text: filtered, pageCount };
}

/**
 * Cluster raw PDF.js text items into spatial lines with column-aware reading order and alignment
 */
function clusterTextItemsIntoLines(
  items: any[],
  styles: Record<string, any> = {},
  spatialColors: { x: number; topY: number; color: string }[] = [],
  vectorLines: PdfVectorLine[] = [],
  viewportWidth: number = 595,
  viewportHeight: number = 842
): { lines: PdfSpatialLine[]; pageMinX: number } {
  if (!items || items.length === 0) return { lines: [], pageMinX: 54 };

  const rawItems: PdfTextItem[] = [];

  for (let idx = 0; idx < items.length; idx++) {
    const it = items[idx];
    if (!it || typeof it.str !== "string") continue;
    const str = it.str.replace(/\s+/g, " ");
    if (!str.trim()) continue;

    const transform = it.transform || [1, 0, 0, 1, 0, 0];
    const scaleX = Math.abs(transform[0]) || 1;
    const scaleY = Math.abs(transform[3]) || 1;
    const rawFontSize =
      Math.sqrt(scaleX * scaleX + (transform[1] || 0) * (transform[1] || 0)) ||
      Math.abs(it.height) ||
      10;
    const fontSize = Math.round(rawFontSize * 2) / 2;
    const x = transform[4] || 0;
    const y = transform[5] || 0;
    const topY = Math.max(0, viewportHeight - y);

    const styleObj = styles && typeof styles === "object" ? styles[it.fontName] : null;
    const styleFontFamily = styleObj?.fontFamily || "";
    const rawFontName = it.fontName || "";
    const combinedFont = `${styleFontFamily} ${rawFontName}`.trim();
    const fontFamily = normalizeFontFamily(combinedFont || styleFontFamily || rawFontName);

    const isBold = /bold|black|heavy|semibold|medium|700|800|900|demi/i.test(combinedFont);
    const isItalic = /italic|oblique|slanted|inclined/i.test(combinedFont);

    // Accurate 2D spatial text color matching (tight on-line tolerance)
    let color: string | undefined = undefined;
    let minDist = 30;
    for (const sc of spatialColors) {
      const dy = Math.abs(sc.topY - topY);
      if (dy <= Math.max(3.5, fontSize * 0.35)) {
        const dx = Math.abs(sc.x - x);
        if (dx <= 35) {
          const dist = Math.sqrt(dx * dx + dy * dy * 4);
          if (dist < minDist) {
            minDist = dist;
            color = sc.color;
          }
        }
      }
    }

    // Detect underline from drawn line segments in PDF or font styles
    const itemWidth = it.width || str.length * fontSize * 0.52;
    const hasDrawnUnderline = vectorLines.some((u) => {
      if (u.orientation !== "h" || u.height > 3.5) return false;
      const yDiff = Math.abs(u.topY - (topY + fontSize));
      const directYDiff = Math.abs(u.topY - topY);
      if (yDiff > 6.0 && directYDiff > 6.0) return false;
      const overlapMin = Math.max(u.x, x - 2);
      const overlapMax = Math.min(u.x + u.width, x + itemWidth + 2);
      const overlapWidth = overlapMax - overlapMin;
      return overlapWidth >= itemWidth * 0.40;
    });
    const isUnderline = hasDrawnUnderline || /underline/i.test(combinedFont);

    rawItems.push({
      str,
      x,
      y,
      topY,
      width: itemWidth,
      height: it.height || fontSize,
      fontSize,
      fontName: rawFontName,
      fontFamily,
      isBold,
      isItalic,
      isUnderline,
      color,
    });
  }

  if (rawItems.length === 0) return { lines: [], pageMinX: 54 };

  const pageMinX = Math.min(...rawItems.map((it) => it.x));

  // Multi-Column / Sidebar Detection:
  // Check if body items cleanly divide into 2 distinct columns with a clear vertical gutter
  let sortedItems: PdfTextItem[] = [];

  // Find potential vertical split gutter between 25% and 65% of viewport width
  let bestSplitX = -1;
  let minCrossingItems = Infinity;

  for (let splitCandidate = Math.round(viewportWidth * 0.25); splitCandidate <= Math.round(viewportWidth * 0.65); splitCandidate += 15) {
    let leftCount = 0;
    let rightCount = 0;
    let crossingCount = 0;

    for (const it of rawItems) {
      const itRight = it.x + it.width;
      if (itRight <= splitCandidate + 6) {
        leftCount++;
      } else if (it.x >= splitCandidate - 6) {
        rightCount++;
      } else {
        crossingCount++;
      }
    }

    if (leftCount >= 6 && rightCount >= 6 && crossingCount < minCrossingItems) {
      minCrossingItems = crossingCount;
      bestSplitX = splitCandidate;
    }
  }

  const isMultiColumnPage =
    bestSplitX > 0 &&
    minCrossingItems <= Math.max(3, rawItems.length * 0.08);

  if (isMultiColumnPage) {
    const headerItems: PdfTextItem[] = [];
    const leftColItems: PdfTextItem[] = [];
    const rightColItems: PdfTextItem[] = [];
    const footerItems: PdfTextItem[] = [];

    // Header threshold: items in top 15% of page that span wide
    for (const it of rawItems) {
      const itRight = it.x + it.width;
      const isWide = it.width >= viewportWidth * 0.45;
      const isTopZone = it.topY < viewportHeight * 0.16;

      if ((isTopZone && isWide) || (it.topY < 90 && isWide)) {
        headerItems.push(it);
      } else if (it.topY > viewportHeight * 0.90 && isWide) {
        footerItems.push(it);
      } else if (itRight <= bestSplitX + 8) {
        leftColItems.push(it);
      } else {
        rightColItems.push(it);
      }
    }

    const sortTopDown = (a: PdfTextItem, b: PdfTextItem) => {
      const dy = b.y - a.y;
      if (Math.abs(dy) > 3.0) return dy;
      return a.x - b.x;
    };

    headerItems.sort(sortTopDown);
    leftColItems.sort(sortTopDown);
    rightColItems.sort(sortTopDown);
    footerItems.sort(sortTopDown);

    sortedItems = [...headerItems, ...leftColItems, ...rightColItems, ...footerItems];
  } else {
    // Single column: standard top-to-bottom, left-to-right reading order
    rawItems.sort((a, b) => {
      const dy = b.y - a.y;
      if (Math.abs(dy) > 3.0) return dy;
      return a.x - b.x;
    });
    sortedItems = rawItems;
  }

  const lines: PdfSpatialLine[] = [];
  let currentGroup: PdfTextItem[] = [];
  let currentY: number | null = null;

  for (const item of sortedItems) {
    if (currentY === null) {
      currentY = item.y;
      currentGroup = [item];
    } else {
      const avgGroupFontSize = currentGroup.reduce((a, b) => a + b.fontSize, 0) / currentGroup.length;
      const fontSizeDiff = Math.abs(item.fontSize - avgGroupFontSize);
      const yDiff = Math.abs(item.y - currentY);

      // Relative line clustering tolerance based on font size
      const tolerance = Math.max(1.5, Math.min(5.5, avgGroupFontSize * 0.28));
      const isSameLine = yDiff <= tolerance && (fontSizeDiff <= 4.5 || yDiff <= 1.5);

      if (isSameLine) {
        currentGroup.push(item);
      } else {
        currentGroup.sort((a, b) => a.x - b.x);
        lines.push(buildSpatialLine(currentGroup, currentY, pageMinX, viewportWidth, viewportHeight));
        currentY = item.y;
        currentGroup = [item];
      }
    }
  }

  if (currentGroup.length > 0 && currentY !== null) {
    currentGroup.sort((a, b) => a.x - b.x);
    lines.push(buildSpatialLine(currentGroup, currentY, pageMinX, viewportWidth, viewportHeight));
  }

  return { lines, pageMinX };
}

function buildSpatialLine(
  items: PdfTextItem[],
  y: number,
  pageMinX: number,
  viewportWidth: number,
  viewportHeight: number
): PdfSpatialLine {
  let lineText = "";
  let lastX = -1;
  let lastWidth = 0;
  let minX = Infinity;
  let maxX = -Infinity;

  for (const item of items) {
    minX = Math.min(minX, item.x);
    maxX = Math.max(maxX, item.x + item.width);

    if (lastX >= 0) {
      const gap = item.x - (lastX + lastWidth);
      if (gap >= 1.8 && !item.str.startsWith(" ") && !lineText.endsWith(" ")) {
        lineText += " ";
      }
    }
    lineText += item.str;
    lastX = item.x;
    lastWidth = item.width;
  }

  const avgFontSize = Math.round((items.reduce((acc, it) => acc + it.fontSize, 0) / items.length) * 2) / 2 || 10;
  const isBold = items.some((it) => it.isBold);
  const isItalic = items.some((it) => it.isItalic);
  const isUnderline = items.some((it) => it.isUnderline);
  const fontFamily = items[0]?.fontFamily || "Calibri";
  const color = items.find((it) => it.color && it.color !== "000000")?.color || items[0]?.color;

  const cleanText = lineText.trim();
  const safeMinX = Number.isFinite(minX) ? minX : 0;
  const safeMaxX = Number.isFinite(maxX) ? maxX : viewportWidth;
  const centerX = (safeMinX + safeMaxX) / 2;
  const pageCenter = viewportWidth / 2;
  const lineWidth = safeMaxX - safeMinX;

  const leftMargin = Math.max(28, Math.min(54, Math.round(pageMinX)));

  // Alignment detection
  let alignment: "left" | "center" | "right" | "justify" = "left";
  let leftIndent: number | undefined = undefined;

  const isFullWidth = lineWidth >= (viewportWidth - leftMargin * 2 - 20);

  if (!isFullWidth) {
    if (Math.abs(centerX - pageCenter) <= 24 && safeMinX >= 35 && safeMaxX <= viewportWidth - 35) {
      alignment = "center";
    } else if (safeMaxX >= viewportWidth - 60 && safeMinX >= viewportWidth * 0.45) {
      alignment = "right";
    } else if (safeMinX > leftMargin + 4) {
      leftIndent = Math.round(safeMinX - leftMargin);
    }
  }

  // Heading & Subheading classification
  const isShortLine = cleanText.length < 80;
  const isAllUpper = /^[A-Z0-9\s&/,\-–—|:]{3,70}$/.test(cleanText) && !cleanText.includes("@") && !cleanText.includes(".com");
  const isMajorHeading = avgFontSize >= 16;
  const isSectionHeading = (avgFontSize >= 12.5 && isBold && isShortLine) || (isAllUpper && (isBold || avgFontSize >= 11.5) && isShortLine);
  const hasAccentColor = Boolean(color && color !== "000000" && color !== "111827" && color !== "333333");
  const isSubheading = (avgFontSize >= 10.5 && isBold && isShortLine) || (hasAccentColor && (isBold || avgFontSize >= 10.5) && isShortLine);

  const isHeading = isMajorHeading || isSectionHeading || isSubheading;
  const headingLevel = isMajorHeading ? (avgFontSize >= 20 ? 1 : 2) : isSectionHeading ? 2 : 3;

  // List detection (bullet or numbered)
  const isListItem =
    /^[•*–—\u2022\u25cf\u25cb\u25aa\u25a0\uF0B7\uF0A7]/i.test(cleanText) ||
    /^\d+[\.\)]\s+/i.test(cleanText) ||
    /^\[[ x]\]/i.test(cleanText) ||
    (items.length > 0 && /^[•*–—\u2022\u25cf\u25cb\u25aa\u25a0\uF0B7\uF0A7]/.test((items[0]?.str || "").trim()));

  return {
    y,
    topY: Math.max(0, viewportHeight - y),
    minX: safeMinX,
    maxX: safeMaxX,
    fontSize: avgFontSize,
    fontFamily,
    isBold,
    isItalic,
    isUnderline,
    color,
    text: cleanText,
    isHeading,
    headingLevel: isHeading ? headingLevel : undefined,
    isListItem,
    alignment,
    leftIndent,
    items,
  };
}

/**
 * Visual layout item for spatial interleaving of paragraphs and images
 */
interface PageVisualElement {
  topY: number;
  block: DocxBlock;
}

/**
 * Analyzes whether a line contains distinct left and right columns (e.g. key-value or multi-column data)
 */
function analyzeLineColumns(line: PdfSpatialLine): {
  isMultiCol: boolean;
  leftItems: PdfTextItem[];
  rightItems: PdfTextItem[];
  splitX: number;
} {
  const items = line.items || [];
  if (items.length < 2) {
    return { isMultiCol: false, leftItems: items, rightItems: [], splitX: 0 };
  }

  for (let i = 0; i < items.length - 1; i++) {
    const itA = items[i];
    const itB = items[i + 1];
    const gap = itB.x - (itA.x + itA.width);
    if (gap >= 18.0 && itA.x < 240 && itB.x >= 120) {
      const leftItems = items.slice(0, i + 1);
      const rightItems = items.slice(i + 1);
      return {
        isMultiCol: true,
        leftItems,
        rightItems,
        splitX: itB.x,
      };
    }
  }

  return { isMultiCol: false, leftItems: items, rightItems: [], splitX: 0 };
}

function buildRunsAndTabsFromItems(
  items: PdfTextItem[],
  defaultColor?: string
): { runs: DocxTextRun[]; tabs: { val: "left" | "center" | "right"; pos: number }[] } {
  const runs: DocxTextRun[] = [];
  const tabs: { val: "left" | "center" | "right"; pos: number }[] = [];
  if (!items || items.length === 0) return { runs, tabs };

  const firstStr = (items[0]?.str || "").trim();
  const isStandaloneBullet = /^[•*–—\u2022\u25cf\u25cb\u25aa\u25a0\uF0B7\uF0A7]$/.test(firstStr);
  const startsWithBullet = /^[•*–—\u2022\u25cf\u25cb\u25aa\u25a0\uF0B7\uF0A7]\s+/.test(items[0]?.str || "");

  let startIdx = 0;

  if (isStandaloneBullet) {
    const it = items[0];
    const rawColor = it.color && it.color !== "000000" ? it.color : defaultColor;
    const cleanColor = rawColor ? rawColor.replace("#", "").toUpperCase() : undefined;
    runs.push({
      text: "•",
      bold: it.isBold,
      italic: it.isItalic,
      fontSize: it.fontSize,
      fontFamily: it.fontFamily,
      color: cleanColor,
    });
    runs.push({ text: "\t", tab: true });
    startIdx = 1;
  } else if (startsWithBullet) {
    const it = items[0];
    const rawColor = it.color && it.color !== "000000" ? it.color : defaultColor;
    const cleanColor = rawColor ? rawColor.replace("#", "").toUpperCase() : undefined;
    runs.push({
      text: "•",
      bold: it.isBold,
      italic: it.isItalic,
      fontSize: it.fontSize,
      fontFamily: it.fontFamily,
      color: cleanColor,
    });
    runs.push({ text: "\t", tab: true });
    const remainder = it.str.replace(/^[•*–—\u2022\u25cf\u25cb\u25aa\u25a0\uF0B7\uF0A7]\s*/, "");
    if (remainder) {
      runs.push({
        text: remainder,
        bold: it.isBold,
        italic: it.isItalic,
        underline: it.isUnderline,
        fontSize: it.fontSize,
        fontFamily: it.fontFamily,
        color: cleanColor,
      });
    }
    startIdx = 1;
  }

  let lastX = -1;
  let lastW = 0;

  for (let i = startIdx; i < items.length; i++) {
    const it = items[i];
    let str = it.str;
    if (startIdx === 1 && i === 1 && isStandaloneBullet) {
      str = str.replace(/^\s+/, "");
    }
    if (lastX >= 0) {
      const gap = it.x - (lastX + lastW);
      if (gap >= 18.0 && it.x > 70) {
        runs.push({ text: "\t", tab: true });
        tabs.push({ val: "left", pos: it.x });
      } else if (gap >= 1.5 && !str.startsWith(" ") && (runs.length === 0 || !runs[runs.length - 1].text.endsWith(" "))) {
        str = " " + str;
      }
    }
    lastX = it.x;
    lastW = it.width;

    const rawColor = it.color && it.color !== "000000" ? it.color : defaultColor;
    const cleanColor = rawColor ? rawColor.replace("#", "").toUpperCase() : undefined;

    runs.push({
      text: str,
      bold: it.isBold,
      italic: it.isItalic,
      underline: it.isUnderline,
      fontSize: it.fontSize,
      fontFamily: it.fontFamily,
      color: cleanColor,
    });
  }

  return { runs, tabs };
}

function buildRunsFromItems(items: PdfTextItem[], defaultColor?: string): DocxTextRun[] {
  return buildRunsAndTabsFromItems(items, defaultColor).runs;
}

/**
 * Coordinate-Preserving Hybrid Layout Reconstruction Engine:
 * Converts multi-row key-value / skills sections (>=2 rows) into borderless Word layout tables,
 * and emits physical lines as distinct positioned blocks with exact indents, natural line spacing, borders, shading, tabs, and fonts.
 */
function reconstructPageBlocks(
  lines: PdfSpatialLine[],
  images: { image: DocxImageBlock; topY: number }[],
  pageMinX: number = 54,
  viewportWidth: number = 595.28,
  vectorLines: PdfVectorLine[] = [],
  filledBoxes: PdfFilledBox[] = []
): DocxBlock[] {
  const elements: PageVisualElement[] = [];
  const leftMargin = Math.max(28, Math.min(54, Math.round(pageMinX)));
  const availableWidth = viewportWidth - leftMargin * 2;

  let lineIdx = 0;
  let prevBlockTopY: number | null = null;
  let prevBlockFontSize: number = 10;
  const usedVectorLineIndices = new Set<number>();

  while (lineIdx < lines.length) {
    const line = lines[lineIdx];
    const items = line.items || [];
    if (items.length === 0 && !line.text) {
      lineIdx++;
      continue;
    }

    // Check if line and subsequent lines form a multi-row 2-column key-value or skills section (require >= 2 rows)
    const colInfo = analyzeLineColumns(line);
    if (colInfo.isMultiCol && !line.isHeading) {
      const tableRows: DocxTableRow[] = [];
      const tableTopY = line.topY;
      const splitX = colInfo.splitX;
      const leftColWidth = Math.max(60, Math.min(220, Math.round(splitX - leftMargin)));
      const rightColWidth = Math.max(100, Math.round(availableWidth - leftColWidth));

      let scanIdx = lineIdx;
      while (scanIdx < lines.length) {
        const curLine = lines[scanIdx];
        if (curLine.isHeading) break;

        const curColInfo = analyzeLineColumns(curLine);
        if (curColInfo.isMultiCol && Math.abs(curColInfo.splitX - splitX) <= 35) {
          const lRuns = buildRunsFromItems(curColInfo.leftItems, curLine.color);
          const rRuns = buildRunsFromItems(curColInfo.rightItems, curLine.color);
          tableRows.push({
            cells: [
              {
                width: leftColWidth,
                blocks: [{ type: "paragraph", runs: lRuns.length > 0 ? lRuns : [{ text: "" }], alignment: "left" }],
              },
              {
                width: rightColWidth,
                blocks: [{ type: "paragraph", runs: rRuns.length > 0 ? rRuns : [{ text: "" }], alignment: "left" }],
              },
            ],
          });
          scanIdx++;
        } else if (curLine.minX >= splitX - 25 && curLine.maxX > splitX + 30 && tableRows.length > 0) {
          const rRuns = buildRunsFromItems(curLine.items, curLine.color);
          tableRows.push({
            cells: [
              {
                width: leftColWidth,
                blocks: [{ type: "paragraph", runs: [{ text: "" }], alignment: "left" }],
              },
              {
                width: rightColWidth,
                blocks: [{ type: "paragraph", runs: rRuns.length > 0 ? rRuns : [{ text: curLine.text }], alignment: "left" }],
              },
            ],
          });
          scanIdx++;
        } else {
          break;
        }
      }

      // Only create table if 2 or more rows matched the column grid. Otherwise, process as single line with tabs.
      if (tableRows.length >= 2) {
        elements.push({
          topY: tableTopY,
          block: {
            type: "table",
            borderStyle: "none",
            colWidths: [leftColWidth, rightColWidth],
            rows: tableRows,
          },
        });
        prevBlockTopY = tableTopY;
        lineIdx = scanIdx;
        continue;
      }
    }

    // Normal paragraph line
    const { runs, tabs } = buildRunsAndTabsFromItems(items, line.color);

    let nextScanIdx = lineIdx + 1;

    // Merge wrapped continuation lines into a single unified paragraph
    if (line.isListItem) {
      while (nextScanIdx < lines.length) {
        const nextL = lines[nextScanIdx];
        if (nextL.isHeading || nextL.isListItem) break;
        const colTest = analyzeLineColumns(nextL);
        if (colTest.isMultiCol) break;

        const prevLine = lines[nextScanIdx - 1];
        const step = nextL.topY - prevLine.topY;
        const normalStep = (prevLine.fontSize || 10) * 1.65;
        if (step <= normalStep && Math.abs(nextL.fontSize - line.fontSize) <= 1.5) {
          const nextRuns = buildRunsFromItems(nextL.items, nextL.color);
          if (nextRuns.length > 0) {
            const lastRun = runs[runs.length - 1];
            if (lastRun && !lastRun.text.endsWith(" ") && !nextRuns[0].text.startsWith(" ")) {
              runs.push({ text: " " });
            }
            runs.push(...nextRuns);
          }
          nextScanIdx++;
        } else {
          break;
        }
      }
    } else if (!line.isHeading) {
      while (nextScanIdx < lines.length) {
        const nextL = lines[nextScanIdx];
        if (nextL.isHeading || nextL.isListItem) break;
        const colTest = analyzeLineColumns(nextL);
        if (colTest.isMultiCol) break;

        const prevLine = lines[nextScanIdx - 1];
        const step = nextL.topY - prevLine.topY;
        const normalStep = (prevLine.fontSize || 10) * 1.65;
        const indentDiff = Math.abs((nextL.minX || 0) - (line.minX || 0));
        if (step <= normalStep && indentDiff <= 28 && Math.abs(nextL.fontSize - line.fontSize) <= 1.5) {
          const nextRuns = buildRunsFromItems(nextL.items, nextL.color);
          if (nextRuns.length > 0) {
            const lastRun = runs[runs.length - 1];
            if (lastRun && !lastRun.text.endsWith(" ") && !nextRuns[0].text.startsWith(" ")) {
              runs.push({ text: " " });
            }
            runs.push(...nextRuns);
          }
          nextScanIdx++;
        } else {
          break;
        }
      }
    }

    let spacingBefore = 0;
    if (prevBlockTopY !== null) {
      const baselineStep = line.topY - prevBlockTopY;
      const normalStep = prevBlockFontSize * 1.30;
      if (baselineStep > normalStep * 1.55) {
        const extraGap = baselineStep - normalStep;
        spacingBefore = Math.min(14, Math.max(2, Math.round(extraGap * 0.70)));
      }
    }

    if (line.isHeading) {
      spacingBefore = Math.max(spacingBefore, line.headingLevel === 1 ? 8 : 4);
    }

    const spacingAfter = line.isHeading ? 1 : (line.isListItem ? 2 : 0);

    // Detect bottom border divider line (specifically for headings with a section line underneath)
    let bottomBorder: DocxParagraphBorders["bottom"] | undefined = undefined;
    if (line.isHeading || line.headingLevel) {
      for (let vIdx = 0; vIdx < vectorLines.length; vIdx++) {
        const vLine = vectorLines[vIdx];
        if (vLine.orientation !== "h" || vLine.width < 28) continue;

        const lineBottom = line.topY + line.fontSize;
        const isNearBottom = vLine.topY >= line.topY - 1 && vLine.topY <= lineBottom + 10;
        const hOverlap = Math.min(line.maxX, vLine.x + vLine.width) - Math.max(line.minX, vLine.x);
        const isHorizAligned = hOverlap >= Math.min(20, (line.maxX - line.minX) * 0.4) || (vLine.width >= viewportWidth * 0.35);

        if (isNearBottom && isHorizAligned) {
          bottomBorder = {
            val: "single",
            sz: Math.max(4, Math.min(16, Math.round(vLine.height * 6))),
            color: vLine.color && vLine.color !== "000000" ? vLine.color.replace("#", "").toUpperCase() : "CBD5E1",
          };
          usedVectorLineIndices.add(vIdx);
          break;
        }
      }
    }

    // Detect light background tint shading box (e.g. highlighted callout or soft banner)
    let bgColor: string | undefined = undefined;
    for (const box of filledBoxes) {
      if (box.width < 16 || box.height < 8) continue;
      const isContained =
        line.minX >= box.x - 8 &&
        line.maxX <= box.x + box.width + 8 &&
        line.topY >= box.topY - 4 &&
        line.topY <= box.topY + box.height + 4;

      if (isContained && box.bgColor) {
        const clean = box.bgColor.replace("#", "").toUpperCase();
        if (clean !== "000000" && clean !== "0" && clean !== "FFFFFF") {
          const r = parseInt(clean.substring(0, 2), 16) || 0;
          const g = parseInt(clean.substring(2, 4), 16) || 0;
          const b = parseInt(clean.substring(4, 6), 16) || 0;
          const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
          if (lum >= 0.78) {
            bgColor = clean;
            break;
          }
        }
      }
    }

    const paragraphBorders: DocxParagraphBorders | undefined =
      bottomBorder ? { bottom: bottomBorder } : undefined;

    const fallbackColor = line.color && line.color !== "000000" ? line.color.replace("#", "").toUpperCase() : undefined;

    const calcLeftIndent = line.isListItem
      ? (line.minX >= leftMargin + 18 ? 32 : 18)
      : (line.alignment === "left" && line.leftIndent !== undefined && line.leftIndent > 3 ? line.leftIndent : undefined);
    const calcHangingIndent = line.isListItem ? 14 : undefined;

    elements.push({
      topY: line.topY,
      block: {
        type: "paragraph",
        runs:
          runs.length > 0
            ? runs
            : [
              {
                text: line.text,
                bold: line.isBold,
                italic: line.isItalic,
                underline: line.isUnderline,
                fontSize: line.fontSize,
                fontFamily: line.fontFamily,
                color: fallbackColor,
              },
            ],
        alignment: line.alignment,
        leftIndent: calcLeftIndent,
        hangingIndent: calcHangingIndent,
        tabs: tabs.length > 0 ? tabs : undefined,
        isHeading: line.isHeading,
        headingLevel: line.headingLevel,
        isListItem: line.isListItem,
        spacingBefore,
        spacingAfter,
        borders: paragraphBorders,
        bgColor,
      },
    });

    prevBlockTopY = lines[nextScanIdx - 1].topY;
    prevBlockFontSize = lines[nextScanIdx - 1].fontSize || 10;
    lineIdx = nextScanIdx;
  }

  // Add extracted images with their topY positions
  for (const img of images) {
    elements.push({
      topY: img.topY,
      block: img.image,
    });
  }

  // Sort all elements in visual reading order from top of page to bottom of page
  elements.sort((a, b) => a.topY - b.topY);

  return elements.map((e) => e.block);
}

function parseColorToHex(args: any[]): string | undefined {
  if (!args || args.length === 0) return undefined;
  let r = 0, g = 0, b = 0;

  const arr = Array.isArray(args[0]) ? args[0] : args;

  if (arr.length >= 3 && typeof arr[0] === "number" && typeof arr[1] === "number" && typeof arr[2] === "number") {
    const isFloat = (arr[0] <= 1.0 && arr[1] <= 1.0 && arr[2] <= 1.0) && (arr[0] > 0 || arr[1] > 0 || arr[2] > 0);
    r = isFloat ? Math.round(arr[0] * 255) : Math.round(arr[0]);
    g = isFloat ? Math.round(arr[1] * 255) : Math.round(arr[1]);
    b = isFloat ? Math.round(arr[2] * 255) : Math.round(arr[2]);
  } else if (arr.length === 1 && typeof arr[0] === "number") {
    const isFloat = arr[0] <= 1.0 && arr[0] > 0;
    const val = isFloat ? Math.round(arr[0] * 255) : Math.round(arr[0]);
    r = g = b = val;
  } else if (arr.length === 4 && typeof arr[0] === "number") {
    const c = arr[0] <= 1.0 ? arr[0] : arr[0] / 100;
    const m = arr[1] <= 1.0 ? arr[1] : arr[1] / 100;
    const y = arr[2] <= 1.0 ? arr[2] : arr[2] / 100;
    const k = arr[3] <= 1.0 ? arr[3] : arr[3] / 100;
    r = Math.round(255 * (1 - c) * (1 - k));
    g = Math.round(255 * (1 - m) * (1 - k));
    b = Math.round(255 * (1 - y) * (1 - k));
  } else {
    return undefined;
  }

  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));

  return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

/**
 * Universal Image, Underline, Vector Line, Shading & Spatial Text Color Extractor from PDF.js Operator List
 */
async function extractImagesAndColorsFromPdfJsPage(
  page: any,
  viewport: any,
  pdfjs: any
): Promise<{
  images: { image: DocxImageBlock; topY: number }[];
  spatialColors: { x: number; topY: number; color: string }[];
  vectorLines: PdfVectorLine[];
  filledBoxes: PdfFilledBox[];
}> {
  const images: { image: DocxImageBlock; topY: number }[] = [];
  const spatialColors: { x: number; topY: number; color: string }[] = [];
  const vectorLines: PdfVectorLine[] = [];
  const filledBoxes: PdfFilledBox[] = [];
  const seenImageKeys = new Set<string>();
  const seenLineKeys = new Set<string>();
  const seenBoxKeys = new Set<string>();

  try {
    const opList = await page.getOperatorList();
    if (!opList?.fnArray || !opList?.argsArray) {
      return { images, spatialColors, vectorLines, filledBoxes };
    }

    const fnArray = opList.fnArray;
    const argsArray = opList.argsArray;

    let currentTransform = [1, 0, 0, 1, 0, 0];
    const transformStack: number[][] = [];
    let currentFillColor: string | undefined = undefined;
    let currentStrokeColor: string | undefined = undefined;

    const multiplyMatrices = (m1: number[], m2: number[]): number[] => {
      const [a1, b1, c1, d1, e1, f1] = m1;
      const [a2, b2, c2, d2, e2, f2] = m2;

      return [
        a1 * a2 + c1 * b2,
        b1 * a2 + d1 * b2,
        a1 * c2 + c1 * d2,
        b1 * c2 + d1 * d2,
        a1 * e2 + c1 * f2 + e1,
        b1 * e2 + d1 * f2 + f1,
      ];
    };

    const transformPoint = (m: number[], px: number, py: number): [number, number] => {
      return [
        m[0] * px + m[2] * py + m[4],
        m[1] * px + m[3] * py + m[5],
      ];
    };

    const addVectorLine = (x: number, topY: number, width: number, height: number, color: string | undefined, orientation: "h" | "v") => {
      const key = `${orientation}_${Math.round(x / 3)}_${Math.round(topY / 3)}_${Math.round(width / 3)}_${Math.round(height / 3)}`;
      if (seenLineKeys.has(key)) return;
      seenLineKeys.add(key);
      vectorLines.push({ x, topY, width, height, color, orientation });
    };

    const addFilledBox = (x: number, topY: number, width: number, height: number, bgColor: string) => {
      if (!bgColor) return;
      const cleanHex = bgColor.replace("#", "").toUpperCase().trim();
      // Ignore pure black, pure white, 0-length or invalid hex codes
      if (cleanHex === "000000" || cleanHex === "0" || cleanHex === "FFFFFF" || cleanHex === "FFF" || cleanHex.length !== 6) return;

      const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
      const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
      const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      // Exclude dark clipping/mask frames and dark boxes (require light pastel tint lum >= 0.78)
      if (lum < 0.78) return;

      // Ignore whole-page canvas background covers (>= 95% of page dimensions)
      const isFullPageCover = width >= viewport.width * 0.95 && height >= viewport.height * 0.95;
      if (isFullPageCover) return;

      const key = `${Math.round(x / 4)}_${Math.round(topY / 4)}_${Math.round(width / 4)}_${Math.round(height / 4)}_${cleanHex}`;
      if (seenBoxKeys.has(key)) return;
      seenBoxKeys.add(key);
      filledBoxes.push({ x, topY, width, height, bgColor: cleanHex });
    };

    const PAINT_IMAGE_XOBJECT = pdfjs?.OPS?.paintImageXObject ?? 85;
    const PAINT_INLINE_IMAGE = pdfjs?.OPS?.paintInlineImageXObject ?? 82;
    const SET_FILL_RGB = pdfjs?.OPS?.setFillRGBColor ?? 8;
    const SET_FILL_COLOR = pdfjs?.OPS?.setFillColor ?? 19;
    const SET_FILL_COLOR_N = pdfjs?.OPS?.setFillColorN ?? 21;
    const SET_FILL_GRAY = pdfjs?.OPS?.setFillGray ?? 5;
    const SET_FILL_CMYK = pdfjs?.OPS?.setFillCMYKColor ?? 10;
    const SET_STROKE_RGB = pdfjs?.OPS?.setStrokeRGBColor ?? 7;
    const SET_STROKE_COLOR = pdfjs?.OPS?.setStrokeColor ?? 18;
    const SET_STROKE_COLOR_N = pdfjs?.OPS?.setStrokeColorN ?? 20;
    const SET_STROKE_GRAY = pdfjs?.OPS?.setStrokeGray ?? 4;
    const SET_STROKE_CMYK = pdfjs?.OPS?.setStrokeCMYKColor ?? 9;
    const SET_TEXT_MATRIX = pdfjs?.OPS?.setTextMatrix ?? 27;
    const MOVE_TEXT = pdfjs?.OPS?.moveText ?? 28;
    const NEXT_LINE = pdfjs?.OPS?.nextLine ?? 30;
    const SHOW_TEXT = pdfjs?.OPS?.showText ?? 33;
    const SHOW_SPACED_TEXT = pdfjs?.OPS?.showSpacedText ?? 34;
    const CONSTRUCT_PATH = pdfjs?.OPS?.constructPath ?? 91;
    const RECTANGLE_OP = pdfjs?.OPS?.rectangle ?? 19;

    let currentTextMatrix = [1, 0, 0, 1, 0, 0];

    for (let i = 0; i < fnArray.length; i++) {
      const fn = fnArray[i];
      const args = argsArray[i];

      // save
      if (fn === (pdfjs?.OPS?.save ?? 11)) {
        transformStack.push([...currentTransform]);
        continue;
      }

      // restore
      if (fn === (pdfjs?.OPS?.restore ?? 12)) {
        if (transformStack.length > 0) {
          currentTransform = transformStack.pop()!;
        }
        continue;
      }

      // transform
      if (fn === (pdfjs?.OPS?.transform ?? 13) && args?.length >= 6) {
        currentTransform = multiplyMatrices(currentTransform, args);
        continue;
      }

      // Text Matrix tracking
      if (fn === SET_TEXT_MATRIX && args?.length >= 6) {
        currentTextMatrix = [...args];
        continue;
      }

      if (fn === MOVE_TEXT && args?.length >= 2) {
        currentTextMatrix = multiplyMatrices(currentTextMatrix, [1, 0, 0, 1, args[0] || 0, args[1] || 0]);
        continue;
      }

      if (fn === NEXT_LINE) {
        currentTextMatrix = multiplyMatrices(currentTextMatrix, [1, 0, 0, 1, 0, -12]);
        continue;
      }

      // Color tracking
      if (fn === SET_FILL_RGB || fn === SET_FILL_COLOR || fn === SET_FILL_COLOR_N || fn === SET_FILL_GRAY || fn === SET_FILL_CMYK) {
        const hex = parseColorToHex(args);
        if (hex) currentFillColor = hex;
        continue;
      }

      if (fn === SET_STROKE_RGB || fn === SET_STROKE_COLOR || fn === SET_STROKE_COLOR_N || fn === SET_STROKE_GRAY || fn === SET_STROKE_CMYK) {
        const hex = parseColorToHex(args);
        if (hex) currentStrokeColor = hex;
        continue;
      }

      // 2D Spatial Text color tracking
      if (fn === SHOW_TEXT || fn === SHOW_SPACED_TEXT) {
        const col = currentFillColor || currentStrokeColor;
        if (col && col !== "000000") {
          const combinedMatrix = multiplyMatrices(currentTransform, currentTextMatrix);
          const [tx, ty] = transformPoint(combinedMatrix, 0, 0);
          spatialColors.push({
            x: tx,
            topY: Math.max(0, viewport.height - ty),
            color: col,
          });
        }
        continue;
      }

      // Path / Line / Box tracking from constructPath
      if (fn === CONSTRUCT_PATH && args && args.length >= 2) {
        const [subOps, subArgs] = args;
        if (Array.isArray(subOps) && Array.isArray(subArgs)) {
          let argPtr = 0;
          let lastMove: [number, number] | null = null;

          for (let j = 0; j < subOps.length; j++) {
            const subOp = subOps[j];
            if (subOp === (pdfjs?.OPS?.moveTo ?? 13) && argPtr + 2 <= subArgs.length) {
              lastMove = [subArgs[argPtr], subArgs[argPtr + 1]];
              argPtr += 2;
            } else if (subOp === (pdfjs?.OPS?.lineTo ?? 14) && argPtr + 2 <= subArgs.length) {
              const curPt: [number, number] = [subArgs[argPtr], subArgs[argPtr + 1]];
              argPtr += 2;
              if (lastMove) {
                const [tx1, ty1] = transformPoint(currentTransform, lastMove[0], lastMove[1]);
                const [tx2, ty2] = transformPoint(currentTransform, curPt[0], curPt[1]);
                const lineWidth = Math.abs(tx2 - tx1);
                const lineHeight = Math.abs(ty2 - ty1);
                const minX = Math.min(tx1, tx2);
                const topY = Math.max(0, viewport.height - Math.max(ty1, ty2));

                if (lineHeight <= 4.0 && lineWidth >= 6.0) {
                  addVectorLine(minX, topY, lineWidth, Math.max(1, lineHeight), currentStrokeColor || currentFillColor || "CBD5E1", "h");
                } else if (lineWidth <= 6.0 && lineHeight >= 8.0) {
                  addVectorLine(minX, topY, Math.max(1, lineWidth), lineHeight, currentStrokeColor || currentFillColor || "2563EB", "v");
                }
              }
              lastMove = curPt;
            } else if (subOp === (pdfjs?.OPS?.rectangle ?? 19) && argPtr + 4 <= subArgs.length) {
              const rx = subArgs[argPtr];
              const ry = subArgs[argPtr + 1];
              const rw = subArgs[argPtr + 2];
              const rh = subArgs[argPtr + 3];
              argPtr += 4;

              const [tx1, ty1] = transformPoint(currentTransform, rx, ry);
              const [tx2, ty2] = transformPoint(currentTransform, rx + rw, ry + rh);
              const minX = Math.min(tx1, tx2);
              const maxX = Math.max(tx1, tx2);
              const minY = Math.min(ty1, ty2);
              const maxY = Math.max(ty1, ty2);
              const w = maxX - minX;
              const h = maxY - minY;
              const topY = Math.max(0, viewport.height - maxY);

              if (h <= 4.0 && w >= 6.0) {
                addVectorLine(minX, topY, w, Math.max(1, h), currentFillColor || currentStrokeColor || "CBD5E1", "h");
              } else if (w <= 6.0 && h >= 8.0) {
                addVectorLine(minX, topY, Math.max(1, w), h, currentFillColor || currentStrokeColor || "2563EB", "v");
              } else if (w >= 16.0 && h >= 8.0 && currentFillColor && currentFillColor !== "FFFFFF" && currentFillColor !== "FFF") {
                addFilledBox(minX, topY, w, h, currentFillColor);
              }
            } else if (subOp === (pdfjs?.OPS?.bezierCurveTo ?? 15) || subOp === (pdfjs?.OPS?.curveTo ?? 16)) {
              argPtr += 6;
            }
          }
        }
        continue;
      }

      // Standalone Rectangle operator
      if (fn === RECTANGLE_OP && args && args.length >= 4) {
        const rx = args[0];
        const ry = args[1];
        const rw = args[2];
        const rh = args[3];
        const [tx1, ty1] = transformPoint(currentTransform, rx, ry);
        const [tx2, ty2] = transformPoint(currentTransform, rx + rw, ry + rh);
        const minX = Math.min(tx1, tx2);
        const maxX = Math.max(tx1, tx2);
        const minY = Math.min(ty1, ty2);
        const maxY = Math.max(ty1, ty2);
        const w = maxX - minX;
        const h = maxY - minY;
        const topY = Math.max(0, viewport.height - maxY);

        if (h <= 4.0 && w >= 6.0) {
          addVectorLine(minX, topY, w, Math.max(1, h), currentFillColor || currentStrokeColor || "CBD5E1", "h");
        } else if (w <= 6.0 && h >= 8.0) {
          addVectorLine(minX, topY, Math.max(1, w), h, currentFillColor || currentStrokeColor || "2563EB", "v");
        } else if (w >= 16.0 && h >= 8.0 && currentFillColor && currentFillColor !== "FFFFFF" && currentFillColor !== "FFF") {
          addFilledBox(minX, topY, w, h, currentFillColor);
        }
        continue;
      }

      if (fn !== PAINT_IMAGE_XOBJECT && fn !== PAINT_INLINE_IMAGE) {
        continue;
      }

      const imgArg = args && args.length > 0 ? args[0] : null;
      if (!imgArg) continue;

      try {
        let imgData: any = null;

        // Inline image: passed directly as an object
        if (typeof imgArg === "object" && imgArg !== null) {
          imgData = imgArg;
        } else if (typeof imgArg === "string") {
          const imgName = imgArg;
          imgData = await new Promise<any>((resolve) => {
            let resolved = false;
            const timer = setTimeout(() => {
              if (!resolved) {
                resolved = true;
                resolve(null);
              }
            }, 2000);

            const done = (obj: any) => {
              if (resolved) return;
              resolved = true;
              clearTimeout(timer);
              resolve(obj);
            };

            try {
              if (page.objs && typeof page.objs.has === "function" && page.objs.has(imgName)) {
                page.objs.get(imgName, done);
              } else if (page.commonObjs && typeof page.commonObjs.has === "function" && page.commonObjs.has(imgName)) {
                page.commonObjs.get(imgName, done);
              } else if (page.objs && typeof page.objs.get === "function") {
                page.objs.get(imgName, done);
              } else if (page.commonObjs && typeof page.commonObjs.get === "function") {
                page.commonObjs.get(imgName, done);
              } else {
                clearTimeout(timer);
                resolve(null);
              }
            } catch {
              clearTimeout(timer);
              resolve(null);
            }
          });

          if (!imgData && page.commonObjs && typeof page.commonObjs.get === "function") {
            imgData = await new Promise<any>((resolve) => {
              const timer = setTimeout(() => resolve(null), 1000);
              try {
                page.commonObjs.get(imgName, (obj: any) => {
                  clearTimeout(timer);
                  resolve(obj);
                });
              } catch {
                clearTimeout(timer);
                resolve(null);
              }
            });
          }
        }

        if (!imgData || typeof document === "undefined") {
          continue;
        }

        const width = imgData.width || (imgData.bitmap && imgData.bitmap.width) || (imgData.image && imgData.image.width) || 100;
        const height = imgData.height || (imgData.bitmap && imgData.bitmap.height) || (imgData.image && imgData.image.height) || 100;

        if (width < 16 || height < 16) {
          continue;
        }

        // Calculate spatial metrics via 4 transformed corners
        const a = currentTransform[0] || 1;
        const b = currentTransform[1] || 0;
        const c = currentTransform[2] || 0;
        const d = currentTransform[3] || 1;
        const e = currentTransform[4] || 0;
        const f = currentTransform[5] || 0;

        // 4 corners of unit image square in PDF space: (0,0), (1,0), (0,1), (1,1)
        const c0x = e;
        const c0y = f;
        const c1x = a + e;
        const c1y = b + f;
        const c2x = c + e;
        const c2y = d + f;
        const c3x = a + c + e;
        const c3y = b + d + f;

        const minPdfX = Math.min(c0x, c1x, c2x, c3x);
        const maxPdfX = Math.max(c0x, c1x, c2x, c3x);
        const minPdfY = Math.min(c0y, c1y, c2y, c3y);
        const maxPdfY = Math.max(c0y, c1y, c2y, c3y);

        let ptWidth = maxPdfX - minPdfX;
        let ptHeight = maxPdfY - minPdfY;

        if (!Number.isFinite(ptWidth) || ptWidth < 10) ptWidth = Math.min(width, 360);
        if (!Number.isFinite(ptHeight) || ptHeight < 10) ptHeight = Math.min(height, 280);

        const aspect = ptWidth / Math.max(1, ptHeight);
        if (aspect > 35 || aspect < 0.02) {
          continue;
        }

        const ptX = Math.max(0, minPdfX);
        const topY = Math.max(0, viewport.height - maxPdfY);

        ptWidth = Math.max(10, Math.min(ptWidth, viewport.width));
        ptHeight = Math.max(10, Math.min(ptHeight, viewport.height));

        const dedupKey = `${typeof imgArg === "string" ? imgArg : "inline"}_${Math.round(ptX / 8)}_${Math.round(topY / 8)}_${Math.round(ptWidth / 8)}_${Math.round(ptHeight / 8)}`;
        if (seenImageKeys.has(dedupKey)) {
          continue;
        }
        seenImageKeys.add(dedupKey);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;

        let hasDrawn = false;

        if (typeof ImageBitmap !== "undefined" && imgData instanceof ImageBitmap) {
          ctx.drawImage(imgData, 0, 0, width, height);
          hasDrawn = true;
        } else if (imgData.bitmap && typeof ImageBitmap !== "undefined" && imgData.bitmap instanceof ImageBitmap) {
          ctx.drawImage(imgData.bitmap, 0, 0, width, height);
          hasDrawn = true;
        } else if (
          typeof HTMLImageElement !== "undefined" &&
          (imgData instanceof HTMLImageElement || (imgData.image && imgData.image instanceof HTMLImageElement))
        ) {
          ctx.drawImage(imgData.image || imgData, 0, 0, width, height);
          hasDrawn = true;
        } else if (typeof HTMLCanvasElement !== "undefined" && imgData instanceof HTMLCanvasElement) {
          ctx.drawImage(imgData, 0, 0, width, height);
          hasDrawn = true;
        } else if (imgData.data) {
          const rawBuf = imgData.data;
          const totalPixels = width * height;
          let outputImageData: ImageData | null = null;

          if (rawBuf.length === totalPixels * 4) {
            outputImageData = new ImageData(new Uint8ClampedArray(rawBuf.buffer || rawBuf), width, height);
          } else if (rawBuf.length === totalPixels * 3) {
            const rgba = new Uint8ClampedArray(totalPixels * 4);
            for (let p = 0, q = 0; p < rawBuf.length; p += 3, q += 4) {
              rgba[q] = rawBuf[p];
              rgba[q + 1] = rawBuf[p + 1];
              rgba[q + 2] = rawBuf[p + 2];
              rgba[q + 3] = 255;
            }
            outputImageData = new ImageData(rgba, width, height);
          } else if (rawBuf.length === totalPixels) {
            const rgba = new Uint8ClampedArray(totalPixels * 4);
            for (let p = 0, q = 0; p < rawBuf.length; p++, q += 4) {
              const value = rawBuf[p];
              rgba[q] = value;
              rgba[q + 1] = value;
              rgba[q + 2] = value;
              rgba[q + 3] = 255;
            }
            outputImageData = new ImageData(rgba, width, height);
          } else if (rawBuf.length > 0) {
            const rgba = new Uint8ClampedArray(totalPixels * 4);
            const step = rawBuf.length / totalPixels;
            for (let p = 0; p < totalPixels; p++) {
              const srcIdx = Math.floor(p * step);
              const val = rawBuf[srcIdx] || 0;
              rgba[p * 4] = val;
              rgba[p * 4 + 1] = val;
              rgba[p * 4 + 2] = val;
              rgba[p * 4 + 3] = 255;
            }
            outputImageData = new ImageData(rgba, width, height);
          }

          if (outputImageData) {
            ctx.putImageData(outputImageData, 0, 0);
            hasDrawn = true;
          }
        }

        if (!hasDrawn) continue;

        const dataUrl = canvas.toDataURL("image/png");
        const base64 = dataUrl.split(",")[1];
        if (!base64) continue;

        const binary = atob(base64);
        const pngBytes = new Uint8Array(binary.length);
        for (let b = 0; b < binary.length; b++) {
          pngBytes[b] = binary.charCodeAt(b);
        }

        images.push({
          topY,
          image: {
            type: "image",
            data: pngBytes,
            mimeType: "image/png",
            width: ptWidth,
            height: ptHeight,
            x: ptX,
            y: topY,
            position: "absolute",
            altText: "Document Graphic / Illustration",
          },
        });
      } catch (imageError) {
        console.warn("PDF image extraction warning:", imageError);
      }
    }
  } catch (error) {
    console.warn("extractImagesAndColorsFromPdfJsPage warning:", error);
  }

  return { images, spatialColors, vectorLines, filledBoxes };
}

/**
 * Universal PDF Text, Image & Spatial Layout Extractor
 */
export async function extractRealPdfContent(buffer: ArrayBuffer): Promise<ExtractedPdfContent> {
  // 1. Primary Engine: PDF.js with spatial line clustering, typography preservation & universal image extraction
  try {
    const pdfjs = await getPdfJs();
    if (pdfjs) {
      const cloned = new Uint8Array(buffer.slice(0));
      const loadingTask = pdfjs.getDocument({ data: cloned });
      const pdfDoc = await loadingTask.promise;
      const numPages = pdfDoc.numPages;
      const pageSections: DocxSection[] = [];
      const pageFormattedTexts: string[] = [];

      for (let p = 1; p <= numPages; p++) {
        const page = await pdfDoc.getPage(p);
        const viewport = page.getViewport({ scale: 1.0 });
        const textContent = await page.getTextContent();

        // Extract genuine high-res images, spatial colors, vector lines & filled boxes from PDF.js operator stream
        const pageAssets = await extractImagesAndColorsFromPdfJsPage(page, viewport, pdfjs);

        const { lines: pageLines, pageMinX } = clusterTextItemsIntoLines(
          textContent.items,
          textContent.styles || {},
          pageAssets.spatialColors || [],
          pageAssets.vectorLines || [],
          viewport.width,
          viewport.height
        );

        // Reconstruct unified blocks in exact top-to-bottom reading order with typography, borders, backgrounds & colors
        const finalPageBlocks = reconstructPageBlocks(
          pageLines,
          pageAssets.images,
          pageMinX,
          viewport.width,
          pageAssets.vectorLines || [],
          pageAssets.filledBoxes || []
        );

        // If page has virtually no text or images (scanned flyer or certificate), take high-res canvas snapshot
        const totalTextChars = pageLines.reduce((acc, l) => acc + l.text.length, 0);
        const isScannedOrGraphicPage =
          (finalPageBlocks.length === 0 || (pageLines.length <= 2 && totalTextChars < 50 && pageAssets.images.length === 0)) &&
          typeof document !== "undefined";

        if (isScannedOrGraphicPage) {
          try {
            const canvas = document.createElement("canvas");
            const scale = 2.0; // High resolution 2x render
            const scaledViewport = page.getViewport({ scale });
            canvas.width = scaledViewport.width;
            canvas.height = scaledViewport.height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
              const dataUrl = canvas.toDataURL("image/png");
              const base64 = dataUrl.split(",")[1];
              const binStr = atob(base64);
              const pngBytes = new Uint8Array(binStr.length);
              for (let i = 0; i < binStr.length; i++) pngBytes[i] = binStr.charCodeAt(i);

              const fullW = viewport.width || 595.28;
              const fullH = viewport.height || 841.89;

              finalPageBlocks.push({
                type: "image",
                data: pngBytes,
                mimeType: "image/png",
                width: fullW - 72,
                height: ((fullW - 72) / fullW) * fullH,
                position: "inline",
                altText: `Page ${p} High-Resolution Layout`,
              });
            }
          } catch (cErr) {
            console.warn("Canvas page snapshot warning:", cErr);
          }
        }

        const isLandscape = viewport.width > viewport.height;

        // Calculate independent 4-sided page margins from spatial item bounding boxes
        let minX = Infinity;
        let maxX = -Infinity;
        let minTopY = Infinity;
        let maxTopY = -Infinity;

        for (const item of textContent.items || []) {
          if (!item || typeof item.str !== "string" || !item.str.trim()) continue;
          const tr = item.transform || [1, 0, 0, 1, 0, 0];
          const ix = tr[4] || 0;
          const iy = tr[5] || 0;
          const itTopY = Math.max(0, viewport.height - iy);
          const iw = item.width || 10;
          const ih = Math.abs(item.height) || 10;

          minX = Math.min(minX, ix);
          maxX = Math.max(maxX, ix + iw);
          minTopY = Math.min(minTopY, itTopY);
          maxTopY = Math.max(maxTopY, itTopY + ih);
        }

        const leftMargin = Number.isFinite(minX) && minX >= 28 ? Math.max(36, Math.min(54, Math.round(minX))) : 54;
        const rightMargin = Number.isFinite(maxX) && (viewport.width - maxX) >= 28 ? Math.max(36, Math.min(54, Math.round(viewport.width - maxX))) : 54;
        const topMargin = Number.isFinite(minTopY) && minTopY >= 28 ? Math.max(36, Math.min(54, Math.round(minTopY))) : 54;
        const bottomMargin = Number.isFinite(maxTopY) && (viewport.height - maxTopY) >= 28 ? Math.max(36, Math.min(54, Math.round(viewport.height - maxTopY))) : 54;

        pageSections.push({
          pageSize: { width: viewport.width || 595.28, height: viewport.height || 841.89 },
          margins: { top: topMargin, right: rightMargin, bottom: bottomMargin, left: leftMargin },
          orientation: isLandscape ? "landscape" : "portrait",
          blocks: finalPageBlocks,
        });

        const pageStr = pageLines
          .map((l) => {
            if (l.isHeading) return `### ${l.text}`;
            if (l.isListItem) return `* ${l.text}`;
            return l.text;
          })
          .join("\n");

        if (pageStr.trim()) pageFormattedTexts.push(pageStr.trim());
      }

      const model: DocumentModel = {
        sections: pageSections,
      };

      return {
        text: pageFormattedTexts.join("\n\n"),
        pageCount: numPages,
        method: "pdfjs",
        model,
      };
    }
  } catch (pdfjsErr) {
    console.warn("PDF.js primary extraction failed, using native stream decoder:", pdfjsErr);
  }

  // 2. Secondary Engine: Native PDF Content Stream Decoder (Fallback)
  try {
    const streamResult = await extractTextViaStreams(buffer);
    const extractedFallbackImages = extractImagesFromPdfBytes(buffer);

    if (streamResult.text && streamResult.text.trim().length > 0) {
      const lines = streamResult.text.split(/\r?\n/).filter(Boolean);
      const blocks: DocxBlock[] = lines.map((l) => ({
        type: "paragraph" as const,
        runs: [{ text: l, fontFamily: "Calibri", fontSize: 11 }],
      }));
      if (extractedFallbackImages.length > 0) {
        blocks.push(...extractedFallbackImages);
      }

      const model: DocumentModel = {
        sections: [
          {
            pageSize: { width: 595.28, height: 841.89 },
            margins: { top: 54, right: 54, bottom: 54, left: 54 },
            blocks,
          },
        ],
      };

      return {
        text: streamResult.text,
        pageCount: streamResult.pageCount,
        method: "content-stream",
        model,
      };
    }
  } catch (streamErr) {
    console.warn("Native stream extraction error:", streamErr);
  }

  // 3. Last Resort Fallback
  return {
    text: "",
    pageCount: 1,
    method: "binary-fallback",
  };
}
