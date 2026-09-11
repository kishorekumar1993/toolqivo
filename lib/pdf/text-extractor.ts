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
  clean = clean.replace(/[-_](Bold|Italic|BoldItalic|Regular|Roman|Light|Medium|Semibold|Black|MT|PS)/gi, "");
  clean = clean.replace(/PSMT|MT|PS/gi, "");
  clean = clean.trim();

  if (/times|roman|georgia|garamond|cambria/i.test(clean)) return "Times New Roman";
  if (/arial|helvetica|calibri|aptos/i.test(clean)) return "Arial";
  if (/courier|mono|consolas|menlo/i.test(clean)) return "Courier New";
  if (/verdana/i.test(clean)) return "Verdana";
  if (/trebuchet/i.test(clean)) return "Trebuchet MS";
  if (/segoe/i.test(clean)) return "Segoe UI";
  if (/roboto/i.test(clean)) return "Roboto";
  if (/open\s*sans/i.test(clean)) return "Open Sans";
  if (/lato/i.test(clean)) return "Lato";

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
  viewportWidth: number = 595,
  viewportHeight: number = 842
): PdfSpatialLine[] {
  if (!items || items.length === 0) return [];

  const rawItems: PdfTextItem[] = [];

  for (const it of items) {
    if (!it || typeof it.str !== "string") continue;
    const str = it.str.replace(/\s+/g, " ");
    if (!str.trim()) continue;

    const transform = it.transform || [1, 0, 0, 1, 0, 0];
    const scaleX = Math.abs(transform[0]) || 1;
    const scaleY = Math.abs(transform[3]) || 1;
    const fontSize =
      Math.round(Math.sqrt(scaleX * scaleX + (transform[1] || 0) * (transform[1] || 0))) ||
      Math.round(it.height) ||
      10;
    const x = transform[4] || 0;
    const y = transform[5] || 0;
    const topY = Math.max(0, viewportHeight - y);
    const fontName = it.fontName || "";
    const fontFamily = normalizeFontFamily(fontName);
    const isBold = /bold|black|heavy|semibold|medium|700|800|900/i.test(fontName);
    const isItalic = /italic|oblique/i.test(fontName);

    rawItems.push({
      str,
      x,
      y,
      topY,
      width: it.width || str.length * fontSize * 0.52,
      height: it.height || fontSize,
      fontSize,
      fontName,
      fontFamily,
      isBold,
      isItalic,
    });
  }

  if (rawItems.length === 0) return [];

  // Detect column regions (e.g. 2-column layout with left & right columns)
  const leftSideItems = rawItems.filter((it) => it.x < viewportWidth * 0.46);
  const rightSideItems = rawItems.filter((it) => it.x >= viewportWidth * 0.54);
  const spansMiddleItems = rawItems.filter((it) => it.x >= viewportWidth * 0.40 && it.x < viewportWidth * 0.60);

  const isMultiColumn =
    leftSideItems.length >= 10 &&
    rightSideItems.length >= 10 &&
    spansMiddleItems.length < Math.min(leftSideItems.length, rightSideItems.length) * 0.2;

  // Sorting function: if multi-column, sort column by column; otherwise sort top-to-bottom
  rawItems.sort((a, b) => {
    if (isMultiColumn) {
      const aCol = a.x < viewportWidth * 0.5 ? 0 : 1;
      const bCol = b.x < viewportWidth * 0.5 ? 0 : 1;
      if (aCol !== bCol) return aCol - bCol;
    }
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
        lines.push(buildSpatialLine(currentGroup, currentY, viewportWidth, viewportHeight));
        currentY = item.y;
        currentGroup = [item];
      }
    }
  }

  if (currentGroup.length > 0 && currentY !== null) {
    currentGroup.sort((a, b) => a.x - b.x);
    lines.push(buildSpatialLine(currentGroup, currentY, viewportWidth, viewportHeight));
  }

  return lines;
}

