/**
 * Toolqivo PDF Engine Dynamic & Bundled Library Loader
 * Handles robust asynchronous loading with singleton promise caching and multi-CDN failover
 */

declare global {
  interface Window {
    PDFLib?: any;
    pdfjsLib?: any;
    jspdf?: any;
    jsPDF?: any;
  }
}

let pdfLibPromise: Promise<any> | null = null;
let pdfJsPromise: Promise<any> | null = null;
let jsPdfPromise: Promise<any> | null = null;

/**
 * Robust async loader for pdfjs-dist with guaranteed singleton promise and multiple CDNs
 */
export async function getPdfJs(): Promise<any> {
  if (typeof window === "undefined") return null;
  if (window.pdfjsLib) return window.pdfjsLib;

  if (pdfJsPromise) return pdfJsPromise;

  pdfJsPromise = new Promise((resolve) => {
    if (window.pdfjsLib) return resolve(window.pdfjsLib);

    const cdnList = [
      {
        js: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
        worker: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
      },
      {
        js: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js",
        worker: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js",
      },
      {
        js: "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js",
        worker: "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js",
      },
    ];

    let currentIdx = 0;

    const tryNext = () => {
      if (window.pdfjsLib) {
        setupWorker(cdnList[Math.max(0, currentIdx - 1)].worker);
        return resolve(window.pdfjsLib);
      }
      if (currentIdx >= cdnList.length) {
        return resolve(window.pdfjsLib || null);
      }

      const item = cdnList[currentIdx++];
      const script = document.createElement("script");
      script.src = item.js;
      script.async = true;
      script.onload = () => {
        if (window.pdfjsLib) {
          setupWorker(item.worker);
          resolve(window.pdfjsLib);
        } else {
          tryNext();
        }
      };
      script.onerror = () => tryNext();
      document.head.appendChild(script);
    };

    const setupWorker = (workerUrl: string) => {
      try {
        if (window.pdfjsLib) {
          try {
            const blob = new Blob([`importScripts('${workerUrl}');`], {
              type: "application/javascript",
            });
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
          } catch {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
          }
        }
      } catch (e) {
        console.warn("PDF.js worker initialization warning:", e);
      }
    };

    tryNext();
  });

  return pdfJsPromise;
}

/**
 * Robust async loader for pdf-lib with guaranteed singleton promise and fast CDN fallback
 */
export async function getPdfLib(): Promise<any> {
  if (typeof window === "undefined") return null;
  if (window.PDFLib) return window.PDFLib;

  if (pdfLibPromise) return pdfLibPromise;

  pdfLibPromise = new Promise((resolve) => {
    if (window.PDFLib) return resolve(window.PDFLib);

    const cdnList = [
      "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.9/dist/pdf-lib.min.js",
      "https://unpkg.com/pdf-lib@1.17.9/dist/pdf-lib.min.js",
      "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js",
      "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js",
      "https://unpkg.com/pdf-lib/dist/pdf-lib.min.js",
    ];

    let currentIdx = 0;
    let timeoutId: any = null;

    const tryNext = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (window.PDFLib) return resolve(window.PDFLib);
      if (currentIdx >= cdnList.length) {
        return resolve(window.PDFLib || null);
      }

      const url = cdnList[currentIdx++];
      const script = document.createElement("script");
      script.src = url;
      script.async = true;

      timeoutId = setTimeout(() => {
        if (!window.PDFLib) {
          tryNext();
        }
      }, 4000);

      script.onload = () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (window.PDFLib) resolve(window.PDFLib);
        else tryNext();
      };
      script.onerror = () => {
        if (timeoutId) clearTimeout(timeoutId);
        tryNext();
      };
      document.head.appendChild(script);
    };

    tryNext();
  });

  return pdfLibPromise;
}

/**
 * Async loader for jsPDF with standard encryption support
 */
export async function getJsPdf(): Promise<any> {
  if (typeof window === "undefined") return null;
  const existing = (window as any).jspdf?.jsPDF || (window as any).jsPDF;
  if (existing) return existing;

  if (jsPdfPromise) return jsPdfPromise;

  jsPdfPromise = new Promise((resolve) => {
    const existing = (window as any).jspdf?.jsPDF || (window as any).jsPDF;
    if (existing) return resolve(existing);

    const cdnList = [
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
      "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js",
      "https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js",
    ];

    let currentIdx = 0;
    const tryNext = () => {
      const cls = (window as any).jspdf?.jsPDF || (window as any).jsPDF;
      if (cls) return resolve(cls);
      if (currentIdx >= cdnList.length) return resolve(null);

      const script = document.createElement("script");
      script.src = cdnList[currentIdx++];
      script.async = true;
      script.onload = () => {
        const loadedCls = (window as any).jspdf?.jsPDF || (window as any).jsPDF;
        if (loadedCls) resolve(loadedCls);
        else tryNext();
      };
      script.onerror = () => tryNext();
      document.head.appendChild(script);
    };

    tryNext();
  });

  return jsPdfPromise;
}
