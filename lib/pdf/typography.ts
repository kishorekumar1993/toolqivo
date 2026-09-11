/**
 * Toolqivo PDF Typography and Document Layout Engine
 * Converts Document Models, Word DOCX structure, and rich tabular data into clean, multi-page PDFs
 * Supports inline multi-run rich text, font families, text justification, underlines,
 * multi-section orientations, proportional table grids, and embedded images.
 * 100% Client-Side with zero server upload.
 */

import { getPdfLib } from "./loader";
import { PdfEngineError } from "./errors";
import { DocumentModel, DocxParagraphBlock, DocxTableBlock, DocxImageBlock, DocxBlock, DocxSection, DocxTextRun } from "../document/docx";

/**
 * Transliterate and sanitize Unicode strings, emojis, and symbols into safe printable characters
 * preventing pdf-lib StandardFonts WinAnsi encoding crashes while preserving readable representation.
 */
export function sanitizeTextForPdf(input: string): string {
  if (!input) return "";

  let text = input;

  // 1. Common icon & symbol transliterations (Tel, Mail, Web, Address, Checkmarks, Bullets)
  text = text
    .replace(new RegExp("[\\u{1F4DE}\\u{260E}\\u{2706}\\u{1F4F1}\\u{1F4F2}]", "gu"), "Tel: ")
    .replace(new RegExp("[\\u{2709}\\u{1F4E7}\\u{1F4E8}\\u{1F4E9}\\u{1F4EC}\\u{1F4ED}]", "gu"), "Email: ")
    .replace(new RegExp("[\\u{1F310}\\u{1F517}\\u{1F30D}\\u{1F30E}\\u{1F30F}]", "gu"), "Web: ")
    .replace(new RegExp("[\\u{1F4CD}\\u{1F4CC}\\u{1F3E0}\\u{1F3E2}]", "gu"), "Address: ")
    .replace(new RegExp("[\\u{2022}\\u{25AA}\\u{25AB}\\u{25B6}\\u{25C6}\\u{25C7}\\u{25CB}\\u{25CF}]", "gu"), "* ")
    .replace(new RegExp("[\\u{2713}\\u{2714}\\u{2611}]", "gu"), "[x] ")
    .replace(new RegExp("[\\u{2717}\\u{2718}\\u{2612}]", "gu"), "[ ] ")
    .replace(new RegExp("[\\u{2605}\\u{2606}\\u{2B50}]", "gu"), "*")
    .replace(new RegExp("[\\u{2190}\\u{2192}\\u{2194}\\u{21D2}]", "gu"), "->");

  // 2. Smart quotes, dashes and non-standard whitespace
  text = text
    .replace(/[\u2018\u2019\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201F\u2033]/g, '"')
    .replace(/[\u2013\u2014\u2015]/g, " - ")
    .replace(/[\u2026]/g, "...")
    .replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, " ");

  // 3. Remove all remaining 4-byte surrogate pairs (emojis)
  text = text.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "");

  // 4. Remove unsupported non-WinAnsi control characters
  text = text.replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, " ");

  return text;
}

/**
 * Measure text width safely without throwing WinAnsi exceptions
 */
export function safeMeasureText(font: any, text: string, size: number): number {
  try {
    return font.widthOfTextAtSize(text, size);
  } catch {
    const clean = text.replace(/[^\x20-\x7E]/g, " ");
    try {
      return font.widthOfTextAtSize(clean, size);
    } catch {
      return text.length * size * 0.55;
    }
  }
}

/**
 * Draw text safely without throwing WinAnsi exceptions
 */
export function safeDrawText(page: any, text: string, options: any): void {
  try {
    page.drawText(text, options);
  } catch {
    try {
      const fallbackText = text.replace(/[^\x20-\x7E]/g, " ");
      page.drawText(fallbackText, options);
    } catch (e2) {
      console.warn("safeDrawText fallback warning:", e2);
    }
  }
}

/**
 * Parse a hex color string ("#0F172A" or "0F172A") into pdf-lib RGB color
 */
function parseHexColor(PDFLib: any, hex?: string, defaultColor = { r: 0.12, g: 0.16, b: 0.23 }) {
  if (!hex) return PDFLib.rgb(defaultColor.r, defaultColor.g, defaultColor.b);
  const clean = hex.replace("#", "").trim();
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;
    return PDFLib.rgb(r, g, b);
  }
  return PDFLib.rgb(defaultColor.r, defaultColor.g, defaultColor.b);
}

/**
 * Parse a highlight color string or named color into pdf-lib RGB color
 */
function parseHighlightColor(PDFLib: any, hl?: string) {
  if (!hl) return PDFLib.rgb(1, 0.96, 0.4);
  const clean = hl.toLowerCase().trim();
  if (clean === "yellow") return PDFLib.rgb(1, 0.95, 0.3);
  if (clean === "green") return PDFLib.rgb(0.5, 1, 0.5);
  if (clean === "cyan") return PDFLib.rgb(0.4, 0.9, 1);
  if (clean === "magenta") return PDFLib.rgb(1, 0.5, 0.9);
  if (clean === "blue") return PDFLib.rgb(0.5, 0.7, 1);
  if (clean === "red") return PDFLib.rgb(1, 0.5, 0.5);
  if (clean === "darkyellow" || clean === "orange") return PDFLib.rgb(1, 0.75, 0.3);
  if (clean === "lightgray" || clean === "gray") return PDFLib.rgb(0.85, 0.85, 0.85);
  if (clean.length === 6) return parseHexColor(PDFLib, clean);
  return PDFLib.rgb(1, 0.95, 0.3);
}

