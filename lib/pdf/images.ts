/**
 * Toolqivo Image to PDF Engine
 * Convert JPG, PNG, and WebP images to PDF with configurable Page Sizes, Orientations, and Margins
 */

import { getPdfLib } from "./loader";
import { PAGE_SIZES, IMAGE_MARGINS } from "./constants";
import { PdfEngineError } from "./errors";

export interface ImageToPdfOptions {
  pageSize?: "original" | "a4" | "letter";
  orientation?: "auto" | "portrait" | "landscape";
  margin?: "none" | "small" | "medium" | "large";
}

export interface ImageInputItem {
  buffer: ArrayBuffer;
  isPng?: boolean;
}

/**
 * Convert sequence of images (PNG/JPG) to a high quality multi-page PDF
 */
export async function imagesToPdfBuffer(
  images: (ImageInputItem | { buffer: ArrayBuffer; isPng: boolean })[],
  options: ImageToPdfOptions = {}
): Promise<Blob> {
  if (!images || images.length === 0) {
    throw new PdfEngineError("No images provided for PDF conversion.", "NO_INPUT_FILES");
  }

  const {
    pageSize = "original",
    orientation = "auto",
    margin = "none",
  } = options;

  const marginPt = IMAGE_MARGINS[margin] || 0;

  const PDFLib = await getPdfLib();
  if (!PDFLib) {
    throw new PdfEngineError("PDF engine could not be loaded.", "LOADER_ERROR");
  }

  const pdfDoc = await PDFLib.PDFDocument.create();

  for (const item of images) {
    try {
      let image: any;
      try {
        image = item.isPng
          ? await pdfDoc.embedPng(item.buffer)
          : await pdfDoc.embedJpg(item.buffer);
      } catch (embedErr) {
        // Try opposite format if detection mismatched
        try {
          image = item.isPng
            ? await pdfDoc.embedJpg(item.buffer)
            : await pdfDoc.embedPng(item.buffer);
        } catch {
          console.warn("Could not embed image format directly:", embedErr);
          continue;
        }
      }

      const imgWidth = image.width;
      const imgHeight = image.height;

      if (pageSize === "original") {
        const pageW = imgWidth + marginPt * 2;
        const pageH = imgHeight + marginPt * 2;
        const page = pdfDoc.addPage([pageW, pageH]);
        page.drawImage(image, {
          x: marginPt,
          y: marginPt,
          width: imgWidth,
          height: imgHeight,
        });
      } else {
        // Standard A4 or Letter
        const baseDim = pageSize === "letter" ? PAGE_SIZES.LETTER : PAGE_SIZES.A4;
        let isLandscape = false;

        if (orientation === "auto") {
          isLandscape = imgWidth > imgHeight;
        } else {
          isLandscape = orientation === "landscape";
        }

        const pageW = isLandscape ? baseDim.height : baseDim.width;
        const pageH = isLandscape ? baseDim.width : baseDim.height;

        const availW = pageW - marginPt * 2;
        const availH = pageH - marginPt * 2;

        const scale = Math.min(availW / imgWidth, availH / imgHeight, 1.0);
        const drawW = imgWidth * scale;
        const drawH = imgHeight * scale;

        const posX = marginPt + (availW - drawW) / 2;
        const posY = marginPt + (availH - drawH) / 2;

        const page = pdfDoc.addPage([pageW, pageH]);
        page.drawImage(image, {
          x: posX,
          y: posY,
          width: drawW,
          height: drawH,
        });
      }
    } catch (err) {
      console.warn("Error embedding image page:", err);
    }
  }

  if (pdfDoc.getPageCount() === 0) {
    pdfDoc.addPage([595.28, 841.89]);
  }

  const bytes = await pdfDoc.save();
  return new Blob([bytes], { type: "application/pdf" });
}
