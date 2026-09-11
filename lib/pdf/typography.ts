/**
 * Toolqivo PDF Typography and Document Generation Engine
 * Handles Unicode transliteration, text-to-PDF, and spreadsheet-to-PDF formatting
 */

import { getPdfLib } from "./loader";
import { PdfEngineError } from "./errors";

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
 * Convert plain text or extracted Word paragraphs into a clean, multi-page PDF document
 */
export async function convertTextOrWordToPdf(
  textContent: string,
  title: string = "Document",
  onProgress?: (msg: string, pct: number) => void
): Promise<Blob> {
  if (onProgress) onProgress("Initializing PDF typography engine...", 20);
  const PDFLib = await getPdfLib();
  if (!PDFLib) {
    throw new PdfEngineError("PDF engine could not be loaded in browser.", "LOADER_ERROR");
  }

  if (onProgress) onProgress("Formatting document pages and typography...", 45);
  const pdfDoc = await PDFLib.PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);

  const pageWidth = 595.28; // Standard A4 (pt)
  const pageHeight = 841.89;
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;

  const fontSizeTitle = 18;
  const fontSizeBody = 10.5;
  const lineHeightTitle = 24;
  const lineHeightBody = 15;
  const paragraphSpacing = 8;

  const safeTitle = sanitizeTextForPdf(title);
  const safeContent = sanitizeTextForPdf(textContent);

  const wrapText = (text: string, font: any, size: number, maxWidth: number): string[] => {
    const lines: string[] = [];
    const words = text.split(/\s+/);
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = safeMeasureText(font, testLine, size);
      if (width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  const rawParagraphs = safeContent.split(/\r?\n/).map((p) => p.trim()).filter(Boolean);
  const linesToRender: { text: string; isTitle?: boolean; isHeader?: boolean; spaceAfter?: number }[] = [];

  // Title header
  linesToRender.push({ text: safeTitle, isTitle: true, spaceAfter: 16 });

  for (const para of rawParagraphs) {
    const isHeading =
      para.length < 60 &&
      (para.startsWith("#") || para.toUpperCase() === para || para.endsWith(":"));
    const cleanPara = para.replace(/^#+\s*/, "");

    if (isHeading) {
      linesToRender.push({ text: cleanPara, isHeader: true, spaceAfter: 6 });
    } else {
      const wrapped = wrapText(cleanPara, helvetica, fontSizeBody, contentWidth);
      for (let i = 0; i < wrapped.length; i++) {
        linesToRender.push({
          text: wrapped[i],
          spaceAfter: i === wrapped.length - 1 ? paragraphSpacing : 0,
        });
      }
    }
  }

  // Draw lines across pages
  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin - 20;

  for (let idx = 0; idx < linesToRender.length; idx++) {
    const line = linesToRender[idx];
    const isTitle = line.isTitle;
    const isHeader = line.isHeader;
    const font = isTitle || isHeader ? helveticaBold : helvetica;
    const size = isTitle ? fontSizeTitle : isHeader ? 12 : fontSizeBody;
    const lHeight = isTitle ? lineHeightTitle : isHeader ? 18 : lineHeightBody;
    const spaceAfter = line.spaceAfter || 0;

    if (y - lHeight < margin + 30) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }

    const textColor = isTitle
      ? PDFLib.rgb(0.06, 0.09, 0.16)
      : isHeader
      ? PDFLib.rgb(0.12, 0.16, 0.23)
      : PDFLib.rgb(0.2, 0.25, 0.33);

    safeDrawText(currentPage, line.text, {
      x: margin,
      y: y - size,
      size,
      font,
      color: textColor,
    });

    y -= lHeight + spaceAfter;
  }

  // Add footer with page numbers and thin rule
  const totalPages = pdfDoc.getPageCount();
  const pages = pdfDoc.getPages();
  for (let p = 0; p < totalPages; p++) {
    const pObj = pages[p];
    const footerText = `Page ${p + 1} of ${totalPages} - Converted with Toolqivo`;
    const fWidth = safeMeasureText(helvetica, footerText, 8.5);
    safeDrawText(pObj, footerText, {
      x: (pageWidth - fWidth) / 2,
      y: 28,
      size: 8.5,
      font: helvetica,
      color: PDFLib.rgb(0.6, 0.65, 0.7),
    });

    pObj.drawLine({
      start: { x: margin, y: 40 },
      end: { x: pageWidth - margin, y: 40 },
      thickness: 0.5,
      color: PDFLib.rgb(0.9, 0.92, 0.95),
    });
  }

  if (onProgress) onProgress("Generating PDF document...", 90);
  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
}

/**
 * Convert tabular grid data into a clean, grid-aligned, multi-page PDF document
 */
export async function convertTableOrSpreadsheetToPdf(
  tableData: string[][],
  title: string = "Spreadsheet",
  onProgress?: (msg: string, pct: number) => void
): Promise<Blob> {
  if (onProgress) onProgress("Initializing PDF spreadsheet engine...", 20);
  const PDFLib = await getPdfLib();
  if (!PDFLib) {
    throw new PdfEngineError("PDF engine could not be loaded in browser.", "LOADER_ERROR");
  }

  if (tableData.length === 0) {
    tableData = [
      ["Column 1", "Column 2", "Column 3"],
      ["Sample Data 1", "Sample Data 2", "Sample Data 3"],
    ];
  }

  // Normalize column count across all rows
  const maxCols = Math.max(...tableData.map((r) => r.length), 1);
  const normalizedRows = tableData.map((r) => {
    const row = [...r];
    while (row.length < maxCols) row.push("");
    return row.map((cell) => sanitizeTextForPdf(cell));
  });

  // Automatically select landscape if > 4 columns for best readability
  const isLandscape = maxCols > 4;
  const pageWidth = isLandscape ? 841.89 : 595.28;
  const pageHeight = isLandscape ? 595.28 : 841.89;
  const margin = 40;
  const tableWidth = pageWidth - margin * 2;

  if (onProgress) onProgress("Calculating table layout and column widths...", 40);
  const pdfDoc = await PDFLib.PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);

  // Calculate proportional column widths based on max content length
  const colMaxChars = new Array(maxCols).fill(4);
  normalizedRows.forEach((row) => {
    row.forEach((cell, cIdx) => {
      colMaxChars[cIdx] = Math.max(colMaxChars[cIdx], Math.min(cell.length, 30));
    });
  });
  const totalChars = colMaxChars.reduce((sum, c) => sum + c, 0) || 1;
  const colWidths = colMaxChars.map((c) => Math.max(50, (c / totalChars) * tableWidth));
  const curSum = colWidths.reduce((a, b) => a + b, 0);
  const scaleRatio = tableWidth / curSum;
  for (let i = 0; i < colWidths.length; i++) {
    colWidths[i] = colWidths[i] * scaleRatio;
  }

  const rowHeight = 22;
  const headerHeight = 26;
  const fontSize = 8.5;
  const headerFontSize = 9.5;

  const safeTitle = sanitizeTextForPdf(title);

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  // Title header
  safeDrawText(currentPage, safeTitle, {
    x: margin,
    y: y - 16,
    size: 16,
    font: helveticaBold,
    color: PDFLib.rgb(0.06, 0.09, 0.16),
  });

  safeDrawText(currentPage, `Exported with Toolqivo - ${normalizedRows.length} Rows, ${maxCols} Columns`, {
    x: margin,
    y: y - 32,
    size: 9,
    font: helvetica,
    color: PDFLib.rgb(0.4, 0.45, 0.55),
  });

  y -= 52;

  const drawHeaderRow = (page: any, atY: number) => {
    page.drawRectangle({
      x: margin,
      y: atY - headerHeight,
      width: tableWidth,
      height: headerHeight,
      color: PDFLib.rgb(0.92, 0.95, 0.98),
      borderColor: PDFLib.rgb(0.8, 0.85, 0.92),
      borderWidth: 1,
    });

    let cellX = margin;
    for (let c = 0; c < maxCols; c++) {
      const headerText = normalizedRows[0][c] || `Col ${c + 1}`;
      const cellW = colWidths[c];

      let display = headerText;
      while (safeMeasureText(helveticaBold, display, headerFontSize) > cellW - 12 && display.length > 2) {
        display = display.slice(0, -1);
      }

      safeDrawText(page, display, {
        x: cellX + 6,
        y: atY - headerHeight + 8,
        size: headerFontSize,
        font: helveticaBold,
        color: PDFLib.rgb(0.12, 0.18, 0.3),
      });

      if (c < maxCols - 1) {
        page.drawLine({
          start: { x: cellX + cellW, y: atY },
          end: { x: cellX + cellW, y: atY - headerHeight },
          thickness: 0.75,
          color: PDFLib.rgb(0.8, 0.85, 0.92),
        });
      }
      cellX += cellW;
    }
  };

  drawHeaderRow(currentPage, y);
  y -= headerHeight;

  const dataRows = normalizedRows.length > 1 ? normalizedRows.slice(1) : normalizedRows;

  for (let rIdx = 0; rIdx < dataRows.length; rIdx++) {
    const row = dataRows[rIdx];

    if (y - rowHeight < margin + 40) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
      drawHeaderRow(currentPage, y);
      y -= headerHeight;
    }

    const isEven = rIdx % 2 === 0;
    const bgColor = isEven ? PDFLib.rgb(1, 1, 1) : PDFLib.rgb(0.97, 0.98, 0.99);

    currentPage.drawRectangle({
      x: margin,
      y: y - rowHeight,
      width: tableWidth,
      height: rowHeight,
      color: bgColor,
      borderColor: PDFLib.rgb(0.88, 0.91, 0.95),
      borderWidth: 0.75,
    });

    let cellX = margin;
    for (let c = 0; c < maxCols; c++) {
      const cellW = colWidths[c];
      let cellText = row[c] || "";

      while (safeMeasureText(helvetica, cellText, fontSize) > cellW - 12 && cellText.length > 2) {
        cellText = cellText.slice(0, -1);
      }

      safeDrawText(currentPage, cellText, {
        x: cellX + 6,
        y: y - rowHeight + 7,
        size: fontSize,
        font: helvetica,
        color: PDFLib.rgb(0.2, 0.25, 0.35),
      });

      if (c < maxCols - 1) {
        currentPage.drawLine({
          start: { x: cellX + cellW, y },
          end: { x: cellX + cellW, y: y - rowHeight },
          thickness: 0.5,
          color: PDFLib.rgb(0.9, 0.92, 0.96),
        });
      }
      cellX += cellW;
    }

    y -= rowHeight;
  }

  // Add footers across all pages
  const totalPages = pdfDoc.getPageCount();
  const pages = pdfDoc.getPages();
  for (let p = 0; p < totalPages; p++) {
    const pObj = pages[p];
    const footerText = `Page ${p + 1} of ${totalPages} - Converted with Toolqivo Spreadsheet Engine`;
    const fWidth = safeMeasureText(helvetica, footerText, 8.5);
    safeDrawText(pObj, footerText, {
      x: (pageWidth - fWidth) / 2,
      y: 20,
      size: 8.5,
      font: helvetica,
      color: PDFLib.rgb(0.6, 0.65, 0.7),
    });
  }

  if (onProgress) onProgress("Finalizing PDF spreadsheet...", 95);
  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
}