// Token for inline rich-text layout
interface RichTextToken {
  text: string;
  font: any;
  fontSize: number;
  color: any;
  underline?: boolean;
  strike?: boolean;
  superscript?: boolean;
  subscript?: boolean;
  highlight?: string;
  isSpace: boolean;
  isNewline?: boolean;
  width: number;
}

/**
 * Split paragraph runs into styled word and whitespace tokens with newline and long-word safety
 */
function tokenizeParagraphRuns(
  runs: DocxTextRun[],
  fontSet: any,
  defaultFontSize: number,
  isHeading = false,
  PDFLib: any,
  maxAvailableWidth = 480
): RichTextToken[] {
  const tokens: RichTextToken[] = [];

  for (const run of runs) {
    const rawText = sanitizeTextForPdf(run.text);
    if (!rawText) continue;

    // Font family selection
    const fam = (run.fontFamily || "").toLowerCase();
    let familyFonts = fontSet.sans;
    if (fam.includes("times") || fam.includes("serif") || fam.includes("georgia") || fam.includes("cambria")) {
      familyFonts = fontSet.serif;
    } else if (fam.includes("courier") || fam.includes("mono") || fam.includes("consolas")) {
      familyFonts = fontSet.mono;
    }

    // Font weight/style
    let font = familyFonts.regular;
    if (run.bold && run.italic) font = familyFonts.boldItalic;
    else if (run.bold || isHeading) font = familyFonts.bold;
    else if (run.italic) font = familyFonts.italic;

    let fontSize = run.fontSize || defaultFontSize;
    if (run.superscript || run.subscript) {
      fontSize = Math.max(6, Math.round(fontSize * 0.72 * 10) / 10);
    }

    const color = parseHexColor(
      PDFLib,
      run.color,
      isHeading ? { r: 0.06, g: 0.09, b: 0.16 } : { r: 0.12, g: 0.16, b: 0.23 }
    );

    // Split run by newlines first, then spaces
    const lineParts = rawText.split(/\r?\n/);
    for (let l = 0; l < lineParts.length; l++) {
      if (l > 0) {
        tokens.push({
          text: "",
          font,
          fontSize,
          color,
          isSpace: false,
          isNewline: true,
          width: 0,
        });
      }

      const linePart = lineParts[l];
      if (!linePart) continue;

      const parts = linePart.split(/(\s+)/);
      for (const part of parts) {
        if (!part) continue;
        const isSpace = /^\s+$/.test(part);
        if (isSpace) {
          const width = safeMeasureText(font, " ", fontSize);
          tokens.push({
            text: " ",
            font,
            fontSize,
            color,
            underline: run.underline,
            strike: run.strike,
            superscript: run.superscript,
            subscript: run.subscript,
            highlight: run.highlight,
            isSpace: true,
            width,
          });
        } else {
          const fullW = safeMeasureText(font, part, fontSize);
          if (fullW > maxAvailableWidth && maxAvailableWidth > 50) {
            // Word is wider than entire content area: split into character sub-tokens
            let currentChunk = "";
            for (let i = 0; i < part.length; i++) {
              const testChunk = currentChunk + part[i];
              const testW = safeMeasureText(font, testChunk, fontSize);
              if (testW > maxAvailableWidth && currentChunk.length > 0) {
                const chunkW = safeMeasureText(font, currentChunk, fontSize);
                tokens.push({
                  text: currentChunk,
                  font,
                  fontSize,
                  color,
                  underline: run.underline,
                  strike: run.strike,
                  superscript: run.superscript,
                  subscript: run.subscript,
                  highlight: run.highlight,
                  isSpace: false,
                  width: chunkW,
                });
                currentChunk = part[i];
              } else {
                currentChunk = testChunk;
              }
            }
            if (currentChunk.length > 0) {
              const chunkW = safeMeasureText(font, currentChunk, fontSize);
              tokens.push({
                text: currentChunk,
                font,
                fontSize,
                color,
                underline: run.underline,
                strike: run.strike,
                superscript: run.superscript,
                subscript: run.subscript,
                highlight: run.highlight,
                isSpace: false,
                width: chunkW,
              });
            }
          } else {
            tokens.push({
              text: part,
              font,
              fontSize,
              color,
              underline: run.underline,
              strike: run.strike,
              superscript: run.superscript,
              subscript: run.subscript,
              highlight: run.highlight,
              isSpace: false,
              width: fullW,
            });
          }
        }
      }
    }
  }

  return tokens;
}

/**
 * Robust image embedding with canvas fallback for any unsupported format (EMF, WebP, GIF, etc.)
 */
