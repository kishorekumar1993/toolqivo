/**
 * Toolqivo PDF Merge Engine
 * Combines multiple PDF files into a single valid PDF with encryption detection and memory protection
 */

import { getPdfLib } from "./loader";
import { validatePdfFileSize, validatePdfPageCount, isPdfEncrypted } from "./validation";
import { PdfEngineError, InvalidPdfError, PasswordRequiredError } from "./errors";

/**
 * Merge multiple PDF buffers into a single valid PDF Blob
 */
export async function mergePdfBuffers(
  buffers: ArrayBuffer[],
  onProgress?: (msg: string, percent: number) => void
): Promise<Blob> {
  if (!buffers || buffers.length === 0) {
    throw new PdfEngineError("No PDF files selected for merging.", "NO_INPUT_FILES");
  }

  if (buffers.length === 1) {
    throw new PdfEngineError("Please select at least 2 PDF files to merge.", "INSUFFICIENT_FILES");
  }

  // Pre-validate file sizes and encryption status
  for (let i = 0; i < buffers.length; i++) {
    const docNum = i + 1;
    validatePdfFileSize(buffers[i].byteLength, `Document #${docNum}`);

    if (isPdfEncrypted(buffers[i])) {
      throw new PasswordRequiredError(
        `Document #${docNum} is password-protected. Please unlock all encrypted files before merging.`
      );
    }
  }

  if (onProgress) onProgress("Initializing PDF merge engine...", 15);
  const PDFLib = await getPdfLib();

  if (!PDFLib) {
    throw new PdfEngineError(
      "PDF engine could not be loaded. Please check your internet connection.",
      "LOADER_ERROR"
    );
  }

  if (onProgress) onProgress("Creating merged document structure...", 25);
  const mergedPdf = await PDFLib.PDFDocument.create();

  let totalPagesCombined = 0;

  for (let i = 0; i < buffers.length; i++) {
    const docNum = i + 1;
    if (onProgress) {
      onProgress(
        `Merging document ${docNum} of ${buffers.length}...`,
        25 + Math.round(((i + 1) / buffers.length) * 60)
      );
    }

    try {
      const bufferCopy = new Uint8Array(buffers[i].slice(0));
      const srcDoc = await PDFLib.PDFDocument.load(bufferCopy, {
        ignoreEncryption: false,
        throwOnInvalidObject: true,
      });

      const pageCount = srcDoc.getPageCount();
      if (pageCount === 0) {
        console.warn(`Document #${docNum} contains 0 pages`);
        continue;
      }

      validatePdfPageCount(totalPagesCombined + pageCount, `Merged Output`);

      const pageIndices = srcDoc.getPageIndices();
      const copiedPages = await mergedPdf.copyPages(srcDoc, pageIndices);
      for (const page of copiedPages) {
        mergedPdf.addPage(page);
        totalPagesCombined++;
      }
    } catch (docErr: any) {
      if (docErr instanceof PdfEngineError) throw docErr;
      const errMsg = docErr?.message?.toLowerCase() || "";
      if (errMsg.includes("encrypt") || errMsg.includes("password")) {
        throw new PasswordRequiredError(
          `Document #${docNum} is password-protected. Please unlock it before merging.`
        );
      }
      throw new InvalidPdfError(
        `Failed to read PDF document #${docNum}: ${docErr?.message || "Invalid or corrupted file"}`
      );
    }
  }

  if (totalPagesCombined === 0) {
    throw new InvalidPdfError("No valid pages could be extracted from the provided PDF files.");
  }

  if (onProgress) onProgress("Compiling and generating merged PDF...", 90);
  const mergedBytes = await mergedPdf.save();
  return new Blob([mergedBytes], { type: "application/pdf" });
}
