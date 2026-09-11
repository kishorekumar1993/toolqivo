/**
 * Toolqivo PDF Rotate Engine
 * Rotate PDF pages with strict angle validation and normalization
 */

import { getPdfLib } from "./loader";
import { validatePdfFileSize, normalizeRotationAngle } from "./validation";
import { PdfEngineError, InvalidPdfError } from "./errors";

/**
 * Rotate all pages in a PDF buffer by the specified angle (90, 180, 270 degrees)
 */
export async function rotatePdfBuffer(
  buffer: ArrayBuffer,
  rotationAngle: number
): Promise<Blob> {
  validatePdfFileSize(buffer.byteLength);
  const normalizedAngle = normalizeRotationAngle(rotationAngle);

  const PDFLib = await getPdfLib();
  if (!PDFLib) {
    throw new PdfEngineError("PDF library could not be loaded in browser.", "LOADER_ERROR");
  }

  try {
    const doc = await PDFLib.PDFDocument.load(buffer, {
      ignoreEncryption: true,
      throwOnInvalidObject: false,
    });
    const pages = doc.getPages();
    pages.forEach((p: any) => {
      const current = p.getRotation().angle || 0;
      p.setRotation(PDFLib.degrees((current + normalizedAngle) % 360));
    });
    const rotatedBytes = await doc.save();
    return new Blob([rotatedBytes], { type: "application/pdf" });
  } catch (err: any) {
    throw new InvalidPdfError(`Failed to rotate PDF: ${err?.message || "Invalid PDF document."}`);
  }
}