async function safelyEmbedImageInPdf(pdfDoc: any, imgBytes: Uint8Array, mimeType?: string): Promise<any> {
  const isPng = mimeType === "image/png" || imgBytes[0] === 0x89;
  try {
    if (isPng) {
      return await pdfDoc.embedPng(imgBytes);
    } else {
      return await pdfDoc.embedJpg(imgBytes);
    }
  } catch {
    try {
      if (!isPng) {
        return await pdfDoc.embedPng(imgBytes);
      } else {
        return await pdfDoc.embedJpg(imgBytes);
      }
    } catch {
      // Browser Canvas fallback to re-encode into clean 100% valid PNG
      if (typeof document !== "undefined") {
        try {
          const blob = new Blob([imgBytes as BlobPart]);
          const url = URL.createObjectURL(blob);
          const img = new Image();
          img.src = url;
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
            setTimeout(() => reject(new Error("Image load timeout")), 2000);
          });
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width || 200;
          canvas.height = img.naturalHeight || img.height || 200;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            const dataUrl = canvas.toDataURL("image/png");
            const base64 = dataUrl.split(",")[1];
            const binStr = atob(base64);
            const cleanPngBytes = new Uint8Array(binStr.length);
            for (let b = 0; b < binStr.length; b++) cleanPngBytes[b] = binStr.charCodeAt(b);
            return await pdfDoc.embedPng(cleanPngBytes);
          }
        } catch (canvasErr) {
          console.warn("Canvas image fallback warning:", canvasErr);
        }
      }
      throw new Error("Unable to embed image in PDF");
    }
  }
}

/**
 * Recursively find all image blocks inside a block array (including nested table cells)
 */
function findImagesInBlocks(blocks: any[]): DocxImageBlock[] {
  const images: DocxImageBlock[] = [];
  for (const block of blocks || []) {
    if (block.type === "image") {
      images.push(block as DocxImageBlock);
    }
    if (block.type === "table") {
      for (const row of block.rows || []) {
        for (const cell of row.cells || []) {
          images.push(...findImagesInBlocks(cell.blocks || []));
        }
      }
    }
  }
  return images;
}

/**
 * Render a CV-style header table with profile photo on left and text on right.
 * Returns the new currentY after rendering.
 */
async function renderHeaderTable(
  tbl: DocxTableBlock,
  pdfDoc: any,
  currentPage: any,
  fonts: { regular: any; bold: any; italic: any; boldItalic: any },
  PDFLib: any,
  marginLeft: number,
  currentY: number,
  contentWidth: number
): Promise<number> {
  if (!tbl.rows?.length) return currentY;

  const firstRow = tbl.rows[0];
  if (!firstRow.cells?.length) return currentY;

  const allImages = findImagesInBlocks(
    firstRow.cells.flatMap((cell: any) => cell.blocks || [])
  );

  if (allImages.length === 0) return currentY;

  /*
   * This is the resume header:
   * ┌──────────┬─────────────────────────────┐
   * │   PHOTO  │ Name                        │
   * │          │ Designation                 │
   * │          │ Contact                     │
   * └──────────┴─────────────────────────────┘
   */

  const image = allImages[0];
  let imageWidth = image.width || 75;
  let imageHeight = image.height || 100;
  const maxImageWidth = 85;
  const maxImageHeight = 85;
  const scale = Math.min(maxImageWidth / imageWidth, maxImageHeight / imageHeight, 1);
  imageWidth *= scale;
  imageHeight *= scale;

  const headerHeight = Math.max(90, imageHeight + 20);

  // Header background
  currentPage.drawRectangle({
    x: marginLeft,
    y: currentY - headerHeight,
    width: contentWidth,
    height: headerHeight,
    color: PDFLib.rgb(0.94, 0.96, 0.98),
  });

  // Draw profile image
  try {
    const embeddedImage = await safelyEmbedImageInPdf(pdfDoc, image.data, image.mimeType);
    const imageX = marginLeft + 12;
    const imageY = currentY - 10 - imageHeight;
    currentPage.drawImage(embeddedImage, {
      x: imageX,
      y: imageY,
      width: imageWidth,
      height: imageHeight,
    });
  } catch (e) {
    console.warn("Header profile image render failed:", e);
  }

  // Text starts after the photo, using the actual paragraph ordering from the header table.
  const textX = marginLeft + 120;
  let textY = currentY - 22;

  const headerParagraphs: Array<{ text: string; alignment?: "left" | "center" | "right" | "justify"; isPrimary?: boolean }> = [];
  for (const cell of firstRow.cells) {
    if (cell.blocks.some((block) => block.type === "image")) continue;
    for (const block of cell.blocks || []) {
      if (block.type !== "paragraph") continue;
      const paragraphText = ((block as DocxParagraphBlock).runs || [])
        .map((r: any) => r.text || "")
        .join("")
        .trim();
      if (paragraphText) {
        headerParagraphs.push({
          text: paragraphText,
          alignment: (block as DocxParagraphBlock).alignment || "left",
          isPrimary: headerParagraphs.length === 0,
        });
      }
    }
  }

  for (let i = 0; i < headerParagraphs.length; i++) {
    const paragraph = headerParagraphs[i];
    const isName = i === 0;
    const isDesignation = i === 1;
    safeDrawText(currentPage, sanitizeTextForPdf(paragraph.text), {
      x: textX + (paragraph.alignment === "right" ? 110 : 0),
      y: textY,
      size: isName ? 18 : isDesignation ? 11 : 8.5,
      font: isName || isDesignation ? fonts.bold : fonts.regular,
      color: isName ? PDFLib.rgb(0.05, 0.25, 0.40) : isDesignation ? PDFLib.rgb(0.10, 0.45, 0.70) : PDFLib.rgb(0.12, 0.16, 0.23),
    });
    textY -= isName ? 22 : isDesignation ? 16 : 13;
  }

  return currentY - headerHeight - 14;
}

