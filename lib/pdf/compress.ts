/**
 * Toolqivo Real Client-Side PDF Compression Engine
 * Optimizes PDF streams, strips redundant objects, and re-encodes pages with adjustable compression ratios
 * 100% Client-Side with zero server upload.
 */

import { getPdfLib, getPdfJs } from "./loader";
import { PdfEngineError } from "./errors";

export type CompressionLevel = "extreme" | "recommended" | "less";

export async function compressPdfBuffer(
  buffer: ArrayBuffer,
  level: CompressionLevel = "recommended",
  onProgress?: (msg: string, pct: number) => void
): Promise<Blob> {
  const PDFLib = await getPdfLib();
  const pdfjs = await getPdfJs();

  if (!PDFLib) {
    throw new PdfEngineError("PDF library failed to load.", "LOADER_ERROR");
  }

  onProgress?.("Loading PDF document for optimization...", 15);

  try {
    // Strategy 1: First try stream-level optimization and object pruning with pdf-lib
    const sourceDoc = await PDFLib.PDFDocument.load(buffer, { ignoreEncryption: true });

    // If stream-only compression requested (or for documents without PDF.js)
    if (level === "less" || !pdfjs) {
      onProgress?.("Re-encoding PDF streams and removing unused objects...", 60);
      const optimizedBytes = await sourceDoc.save({
        useObjectStreams: true,
        addDefaultPage: false,
      });

      // If stream-level save actually reduced size, return it
      if (optimizedBytes.length < buffer.byteLength * 0.95) {
        return new Blob([new Uint8Array(optimizedBytes)], { type: "application/pdf" });
      }
    }

    // Strategy 2: For "recommended" and "extreme" compression, render pages at optimized scale and JPEG quality
    if (pdfjs && typeof document !== "undefined") {
      const cloned = new Uint8Array(buffer.slice(0));
      const loadingTask = pdfjs.getDocument({ data: cloned });
      const pdfDoc = await loadingTask.promise;
      const totalPages = pdfDoc.numPages;

      const newPdfDoc = await PDFLib.PDFDocument.create();

      // Configure scale and JPEG quality based on compression level
      const scale = level === "extreme" ? 1.0 : level === "recommended" ? 1.35 : 1.75;
      const jpegQuality = level === "extreme" ? 0.45 : level === "recommended" ? 0.65 : 0.82;

      for (let p = 1; p <= totalPages; p++) {
        const pct = 20 + Math.round((p / totalPages) * 65);
        onProgress?.(`Compressing page ${p} of ${totalPages}...`, pct);

        const page = await pdfDoc.getPage(p);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        const ctx = canvas.getContext("2d");

        if (ctx) {
          await page.render({ canvasContext: ctx, viewport }).promise;
          const dataUrl = canvas.toDataURL("image/jpeg", jpegQuality);
          const base64 = dataUrl.split(",")[1];
          const binStr = atob(base64);
          const imgBytes = new Uint8Array(binStr.length);
          for (let i = 0; i < binStr.length; i++) imgBytes[i] = binStr.charCodeAt(i);

          const embeddedImage = await newPdfDoc.embedJpg(imgBytes);
          const originalViewport = page.getViewport({ scale: 1.0 });
          const newPage = newPdfDoc.addPage([originalViewport.width, originalViewport.height]);
          newPage.drawImage(embeddedImage, {
            x: 0,
            y: 0,
            width: originalViewport.width,
            height: originalViewport.height,
          });
        }
      }

      onProgress?.("Finalizing compressed PDF package...", 90);
      const compressedBytes = await newPdfDoc.save({ useObjectStreams: true });
      return new Blob([new Uint8Array(compressedBytes)], { type: "application/pdf" });
    }

    // Fallback: save optimized pdf-lib
    const optimizedBytes = await sourceDoc.save({ useObjectStreams: true });
    return new Blob([new Uint8Array(optimizedBytes)], { type: "application/pdf" });
  } catch (err: any) {
    console.warn("PDF compression fallback:", err);
    return new Blob([buffer], { type: "application/pdf" });
  }
}
