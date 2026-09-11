/**
 * Toolqivo PDF Engine Constants and Limits
 */

export const PDF_LIMITS = {
  /** Maximum supported file size in bytes (100 MB) */
  MAX_FILE_SIZE_BYTES: 100 * 1024 * 1024,
  /** Maximum supported file size in MB */
  MAX_FILE_SIZE_MB: 100,
  /** Maximum safe page count for intensive operations */
  MAX_PAGES: 500,
  /** Recommended batch size for large page renders */
  RENDER_BATCH_SIZE: 20,
} as const;

export const ALLOWED_ROTATION_ANGLES = [90, 180, 270, -90, -180, -270] as const;

export const PAGE_SIZES = {
  A4: { width: 595.28, height: 841.89 },
  LETTER: { width: 612.0, height: 792.0 },
  LEGAL: { width: 612.0, height: 1008.0 },
} as const;

export const IMAGE_MARGINS = {
  none: 0,
  small: 20,
  medium: 40,
  large: 60,
} as const;