function buildSpatialLine(
  items: PdfTextItem[],
  y: number,
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
      if (gap > 2.0) {
        lineText += gap > 20 ? "   " : " ";
      }
    }
    lineText += item.str;
    lastX = item.x;
    lastWidth = item.width;
  }

  const avgFontSize = Math.round(items.reduce((acc, it) => acc + it.fontSize, 0) / items.length) || 10;
  const isBold = items.some((it) => it.isBold);
  const isItalic = items.some((it) => it.isItalic);
  const fontFamily = items[0]?.fontFamily || "Calibri";

  const cleanText = lineText.trim();
  const safeMinX = Number.isFinite(minX) ? minX : 0;
  const safeMaxX = Number.isFinite(maxX) ? maxX : viewportWidth;
  const centerX = (safeMinX + safeMaxX) / 2;
  const pageCenter = viewportWidth / 2;
  const lineWidth = safeMaxX - safeMinX;

  // Alignment detection
  let alignment: "left" | "center" | "right" | "justify" = "left";
  let leftIndent: number | undefined = undefined;

  const isFullWidth = lineWidth >= (viewportWidth - 130);

  if (!isFullWidth) {
    if (Math.abs(centerX - pageCenter) <= 28 && safeMinX >= 45 && safeMaxX <= viewportWidth - 45) {
      alignment = "center";
    } else if (safeMaxX >= viewportWidth - 75 && safeMinX >= pageCenter - 30) {
      alignment = "right";
    } else if (safeMinX > 68) {
      leftIndent = Math.round(safeMinX - 54);
    }
  } else if (items.length >= 4) {
    alignment = "justify";
  }

  // Heading classification
  const isShortLine = cleanText.length < 80;
  const isAllUpper = /^[A-Z0-9\s&/,\-–—|:]{4,70}$/.test(cleanText) && !cleanText.includes("@") && !cleanText.includes(".com");
  const isMajorHeading = avgFontSize >= 16;
  const isSectionHeading = (avgFontSize >= 13 && isBold && isShortLine) || (isAllUpper && (isBold || avgFontSize >= 12));

  const isHeading = isMajorHeading || isSectionHeading;
  const headingLevel = avgFontSize >= 20 ? 1 : avgFontSize >= 15 ? 2 : 3;

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
 * Check if a group of lines forms an aligned multi-column table grid
 */
function isTrueTableGrid(lines: PdfSpatialLine[]): boolean {
  if (lines.length < 2) return false;

  const rowColumns = lines.map((line) => {
    const cols: number[] = [];
    let lastX = -1;
    let lastW = 0;
    for (const it of line.items) {
      if (lastX < 0 || it.x - (lastX + lastW) > 20) {
        cols.push(Math.round(it.x / 15) * 15);
      }
      lastX = it.x;
      lastW = it.width;
    }
    return cols;
  });

  const colCount = rowColumns[0]?.length || 0;
  if (colCount < 2) return false;

  const allSameCount = rowColumns.every((cols) => cols.length === colCount);
  if (!allSameCount) return false;

  const firstRow = rowColumns[0];
  const alignedRows = rowColumns.filter((cols) =>
    cols.every((c, idx) => Math.abs(c - firstRow[idx]) <= 18)
  );

  return alignedRows.length >= Math.min(2, lines.length);
}

/**
 * Visual layout item for spatial interleaving of paragraphs, tables, and images
 */
interface PageVisualElement {
  topY: number;
  block: DocxBlock;
}

/**
 * Reconstruct cohesive paragraphs, headings, lists, tables, and images from spatial lines
 */
