/**
 * Toolqivo Universal Client-Side Download Engine
 * Secure, memory-safe, 100% on-device download engine for all Toolqivo tools.
 * 
 * Features:
 * - Filename sanitization against OS-restricted characters and length limits
 * - Robust Data URL parser supporting both Base64 and URL-encoded streams
 * - Explicit MIME type precedence over internal Blob metadata
 * - Validated object URL lifecycle management with automatic memory cleanup
 * - Zero API or external server dependencies
 */

export type DownloadableData = Blob | ArrayBuffer | Uint8Array | string;

export interface DownloadOptions {
  /** Explicit MIME type override (e.g. "application/pdf", "image/png") */
  mimeType?: string;
  /** Milliseconds before revoking the Object URL (clamped to safe 1,000 - 120,000ms range; default: 20,000ms) */
  autoRevokeMs?: number;
  /** Callback fired immediately when browser download click is successfully triggered */
  onTriggered?: () => void;
  /** Backward-compatible alias for onTriggered */
  onSuccess?: () => void;
  /** Callback fired if an error occurs during preparation or triggering */
  onError?: (err: Error) => void;
}

const MIME_MAP: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ppt: "application/vnd.ms-powerpoint",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  txt: "text/plain;charset=utf-8",
  json: "application/json;charset=utf-8",
  csv: "text/csv;charset=utf-8",
  xml: "application/xml;charset=utf-8",
  html: "text/html;charset=utf-8",
  zip: "application/zip",
  tar: "application/x-tar",
  gz: "application/gzip",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  wav: "audio/wav",
};

/**
 * Sanitize filename by removing dangerous or reserved OS characters and enforcing length limits
 */
export function sanitizeFilename(filename: string, fallback = "download"): string {
  if (!filename || typeof filename !== "string") {
    return fallback;
  }

  // Remove control characters (0x00-0x1F, 0x7F) and illegal path characters: < > : " / \ | ? *
  let clean = filename
    .replace(/[<>:"/\\|?*\x00-\x1F\x7F]/g, "_")
    .replace(/\s+/g, " ")
    .trim();

  // Prevent dot-only or reserved windows filenames (CON, PRN, AUX, NUL, COM1..9, LPT1..9)
  const baseName = clean.split(".")[0]?.toUpperCase();
  const reserved = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/;
  if (reserved.test(baseName)) {
    clean = `file_${clean}`;
  }

  // Clamp maximum filename length (Windows MAX_PATH compatibility)
  if (clean.length > 240) {
    const extIdx = clean.lastIndexOf(".");
    if (extIdx !== -1 && extIdx > clean.length - 10) {
      const ext = clean.substring(extIdx);
      clean = clean.substring(0, 240 - ext.length) + ext;
    } else {
      clean = clean.substring(0, 240);
    }
  }

  return clean || fallback;
}

/**
 * Infer proper MIME type from filename extension if not explicitly specified
 */
export function inferMimeType(filename: string, fallback = "application/octet-stream"): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext && MIME_MAP[ext]) {
    return MIME_MAP[ext];
  }
  return fallback;
}

/**
 * Robust Data URL parser supporting both Base64 and Percent-Encoded data URLs
 */
function parseDataUrl(dataUrl: string, fallbackMime: string): Blob {
  const commaIdx = dataUrl.indexOf(",");
  if (commaIdx === -1) {
    return new Blob([dataUrl], { type: fallbackMime });
  }

  const metaPart = dataUrl.substring(5, commaIdx); // After "data:"
  const rawData = dataUrl.substring(commaIdx + 1);

  const metaTokens = metaPart.split(";");
  const extractedMime = metaTokens[0]?.trim() || fallbackMime;
  const isBase64 = metaTokens.includes("base64");

  if (isBase64) {
    try {
      const byteString = atob(rawData.trim());
      const len = byteString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = byteString.charCodeAt(i);
      }
      return new Blob([bytes], { type: extractedMime });
    } catch {
      // If atob fails, fallback to percent decoding
      return new Blob([decodeURIComponent(rawData)], { type: extractedMime });
    }
  } else {
    // Percent-encoded plain text / SVG / JSON
    try {
      const decoded = decodeURIComponent(rawData);
      return new Blob([decoded], { type: extractedMime });
    } catch {
      return new Blob([rawData], { type: extractedMime });
    }
  }
}

/**
 * Downloads any client-side file directly to the user's browser with the exact filename and extension.
 *
 * @param data - The file data as Blob, ArrayBuffer, Uint8Array, string, or Data URL
 * @param filename - The target filename (e.g. "my-document.pdf", "report.xlsx")
 * @param options - Configuration options (MIME override, revocation timeout, triggers)
 */
export function downloadFile(
  data: DownloadableData,
  filename: string,
  options: DownloadOptions = {}
): boolean {
  if (typeof window === "undefined") return false;

  try {
    const safeName = sanitizeFilename(filename);
    const defaultMime = inferMimeType(safeName);
    const targetMime = options.mimeType || defaultMime;

    let blob: Blob;

    if (data instanceof Blob) {
      // If user passed explicit mimeType and it differs from blob.type, re-wrap it with user's mimeType
      if (options.mimeType && data.type !== options.mimeType) {
        blob = new Blob([data], { type: options.mimeType });
      } else if (data.type && data.type !== "application/octet-stream") {
        blob = data;
      } else {
        blob = new Blob([data], { type: targetMime });
      }
    } else if (data instanceof Uint8Array) {
      blob = new Blob([data as BlobPart], { type: targetMime });
    } else if (data instanceof ArrayBuffer) {
      blob = new Blob([data], { type: targetMime });
    } else if (typeof data === "string") {
      if (data.startsWith("data:")) {
        blob = parseDataUrl(data, targetMime);
      } else {
        blob = new Blob([data], { type: targetMime });
      }
    } else {
      throw new Error("Unsupported data format for client-side download.");
    }

    // Generate Object URL
    const url = URL.createObjectURL(blob);

    // Create anchor element with explicit download attribute
    const anchor = document.createElement("a");
    anchor.style.display = "none";
    anchor.href = url;
    anchor.setAttribute("download", safeName);
    anchor.download = safeName;
    anchor.rel = "noopener noreferrer";

    document.body.appendChild(anchor);

    // Trigger click synchronously
    anchor.click();

    // Clean up DOM element
    setTimeout(() => {
      if (anchor.parentNode) {
        anchor.parentNode.removeChild(anchor);
      }
    }, 100);

    // Safe Object URL revocation window (clamped between 1s and 120s; default 20s)
    const revokeMs = Math.min(
      120000,
      Math.max(1000, options.autoRevokeMs ?? 20000)
    );

    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    }, revokeMs);

    // Trigger callbacks
    if (options.onTriggered) {
      options.onTriggered();
    }
    if (options.onSuccess) {
      options.onSuccess();
    }

    return true;
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error("Unknown error occurred during download.");
    console.error("Toolqivo download engine error:", error);
    if (options.onError) {
      options.onError(error);
    }
    return false;
  }
}
