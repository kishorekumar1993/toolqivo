/**
 * Toolqivo PDF Split Engine
 * Extract page ranges, single pages, or split multi-page PDFs into standalone files
 */

import { getPdfLib } from "./loader";
import { validatePdfFileSize, validatePdfPageCount } from "./validation";
import { PdfEngineError, InvalidPdfError } from "./errors";

export interface SplitPageItem {
  pageNum: number;
  blob: Blob;
  fileName: string;
}

/**
 * Parse human page range strings like "1-3, 5, 8-10" into 0-indexed page number arrays
 */
export function parsePageRanges(rangeStr: string, totalPages: number): number[] {
  if (!rangeStr || !rangeStr.trim()) {
    return Array.from({ length: totalPages }, (_, i) => i);
  }

  const indices = new Set<number>();
  const tokens = rangeStr.split(/[,;\s]+/).map((t) => t.trim()).filter(Boolean);

  for (const token of tokens) {
    if (token.includes("-")) {
      const parts = token.split("-").map((p) => parseInt(p.trim(), 10));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        const start = Math.max(1, Math.min(parts[0], totalPages));
        const end = Math.max(1, Math.min(parts[1], totalPages));
        const minP = Math.min(start, end);
        const maxP = Math.max(start, end);
        for (let p = minP; p <= maxP; p++) {
          indices.add(p - 1);
        }
      }
    } else {
      const pageNum = parseInt(token, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        indices.add(pageNum - 1);
      }
    }
  }

  const result = Array.from(indices).sort((a, b) => a - b);
  return result.length > 0 ? result : [0];
}

/**
 * Get accurate PDF page count safely
 */
export async function getPdfPageCount(buffer: ArrayBuffer): Promise<number> {
  try {
    const PDFLib = await getPdfLib();
    if (PDFLib) {
      const doc = await PDFLib.PDFDocument.load(new Uint8Array(buffer.slice(0)), {
        ignoreEncryption: true,
        throwOnInvalidObject: false,
      });
      const count = doc.getPageCount();
      if (count > 0) return count;
    }
  } catch (err) {
    console.warn("Error reading page count with pdf-lib:", err);
  }
  return 1;
}

/**
 * Extract specific pages from a PDF buffer into a new single PDF Blob
 */
export async function splitPdfBuffer(
  buffer: ArrayBuffer,
  pageIndices: number[]
): Promise<Blob> {
  validatePdfFileSize(buffer.byteLength);
  const PDFLib = await getPdfLib();
  if (!PDFLib) {
    throw new PdfEngineError("PDF engine could not be loaded in browser.", "LOADER_ERROR");
  }

  try {
    const bufferCopy = new Uint8Array(buffer.slice(0));
    const srcDoc = await PDFLib.PDFDocument.load(bufferCopy, {
      ignoreEncryption: true,
      throwOnInvalidObject: false,
    });
    const totalPages = srcDoc.getPageCount();
    const newPdf = await PDFLib.PDFDocument.create();

    const validIndices = pageIndices.filter((idx) => idx >= 0 && idx < totalPages);
    const indicesToCopy = validIndices.length > 0 ? validIndices : [0];

    const copiedPages = await newPdf.copyPages(srcDoc, indicesToCopy);
    copiedPages.forEach((page: any) => newPdf.addPage(page));

    const splitBytes = await newPdf.save();
    return new Blob([splitBytes], { type: "application/pdf" });
  } catch (err: any) {
    throw new InvalidPdfError(`Failed to split PDF: ${err?.message || "Invalid PDF structure."}`);
  }
}

/**
 * Split every page of a PDF into its own individual PDF document
 */
export async function splitPdfToIndividualPages(
  buffer: ArrayBuffer,
  baseName: string = "document",
  onProgress?: (msg: string, percent: number) => void
): Promise<SplitPageItem[]> {
  validatePdfFileSize(buffer.byteLength, baseName);
  const PDFLib = await getPdfLib();
  if (!PDFLib) {
    throw new PdfEngineError("PDF engine could not be loaded in browser.", "LOADER_ERROR");
  }

  if (onProgress) onProgress("Loading document page stream...", 15);
  const bufferCopy = new Uint8Array(buffer.slice(0));
  const srcDoc = await PDFLib.PDFDocument.load(bufferCopy, {
    ignoreEncryption: true,
    throwOnInvalidObject: false,
  });
  const totalPages = srcDoc.getPageCount();
  validatePdfPageCount(totalPages, baseName);

  const results: SplitPageItem[] = [];

  for (let p = 1; p <= totalPages; p++) {
    if (onProgress) {
      onProgress(
        `Extracting page ${p} of ${totalPages} into individual PDF...`,
        20 + Math.round((p / totalPages) * 70)
      );
    }
    const singlePdf = await PDFLib.PDFDocument.create();
    const [copied] = await singlePdf.copyPages(srcDoc, [p - 1]);
    singlePdf.addPage(copied);
    const bytes = await singlePdf.save();
    const blob = new Blob([bytes], { type: "application/pdf" });
    results.push({
      pageNum: p,
      blob,
      fileName: `${baseName}-page-${p}.pdf`,
    });
  }

  if (onProgress) onProgress("All pages split successfully!", 100);
  return results;
}
