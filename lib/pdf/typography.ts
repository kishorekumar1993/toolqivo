/**
 * Toolqivo PDF Typography and Document Layout Engine
 * Converts Document Models, Word DOCX structure, and rich tabular data into clean, multi-page PDFs
 * 100% Client-Side with zero server upload.
 */

import { getPdfLib } from "./loader";
import { PdfEngineError } from "./errors";
import { DocumentModel, DocxParagraphBlock, DocxTableBlock, DocxBlock } from "../document/docx";

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
function parseHexColor(PDFLib: any, hex?: string, defaultColor = { r: 0.1, g: 0.15, b: 0.2 }) {
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
 * Wrap text into lines based on available maxWidth
 */
function wrapWords(font: any, text: string, fontSize: number, maxWidth: number): string[] {
  const lines: string[] = [];
  const words = text.split(/\s+/);
  let currentLine = "";

  for (const word of words) {
    if (!word) continue;
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = safeMeasureText(font, testLine, fontSize);
    if (width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [text];
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

  if (onProgress) onProgress("Embedding typography and font glyphs...", 35);
  const pdfDoc = await PDFLib.PDFDocument.create();

  const regularFont = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);
  const italicFont = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaOblique);
  const boldItalicFont = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBoldOblique);

  // Document default settings
  const firstSection = model.sections[0] || {
    pageSize: { width: 595.28, height: 841.89 },
    margins: { top: 54, right: 54, bottom: 54, left: 54 },
    blocks: [],
  };

  const pageWidth = firstSection.pageSize?.width || 595.28;
  const pageHeight = firstSection.pageSize?.height || 841.89;
  const marginTop = Math.max(36, firstSection.margins?.top || 54);
  const marginRight = Math.max(36, firstSection.margins?.right || 54);
  const marginBottom = Math.max(36, firstSection.margins?.bottom || 54);
  const marginLeft = Math.max(36, firstSection.margins?.left || 54);
  const contentWidth = pageWidth - marginLeft - marginRight;

  const pages: any[] = [];
  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  pages.push(currentPage);
  let currentY = pageHeight - marginTop;

  const checkPageBreak = (neededHeight: number) => {
    if (currentY - neededHeight < marginBottom) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      pages.push(currentPage);
      currentY = pageHeight - marginTop;
    }
  };

  if (onProgress) onProgress("Rendering document sections and typography...", 60);

  // Document Title Header (if not empty and not matching first heading)
  const safeDocTitle = sanitizeTextForPdf(docTitle);
  if (safeDocTitle && safeDocTitle !== "Document") {
    safeDrawText(currentPage, safeDocTitle, {
      x: marginLeft,
      y: currentY - 18,
      size: 18,
      font: boldFont,
      color: PDFLib.rgb(0.06, 0.09, 0.16),
    });
    currentY -= 32;
  }

  // Iterate sections and blocks
  for (const section of model.sections) {
    for (const block of section.blocks) {
      if (block.type === "paragraph") {
        const para = block as DocxParagraphBlock;
        const isHeading = para.isHeading;
        const level = para.headingLevel || 1;
        const isListItem = para.isListItem;

        const fontSize = isHeading ? (level === 1 ? 16 : level === 2 ? 13 : 11.5) : 10;
        const lineHeight = fontSize * 1.35;
        const beforeSpace = para.spacingBefore || (isHeading ? 10 : 2);
        const afterSpace = para.spacingAfter || (isHeading ? 6 : 4);

        currentY -= beforeSpace;
        checkPageBreak(lineHeight + afterSpace);

        const indent = isListItem ? 16 : 0;
        const maxTextWidth = contentWidth - indent;

        // Draw bullet point icon if list item
        if (isListItem) {
          safeDrawText(currentPage, "*", {
            x: marginLeft + 4,
            y: currentY - fontSize,
            size: fontSize,
            font: boldFont,
            color: PDFLib.rgb(0.05, 0.58, 0.53),
          });
        }

        // Aggregate runs into formatted lines
        for (const run of para.runs) {
          const runText = sanitizeTextForPdf(run.text);
          if (!runText) continue;

          let runFont = regularFont;
          if (run.bold && run.italic) runFont = boldItalicFont;
          else if (run.bold || isHeading) runFont = boldFont;
          else if (run.italic) runFont = italicFont;

          const runFontSize = run.fontSize || fontSize;
          const runColor = parseHexColor(PDFLib, run.color, isHeading ? { r: 0.06, g: 0.09, b: 0.16 } : { r: 0.12, g: 0.16, b: 0.23 });

          const wrappedLines = wrapWords(runFont, runText, runFontSize, maxTextWidth);

          for (const line of wrappedLines) {
            checkPageBreak(lineHeight);
            let drawX = marginLeft + indent;
            if (para.alignment === "center") {
              const textW = safeMeasureText(runFont, line, runFontSize);
              drawX = marginLeft + (contentWidth - textW) / 2;
            } else if (para.alignment === "right") {
              const textW = safeMeasureText(runFont, line, runFontSize);
              drawX = marginLeft + contentWidth - textW;
            }

            safeDrawText(currentPage, line, {
              x: drawX,
              y: currentY - runFontSize,
              size: runFontSize,
              font: runFont,
              color: runColor,
            });

            currentY -= lineHeight;
          }
        }

        currentY -= afterSpace;
      } else if (block.type === "table") {
        const tbl = block as DocxTableBlock;
        if (tbl.rows.length === 0) continue;

        currentY -= 8;
        const numCols = Math.max(...tbl.rows.map((r) => r.cells.length));
        if (numCols === 0) continue;

        const colWidth = contentWidth / numCols;
        const cellPadding = 5;

        for (let rIdx = 0; rIdx < tbl.rows.length; rIdx++) {
          const row = tbl.rows[rIdx];
          const isHeader = row.isHeader || rIdx === 0;

          // Compute row height based on cell text wraps
          let maxCellLines = 1;
          const cellLinesList: string[][] = [];

          for (let cIdx = 0; cIdx < numCols; cIdx++) {
            const cell = row.cells[cIdx];
            const cellText = cell
              ? cell.blocks
                  .map((p) => p.runs.map((r) => r.text).join(""))
                  .join(" ")
              : "";
            const safeCell = sanitizeTextForPdf(cellText);
            const wrapped = wrapWords(isHeader ? boldFont : regularFont, safeCell, 9, colWidth - cellPadding * 2);
            cellLinesList.push(wrapped);
            if (wrapped.length > maxCellLines) maxCellLines = wrapped.length;
          }

          const rowHeight = maxCellLines * 12 + cellPadding * 2;
          checkPageBreak(rowHeight);

          // Draw row background
          const rowBg = isHeader
            ? PDFLib.rgb(0.94, 0.96, 0.98) // slate-100
            : rIdx % 2 === 1
            ? PDFLib.rgb(0.98, 0.99, 1.0)
            : PDFLib.rgb(1, 1, 1);

          currentPage.drawRectangle({
            x: marginLeft,
            y: currentY - rowHeight,
            width: contentWidth,
            height: rowHeight,
            color: rowBg,
            borderColor: PDFLib.rgb(0.85, 0.88, 0.92),
            borderWidth: 0.5,
          });

          // Draw cell borders & text
          for (let cIdx = 0; cIdx < numCols; cIdx++) {
            const cellX = marginLeft + cIdx * colWidth;
            const lines = cellLinesList[cIdx] || [];

            for (let lIdx = 0; lIdx < lines.length; lIdx++) {
              safeDrawText(currentPage, lines[lIdx], {
                x: cellX + cellPadding,
                y: currentY - cellPadding - 9 - lIdx * 12,
                size: 9,
                font: isHeader ? boldFont : regularFont,
                color: isHeader ? PDFLib.rgb(0.06, 0.09, 0.16) : PDFLib.rgb(0.12, 0.16, 0.23),
              });
            }

            // Cell vertical right border
            if (cIdx < numCols - 1) {
              currentPage.drawLine({
                start: { x: cellX + colWidth, y: currentY },
                end: { x: cellX + colWidth, y: currentY - rowHeight },
                thickness: 0.5,
                color: PDFLib.rgb(0.88, 0.91, 0.95),
              });
            }
          }

          currentY -= rowHeight;
        }

        currentY -= 10;
      }
    }
  }

  // Draw Page Numbers in Footer
  if (onProgress) onProgress("Finalizing multi-page layout and numbering...", 90);
  const totalPages = pages.length;
  for (let i = 0; i < totalPages; i++) {
    const p = pages[i];
    const footerText = `Page ${i + 1} of ${totalPages}`;
    const textW = safeMeasureText(regularFont, footerText, 8.5);
    safeDrawText(p, footerText, {
      x: (pageWidth - textW) / 2,
      y: marginBottom / 2,
      size: 8.5,
      font: regularFont,
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
        pageSize: { width: 841.89, height: 595.28 }, // Landscape A4 for wide tables
        margins: { top: 40, right: 40, bottom: 40, left: 40 },
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
