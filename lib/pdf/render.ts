/**
 * Toolqivo PDF Rendering Engine
 * High-performance, memory-efficient PDF page rendering with reusable canvas and resource disposal
 */

import { getPdfJs } from "./loader";
import { validatePdfFileSize, validatePdfPageCount } from "./validation";
import { PdfEngineError, InvalidPdfError } from "./errors";

export interface RenderedJpgPage {
  pageNum: number;
  blob: Blob;
  dataUrl: string;
  fileName: string;
}

/**
 * Render all or selected pages of a PDF to high quality JPG images
 * Uses a single reusable canvas, explicitly cleans up page memory, and prevents memory leaks
 */
export async function renderPdfBufferToJpgPages(
  buffer: ArrayBuffer,
  quality: "high" | "standard" = "high",
  baseName: string = "document",
  onProgress?: (msg: string, percent: number) => void
): Promise<RenderedJpgPage[]> {
  validatePdfFileSize(buffer.byteLength, baseName);

  if (onProgress) onProgress("Initializing PDF rendering engine...", 10);
  const pdfjs = await getPdfJs();

  if (!pdfjs) {
    throw new PdfEngineError(
      "PDF rendering engine could not be loaded. Please check your internet connection.",
      "LOADER_ERROR"
    );
  }

  let pdfDoc: any = null;
  let canvas: HTMLCanvasElement | null = null;

  try {
    const cloned = new Uint8Array(buffer.slice(0));
    const loadingTask = pdfjs.getDocument({ data: cloned });
    pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;

    validatePdfPageCount(numPages, baseName);

    const scale = quality === "high" ? 2.0 : 1.25;
    const pages: RenderedJpgPage[] = [];

    // Allocate single reusable canvas for all pages to avoid browser memory bloat
    canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: false });

    if (!ctx) {
      throw new PdfEngineError(
        "Could not create 2D rendering canvas in your browser.",
        "CANVAS_ERROR"
      );
    }

    for (let p = 1; p <= numPages; p++) {
      if (onProgress) {
        onProgress(
          `Rendering page ${p} of ${numPages} to high-res JPG...`,
          15 + Math.round((p / numPages) * 75)
        );
      }

      const page = await pdfDoc.getPage(p);
      const viewport = page.getViewport({ scale });

      // Resize reusable canvas to fit current page
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Fill background with clean white (PDFs often have transparent backgrounds)
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Render page content
      await page.render({ canvasContext: ctx, viewport }).promise;

      // Export high-quality image
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      const blob = await new Promise<Blob>((resolve) => {
        canvas!.toBlob(
          (b) => resolve(b || new Blob([], { type: "image/jpeg" })),
          "image/jpeg",
          0.92
        );
      });

      pages.push({
        pageNum: p,
        blob,
        dataUrl,
        fileName: `${baseName}-page-${p}.jpg`,
      });

      // Immediately free internal PDF.js page resources and caches
      if (typeof page.cleanup === "function") {
        page.cleanup();
      }
    }

    if (onProgress) onProgress("All pages successfully converted to JPG!", 100);
    return pages;
  } catch (err: any) {
    if (err instanceof PdfEngineError) throw err;
    console.error("PDF rendering error:", err);
    throw new InvalidPdfError(
      `Failed to render PDF pages: ${err?.message || "Corrupted or unreadable PDF structure."}`
    );
  } finally {
    // Explicitly release canvas memory
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
      canvas = null;
    }
    // Clean up document resources
    if (pdfDoc && typeof pdfDoc.cleanup === "function") {
      pdfDoc.cleanup();
    }
    if (pdfDoc && typeof pdfDoc.destroy === "function") {
      pdfDoc.destroy();
    }
  }
}
