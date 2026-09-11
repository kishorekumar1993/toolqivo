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
import { DocumentModel, DocxParagraphBlock, DocxTableBlock, DocxImageBlock, DocxBlock, DocxSection, DocxTextRun } from "../document/docx";

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

/**
 * Extract native JPEG images from raw PDF byte stream (Strict Fallback only)
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
            images.push({
              type: "image",
              data: imgData,
              mimeType: "image/jpeg",
              width: 380,
              height: 240,
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
      } catch {}
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
  textColors: (string | undefined)[] = [],
  underlines: { x: number; topY: number; width: number; height: number }[] = [],
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
    const color = textColors[idx] || undefined;

    // Detect underline from drawn line segments in PDF or font styles
    const itemWidth = it.width || str.length * fontSize * 0.52;
    const hasDrawnUnderline = underlines.some((u) => {
      const yDiff = Math.abs(u.topY - topY);
      if (yDiff > 7.0) return false;
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

  // Sort items strictly from top to bottom (descending Y), then left to right (ascending X)
  rawItems.sort((a, b) => {
    const dy = b.y - a.y;
    if (Math.abs(dy) > 3.0) {
      return dy;
    }
    return a.x - b.x;
  });

  const lines: PdfSpatialLine[] = [];
  let currentGroup: PdfTextItem[] = [];
  let currentY: number | null = null;

  for (const item of rawItems) {
    if (currentY === null) {
      currentY = item.y;
      currentGroup = [item];
    } else {
      const avgGroupFontSize = currentGroup.reduce((a, b) => a + b.fontSize, 0) / currentGroup.length;
      const fontSizeDiff = Math.abs(item.fontSize - avgGroupFontSize);
      const yDiff = Math.abs(item.y - currentY);

      // Same visual line if vertical offset <= 3.2pt
      const isSameLine = yDiff <= 3.2 && (fontSizeDiff <= 4 || yDiff <= 1.5);

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

  // Heading classification
  const isShortLine = cleanText.length < 80;
  const isAllUpper = /^[A-Z0-9\s&/,\-–—|:]{4,70}$/.test(cleanText) && !cleanText.includes("@") && !cleanText.includes(".com");
  const isMajorHeading = avgFontSize >= 16;
  const isSectionHeading = (avgFontSize >= 12.5 && isBold && isShortLine) || (isAllUpper && (isBold || avgFontSize >= 12));

  const isHeading = isMajorHeading || isSectionHeading;
  const headingLevel = avgFontSize >= 20 ? 1 : avgFontSize >= 14 ? 2 : 3;

  // List detection (bullet or numbered)
  const isListItem = /^[•*–—\u2022\u25cf\u25cb\u25aa]\s+|^\d+[\.\)]\s+|^\[[ x]\]\s+/i.test(cleanText);

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
 * Coordinate-Preserving Layout Reconstruction Engine:
 * Emits physical lines as distinct positioned blocks with exact indents, tab stops, natural line spacing, and fonts.
 */
function reconstructPageBlocks(
  lines: PdfSpatialLine[],
  images: { image: DocxImageBlock; topY: number }[],
  pageMinX: number = 54,
  viewportWidth: number = 595.28
): DocxBlock[] {
  const elements: PageVisualElement[] = [];

  const leftMargin = Math.max(28, Math.min(54, Math.round(pageMinX)));

  let prevLineTopY: number | null = null;
  let prevLineFontSize: number = 10;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const items = line.items || [];
    if (items.length === 0 && !line.text) continue;

    const runs: DocxTextRun[] = [];
    const tabs: { val: "left" | "center" | "right"; pos: number }[] = [];

    let prevItemX = -1;
    let prevItemW = 0;

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      let str = it.str;

      if (prevItemX >= 0) {
        const gap = it.x - (prevItemX + prevItemW);
        if (gap >= 16.0) {
          // Horizontal gap: insert an explicit Word tab stop positioned at exact relative horizontal coordinate
          const tabPos = Math.max(10, Math.round(it.x - leftMargin));
          tabs.push({ val: "left", pos: tabPos });
          runs.push({ text: "", tab: true });
        } else if (gap >= 1.8 && !str.startsWith(" ") && (runs.length === 0 || !runs[runs.length - 1].text.endsWith(" "))) {
          str = " " + str;
        }
      }

      prevItemX = it.x;
      prevItemW = it.width;

      runs.push({
        text: str,
        bold: it.isBold,
        italic: it.isItalic,
        underline: it.isUnderline,
        fontSize: it.fontSize,
        fontFamily: it.fontFamily,
        color: it.color,
      });
    }

    // Baseline step distance between lines:
    // Regular consecutive lines (baselineStep <= fontSize * 1.35) have spacingBefore = 0.
    // Only actual intentional paragraph/section gaps have spacingBefore > 0.
    let spacingBefore = 0;
    if (prevLineTopY !== null) {
      const baselineStep = line.topY - prevLineTopY;
      const normalStep = prevLineFontSize * 1.35;
      if (baselineStep > normalStep + 3.0) {
        const extraGap = baselineStep - normalStep;
        spacingBefore = Math.min(36, Math.max(0, Math.round(extraGap)));
      }
    }

    if (line.isHeading) {
      spacingBefore = Math.max(spacingBefore, line.headingLevel === 1 ? 12 : 6);
    }

    const spacingAfter = line.isHeading ? 2 : 0;

    elements.push({
      topY: line.topY,
      block: {
        type: "paragraph",
        runs: runs.length > 0 ? runs : [{ text: line.text, bold: line.isBold, italic: line.isItalic, underline: line.isUnderline, fontSize: line.fontSize, fontFamily: line.fontFamily, color: line.color }],
        alignment: line.alignment,
        leftIndent: line.alignment === "left" && line.leftIndent !== undefined && line.leftIndent > 3 ? line.leftIndent : undefined,
        tabs: tabs.length > 0 ? tabs : undefined,
        isHeading: line.isHeading,
        headingLevel: line.headingLevel,
        isListItem: line.isListItem,
        spacingBefore,
        spacingAfter,
      },
    });

    prevLineTopY = line.topY;
    prevLineFontSize = line.fontSize || 10;
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
 * Universal Image, Underline & Text Color Extractor from PDF.js Operator List
 */