/**
 * Render a high-fidelity DocumentModel into a multi-page PDF document
 */
export async function convertDocumentModelToPdf(
  model: DocumentModel,
  docTitle: string = "Document",
  onProgress?: (msg: string, pct: number) => void
): Promise<Blob> {
  if (onProgress) onProgress("Initializing PDF layout engine...", 15);
  const PDFLib = await getPdfLib();
  if (!PDFLib) {
    throw new PdfEngineError("PDF engine could not be loaded in browser.", "LOADER_ERROR");
  }

  if (onProgress) onProgress("Embedding typography and font families...", 35);
  const pdfDoc = await PDFLib.PDFDocument.create();

  // Embed Font Families: Sans-serif (Helvetica), Serif (Times), Monospace (Courier)
  const fontSet = {
    sans: {
      regular: await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica),
      bold: await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold),
      italic: await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaOblique),
      boldItalic: await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBoldOblique),
    },
    serif: {
      regular: await pdfDoc.embedFont(PDFLib.StandardFonts.TimesRoman),
      bold: await pdfDoc.embedFont(PDFLib.StandardFonts.TimesRomanBold),
      italic: await pdfDoc.embedFont(PDFLib.StandardFonts.TimesRomanItalic),
      boldItalic: await pdfDoc.embedFont(PDFLib.StandardFonts.TimesRomanBoldItalic),
    },
    mono: {
      regular: await pdfDoc.embedFont(PDFLib.StandardFonts.Courier),
      bold: await pdfDoc.embedFont(PDFLib.StandardFonts.CourierBold),
      italic: await pdfDoc.embedFont(PDFLib.StandardFonts.CourierOblique),
      boldItalic: await pdfDoc.embedFont(PDFLib.StandardFonts.CourierBoldOblique),
    },
  };

  const pages: { page: any; width: number; height: number; marginBottom: number }[] = [];
  let currentPage: any = null;
  let currentY = 0;
  let currentSecPageWidth = 595.28;
  let currentSecPageHeight = 841.89;
  let currentMarginTop = 54;
  let currentMarginRight = 54;
  let currentMarginBottom = 54;
  let currentMarginLeft = 54;
  let currentContentWidth = 487.28;

  const addNewPage = (w = currentSecPageWidth, h = currentSecPageHeight) => {
    currentPage = pdfDoc.addPage([w, h]);
    pages.push({
      page: currentPage,
      width: w,
      height: h,
      marginBottom: currentMarginBottom,
    });
    currentY = h - currentMarginTop;
    return currentPage;
  };

  const checkPageBreak = (neededHeight: number) => {
    if (currentY - neededHeight < currentMarginBottom) {
      addNewPage();
    }
  };

  if (onProgress) onProgress("Rendering document sections and rich-text layout...", 60);

  // Iterate sections
  for (let sIdx = 0; sIdx < model.sections.length; sIdx++) {
    const section = model.sections[sIdx];
    currentSecPageWidth = section.pageSize?.width || 595.28;
    currentSecPageHeight = section.pageSize?.height || 841.89;
    currentMarginTop = Math.max(30, section.margins?.top || 54);
    currentMarginRight = Math.max(30, section.margins?.right || 54);
    currentMarginBottom = Math.max(30, section.margins?.bottom || 54);
    currentMarginLeft = Math.max(30, section.margins?.left || 54);
    currentContentWidth = currentSecPageWidth - currentMarginLeft - currentMarginRight;

    // Start section on a new page (or initial page)
    if (!currentPage || sIdx > 0) {
      addNewPage(currentSecPageWidth, currentSecPageHeight);
    }

    // Render Blocks in Section
    for (const block of section.blocks) {
      if (block.type === "paragraph") {
        const para = block as DocxParagraphBlock;
        if (para.pageBreakBefore) {
          addNewPage();
        }

        const isHeading = para.isHeading;
        const level = para.headingLevel || 1;
        const isListItem = para.isListItem;
        const defaultFontSize = isHeading ? (level === 1 ? 16 : level === 2 ? 13 : 11.5) : 10;
        const beforeSpace = para.spacingBefore !== undefined ? para.spacingBefore : (isHeading ? 10 : 2);
        const afterSpace = para.spacingAfter !== undefined ? para.spacingAfter : (isHeading ? 6 : 4);

        currentY -= beforeSpace;

        const baseLeftIndent = (para.leftIndent || 0) + (isListItem ? 16 : 0);
        const rightIndent = para.rightIndent || 0;
        const firstLineIndent = para.firstLineIndent || 0;
        const hangingIndent = para.hangingIndent || 0;

        /*
         * Reserve left column for header photo.
         * Typical CV profile photo: x ≈ 20-80, width ≈ 90-130
         * Text starts after the photo.
         */
        let effectiveBaseLeftIndent = baseLeftIndent;

        const hasLeftHeaderImage = section.blocks.some(
          (b) =>
            b.type === "image" &&
            (b as DocxImageBlock).position === "absolute" &&
            ((b as DocxImageBlock).x ?? 999) < currentMarginLeft + 120 &&
            ((b as DocxImageBlock).y ?? 999) < 180
        );

        if (
          hasLeftHeaderImage &&
          currentY > currentSecPageHeight - currentMarginTop - 180
        ) {
          effectiveBaseLeftIndent = Math.max(
            effectiveBaseLeftIndent,
            125
          );
        }

        const maxTextWidth = Math.max(
          60,
          currentContentWidth - effectiveBaseLeftIndent - rightIndent
        );

        // Draw bullet point marker if list item
        if (isListItem) {
          safeDrawText(currentPage, "*", {
            x: currentMarginLeft + (para.leftIndent || 0) + 4,
            y: currentY - defaultFontSize,
            size: defaultFontSize,
            font: fontSet.sans.bold,
            color: PDFLib.rgb(0.05, 0.58, 0.53),
          });
        }

        // Tokenize paragraph runs into inline words and spaces (with long-word protection)
        const tokens = tokenizeParagraphRuns(para.runs, fontSet, defaultFontSize, isHeading, PDFLib, maxTextWidth);
        if (tokens.length === 0) {
          currentY -= afterSpace;
          continue;
        }

        // Line Wrapping & Layout Engine (Combines multi-runs seamlessly across lines)
        const lines: { tokens: RichTextToken[]; lineWidth: number; maxFontSize: number }[] = [];
        let curLineTokens: RichTextToken[] = [];
        let curLineWidth = 0;
        let curLineMaxFontSize = defaultFontSize;

        for (const token of tokens) {
          if (token.isNewline) {
            // Force line break immediately
            while (curLineTokens.length > 0 && curLineTokens[curLineTokens.length - 1].isSpace) {
              const removed = curLineTokens.pop()!;
              curLineWidth -= removed.width;
            }
            lines.push({ tokens: curLineTokens, lineWidth: curLineWidth, maxFontSize: curLineMaxFontSize });
            curLineTokens = [];
            curLineWidth = 0;
            curLineMaxFontSize = defaultFontSize;
            continue;
          }

          if (curLineTokens.length === 0 && token.isSpace) {
            continue; // Skip leading whitespace
          }

          const isFirstLine = lines.length === 0;
          const currentLineIndent = isFirstLine ? firstLineIndent : hangingIndent;
          const targetLineWidth = Math.max(50, maxTextWidth - currentLineIndent);

          if (curLineWidth + token.width <= targetLineWidth || curLineTokens.length === 0) {
            curLineTokens.push(token);
            curLineWidth += token.width;
            if (token.fontSize > curLineMaxFontSize) curLineMaxFontSize = token.fontSize;
          } else {
            // Trim trailing space from line
            while (curLineTokens.length > 0 && curLineTokens[curLineTokens.length - 1].isSpace) {
              const removed = curLineTokens.pop()!;
              curLineWidth -= removed.width;
            }

            lines.push({ tokens: curLineTokens, lineWidth: curLineWidth, maxFontSize: curLineMaxFontSize });

            if (token.isSpace) {
              curLineTokens = [];
              curLineWidth = 0;
              curLineMaxFontSize = defaultFontSize;
            } else {
              curLineTokens = [token];
              curLineWidth = token.width;
              curLineMaxFontSize = token.fontSize;
            }
          }
        }

        if (curLineTokens.length > 0) {
          while (curLineTokens.length > 0 && curLineTokens[curLineTokens.length - 1].isSpace) {
            const removed = curLineTokens.pop()!;
            curLineWidth -= removed.width;
          }
          if (curLineTokens.length > 0) {
            lines.push({ tokens: curLineTokens, lineWidth: curLineWidth, maxFontSize: curLineMaxFontSize });
          }
        }

        // Draw Lines
        for (let lIdx = 0; lIdx < lines.length; lIdx++) {
          const line = lines[lIdx];
          const isLastLine = lIdx === lines.length - 1;
          const isFirstLine = lIdx === 0;
          const lineHeight = para.lineSpacing && para.lineSpacing > 0 ? para.lineSpacing : line.maxFontSize * 1.35;

          checkPageBreak(lineHeight);

          const lineIndentOffset = isFirstLine ? firstLineIndent : hangingIndent;
          const lineAvailableW = Math.max(50, maxTextWidth - lineIndentOffset);
          const startBaseX = currentMarginLeft + effectiveBaseLeftIndent + lineIndentOffset;

          let startX = startBaseX;
          let spaceExtra = 0;

          if (para.alignment === "center") {
            startX = startBaseX + (lineAvailableW - line.lineWidth) / 2;
          } else if (para.alignment === "right") {
            startX = startBaseX + (lineAvailableW - line.lineWidth);
          } else if (para.alignment === "justify" && !isLastLine) {
            const spaceCount = line.tokens.filter((t) => t.isSpace).length;
            if (spaceCount > 0 && lineAvailableW > line.lineWidth) {
              spaceExtra = (lineAvailableW - line.lineWidth) / spaceCount;
            }
          }

          // Draw tokens sequentially
          let curX = startX;
          for (const token of line.tokens) {
            const tokenW = token.isSpace ? token.width + spaceExtra : token.width;

            if (!token.isSpace) {
              // Highlight background
              if (token.highlight) {
                const hlColor = parseHighlightColor(PDFLib, token.highlight);
                currentPage.drawRectangle({
                  x: curX - 0.5,
                  y: currentY - token.fontSize * 1.05,
                  width: tokenW + 1,
                  height: token.fontSize * 1.25,
                  color: hlColor,
                });
              }

              let drawY = currentY - token.fontSize;
              if (token.superscript) {
                drawY += token.fontSize * 0.4;
              } else if (token.subscript) {
                drawY -= token.fontSize * 0.15;
              }

              safeDrawText(currentPage, token.text, {
                x: curX,
                y: drawY,
                size: token.fontSize,
                font: token.font,
                color: token.color,
              });

              // Underline drawing
              if (token.underline) {
                const uY = currentY - token.fontSize - 1.5;
                currentPage.drawLine({
                  start: { x: curX, y: uY },
                  end: { x: curX + tokenW, y: uY },
                  thickness: Math.max(0.6, token.fontSize * 0.055),
                  color: token.color,
                });
              }

              // Strikethrough drawing
              if (token.strike) {
                const sY = currentY - token.fontSize * 0.52;
                currentPage.drawLine({
                  start: { x: curX, y: sY },
                  end: { x: curX + tokenW, y: sY },
                  thickness: Math.max(0.6, token.fontSize * 0.055),
                  color: token.color,
                });
              }
            }

            curX += tokenW;
          }

          currentY -= lineHeight;
        }

        currentY -= afterSpace;
      } else if (block.type === "table") {
        const tbl = block as DocxTableBlock;
        if (tbl.rows.length === 0) continue;

        // Detect header table with embedded image (CV profile photo)
        const tableImages = findImagesInBlocks(
          tbl.rows?.[0]?.cells?.flatMap((cell: any) => cell.blocks || []) || []
        );

        if (tableImages.length > 0 && tableImages[0]?.data) {
          currentY = await renderHeaderTable(
            tbl,
            pdfDoc,
            currentPage,
            {
              regular: fontSet.sans.regular,
              bold: fontSet.sans.bold,
              italic: fontSet.sans.italic,
              boldItalic: fontSet.sans.boldItalic,
            },
            PDFLib,
            currentMarginLeft,
            currentY,
            currentContentWidth
          );
          continue;
        }

        currentY -= 6;
        const totalCols = Math.max(...tbl.rows.map((r) => r.cells.reduce((acc, c) => acc + (c.colSpan || 1), 0)));
        if (totalCols === 0) continue;

        // Calculate proportional column widths
        let colWidths: number[] = [];
        if (tbl.colWidths && tbl.colWidths.length === totalCols) {
          const sumW = tbl.colWidths.reduce((a, b) => a + b, 0);
          colWidths = tbl.colWidths.map((w) => (w / sumW) * currentContentWidth);
        } else {
          colWidths = Array(totalCols).fill(currentContentWidth / totalCols);
        }

        const cellPadding = 5;

        for (let rIdx = 0; rIdx < tbl.rows.length; rIdx++) {
          const row = tbl.rows[rIdx];
          const isHeader = row.isHeader || rIdx === 0;

          // Compute cell bounding heights based on tokens
          let maxRowHeight = 22;
          const cellTokenLines: { cell: any; lines: any[]; width: number; colStart: number }[] = [];

          let colCursor = 0;
          for (const cell of row.cells) {
            const span = cell.colSpan || 1;
            let cellWidth = 0;
            for (let c = 0; c < span && colCursor + c < colWidths.length; c++) {
              cellWidth += colWidths[colCursor + c];
            }

            const allCellRuns: DocxTextRun[] = [];
            for (const p of cell.blocks) {
              if (p.type === "paragraph") {
                allCellRuns.push(...p.runs);
              }
            }

            const cellTokens = tokenizeParagraphRuns(
              allCellRuns,
              fontSet,
              isHeader ? 9 : 8.5,
              isHeader,
              PDFLib
            );

            // Wrap cell tokens
            const maxCellW = cellWidth - cellPadding * 2;
            const cLines: RichTextToken[][] = [];
            let cCurLine: RichTextToken[] = [];
            let cCurW = 0;

            for (const token of cellTokens) {
              if (cCurLine.length === 0 && token.isSpace) continue;
              if (cCurW + token.width <= maxCellW || cCurLine.length === 0) {
                cCurLine.push(token);
                cCurW += token.width;
              } else {
                cLines.push(cCurLine);
                cCurLine = token.isSpace ? [] : [token];
                cCurW = token.isSpace ? 0 : token.width;
              }
            }
            if (cCurLine.length > 0) cLines.push(cCurLine);

            const cellImageBlocks = (cell.blocks || []).filter((b) => b.type === "image") as DocxImageBlock[];
            const cellImageHeight = cellImageBlocks.length > 0
              ? Math.max(...cellImageBlocks.map((img) => (img.height || 50) + cellPadding * 2))
              : 0;
            const cellEstimatedH = Math.max(
              Math.max(1, cLines.length) * 11.5 + cellPadding * 2,
              cellImageHeight + cellPadding * 2
            );
            if (cellEstimatedH > maxRowHeight) maxRowHeight = cellEstimatedH;

            cellTokenLines.push({ cell, lines: cLines, width: cellWidth, colStart: colCursor });
            colCursor += span;
          }

          checkPageBreak(maxRowHeight);

          // Draw cells in row
          let currentCellX = currentMarginLeft;
          for (const item of cellTokenLines) {
            const cellBg = item.cell.bgColor
              ? parseHexColor(PDFLib, item.cell.bgColor)
              : isHeader
              ? PDFLib.rgb(0.94, 0.96, 0.98)
              : rIdx % 2 === 1
              ? PDFLib.rgb(0.98, 0.99, 1.0)
              : PDFLib.rgb(1, 1, 1);

            // Draw cell background
            currentPage.drawRectangle({
              x: currentCellX,
              y: currentY - maxRowHeight,
              width: item.width,
              height: maxRowHeight,
              color: cellBg,
              borderColor: PDFLib.rgb(0.85, 0.88, 0.92),
              borderWidth: 0.5,
            });

            const cellImages = (item.cell.blocks || []).filter((block: DocxBlock) => block.type === "image") as DocxImageBlock[];
            if (cellImages.length > 0) {
              const cellInnerWidth = item.width - cellPadding * 2;
              const imageTopY = currentY - maxRowHeight + cellPadding;
              let imageCursorX = currentCellX + cellPadding;
              for (const imgBlock of cellImages) {
                try {
                  const embeddedImg = await safelyEmbedImageInPdf(pdfDoc, imgBlock.data, imgBlock.mimeType);
                  let imgW = imgBlock.width || 60;
                  let imgH = imgBlock.height || 60;
                  const maxAllowedW = Math.max(24, cellInnerWidth * 0.8);
                  const scale = Math.min(1, maxAllowedW / imgW, (maxRowHeight - cellPadding * 3) / Math.max(1, imgH));
                  imgW *= scale;
                  imgH *= scale;

                  const drawX = Math.min(imageCursorX, currentCellX + item.width - cellPadding - imgW);
                  const drawY = imageTopY + (maxRowHeight - cellPadding * 2 - imgH) / 2;
                  currentPage.drawImage(embeddedImg, {
                    x: drawX,
                    y: drawY,
                    width: imgW,
                    height: imgH,
                  });
                  imageCursorX += imgW + 6;
                } catch (imgErr) {
                  console.warn("PDF table image draw warning:", imgErr);
                }
              }
            }

            // Draw cell text tokens
            for (let lIdx = 0; lIdx < item.lines.length; lIdx++) {
              const cLine = item.lines[lIdx];
              let drawTokenX = currentCellX + cellPadding;
              const drawTokenY = currentY - cellPadding - 9 - lIdx * 11.5;

              for (const token of cLine) {
                if (!token.isSpace) {
                  safeDrawText(currentPage, token.text, {
                    x: drawTokenX,
                    y: drawTokenY,
                    size: token.fontSize,
                    font: token.font,
                    color: token.color,
                  });
                }
                drawTokenX += token.width;
              }
            }

            currentCellX += item.width;
          }

          currentY -= maxRowHeight;
        }

        currentY -= 10;
      } else if (block.type === "image") {
        try {
          const imgBlock = block as DocxImageBlock;

          const embeddedImg = await safelyEmbedImageInPdf(
            pdfDoc,
            imgBlock.data,
            imgBlock.mimeType
          );

          let imgW = imgBlock.width || 120;
          let imgH = imgBlock.height || 120;
          if (imgW > 0 && imgH > 0) {
            const aspectRatio = imgW / imgH;
            const maxSingleDimension = 420;
            if (imgW > maxSingleDimension || imgH > maxSingleDimension) {
              if (aspectRatio >= 1) {
                imgW = maxSingleDimension;
                imgH = Math.max(10, maxSingleDimension / aspectRatio);
              } else {
                imgH = maxSingleDimension;
                imgW = Math.max(10, maxSingleDimension * aspectRatio);
              }
            }
          }

          /*
           * ABSOLUTE POSITIONED IMAGE
           * Used for photos/logos extracted from PDF.
           */
          if (
            imgBlock.position === "absolute" &&
            imgBlock.x !== undefined &&
            imgBlock.y !== undefined
          ) {
            /* Keep the image inside the page. */
            imgW = Math.min(imgW, currentSecPageWidth - imgBlock.x - 10);
            imgH = Math.min(imgH, currentSecPageHeight - imgBlock.y - 10);
            imgW = Math.max(1, imgW);
            imgH = Math.max(1, imgH);

            /* Convert top-left Y into pdf-lib bottom-left Y. */
            const drawX = imgBlock.x;
            const drawY = currentSecPageHeight - imgBlock.y - imgH;

            currentPage.drawImage(embeddedImg, {
              x: drawX,
              y: drawY,
              width: imgW,
              height: imgH,
            });

            /*
             * IMPORTANT: Do not change currentY.
             * Absolute images do not participate in normal document flow.
             */
            continue;
          }

          /*
           * NORMAL INLINE IMAGE
           */
          if (imgW > currentContentWidth) {
            const scale = currentContentWidth / imgW;
            imgW = currentContentWidth;
            imgH = Math.max(10, imgH * scale);
          }

          checkPageBreak(imgH + 20);

          const drawX = currentMarginLeft + (currentContentWidth - imgW) / 2;

          currentPage.drawImage(embeddedImg, {
            x: drawX,
            y: currentY - imgH,
            width: imgW,
            height: imgH,
          });

          currentY -= imgH + 16;
        } catch (imgErr) {
          console.warn("PDF typography image embedding warning:", imgErr);
        }
      }
    }
  }

  // Draw Page Numbers in Footer
  if (onProgress) onProgress("Finalizing multi-page layout and numbering...", 90);
  const totalPages = pages.length;
  for (let i = 0; i < totalPages; i++) {
    const pInfo = pages[i];
    const footerText = `Page ${i + 1} of ${totalPages}`;
    const textW = safeMeasureText(fontSet.sans.regular, footerText, 8.5);
    safeDrawText(pInfo.page, footerText, {
      x: (pInfo.width - textW) / 2,
      y: pInfo.marginBottom / 2,
      size: 8.5,
      font: fontSet.sans.regular,
      color: PDFLib.rgb(0.5, 0.55, 0.65),
    });
  }

  const pdfBytes = await pdfDoc.save();
  if (onProgress) onProgress("Document conversion completed successfully!", 100);
  return new Blob([pdfBytes], { type: "application/pdf" });
}

