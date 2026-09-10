/**
 * Toolqivo Client-Side Download Engine
 * Universal, secure, 100% on-device file download utility.
 * Guarantees correct filename preservation, MIME type headers, and safe Object URL cleanup.
 */

export type DownloadableData = Blob | ArrayBuffer | Uint8Array | string;

export interface DownloadOptions {
  mimeType?: string;
  autoRevokeMs?: number;
  onSuccess?: () => void;
  onError?: (err: Error) => void;
}

const MIME_MAP: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
  txt: "text/plain;charset=utf-8",
  json: "application/json;charset=utf-8",
  csv: "text/csv;charset=utf-8",
  zip: "application/zip",
};

/**
 * Infer proper MIME type from filename extension if not provided
 */
function inferMimeType(filename: string, fallback = "application/octet-stream"): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext && MIME_MAP[ext]) {
    return MIME_MAP[ext];
  }
  return fallback;
}

/**
 * Downloads any client-side file directly to the user's browser with the exact filename and extension.
 *
 * @param data - The file data as Blob, ArrayBuffer, Uint8Array, or string
 * @param filename - The exact target filename (e.g. "my-document.docx", "photo.jpg")
 * @param options - Optional custom MIME type or revocation delay
 */
export function downloadFile(
  data: DownloadableData,
  filename: string,
  options: DownloadOptions = {}
): boolean {
  if (typeof window === "undefined") return false;

  try {
    const defaultMime = inferMimeType(filename);
    const mimeType = options.mimeType || defaultMime;

    let blob: Blob;

    if (data instanceof Blob) {
      // Ensure the blob has the explicit MIME type
      if (data.type && data.type !== "application/octet-stream") {
        blob = data;
      } else {
        blob = new Blob([data], { type: mimeType });
      }
    } else if (data instanceof Uint8Array) {
      blob = new Blob([new Uint8Array(data)], { type: mimeType });
    } else if (data instanceof ArrayBuffer) {
      blob = new Blob([data], { type: mimeType });
    } else if (typeof data === "string") {
      // Handle data URL or raw text
      if (data.startsWith("data:")) {
        const parts = data.split(",");
        const byteString = atob(parts[1]);
        const mimeString = parts[0].split(":")[1].split(";")[0] || mimeType;
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        blob = new Blob([ab], { type: mimeString });
      } else {
        blob = new Blob([data], { type: mimeType });
      }
    } else {
      throw new Error("Unsupported data format for client-side download");
    }

    // Generate Object URL
    const url = URL.createObjectURL(blob);

    // Create anchor element with explicit download attribute
    const anchor = document.createElement("a");
    anchor.style.display = "none";
    anchor.href = url;
    anchor.setAttribute("download", filename);
    anchor.download = filename;
    anchor.rel = "noopener noreferrer";

    document.body.appendChild(anchor);

    // Trigger click synchronously
    anchor.click();

    // Remove anchor from DOM
    setTimeout(() => {
      if (anchor.parentNode) {
        anchor.parentNode.removeChild(anchor);
      }
    }, 100);

    // Revoke object URL after safe window (60s delay ensures Chrome/Edge background stream finishes)
    const revokeMs = options.autoRevokeMs ?? 60000;
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    }, revokeMs);

    if (options.onSuccess) {
      options.onSuccess();
    }

    return true;
  } catch (err: any) {
    console.error("Toolqivo download error:", err);
    if (options.onError) {
      options.onError(err);
    }
    return false;
  }
}