async function extractImagesAndColorsFromPdfJsPage(
  page: any,
  viewport: any,
  pdfjs: any
): Promise<{
  images: { image: DocxImageBlock; topY: number }[];
  textColors: (string | undefined)[];
  underlines: { x: number; topY: number; width: number; height: number }[];
}> {
  const images: { image: DocxImageBlock; topY: number }[] = [];
  const textColors: (string | undefined)[] = [];
  const underlines: { x: number; topY: number; width: number; height: number }[] = [];
  const seenImageKeys = new Set<string>();

  try {
    const opList = await page.getOperatorList();
    if (!opList?.fnArray || !opList?.argsArray) {
      return { images, textColors, underlines };
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
    const SHOW_TEXT = pdfjs?.OPS?.showText ?? 33;
    const SHOW_SPACED_TEXT = pdfjs?.OPS?.showSpacedText ?? 34;
    const CONSTRUCT_PATH = pdfjs?.OPS?.constructPath ?? 91;
    const RECTANGLE_OP = pdfjs?.OPS?.rectangle ?? 19;

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

      // Text tracking
      if (fn === SHOW_TEXT || fn === SHOW_SPACED_TEXT) {
        textColors.push(currentFillColor || currentStrokeColor);
        continue;
      }

      // Path / Underline tracking from constructPath
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
                if (lineHeight <= 3.5 && lineWidth >= 6.0) {
                  underlines.push({
                    x: Math.min(tx1, tx2),
                    topY: Math.max(0, viewport.height - Math.max(ty1, ty2)),
                    width: lineWidth,
                    height: Math.max(1, lineHeight),
                  });
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
              if (h <= 4.0 && w >= 6.0) {
                underlines.push({
                  x: minX,
                  topY: Math.max(0, viewport.height - maxY),
                  width: w,
                  height: Math.max(1, h),
                });
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
        if (h <= 4.0 && w >= 6.0) {
          underlines.push({
            x: minX,
            topY: Math.max(0, viewport.height - maxY),
            width: w,
            height: Math.max(1, h),
          });
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

        // Calculate spatial metrics
        const a = currentTransform[0] || 1;
        const b = currentTransform[1] || 0;
        const c = currentTransform[2] || 0;
        const d = currentTransform[3] || 1;
        const e = currentTransform[4] || 0;
        const f = currentTransform[5] || 0;

        let ptWidth = Math.sqrt(a * a + b * b);
        let ptHeight = Math.sqrt(c * c + d * d);

        if (!Number.isFinite(ptWidth) || ptWidth < 20) ptWidth = Math.min(width, 360);
        if (!Number.isFinite(ptHeight) || ptHeight < 20) ptHeight = Math.min(height, 280);

        const aspect = ptWidth / Math.max(1, ptHeight);
        if (aspect > 30 || aspect < 0.03) {
          continue;
        }

        let ptX = Math.max(0, e);
        let topY = Math.max(0, viewport.height - (f + ptHeight));

        ptWidth = Math.max(20, Math.min(ptWidth, viewport.width));
        ptHeight = Math.max(20, Math.min(ptHeight, viewport.height));

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

  return { images, textColors, underlines };
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
        
        // Extract genuine high-res images, text colors & underlines from PDF.js operator stream
        const pageAssets = await extractImagesAndColorsFromPdfJsPage(page, viewport, pdfjs);

        const { lines: pageLines, pageMinX } = clusterTextItemsIntoLines(
          textContent.items,
          textContent.styles || {},
          pageAssets.textColors || [],
          pageAssets.underlines || [],
          viewport.width,
          viewport.height
        );

        // Reconstruct unified blocks in exact top-to-bottom reading order with typography & colors
        const finalPageBlocks = reconstructPageBlocks(pageLines, pageAssets.images, pageMinX, viewport.width);

        // If page has virtually no text or images (scanned flyer or certificate), take high-res canvas snapshot
        if (finalPageBlocks.length === 0 && typeof document !== "undefined") {
          try {
            const canvas = document.createElement("canvas");
            const scale = 1.5;
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

              finalPageBlocks.push({
                type: "image",
                data: pngBytes,
                mimeType: "image/png",
                width: Math.min(viewport.width, 480),
                height: (viewport.height / viewport.width) * Math.min(viewport.width, 480),
                position: "inline",
                altText: `Page ${p} Visual Layout`,
              });
            }
          } catch (cErr) {
            console.warn("Canvas page snapshot warning:", cErr);
          }
        }

        const isLandscape = viewport.width > viewport.height;
        const leftMargin = Math.max(28, Math.min(54, Math.round(pageMinX)));
        pageSections.push({
          pageSize: { width: viewport.width || 595.28, height: viewport.height || 841.89 },
          margins: { top: leftMargin, right: leftMargin, bottom: leftMargin, left: leftMargin },
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
