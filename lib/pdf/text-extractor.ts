/**
 * Toolqivo Spatial PDF Layout & Text Extraction Engine
 * 100% Client-Side with zero server upload.
 * 
 * Extracts spatial coordinates, font metrics, line clustering,
 * heading detection, table structures, and converts them into structured Document Models.
 */

import { getPdfJs } from "./loader";
import { DocumentModel, DocxParagraphBlock, DocxTableBlock, DocxBlock } from "../document/docx";

export interface PdfTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontName: string;
  isBold?: boolean;
  isItalic?: boolean;
}

export interface PdfSpatialLine {
  y: number;
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
  text: string;
  isHeading?: boolean;
  headingLevel?: number;
  isListItem?: boolean;
  items: PdfTextItem[];
}

export interface ExtractedPdfContent {
  text: string;
  pageCount: number;
  method: "pdfjs" | "content-stream" | "binary-fallback";
  model?: DocumentModel;
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

  // Check for UTF-16BE BOM (0xFE, 0xFF)
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
 * Extract text strings from a decompressed PDF content stream operator block
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
 * Native client-side PDF stream scanner and content parser (Fallback)
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
 * Cluster raw PDF.js text items into spatial lines and detect document structure
 */
function clusterTextItemsIntoLines(items: any[]): PdfSpatialLine[] {
  if (!items || items.length === 0) return [];

  const rawItems: PdfTextItem[] = items
    .map((it) => {
      const str = (it.str || "").replace(/\s+/g, " ");
      const transform = it.transform || [1, 0, 0, 1, 0, 0];
      const scaleX = transform[0];
      const scaleY = transform[3];
      const fontSize = Math.round(Math.sqrt(scaleX * scaleX + (transform[1] || 0) * (transform[1] || 0))) || Math.round(it.height) || 10;
      const x = transform[4];
      const y = transform[5];
      const fontName = it.fontName || "";
      const isBold = /bold|black|heavy|semibold|medium/i.test(fontName);
      const isItalic = /italic|oblique/i.test(fontName);

      return {
        str,
        x,
        y,
        width: it.width || (str.length * fontSize * 0.5),
        height: it.height || fontSize,
        fontSize,
        fontName,
        isBold,
        isItalic,
      };
    })
    .filter((it) => it.str.trim().length > 0);

  // Sort items top-to-bottom (Y descending), left-to-right (X ascending)
  rawItems.sort((a, b) => {
    const dy = b.y - a.y;
    if (Math.abs(dy) > Math.max(3.5, Math.min(a.fontSize, b.fontSize) * 0.35)) {
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
      const threshold = Math.max(3.5, item.fontSize * 0.35);
      if (Math.abs(item.y - currentY) <= threshold) {
        currentGroup.push(item);
      } else {
        // Finalize line
        currentGroup.sort((a, b) => a.x - b.x);
        lines.push(buildSpatialLine(currentGroup, currentY));
        currentY = item.y;
        currentGroup = [item];
      }
    }
  }

  if (currentGroup.length > 0 && currentY !== null) {
    currentGroup.sort((a, b) => a.x - b.x);
    lines.push(buildSpatialLine(currentGroup, currentY));
  }

  return lines;
}

function buildSpatialLine(items: PdfTextItem[], y: number): PdfSpatialLine {
  let lineText = "";
  let lastX = -1;
  let lastWidth = 0;

  for (const item of items) {
    if (lastX >= 0) {
      const gap = item.x - (lastX + lastWidth);
      if (gap > 2.0) {
        lineText += " ";
      }
    }
    lineText += item.str;
    lastX = item.x;
    lastWidth = item.width;
  }

  const avgFontSize = Math.round(items.reduce((acc, it) => acc + it.fontSize, 0) / items.length) || 10;
  const isBold = items.some((it) => it.isBold);
  const isItalic = items.some((it) => it.isItalic);

  const cleanText = lineText.trim();
  const isHeading = avgFontSize >= 14 || (isBold && avgFontSize >= 12);
  const headingLevel = avgFontSize >= 18 ? 1 : avgFontSize >= 14 ? 2 : 3;
  const isListItem = /^[•*–-]\s+|^\d+\.\s+|^\[[ x]\]\s+/i.test(cleanText);

  return {
    y,
    fontSize: avgFontSize,
    isBold,
    isItalic,
    text: cleanText,
    isHeading,
    headingLevel: isHeading ? headingLevel : undefined,
    isListItem,
    items,
  };
}

/**
 * Build a high-fidelity DocumentModel from spatial lines and detected tables
 */
function buildDocumentModelFromLines(lines: PdfSpatialLine[], pageWidth = 595.28, pageHeight = 841.89): DocumentModel {
  const blocks: DocxBlock[] = [];

  let tableLines: PdfSpatialLine[] = [];

  const flushTable = () => {
    if (tableLines.length >= 2) {
      // Convert multi-column lines into a table
      const rows = tableLines.map((tl, rIdx) => {
        // Split line by large gaps (> 25pt)
        const cellItems: string[] = [];
        let currentCell = "";
        let prevX = -1;
        let prevW = 0;

        for (const it of tl.items) {
          if (prevX >= 0 && it.x - (prevX + prevW) > 20) {
            if (currentCell.trim()) cellItems.push(currentCell.trim());
            currentCell = "";
          }
          currentCell += (currentCell ? " " : "") + it.str;
          prevX = it.x;
          prevW = it.width;
        }
        if (currentCell.trim()) cellItems.push(currentCell.trim());

        return {
          isHeader: rIdx === 0,
          cells: (cellItems.length > 0 ? cellItems : [tl.text]).map((cText) => ({
            blocks: [
              {
                type: "paragraph" as const,
                runs: [{ text: cText, bold: rIdx === 0 }],
                spacingAfter: 0,
              },
            ],
          })),
        };
      });

      blocks.push({
        type: "table",
        rows,
        hasHeader: true,
      });
      tableLines = [];
    } else if (tableLines.length === 1) {
      const tl = tableLines[0];
      blocks.push({
        type: "paragraph",
        runs: [{ text: tl.text, bold: tl.isBold, italic: tl.isItalic, fontSize: tl.fontSize }],
        isHeading: tl.isHeading,
        headingLevel: tl.headingLevel,
        isListItem: tl.isListItem,
      });
      tableLines = [];
    }
  };

  for (const line of lines) {
    // Check if line has multiple spaced column clusters (> 2 columns)
    let columnGaps = 0;
    for (let i = 1; i < line.items.length; i++) {
      if (line.items[i].x - (line.items[i - 1].x + line.items[i - 1].width) > 25) {
        columnGaps++;
      }
    }

    const isTableCandidate = columnGaps >= 1 && line.items.length >= 2 && !line.isHeading;

    if (isTableCandidate) {
      tableLines.push(line);
      continue;
    }

    flushTable();

    blocks.push({
      type: "paragraph",
      runs: line.items.map((it) => ({
        text: it.str,
        bold: it.isBold,
        italic: it.isItalic,
        fontSize: it.fontSize,
      })),
      isHeading: line.isHeading,
      headingLevel: line.headingLevel,
      isListItem: line.isListItem,
      spacingBefore: line.isHeading ? 10 : 2,
      spacingAfter: line.isHeading ? 6 : 4,
    });
  }

  flushTable();

  return {
    sections: [
      {
        pageSize: { width: pageWidth, height: pageHeight },
        margins: { top: 54, right: 54, bottom: 54, left: 54 },
        blocks,
      },
    ],
  };
}

/**
 * Universal PDF Text & Spatial Layout Extractor
 */
export async function extractRealPdfContent(buffer: ArrayBuffer): Promise<ExtractedPdfContent> {
  // 1. PDF.js Engine with spatial line clustering
  try {
    const pdfjs = await getPdfJs();
    if (pdfjs) {
      const cloned = new Uint8Array(buffer.slice(0));
      const loadingTask = pdfjs.getDocument({ data: cloned });
      const pdfDoc = await loadingTask.promise;
      const numPages = pdfDoc.numPages;
      const allLines: PdfSpatialLine[] = [];
      const pageFormattedTexts: string[] = [];

      for (let p = 1; p <= numPages; p++) {
        const page = await pdfDoc.getPage(p);
        const textContent = await page.getTextContent();
        const pageLines = clusterTextItemsIntoLines(textContent.items);

        allLines.push(...pageLines);

        const pageStr = pageLines
          .map((l) => {
            if (l.isHeading) return `### ${l.text}`;
            if (l.isListItem) return `* ${l.text}`;
            return l.text;
          })
          .join("\n");

        if (pageStr.trim()) pageFormattedTexts.push(pageStr.trim());
      }

      if (pageFormattedTexts.length > 0) {
        const model = buildDocumentModelFromLines(allLines);
        return {
          text: pageFormattedTexts.join("\n\n"),
          pageCount: numPages,
          method: "pdfjs",
          model,
        };
      }
    }
  } catch (pdfjsErr) {
    console.warn("PDF.js primary extraction failed, using native stream decoder:", pdfjsErr);
  }

  // 2. Native PDF Content Stream Decoder
  try {
    const streamResult = await extractTextViaStreams(buffer);
    if (streamResult.text && streamResult.text.trim().length > 0) {
      return {
        text: streamResult.text,
        pageCount: streamResult.pageCount,
        method: "content-stream",
      };
    }
  } catch (streamErr) {
    console.warn("Native stream extraction error:", streamErr);
  }

  // 3. Fallback
  return {
    text: "",
    pageCount: 1,
    method: "binary-fallback",
  };
}