/**
 * Convert plain text or markdown paragraphs into a structured PDF
 */
export async function convertTextOrWordToPdf(
  textContent: string,
  title: string = "Document",
  onProgress?: (msg: string, pct: number) => void
): Promise<Blob> {
  const lines = textContent.split(/\r?\n/);
  const blocks: DocxBlock[] = [];

  let tableRowsAccumulator: string[][] = [];

  const flushTable = () => {
    if (tableRowsAccumulator.length > 0) {
      blocks.push({
        type: "table",
        rows: tableRowsAccumulator.map((rowCells, rIdx) => ({
          isHeader: rIdx === 0,
          cells: rowCells.map((c) => ({
            blocks: [
              {
                type: "paragraph",
                runs: [{ text: c }],
                spacingAfter: 0,
              },
            ],
          })),
        })),
      });
      tableRowsAccumulator = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushTable();
      continue;
    }

    if (line.includes(" | ") || (line.includes("\t") && line.split("\t").length > 1)) {
      const cols = line.includes(" | ") ? line.split(" | ").map((c) => c.trim()) : line.split("\t").map((c) => c.trim());
      tableRowsAccumulator.push(cols);
      continue;
    }

    flushTable();

    const isH1 = line.startsWith("# ");
    const isH2 = line.startsWith("## ");
    const isH3 = line.startsWith("### ") || (line.endsWith(":") && line.length < 50);
    const isList = line.startsWith("* ") || line.startsWith("- ") || line.startsWith("• ");

    const cleanText = line.replace(/^[#*•-]+\s*/, "");

    blocks.push({
      type: "paragraph",
      runs: [{ text: cleanText, bold: isH1 || isH2 || isH3 }],
      isHeading: isH1 || isH2 || isH3,
      headingLevel: isH1 ? 1 : isH2 ? 2 : isH3 ? 3 : undefined,
      isListItem: isList,
      spacingBefore: isH1 ? 12 : isH2 ? 8 : 2,
      spacingAfter: isH1 ? 6 : isH2 ? 4 : 4,
    });
  }

  flushTable();

  const model: DocumentModel = {
    title,
    sections: [
      {
        pageSize: { width: 595.28, height: 841.89 },
        margins: { top: 54, right: 54, bottom: 54, left: 54 },
        blocks,
      },
    ],
  };

  return convertDocumentModelToPdf(model, title, onProgress);
}

/**
 * Convert tabular rows (from spreadsheet or CSV) to formatted PDF
 */
export async function convertTableOrSpreadsheetToPdf(
  rows: string[][],
  title: string = "Spreadsheet",
  onProgress?: (msg: string, pct: number) => void
): Promise<Blob> {
  const model: DocumentModel = {
    title,
    sections: [
      {
        pageSize: { width: 841.89, height: 595.28 },
        margins: { top: 40, right: 40, bottom: 40, left: 40 },
        orientation: "landscape",
        blocks: [
          {
            type: "table",
            rows: rows.map((r, rIdx) => ({
              isHeader: rIdx === 0,
              cells: r.map((c) => ({
                blocks: [
                  {
                    type: "paragraph",
                    runs: [{ text: c }],
                    spacingAfter: 0,
                  },
                ],
              })),
            })),
          },
        ],
      },
    ],
  };

  return convertDocumentModelToPdf(model, title, onProgress);
}