function reconstructPageBlocks(
  lines: PdfSpatialLine[],
  images: { image: DocxImageBlock; topY: number }[]
): DocxBlock[] {
  const elements: PageVisualElement[] = [];

  let lineIdx = 0;
  while (lineIdx < lines.length) {
    const line = lines[lineIdx];

    // Check if table candidate
    let columnGaps = 0;
    for (let i = 1; i < line.items.length; i++) {
      if (line.items[i].x - (line.items[i - 1].x + line.items[i - 1].width) > 20) {
        columnGaps++;
      }
    }

    if (columnGaps >= 1 && line.items.length >= 2 && !line.isHeading && !line.isListItem) {
      const tableLines: PdfSpatialLine[] = [line];
      let lookAhead = lineIdx + 1;
      while (lookAhead < lines.length) {
        const nextL = lines[lookAhead];
        let nextGaps = 0;
        for (let i = 1; i < nextL.items.length; i++) {
          if (nextL.items[i].x - (nextL.items[i - 1].x + nextL.items[i - 1].width) > 20) {
            nextGaps++;
          }
        }
        if (nextGaps >= 1 && nextL.items.length >= 2 && !nextL.isHeading && !nextL.isListItem) {
          tableLines.push(nextL);
          lookAhead++;
        } else {
          break;
        }
      }

      if (tableLines.length >= 2 && isTrueTableGrid(tableLines)) {
        const rows = tableLines.map((tl, rIdx) => {
          const cellItems: { text: string; bold: boolean; italic: boolean; fontSize: number; fontFamily: string }[] = [];
          let currentCell = "";
          let prevX = -1;
          let prevW = 0;
          let cellBold = rIdx === 0;
          let cellItalic = false;
          let cellFontSize = tl.fontSize;
          let cellFontFamily = tl.fontFamily;

          for (const it of tl.items) {
            if (prevX >= 0 && it.x - (prevX + prevW) > 18) {
              if (currentCell.trim()) {
                cellItems.push({
                  text: currentCell.trim(),
                  bold: cellBold,
                  italic: cellItalic,
                  fontSize: cellFontSize,
                  fontFamily: cellFontFamily,
                });
              }
              currentCell = "";
            }
            currentCell += (currentCell ? " " : "") + it.str;
            cellBold = it.isBold || rIdx === 0;
            cellItalic = it.isItalic;
            cellFontSize = it.fontSize;
            cellFontFamily = it.fontFamily;
            prevX = it.x;
            prevW = it.width;
          }
          if (currentCell.trim()) {
            cellItems.push({
              text: currentCell.trim(),
              bold: cellBold,
              italic: cellItalic,
              fontSize: cellFontSize,
              fontFamily: cellFontFamily,
            });
          }

          return {
            isHeader: rIdx === 0,
            cells: (cellItems.length > 0 ? cellItems : [{ text: tl.text, bold: rIdx === 0, italic: false, fontSize: tl.fontSize, fontFamily: tl.fontFamily }]).map((cItem) => ({
              blocks: [
                {
                  type: "paragraph" as const,
                  runs: [
                    {
                      text: cItem.text,
                      bold: cItem.bold,
                      italic: cItem.italic,
                      fontSize: cItem.fontSize,
                      fontFamily: cItem.fontFamily,
                    },
                  ],
                  spacingAfter: 0,
                },
              ],
            })),
          };
        });

        elements.push({
          topY: tableLines[0].topY,
          block: {
            type: "table",
            rows,
            hasHeader: true,
          },
        });

        lineIdx = lookAhead;
        continue;
      }
    }

    // Heading or List Item: emit as standalone paragraph with exact styling & alignment
    if (line.isHeading || line.isListItem) {
      const runs: DocxTextRun[] = [];
      let prevX = -1;
      let prevW = 0;
      for (let i = 0; i < line.items.length; i++) {
        const it = line.items[i];
        let str = it.str;
        if (prevX >= 0) {
          const gap = it.x - (prevX + prevW);
          if (gap > 2.0 && !str.startsWith(" ")) {
            str = (gap > 20 ? "   " : " ") + str;
          }
        }
        prevX = it.x;
        prevW = it.width;

        runs.push({
          text: str,
          bold: it.isBold,
          italic: it.isItalic,
          fontSize: it.fontSize,
          fontFamily: it.fontFamily,
        });
      }

      elements.push({
        topY: line.topY,
        block: {
          type: "paragraph",
          runs: runs.length > 0 ? runs : [{ text: line.text, bold: line.isBold, italic: line.isItalic, fontSize: line.fontSize, fontFamily: line.fontFamily }],
          alignment: line.alignment,
          leftIndent: line.leftIndent,
          isHeading: line.isHeading,
          headingLevel: line.headingLevel,
          isListItem: line.isListItem,
          spacingBefore: line.isHeading ? (line.headingLevel === 1 ? 16 : 10) : 2,
          spacingAfter: line.isHeading ? 6 : 3,
        },
      });

      lineIdx++;
      continue;
    }

    // Normal body lines: group consecutive lines of the same paragraph together for natural reflow
    const paraLines: PdfSpatialLine[] = [line];
    let lookAhead = lineIdx + 1;

    while (lookAhead < lines.length) {
      const nextL = lines[lookAhead];
      if (nextL.isHeading || nextL.isListItem) break;

      const prevL = paraLines[paraLines.length - 1];
      const yGap = Math.abs(prevL.y - nextL.y);
      const fontSizeDiff = Math.abs(prevL.fontSize - nextL.fontSize);
      const isNormalLineGap = yGap <= (prevL.fontSize * 2.2 + 6);

      // Don't merge if alignments differ or if one line is significantly indented compared to another
      if (prevL.alignment !== nextL.alignment) break;
      if (Math.abs(prevL.minX - nextL.minX) > 25 && nextL.minX > 80) break;

      if (fontSizeDiff <= 2.5 && isNormalLineGap) {
        paraLines.push(nextL);
        lookAhead++;
      } else {
        break;
      }
    }

    const mergedRuns: DocxTextRun[] = [];
    for (let pIdx = 0; pIdx < paraLines.length; pIdx++) {
      const pLine = paraLines[pIdx];
      let prevItemX = -1;
      let prevItemW = 0;

      for (let i = 0; i < pLine.items.length; i++) {
        const it = pLine.items[i];
        let str = it.str;

        if (prevItemX >= 0) {
          const gap = it.x - (prevItemX + prevItemW);
          if (gap > 2.0 && !str.startsWith(" ")) {
            str = (gap > 20 ? "   " : " ") + str;
          }
        }

        if (i === pLine.items.length - 1 && pIdx < paraLines.length - 1) {
          if (str.endsWith("-") && str.length > 2) {
            str = str.slice(0, -1);
          } else if (!str.endsWith(" ")) {
            str += " ";
          }
        }

        prevItemX = it.x;
        prevItemW = it.width;

        mergedRuns.push({
          text: str,
          bold: it.isBold,
          italic: it.isItalic,
          fontSize: it.fontSize,
          fontFamily: it.fontFamily,
        });
      }
    }

    elements.push({
      topY: paraLines[0].topY,
      block: {
        type: "paragraph",
        runs: mergedRuns.length > 0 ? mergedRuns : [{ text: paraLines.map((l) => l.text).join(" "), fontSize: line.fontSize, fontFamily: line.fontFamily }],
        alignment: paraLines[0].alignment,
        leftIndent: paraLines[0].leftIndent,
        spacingBefore: 0,
        spacingAfter: 6,
        lineSpacing: Math.round(line.fontSize * 1.35),
      },
    });

    lineIdx = lookAhead;
  }

  // 2. Add extracted images with their topY positions
  for (const img of images) {
    elements.push({
      topY: img.topY,
      block: img.image,
    });
  }

  // 3. Sort all elements in exact visual reading order from top of page to bottom of page
  elements.sort((a, b) => a.topY - b.topY);

  return elements.map((e) => e.block);
}

