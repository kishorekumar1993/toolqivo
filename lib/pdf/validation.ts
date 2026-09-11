/**
 * Toolqivo PDF Engine Validation Utilities
 */

import { PDF_LIMITS, ALLOWED_ROTATION_ANGLES } from "./constants";
import { FileTooLargeError, PageLimitExceededError, InvalidPdfError } from "./errors";

/**
 * Validate that an ArrayBuffer or File meets size safety limits
 */
export function validatePdfFileSize(sizeInBytes: number, fileName?: string): void {
  if (sizeInBytes > PDF_LIMITS.MAX_FILE_SIZE_BYTES) {
    const sizeMb = sizeInBytes / (1024 * 1024);
    throw new FileTooLargeError(sizeMb, PDF_LIMITS.MAX_FILE_SIZE_MB);
  }
}

/**
 * Validate page count limits to protect client memory
 */
export function validatePdfPageCount(pageCount: number, fileName?: string): void {
  if (pageCount > PDF_LIMITS.MAX_PAGES) {
    throw new PageLimitExceededError(pageCount, PDF_LIMITS.MAX_PAGES);
  }
}

/**
 * Validate and normalize rotation angle (supports negative degrees)
 */
export function normalizeRotationAngle(angle: number): number {
  const normalized = ((angle % 360) + 360) % 360;
  if (![90, 180, 270].includes(normalized)) {
    throw new InvalidPdfError(
      `Invalid rotation angle: ${angle}°. Rotation angle must be 90°, 180°, or 270°.`
    );
  }
  return normalized;
}

/**
 * Fast check if buffer has valid PDF magic header (%PDF-)
 */
export function hasPdfHeader(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 5) return false;
  const header = new Uint8Array(buffer.slice(0, 5));
  // %PDF- is [0x25, 0x50, 0x44, 0x46, 0x2D]
  return (
    header[0] === 0x25 &&
    header[1] === 0x50 &&
    header[2] === 0x44 &&
    header[3] === 0x46 &&
    header[4] === 0x2d
  );
}

/**
 * Fast scanner to check if PDF buffer contains /Encrypt dictionary
 */
export function isPdfEncrypted(buffer: ArrayBuffer): boolean {
  try {
    const bytes = new Uint8Array(buffer);
    const len = Math.min(bytes.length, 1024 * 512); // Scan first and last 512KB
    const startStr = new TextDecoder("latin1").decode(bytes.subarray(0, len));
    if (startStr.includes("/Encrypt")) return true;

    if (bytes.length > len) {
      const endStr = new TextDecoder("latin1").decode(
        bytes.subarray(Math.max(0, bytes.length - len))
      );
      if (endStr.includes("/Encrypt")) return true;
    }
  } catch {}
  return false;
}
