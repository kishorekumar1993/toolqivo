/**
 * Toolqivo Spatial PDF Layout, Image & Text Extraction Engine
 * 100% Client-Side with zero server upload.
 * 
 * Extracts spatial coordinates, font metrics, line clustering,
 * heading detection, table structures, and embedded images (JPEG/PNG),
 * converting them into rich Microsoft Word Document Models.
 */

import { getPdfJs } from "./loader";
import { DocumentModel, DocxParagraphBlock, DocxTableBlock, DocxImageBlock, DocxBlock, DocxSection } from "../document/docx";

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
 * Extract native JPEG and PNG images from raw PDF byte stream
 */
function extractImagesFromPdfBytes(buffer: ArrayBuffer): DocxImageBlock[] {
  const images: DocxImageBlock[] = [];
  const bytes = new Uint8Array(buffer);

  // Scan for JPEG SOI (0xFF 0xD8) to EOI (0xFF 0xD9)
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
          // Filter out tiny thumbnails (< 1KB) or gigantic corrupted ranges (> 20MB)
          if (imgLen > 1024 && imgLen < 20 * 1024 * 1024) {
            const imgData = bytes.slice(start, end);
            images.push({
              type: "image",
              data: imgData,
              mimeType: "image/jpeg",
              width: 380,
              height: 240,
              altText: `Extracted Image ${images.length + 1}`,
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

  rawItems.sort((a, b) => {
    const dy = b.y - a.y;
    if (Math.abs(dy) > 2.5) {
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

      // Separate lines if Y differs by > 2.5pt or if font size differs significantly with spacing
      const isSameLine = yDiff <= 2.5 && (fontSizeDiff <= 3 || yDiff <= 1.0);

      if (isSameLine) {
        currentGroup.push(item);
      } else {
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

  const cleanText = lineText.trim();
  const isUppercaseSectionHeading =
    /^[A-Z0-9\s&/,\-–—|]{4,60}$/.test(cleanText) &&
    (isBold || avgFontSize >= 11) &&
    !cleanText.includes("@") &&
    !cleanText.includes(".com") &&
    !cleanText.includes("+");

  const isHeading = avgFontSize >= 14 || (isBold && avgFontSize >= 11.5) || isUppercaseSectionHeading;
  const headingLevel = avgFontSize >= 18 ? 1 : (avgFontSize >= 14 || isUppercaseSectionHeading) ? 2 : 3;
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
 * Build page blocks from spatial lines and detected tables with spacing preservation
 */
function buildBlocksFromLines(lines: PdfSpatialLine[]): DocxBlock[] {
  const blocks: DocxBlock[] = [];
  let tableLines: PdfSpatialLine[] = [];

  const flushTable = () => {
    if (tableLines.length >= 2) {
      const rows = tableLines.map((tl, rIdx) => {
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

    // Preserve whitespace between adjacent text items to prevent running words together
    const runs: DocxTextRun[] = [];
    let prevX = -1;
    let prevW = 0;

    for (let i = 0; i < line.items.length; i++) {
      const it = line.items[i];
      let prefix = "";
      if (prevX >= 0) {
        const gap = it.x - (prevX + prevW);
        if (gap > 2.0) {
          const prevRun = runs[runs.length - 1];
          if (prevRun && !prevRun.text.endsWith(" ") && !it.str.startsWith(" ")) {
            prefix = gap > 20 ? "   " : " ";
          }
        }
      }

      runs.push({
        text: prefix + it.str,
        bold: it.isBold,
        italic: it.isItalic,
        fontSize: it.fontSize,
      });

      prevX = it.x;
      prevW = it.width;
    }

    blocks.push({
      type: "paragraph",
      runs: runs.length > 0 ? runs : [{ text: line.text }],
      isHeading: line.isHeading,
      headingLevel: line.headingLevel,
      isListItem: line.isListItem,
      spacingBefore: line.isHeading ? (line.headingLevel === 1 ? 14 : 10) : 2,
      spacingAfter: line.isHeading ? 6 : 4,
    });
  }

  flushTable();
  return blocks;
}

/**
 * Extract all images directly from PDF.js page operator list and object repository
 */
async function extractImagesFromPdfJsPage(
  page: any,
  viewport: any
): Promise<{ image: DocxImageBlock; x: number; y: number }[]> {
  const results: { image: DocxImageBlock; x: number; y: number }[] = [];

  try {
    const opList = await page.getOperatorList();
    if (!opList || !opList.fnArray) return results;

    const fnArray = opList.fnArray;
    const argsArray = opList.argsArray;
    let currentTransform = [1, 0, 0, 1, 0, 0];
    const transformStack: number[][] = [];

    for (let i = 0; i < fnArray.length; i++) {
      const fn = fnArray[i];
      const args = argsArray[i];

      if (fn === 11) {
        // OPS.save
        transformStack.push([...currentTransform]);
      } else if (fn === 12) {
        // OPS.restore
        if (transformStack.length > 0) {
          currentTransform = transformStack.pop()!;
        }
      } else if (fn === 13 && args && args.length >= 6) {
        // OPS.transform
        currentTransform = args;
      } else if (fn === 85 || fn === 86 || fn === 82 || fn === 83) {
        // paintImageXObject, paintInlineImageXObject, paintImageMaskXObject
        const imgObjName = args && args[0] ? args[0] : null;
        if (imgObjName && page.objs) {
          try {
            const imgData = await new Promise<any>((resolve) => {
              try {
                page.objs.get(imgObjName, (obj: any) => resolve(obj));
                setTimeout(() => resolve(null), 300);
              } catch {
                resolve(null);
              }
            });

            if (
              imgData &&
              imgData.width >= 16 &&
              imgData.height >= 16 &&
              imgData.data &&
              typeof document !== "undefined"
            ) {
              const canvas = document.createElement("canvas");
              canvas.width = imgData.width;
              canvas.height = imgData.height;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                const rawBuf = imgData.data;
                const totalPixels = imgData.width * imgData.height;
                let imgDataObj: ImageData | null = null;

                if (rawBuf.length === totalPixels * 4) {
                  imgDataObj = new ImageData(new Uint8ClampedArray(rawBuf), imgData.width, imgData.height);
                } else if (rawBuf.length === totalPixels * 3) {
                  const rgba = new Uint8ClampedArray(totalPixels * 4);
                  for (let p = 0, q = 0; p < rawBuf.length; p += 3, q += 4) {
                    rgba[q] = rawBuf[p];
                    rgba[q + 1] = rawBuf[p + 1];
                    rgba[q + 2] = rawBuf[p + 2];
                    rgba[q + 3] = 255;
                  }
                  imgDataObj = new ImageData(rgba, imgData.width, imgData.height);
                } else if (rawBuf.length === totalPixels) {
                  const rgba = new Uint8ClampedArray(totalPixels * 4);
                  for (let p = 0, q = 0; p < rawBuf.length; p++, q += 4) {
                    const v = rawBuf[p];
                    rgba[q] = v;
                    rgba[q + 1] = v;
                    rgba[q + 2] = v;
                    rgba[q + 3] = 255;
                  }
                  imgDataObj = new ImageData(rgba, imgData.width, imgData.height);
                }

                if (imgDataObj) {
                  ctx.putImageData(imgDataObj, 0, 0);
                  const dataUrl = canvas.toDataURL("image/png");
                  const base64 = dataUrl.split(",")[1];
                  const binStr = atob(base64);
                  const pngBytes = new Uint8Array(binStr.length);
                  for (let b = 0; b < binStr.length; b++) pngBytes[b] = binStr.charCodeAt(b);

                  const ptX = currentTransform[4] || 54;
                  const ptY = (viewport.height || 841.89) - (currentTransform[5] || 750);
                  const ptW = Math.round(Math.abs(currentTransform[0])) || Math.min(imgData.width, 180);
                  const ptH = Math.round(Math.abs(currentTransform[3])) || Math.min(imgData.height, 180);

                  results.push({
                    image: {
                      type: "image",
                      data: pngBytes,
                      mimeType: "image/png",
                      width: ptW > 0 ? ptW : 120,
                      height: ptH > 0 ? ptH : 120,
                      altText: "Extracted Photo / Logo",
                    },
                    x: ptX,
                    y: ptY,
                  });
                }
              }
            }
          } catch (objErr) {
            console.warn("Error resolving PDF.js image object:", objErr);
          }
        }
      }
    }
  } catch (err) {
    console.warn("extractImagesFromPdfJsPage warning:", err);
  }

  return results;
}

/**
 * Universal PDF Text, Image & Spatial Layout Extractor
 */
export async function extractRealPdfContent(buffer: ArrayBuffer): Promise<ExtractedPdfContent> {
  const extractedImages = extractImagesFromPdfBytes(buffer);

  // 1. PDF.js Engine with spatial line clustering & image preservation
  try {
    const pdfjs = await getPdfJs();
    if (pdfjs) {
      const cloned = new Uint8Array(buffer.slice(0));
      const loadingTask = pdfjs.getDocument({ data: cloned });
      const pdfDoc = await loadingTask.promise;
      const numPages = pdfDoc.numPages;
      const pageSections: DocxSection[] = [];
      const pageFormattedTexts: string[] = [];

      let imgOffset = 0;
      const imagesPerPage = Math.max(1, Math.ceil(extractedImages.length / numPages));

      for (let p = 1; p <= numPages; p++) {
        const page = await pdfDoc.getPage(p);
        const viewport = page.getViewport({ scale: 1.0 });
        const textContent = await page.getTextContent();
        const pageLines = clusterTextItemsIntoLines(textContent.items);
        const pageBlocks = buildBlocksFromLines(pageLines);

        // Extract native high-res images from PDF.js page
        const pageImgResults = await extractImagesFromPdfJsPage(page, viewport);

        let finalPageBlocks: DocxBlock[] = [];

        if (pageImgResults.length > 0) {
          pageImgResults.sort((a, b) => a.y - b.y);
          // Images located in header / top region (y < 250 or at beginning)
          const headerImgs = pageImgResults.filter((r) => r.y < 250);
          const bodyImgs = pageImgResults.filter((r) => r.y >= 250);

          if (headerImgs.length > 0) {
            finalPageBlocks.push(...headerImgs.map((r) => r.image));
          }
          finalPageBlocks.push(...pageBlocks);
          if (bodyImgs.length > 0) {
            finalPageBlocks.push(...bodyImgs.map((r) => r.image));
          }
        } else {
          // Fallback to byte stream scanned images
          const pageImgsFallback = extractedImages.slice(imgOffset, imgOffset + imagesPerPage);
          imgOffset += imagesPerPage;

          if (pageImgsFallback.length > 0) {
            finalPageBlocks = p === 1 ? [...pageImgsFallback, ...pageBlocks] : [...pageBlocks, ...pageImgsFallback];
          } else {
            finalPageBlocks = pageBlocks;
          }
        }

        // If page has virtually no text (scanned / visual flyer), take high-res canvas snapshot
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
                width: viewport.width > 450 ? 450 : viewport.width,
                height: (viewport.height / viewport.width) * (viewport.width > 450 ? 450 : viewport.width),
                altText: `Page ${p} Visual Layout`,
              });
            }
          } catch (cErr) {
            console.warn("Canvas page snapshot warning:", cErr);
          }
        }

        pageSections.push({
          pageSize: { width: viewport.width || 595.28, height: viewport.height || 841.89 },
          margins: { top: 54, right: 54, bottom: 54, left: 54 },
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

  // 2. Native PDF Content Stream Decoder
  try {
    const streamResult = await extractTextViaStreams(buffer);
    if (streamResult.text && streamResult.text.trim().length > 0) {
      const lines = streamResult.text.split(/\r?\n/).filter(Boolean);
      const blocks: DocxBlock[] = lines.map((l) => ({
        type: "paragraph" as const,
        runs: [{ text: l }],
      }));
      if (extractedImages.length > 0) {
        blocks.push(...extractedImages);
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

  // 3. Fallback
  return {
    text: "",
    pageCount: 1,
    method: "binary-fallback",
  };
}