/**
 * Universal Image Extractor supporting ImageBitmaps, Canvas, HTMLImageElements, and multi-channel raw buffers
 */
async function extractImagesFromPdfJsPage(
  page: any,
  viewport: any,
  pdfjs: any
): Promise<{ image: DocxImageBlock; topY: number }[]> {
  const results: { image: DocxImageBlock; topY: number }[] = [];
  const seenImageKeys = new Set<string>();

  try {
    const opList = await page.getOperatorList();
    if (!opList?.fnArray || !opList?.argsArray) {
      return results;
    }

    const fnArray = opList.fnArray;
    const argsArray = opList.argsArray;

    let currentTransform = [1, 0, 0, 1, 0, 0];
    const transformStack: number[][] = [];

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

    const PAINT_IMAGE_XOBJECT = pdfjs?.OPS?.paintImageXObject ?? 85;
    const PAINT_INLINE_IMAGE = pdfjs?.OPS?.paintInlineImageXObject ?? 82;

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

        results.push({
          topY,
          image: {
            type: "image",
            data: pngBytes,
            mimeType: "image/png",
            width: ptWidth,
            height: ptHeight,
            x: ptX,
            y: topY,
            position: "inline",
            altText: "Document Graphic / Illustration",
          },
        });
      } catch (imageError) {
        console.warn("PDF image extraction warning:", imageError);
      }
    }
  } catch (error) {
    console.warn("extractImagesFromPdfJsPage warning:", error);
  }

  return results;
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
        const pageLines = clusterTextItemsIntoLines(textContent.items, viewport.width, viewport.height);

        // Extract genuine high-res images from PDF.js
        const pageImgResults = await extractImagesFromPdfJsPage(page, viewport, pdfjs);

        // Reconstruct unified blocks in exact top-to-bottom reading order with typography
        const finalPageBlocks = reconstructPageBlocks(pageLines, pageImgResults);

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
        pageSections.push({
          pageSize: { width: viewport.width || 595.28, height: viewport.height || 841.89 },
          margins: { top: 54, right: 54, bottom: 54, left: 54 },
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
