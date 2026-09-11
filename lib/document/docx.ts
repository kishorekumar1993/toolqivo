/**
 * Toolqivo Advanced DOCX Document Model, Extraction & Generation Engine
 * Fully parses Microsoft Word (.docx) OpenXML PKZIP structure into a rich Document Model
 * (Sections, Paragraphs, TextRuns, Tables, Images, DrawingML, Styles, Margins, Dimensions)
 * and generates clean, valid Microsoft Word OpenXML packages.
 * 100% Client-Side with zero server upload.
 */

// ==========================================
// Document Model Interfaces
// ==========================================

export interface DocxTextRun {
  text: string;
  fontFamily?: string;
  fontSize?: number; // in points (pt)
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  superscript?: boolean;
  subscript?: boolean;
  color?: string; // hex e.g. "0F172A" or "#0F172A"
  highlight?: string; // hex or color name e.g. "FFFF00" or "yellow"
}

export interface DocxParagraphBlock {
  type: "paragraph";
  runs: DocxTextRun[];
  alignment?: "left" | "center" | "right" | "justify";
  isHeading?: boolean;
  headingLevel?: number; // 1, 2, 3...
  isListItem?: boolean;
  bulletChar?: string;
  spacingBefore?: number; // in pt
  spacingAfter?: number; // in pt
  lineSpacing?: number; // in pt
  leftIndent?: number; // in pt
  rightIndent?: number; // in pt
  firstLineIndent?: number; // in pt
  hangingIndent?: number; // in pt
  pageBreakBefore?: boolean;
}

export interface DocxTableCell {
  blocks: (DocxParagraphBlock | DocxImageBlock)[];
  width?: number; // in pt
  bgColor?: string; // hex e.g. "F1F5F9"
  colSpan?: number;
  rowSpan?: number;
}

export interface DocxTableRow {
  cells: DocxTableCell[];
  isHeader?: boolean;
}

export interface DocxTableBlock {
  type: "table";
  rows: DocxTableRow[];
  colWidths?: number[]; // in pt
  hasHeader?: boolean;
}

export interface DocxImageBlock {
  type: "image";
  data: Uint8Array; // Raw PNG or JPEG binary bytes
  mimeType: "image/png" | "image/jpeg";
  width: number; // in pt
  height: number; // in pt
  altText?: string;

  // Original PDF position in points.
  // PDF coordinates are converted to top-left coordinates.
  x?: number;
  y?: number;

  // Keep image positioned instead of treating it as a normal
  // flowing paragraph.
  position?: "absolute" | "inline";
}

export type DocxBlock = DocxParagraphBlock | DocxTableBlock | DocxImageBlock;

export interface DocxSection {
  pageSize: { width: number; height: number }; // in pt (e.g. 595.28 x 841.89 for A4)
  margins: { top: number; right: number; bottom: number; left: number }; // in pt
  orientation?: "portrait" | "landscape";
  blocks: DocxBlock[];
}

export interface DocumentModel {
  sections: DocxSection[];
  title?: string;
}

// ==========================================
// XML Entity & Escape Utilities
// ==========================================

export function decodeXmlEntities(str: string): string {
  if (!str) return "";
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

export function escapeXml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ==========================================
// ZIP / OpenXML Packaging Helpers
// ==========================================

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

function computeCrc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function buildZip(entries: ZipEntry[]): Uint8Array {
  const localHeaders: Uint8Array[] = [];
  const centralHeaders: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = new TextEncoder().encode(entry.name);
    const crc = computeCrc32(entry.data);
    const size = entry.data.length;

    const lh = new Uint8Array(30 + nameBytes.length + size);
    const lView = new DataView(lh.buffer);
    lView.setUint32(0, 0x04034b50, true);
    lView.setUint16(4, 20, true);
    lView.setUint16(6, 0, true);
    lView.setUint16(8, 0, true);
    lView.setUint16(10, 0, true);
    lView.setUint16(12, 0, true);
    lView.setUint32(14, crc, true);
    lView.setUint32(18, size, true);
    lView.setUint32(22, size, true);
    lView.setUint16(26, nameBytes.length, true);
    lView.setUint16(28, 0, true);
    lh.set(nameBytes, 30);
    lh.set(entry.data, 30 + nameBytes.length);
    localHeaders.push(lh);

    const ch = new Uint8Array(46 + nameBytes.length);
    const cView = new DataView(ch.buffer);
    cView.setUint32(0, 0x02014b50, true);
    cView.setUint16(4, 20, true);
    cView.setUint16(6, 20, true);
    cView.setUint16(8, 0, true);
    cView.setUint16(10, 0, true);
    cView.setUint16(12, 0, true);
    cView.setUint16(14, 0, true);
    cView.setUint32(16, crc, true);
    cView.setUint32(20, size, true);
    cView.setUint32(24, size, true);
    cView.setUint16(28, nameBytes.length, true);
    cView.setUint16(30, 0, true);
    cView.setUint16(32, 0, true);
    cView.setUint16(34, 0, true);
    cView.setUint16(36, 0, true);
    cView.setUint32(38, 0, true);
    cView.setUint32(42, offset, true);
    ch.set(nameBytes, 46);
    centralHeaders.push(ch);

    offset += lh.length;
  }

  const centralDirOffset = offset;
  const centralDirSize = centralHeaders.reduce((acc, h) => acc + h.length, 0);

  const eocd = new Uint8Array(22);
  const eView = new DataView(eocd.buffer);
  eView.setUint32(0, 0x06054b50, true);
  eView.setUint16(4, 0, true);
  eView.setUint16(6, 0, true);
  eView.setUint16(8, entries.length, true);
  eView.setUint16(10, entries.length, true);
  eView.setUint32(12, centralDirSize, true);
  eView.setUint32(16, centralDirOffset, true);
  eView.setUint16(20, 0, true);

  const totalLength = offset + centralDirSize + 22;
  const result = new Uint8Array(totalLength);
  let pos = 0;
  for (const lh of localHeaders) {
    result.set(lh, pos);
    pos += lh.length;
  }
  for (const ch of centralHeaders) {
    result.set(ch, pos);
    pos += ch.length;
  }
  result.set(eocd, pos);

  return result;
}

async function decompressZipEntryBytes(
  compData: Uint8Array,
  compMethod: number
): Promise<Uint8Array> {
  if (compMethod === 0) {
    return compData;
  }

  if (compMethod === 8 && typeof DecompressionStream !== "undefined") {
    try {
      const stream = new Blob([compData as BlobPart])
        .stream()
        .pipeThrough(new DecompressionStream("deflate-raw"));
      const buffer = await new Response(stream).arrayBuffer();
      return new Uint8Array(buffer);
    } catch {
      try {
        const stream = new Blob([compData as BlobPart])
          .stream()
          .pipeThrough(new DecompressionStream("deflate"));
        const buffer = await new Response(stream).arrayBuffer();
        return new Uint8Array(buffer);
      } catch (err) {
        console.warn("DecompressionStream error in docx:", err);
      }
    }
  }

  return compData;
}

export interface ExtractedDocxPackage {
  documentXml: string;
  relsXml: string;
  mediaFiles: Map<string, Uint8Array>;
}

/**
 * Universal media file resolver handling relative paths, prefixes, bare names, and case-insensitivity
 */
export function resolveMediaFile(
  target: string,
  mediaFiles: Map<string, Uint8Array>
): Uint8Array | undefined {
  if (!target || mediaFiles.size === 0) {
    if (mediaFiles.size === 1) return mediaFiles.values().next().value;
    return undefined;
  }

  const normalized = target
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/^word\//i, "")
    .replace(/^(\.\.\/)+/, "");

  const candidates = [
    normalized,
    `media/${normalized}`,
    `word/${normalized}`,
  ];

  // Also match by filename as a final fallback
  const fileName = normalized.split("/").pop();
  if (fileName) {
    candidates.push(`media/${fileName}`);
    candidates.push(`word/media/${fileName}`);
    candidates.push(fileName);
  }

  for (const key of candidates) {
    const data = mediaFiles.get(key);
    if (data) return data;
  }

  // Case-insensitive fallback
  const lowerCandidates = candidates.map((c) => c.toLowerCase());
  for (const [mapKey, data] of mediaFiles.entries()) {
    const lowerMapKey = mapKey.toLowerCase();
    if (
      lowerCandidates.includes(lowerMapKey) ||
      (fileName && lowerMapKey.endsWith(fileName.toLowerCase()))
    ) {
      return data;
    }
  }

  // Single-image fallback
  if (mediaFiles.size === 1) {
    return mediaFiles.values().next().value;
  }

  return undefined;
}

/**
 * Robust Central-Directory-first ZIP decompression and package extractor
 */
export async function extractDocxPackage(buffer: ArrayBuffer): Promise<ExtractedDocxPackage> {
  const result: ExtractedDocxPackage = {
    documentXml: "",
    relsXml: "",
    mediaFiles: new Map(),
  };

  try {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);

    let eocdOffset = -1;
    const maxSearch = Math.max(0, bytes.length - 65557);
    for (let i = bytes.length - 22; i >= maxSearch; i--) {
      if (view.getUint32(i, true) === 0x06054b50) {
        eocdOffset = i;
        break;
      }
    }

    if (eocdOffset !== -1) {
      const totalEntries = view.getUint16(eocdOffset + 10, true);
      const cdOffset = view.getUint32(eocdOffset + 16, true);
      let entryPos = cdOffset;

      for (let i = 0; i < totalEntries && entryPos < bytes.length - 46; i++) {
        if (view.getUint32(entryPos, true) !== 0x02014b50) break;

        const compMethod = view.getUint16(entryPos + 10, true);
        const compSize = view.getUint32(entryPos + 20, true);
        const nameLen = view.getUint16(entryPos + 28, true);
        const extraLen = view.getUint16(entryPos + 30, true);
        const commentLen = view.getUint16(entryPos + 32, true);
        const localHeaderOffset = view.getUint32(entryPos + 42, true);

        const nameBytes = bytes.subarray(entryPos + 46, entryPos + 46 + nameLen);
        const filename = new TextDecoder().decode(nameBytes);

        if (
          filename === "word/document.xml" ||
          filename.endsWith("document.xml") ||
          filename.includes("_rels/") ||
          filename.includes("media/") ||
          /\.(png|jpe?g|gif|webp|bmp|emf|wmf|svg)$/i.test(filename)
        ) {
          if (view.getUint32(localHeaderOffset, true) === 0x04034b50) {
            const localNameLen = view.getUint16(localHeaderOffset + 26, true);
            const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
            const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
            const dataEnd = dataStart + compSize;

            const compData = bytes.subarray(dataStart, dataEnd);
            const uncomp = await decompressZipEntryBytes(compData, compMethod);

            if (filename === "word/document.xml" || filename.endsWith("document.xml")) {
              result.documentXml = new TextDecoder("utf-8").decode(uncomp);
            } else if (filename.includes("_rels/")) {
              const relText = new TextDecoder("utf-8").decode(uncomp);
              result.relsXml = (result.relsXml ? result.relsXml + "\n" : "") + relText;
            } else {
              const cleanName = filename.replace(/^word\//, "");
              result.mediaFiles.set(cleanName, uncomp);
              result.mediaFiles.set(filename, uncomp);
              const bareName = cleanName.split("/").pop();
              if (bareName) {
                result.mediaFiles.set(bareName, uncomp);
                result.mediaFiles.set(`media/${bareName}`, uncomp);
                result.mediaFiles.set(`word/media/${bareName}`, uncomp);
              }
            }
          }
        }

        entryPos += 46 + nameLen + extraLen + commentLen;
      }
    }
  } catch (e) {
    console.warn("Error extracting DOCX package:", e);
  }

  return result;
}

export async function extractWordDocumentXml(buffer: ArrayBuffer): Promise<string> {
  const pkg = await extractDocxPackage(buffer);
  return pkg.documentXml;
}

// ==========================================
// OpenXML Parsing to Structured Document Model
// ==========================================

function parseSectionProps(sectPrXml: string): {
  pageSize: { width: number; height: number };
  margins: { top: number; right: number; bottom: number; left: number };
  orientation?: "portrait" | "landscape";
} {
  let pageWidth = 595.28; // Default A4 in pt
  let pageHeight = 841.89;
  let marginTop = 54;
  let marginRight = 54;
  let marginBottom = 54;
  let marginLeft = 54;
  let orientation: "portrait" | "landscape" = "portrait";

  const pgSzMatch = sectPrXml.match(/<w:pgSz\s+([^>]*)\/>/);
  if (pgSzMatch) {
    const attrs = pgSzMatch[1];
    const wMatch = attrs.match(/w:w="(\d+)"/);
    const hMatch = attrs.match(/w:h="(\d+)"/);
    const orientMatch = attrs.match(/w:orient="([a-zA-Z]+)"/);
    if (wMatch) pageWidth = parseInt(wMatch[1], 10) / 20;
    if (hMatch) pageHeight = parseInt(hMatch[1], 10) / 20;
    if (orientMatch && orientMatch[1].toLowerCase() === "landscape") {
      orientation = "landscape";
    }
  }

  const pgMarMatch = sectPrXml.match(/<w:pgMar\s+([^>]*)\/>/);
  if (pgMarMatch) {
    const attrs = pgMarMatch[1];
    const topM = attrs.match(/w:top="(\d+)"/);
    const rightM = attrs.match(/w:right="(\d+)"/);
    const botM = attrs.match(/w:bottom="(\d+)"/);
    const leftM = attrs.match(/w:left="(\d+)"/);
    if (topM) marginTop = parseInt(topM[1], 10) / 20;
    if (rightM) marginRight = parseInt(rightM[1], 10) / 20;
    if (botM) marginBottom = parseInt(botM[1], 10) / 20;
    if (leftM) marginLeft = parseInt(leftM[1], 10) / 20;
  }

  return {
    pageSize: { width: pageWidth, height: pageHeight },
    margins: { top: marginTop, right: marginRight, bottom: marginBottom, left: marginLeft },
    orientation,
  };
}

function parseParagraphXml(
  pXml: string,
  relMap: Map<string, string>,
  mediaFiles: Map<string, Uint8Array>
): DocxBlock[] {
  const blocks: DocxBlock[] = [];

  // Check if paragraph contains any embedded DrawingML or VML Images
  const drawingMatches = [
    ...(pXml.match(/<w:drawing\b[\s\S]*?<\/w:drawing>/gi) || []),
    ...(pXml.match(/<w:pict\b[\s\S]*?<\/w:pict>/gi) || []),
    ...(pXml.match(/<a:blip\b[\s\S]*?\/>/gi) || []),
    ...(pXml.match(/<v:imagedata\b[\s\S]*?\/>/gi) || []),
  ];

  if (drawingMatches.length > 0) {
    for (const dXml of drawingMatches) {
      const blipMatch = dXml.match(/(?:r:embed|r:id|r:href|o:relid|embed|src|id)="([^"]+)"/i);
      if (blipMatch) {
        const rId = blipMatch[1];
        const target = relMap.get(rId) || rId;
        let imgBytes = resolveMediaFile(target, mediaFiles);
        if (!imgBytes) {
          imgBytes = resolveMediaFile(rId, mediaFiles);
        }
        if (imgBytes) {
          let width = 380;
          let height = 240;
          const extMatch = dXml.match(/<wp:extent\s+[^>]*cx="(\d+)"[^>]*cy="(\d+)"/i);
          if (extMatch) {
            width = Math.round(parseInt(extMatch[1], 10) / 12700);
            height = Math.round(parseInt(extMatch[2], 10) / 12700);
          } else {
            const styleMatch = dXml.match(/style="[^"]*width:(\d+(?:\.\d+)?)(pt|in|px)?[^"]*height:(\d+(?:\.\d+)?)(pt|in|px)?/i);
            if (styleMatch) {
              let w = parseFloat(styleMatch[1]);
              let h = parseFloat(styleMatch[3]);
              if (styleMatch[2] === "in") { w *= 72; h *= 72; }
              else if (styleMatch[2] === "px") { w *= 0.75; h *= 0.75; }
              width = Math.round(w);
              height = Math.round(h);
            }
          }
          const isPng = (target && target.toLowerCase().endsWith(".png")) || imgBytes[0] === 0x89;
          blocks.push({
            type: "image",
            data: imgBytes,
            mimeType: isPng ? "image/png" : "image/jpeg",
            width: width > 0 ? width : 200,
            height: height > 0 ? height : 200,
            altText: "Word Embedded Image",
          });
        }
      }
    }
  }

  let alignment: "left" | "center" | "right" | "justify" = "left";
  let isHeading = false;
  let headingLevel = 1;
  let isListItem = false;
  let spacingBefore = 0;
  let spacingAfter = 4;
  let lineSpacing: number | undefined;
  let leftIndent: number | undefined;
  let rightIndent: number | undefined;
  let firstLineIndent: number | undefined;
  let hangingIndent: number | undefined;
  let pageBreakBefore = false;

  const pPrMatch = pXml.match(/<w:pPr\b[\s\S]*?<\/w:pPr>/);
  if (pPrMatch) {
    const pPr = pPrMatch[0];

    if (/<w:pageBreakBefore\/>/i.test(pPr)) {
      pageBreakBefore = true;
    }

    const jcMatch = pPr.match(/<w:jc\s+w:val="([a-zA-Z]+)"/);
    if (jcMatch) {
      const val = jcMatch[1].toLowerCase();
      if (val === "center") alignment = "center";
      else if (val === "right") alignment = "right";
      else if (val === "both" || val === "justify") alignment = "justify";
    }

    const styleMatch = pPr.match(/<w:pStyle\s+w:val="([^"]+)"/i);
    if (styleMatch) {
      const sVal = styleMatch[1].toLowerCase();
      if (sVal.includes("heading1") || sVal.includes("head1") || sVal === "title" || sVal.includes("titre1")) {
        isHeading = true;
        headingLevel = 1;
        spacingBefore = 14;
        spacingAfter = 6;
      } else if (sVal.includes("heading2") || sVal.includes("head2") || sVal === "subtitle" || sVal.includes("titre2")) {
        isHeading = true;
        headingLevel = 2;
        spacingBefore = 10;
        spacingAfter = 4;
      } else if (sVal.includes("heading") || sVal.includes("head") || sVal.includes("titre")) {
        isHeading = true;
        headingLevel = 3;
        spacingBefore = 8;
        spacingAfter = 3;
      }
    }

    if (/<w:numPr\b/i.test(pPr)) {
      isListItem = true;
    }

    // Paragraph Indentation
    const indMatch = pPr.match(/<w:ind\b([^>]*)\/>/);
    if (indMatch) {
      const attrs = indMatch[1];
      const leftM = attrs.match(/w:left="(\d+)"/);
      const rightM = attrs.match(/w:right="(\d+)"/);
      const firstLineM = attrs.match(/w:firstLine="(\d+)"/);
      const hangingM = attrs.match(/w:hanging="(\d+)"/);
      if (leftM) leftIndent = Math.round(parseInt(leftM[1], 10) / 20);
      if (rightM) rightIndent = Math.round(parseInt(rightM[1], 10) / 20);
      if (firstLineM) firstLineIndent = Math.round(parseInt(firstLineM[1], 10) / 20);
      if (hangingM) hangingIndent = Math.round(parseInt(hangingM[1], 10) / 20);
    }

    // Spacing Before, After, and Line Spacing
    const spMatch = pPr.match(/<w:spacing\b([^>]*)\/>/);
    if (spMatch) {
      const attrs = spMatch[1];
      const beforeMatch = attrs.match(/w:before="(\d+)"/);
      const afterMatch = attrs.match(/w:after="(\d+)"/);
      const lineMatch = attrs.match(/w:line="(\d+)"/);
      const lineRuleMatch = attrs.match(/w:lineRule="([a-zA-Z]+)"/);

      if (beforeMatch) spacingBefore = Math.round(parseInt(beforeMatch[1], 10) / 20);
      if (afterMatch) spacingAfter = Math.round(parseInt(afterMatch[1], 10) / 20);

      if (lineMatch) {
        const lineVal = parseInt(lineMatch[1], 10);
        const lineRule = lineRuleMatch ? lineRuleMatch[1].toLowerCase() : "auto";
        if (lineRule === "exact" || lineRule === "atleast") {
          lineSpacing = lineVal / 20;
        } else {
          const multiple = lineVal / 240;
          lineSpacing = multiple * 14;
        }
      }
    }
  }

  // Parse Text Runs (<w:r>)
  const runs: DocxTextRun[] = [];
  const runMatches = pXml.match(/<w:r\b[\s\S]*?<\/w:r>/g);

  if (runMatches) {
    for (const rXml of runMatches) {
      let bold = false;
      let italic = false;
      let underline = false;
      let strike = false;
      let superscript = false;
      let subscript = false;
      let fontSize: number | undefined;
      let color: string | undefined;
      let highlight: string | undefined;
      let fontFamily: string | undefined;

      const rPrMatch = rXml.match(/<w:rPr\b[\s\S]*?<\/w:rPr>/);
      if (rPrMatch) {
        const rPr = rPrMatch[0];
        if (/<w:b\b/i.test(rPr) && !/<w:b\s+w:val="0"/i.test(rPr) && !/<w:b\s+w:val="false"/i.test(rPr)) {
          bold = true;
        }
        if (/<w:i\b/i.test(rPr) && !/<w:i\s+w:val="0"/i.test(rPr) && !/<w:i\s+w:val="false"/i.test(rPr)) {
          italic = true;
        }
        if (/<w:u\b/i.test(rPr) && !/<w:u\s+w:val="none"/i.test(rPr)) {
          underline = true;
        }
        if (/<w:strike\b/i.test(rPr) || /<w:dstrike\b/i.test(rPr)) {
          strike = true;
        }

        const vertAlignMatch = rPr.match(/<w:vertAlign\s+w:val="([a-zA-Z]+)"/i);
        if (vertAlignMatch) {
          const va = vertAlignMatch[1].toLowerCase();
          if (va === "superscript") superscript = true;
          else if (va === "subscript") subscript = true;
        }

        const hlMatch = rPr.match(/<w:highlight\s+w:val="([a-zA-Z0-9]+)"/i);
        if (hlMatch && hlMatch[1].toLowerCase() !== "none") {
          highlight = hlMatch[1];
        }

        const szMatch = rPr.match(/<w:sz\s+w:val="(\d+)"/);
        if (szMatch) {
          fontSize = parseInt(szMatch[1], 10) / 2;
        }

        const colorMatch = rPr.match(/<w:color\s+w:val="([0-9a-fA-F]{6})"/);
        if (colorMatch && colorMatch[1].toUpperCase() !== "AUTO") {
          color = `#${colorMatch[1]}`;
        }

        const fontMatch = rPr.match(/<w:rFonts\s+[^>]*w:ascii="([^"]+)"/);
        if (fontMatch) {
          fontFamily = fontMatch[1];
        }
      }

      const tokenMatches = rXml.match(/<w:t\b[\s\S]*?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>/g);
      let runText = "";
      if (tokenMatches) {
        for (const token of tokenMatches) {
          if (token === "<w:tab/>") {
            runText += "    ";
          } else if (token === "<w:br/>") {
            runText += "\n";
          } else {
            const rawInner = token.replace(/<[^>]+>/g, "");
            runText += decodeXmlEntities(rawInner);
          }
        }
      }

      if (runText) {
        runs.push({
          text: runText,
          bold,
          italic,
          underline,
          strike,
          superscript,
          subscript,
          fontSize,
          color,
          highlight,
          fontFamily,
        });
      }
    }
  }

  if (runs.length === 0) {
    const rawTextMatches = pXml.match(/<w:t\b[\s\S]*?>([\s\S]*?)<\/w:t>/g);
    if (rawTextMatches) {
      const full = rawTextMatches.map((m) => decodeXmlEntities(m.replace(/<[^>]+>/g, ""))).join("");
      if (full.trim()) {
        runs.push({ text: full });
      }
    }
  }

  if (runs.length > 0) {
    // Detect direct-formatted Headings (large font size or uppercase section title)
    const totalText = runs.map((r) => r.text).join("").trim();
    const maxRunFontSize = Math.max(0, ...runs.map((r) => r.fontSize || 0));
    const allRunsBold = runs.every((r) => r.bold || !r.text.trim());
    const isUppercaseHeader =
      /^[A-Z0-9\s&/,\-–—|]{4,60}$/.test(totalText) &&
      (allRunsBold || maxRunFontSize >= 11) &&
      !totalText.includes("@") &&
      !totalText.includes(".com");

    if (!isHeading && totalText.length > 0 && totalText.length < 80) {
      if (maxRunFontSize >= 16) {
        isHeading = true;
        headingLevel = 1;
        spacingBefore = 14;
        spacingAfter = 6;
      } else if (maxRunFontSize >= 13 || (allRunsBold && maxRunFontSize >= 11.5) || isUppercaseHeader) {
        isHeading = true;
        headingLevel = 2;
        spacingBefore = 10;
        spacingAfter = 4;
      }
    }

    blocks.push({
      type: "paragraph",
      runs,
      alignment,
      isHeading,
      headingLevel,
      isListItem,
      spacingBefore,
      spacingAfter,
      lineSpacing,
      leftIndent,
      rightIndent,
      firstLineIndent,
      hangingIndent,
      pageBreakBefore,
    });
  }

  return blocks;
}

function parseTableXml(
  tblXml: string,
  relMap: Map<string, string>,
  mediaFiles: Map<string, Uint8Array>
): DocxTableBlock {
  const rows: DocxTableRow[] = [];

  // Extract column grid widths from <w:tblGrid>
  const colWidths: number[] = [];
  const gridMatch = tblXml.match(/<w:tblGrid\b[\s\S]*?<\/w:tblGrid>/);
  if (gridMatch) {
    const colMatches = gridMatch[0].match(/<w:gridCol\s+[^>]*w:w="(\d+)"/g);
    if (colMatches) {
      for (const col of colMatches) {
        const wVal = col.match(/w:w="(\d+)"/);
        if (wVal) colWidths.push(Math.round(parseInt(wVal[1], 10) / 20));
      }
    }
  }

  const trMatches = tblXml.match(/<w:tr\b[\s\S]*?<\/w:tr>/g);
  if (trMatches) {
    for (let rIdx = 0; rIdx < trMatches.length; rIdx++) {
      const trXml = trMatches[rIdx];
      const isHeader = rIdx === 0 || /<w:tblHeader\/>/i.test(trXml);
      const cells: DocxTableCell[] = [];

      const tcMatches = trXml.match(/<w:tc\b[\s\S]*?<\/w:tc>/g);
      if (tcMatches) {
        for (const tcXml of tcMatches) {
          let bgColor: string | undefined;
          let width: number | undefined;
          let colSpan = 1;
          let rowSpan = 1;

          const shdMatch = tcXml.match(/<w:shd\s+[^>]*w:fill="([0-9a-fA-F]{6})"/i);
          if (shdMatch && shdMatch[1].toUpperCase() !== "AUTO") {
            bgColor = `#${shdMatch[1]}`;
          }

          const wMatch = tcXml.match(/<w:tcW\s+[^>]*w:w="(\d+)"/);
          if (wMatch) {
            width = Math.round(parseInt(wMatch[1], 10) / 20);
          }

          const spanMatch = tcXml.match(/<w:gridSpan\s+[^>]*w:val="(\d+)"/);
          if (spanMatch) {
            colSpan = parseInt(spanMatch[1], 10);
          }

          const cellBlocks: (DocxParagraphBlock | DocxImageBlock)[] = [];
          const cellPMatches = tcXml.match(/<w:p\b[\s\S]*?<\/w:p>/g);
          if (cellPMatches) {
            for (const cellP of cellPMatches) {
              const parsed = parseParagraphXml(cellP, relMap, mediaFiles);
              for (const b of parsed) {
                if (b.type === "paragraph" || b.type === "image") cellBlocks.push(b as DocxParagraphBlock | DocxImageBlock);
              }
            }
          }

          if (cellBlocks.length === 0) {
            const tMatches = tcXml.match(/<w:t\b[\s\S]*?>([\s\S]*?)<\/w:t>/g);
            const str = tMatches
              ? tMatches.map((t) => decodeXmlEntities(t.replace(/<[^>]+>/g, ""))).join("").trim()
              : "";
            cellBlocks.push({
              type: "paragraph",
              runs: [{ text: str }],
              spacingAfter: 0,
            });
          }

          cells.push({
            blocks: cellBlocks,
            width,
            bgColor,
            colSpan,
            rowSpan,
          });
        }
      }

      if (cells.length > 0) {
        rows.push({ cells, isHeader });
      }
    }
  }

  return {
    type: "table",
    rows,
    colWidths: colWidths.length > 0 ? colWidths : undefined,
    hasHeader: rows.some((r) => r.isHeader),
  };
}

export async function parseDocxToDocumentModel(buffer: ArrayBuffer): Promise<DocumentModel> {
  const pkg = await extractDocxPackage(buffer);
  const xmlStr = pkg.documentXml;

  if (!xmlStr) {
    const plainText = await extractTextFromDocx(buffer);
    const lines = plainText.split(/\r?\n/).filter(Boolean);
    const blocks: DocxParagraphBlock[] = lines.map((l) => {
      const isHeading = l.startsWith("#") || l.startsWith("###");
      return {
        type: "paragraph",
        runs: [{ text: l.replace(/^#+\s*/, "") }],
        isHeading,
        headingLevel: l.startsWith("# ") ? 1 : l.startsWith("## ") ? 2 : 3,
        spacingAfter: 6,
      };
    });

    return {
      sections: [
        {
          pageSize: { width: 595.28, height: 841.89 },
          margins: { top: 54, right: 54, bottom: 54, left: 54 },
          blocks,
        },
      ],
    };
  }

  // Parse Relationship Map (rId -> media target)
  const relMap = new Map<string, string>();
  if (pkg.relsXml) {
    const relMatches = pkg.relsXml.match(/<Relationship\b[\s\S]*?(?:\/>|<\/Relationship>)/gi);
    if (relMatches) {
      for (const r of relMatches) {
        const idMatch = r.match(/Id="([^"]+)"/i);
        const targetMatch = r.match(/Target="([^"]+)"/i);
        if (idMatch && targetMatch) {
          relMap.set(idMatch[1], targetMatch[1]);
        }
      }
    }
  }

  const bodyMatch = xmlStr.match(/<w:body\b[\s\S]*?<\/w:body>/);
  const bodyContent = bodyMatch ? bodyMatch[0] : xmlStr;

  const sections: DocxSection[] = [];
  let currentSectionBlocks: DocxBlock[] = [];

  // Match blocks in sequence
  const blockRegex = /<w:p\b[\s\S]*?<\/w:p>|<w:tbl\b[\s\S]*?<\/w:tbl>/g;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(bodyContent)) !== null) {
    const blockXml = match[0];
    if (blockXml.startsWith("<w:p")) {
      const parsedBlocks = parseParagraphXml(blockXml, relMap, pkg.mediaFiles);
      currentSectionBlocks.push(...parsedBlocks);

      // Check for inline section break <w:pPr><w:sectPr>...</w:sectPr></w:pPr>
      const sectMatch = blockXml.match(/<w:pPr\b[\s\S]*?<w:sectPr\b[\s\S]*?<\/w:sectPr>[\s\S]*?<\/w:pPr>/);
      if (sectMatch) {
        const secProps = parseSectionProps(sectMatch[0]);
        sections.push({
          pageSize: secProps.pageSize,
          margins: secProps.margins,
          orientation: secProps.orientation,
          blocks: currentSectionBlocks,
        });
        currentSectionBlocks = [];
      }
    } else if (blockXml.startsWith("<w:tbl")) {
      const tbl = parseTableXml(blockXml, relMap, pkg.mediaFiles);
      if (tbl.rows.length > 0) {
        currentSectionBlocks.push(tbl);
      }
    }
  }

  // Final section properties at end of body
  let finalSecProps: {
    pageSize: { width: number; height: number };
    margins: { top: number; right: number; bottom: number; left: number };
    orientation?: "portrait" | "landscape";
  } = {
    pageSize: { width: 595.28, height: 841.89 },
    margins: { top: 54, right: 54, bottom: 54, left: 54 },
    orientation: "portrait",
  };
  const bodyEndSect = bodyContent.match(/<w:sectPr\b[\s\S]*?<\/w:sectPr>(?=\s*<\/w:body>|$)/);
  if (bodyEndSect) {
    finalSecProps = parseSectionProps(bodyEndSect[0]);
  }

  sections.push({
    pageSize: finalSecProps.pageSize,
    margins: finalSecProps.margins,
    orientation: finalSecProps.orientation,
    blocks: currentSectionBlocks,
  });

  return {
    sections: sections.length > 0 ? sections : [
      {
        pageSize: finalSecProps.pageSize,
        margins: finalSecProps.margins,
        blocks: [],
      }
    ],
  };
}

export async function extractTextFromDocx(buffer: ArrayBuffer): Promise<string> {
  const pkg = await extractDocxPackage(buffer);
  const xmlStr = pkg.documentXml;

  if (!xmlStr) {
    try {
      const text = new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(buffer));
      const textBlocks = text.match(/[\x20-\x7E\xA0-\xFF\t\r\n]{4,}/g) || [];
      const clean = textBlocks
        .filter((s) => !s.startsWith("<?xml") && !s.includes("word/") && !s.includes("schemas.openxml"))
        .join("\n")
        .replace(/\s+/g, " ")
        .trim();
      if (clean.length > 20) return clean;
    } catch {}
    return "";
  }

  const paragraphs: string[] = [];
  const blockMatches = xmlStr.match(/<w:p\b[\s\S]*?<\/w:p>|<w:tr\b[\s\S]*?<\/w:tr>/g);

  if (blockMatches) {
    for (const block of blockMatches) {
      if (block.startsWith("<w:tr")) {
        const cellMatches = block.match(/<w:tc\b[\s\S]*?<\/w:tc>/g);
        if (cellMatches) {
          const cellTexts = cellMatches.map((cell) => {
            const tMatches = cell.match(/<w:t\b[\s\S]*?>([\s\S]*?)<\/w:t>/g) || [];
            return tMatches.map((t) => decodeXmlEntities(t.replace(/<[^>]+>/g, ""))).join("").trim();
          });
          const rowStr = cellTexts.filter(Boolean).join(" | ");
          if (rowStr.trim()) paragraphs.push(rowStr);
        }
        continue;
      }

      let pText = "";
      const isHeading = /<w:pStyle\s+w:val="Heading(\d+)"/i.test(block) || /<w:pStyle\s+w:val="Title"/i.test(block);
      const isListItem = /<w:numPr>/i.test(block);

      const tokens = block.match(/<w:t\b[\s\S]*?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>/g);
      if (tokens) {
        for (const token of tokens) {
          if (token === "<w:tab/>") pText += "\t";
          else if (token === "<w:br/>") pText += "\n";
          else pText += decodeXmlEntities(token.replace(/<[^>]+>/g, ""));
        }
      }

      const trimmed = pText.trim();
      if (trimmed) {
        if (isHeading) paragraphs.push(`### ${trimmed}`);
        else if (isListItem) paragraphs.push(`* ${trimmed}`);
        else paragraphs.push(trimmed);
      }
    }
  }

  return paragraphs.join("\n\n");
}

// ==========================================
// OpenXML Generator: PDF / Text to .DOCX with DrawingML Images
// ==========================================

export function generateRealDocxBlob(
  title: string,
  contentOrModel: string | DocumentModel
): Blob {
  const encoder = new TextEncoder();
  const imageEntries: ZipEntry[] = [];
  const imageRelationships: string[] = [];

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Default Extension="jpg" ContentType="image/jpeg"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
        <w:lang w:val="en-US"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Normal" w:default="1">
    <w:name w:val="Normal"/>
    <w:pPr><w:spacing w:after="140" w:line="260" w:lineRule="auto"/></w:pPr>
    <w:rPr><w:sz w:val="22"/><w:color w:val="1E293B"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:pPr><w:spacing w:before="260" w:after="120"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="0F172A"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:pPr><w:spacing w:before="200" w:after="100"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="26"/><w:color w:val="1E293B"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:pPr><w:spacing w:before="140" w:after="80"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="22"/><w:color w:val="334155"/></w:rPr>
  </w:style>
</w:styles>`;

  const bodyXmlParts: string[] = [];
  let imageCounter = 0;

  if (typeof contentOrModel === "string") {
    const lines = contentOrModel.split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        bodyXmlParts.push(`<w:p><w:pPr><w:spacing w:after="100"/></w:pPr></w:p>`);
        continue;
      }

      if (line.startsWith("# ") || line.startsWith("## ")) {
        const headingText = line.replace(/^#+\s*/, "");
        bodyXmlParts.push(`<w:p>
          <w:pPr><w:pStyle w:val="Heading1"/><w:spacing w:before="220" w:after="100"/></w:pPr>
          <w:r><w:rPr><w:b/><w:sz w:val="30"/><w:color w:val="0F172A"/></w:rPr><w:t xml:space="preserve">${escapeXml(headingText)}</w:t></w:r>
        </w:p>`);
      } else if (line.startsWith("### ") || (line.endsWith(":") && line.length < 60)) {
        const headingText = line.replace(/^###\s*/, "");
        bodyXmlParts.push(`<w:p>
          <w:pPr><w:pStyle w:val="Heading2"/><w:spacing w:before="160" w:after="80"/></w:pPr>
          <w:r><w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="1E293B"/></w:rPr><w:t xml:space="preserve">${escapeXml(headingText)}</w:t></w:r>
        </w:p>`);
      } else if (line.startsWith("* ") || line.startsWith("- ") || line.startsWith("• ")) {
        const bulletText = line.replace(/^[-*•]\s*/, "");
        bodyXmlParts.push(`<w:p>
          <w:pPr><w:ind w:left="400"/><w:spacing w:after="80" w:line="240" w:lineRule="auto"/></w:pPr>
          <w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:color w:val="0D9488"/><w:b/></w:rPr><w:t xml:space="preserve">• </w:t></w:r>
          <w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/><w:color w:val="1E293B"/></w:rPr><w:t xml:space="preserve">${escapeXml(bulletText)}</w:t></w:r>
        </w:p>`);
      } else if (line.includes(" | ")) {
        const cells = line.split(" | ").map((c) => c.trim());
        const cellXml = cells
          .map(
            (c) => `<w:tc>
              <w:tcPr><w:tcMar><w:top w:w="120"/><w:bottom w:w="120"/><w:left w:w="140"/><w:right w:w="140"/></w:tcMar></w:tcPr>
              <w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:sz w:val="20"/><w:color w:val="1E293B"/></w:rPr><w:t xml:space="preserve">${escapeXml(c)}</w:t></w:r></w:p>
            </w:tc>`
          )
          .join("");
        bodyXmlParts.push(`<w:tbl>
          <w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/></w:tblBorders></w:tblPr>
          <w:tr>${cellXml}</w:tr>
        </w:tbl>`);
      } else {
        bodyXmlParts.push(`<w:p>
          <w:pPr><w:spacing w:after="140" w:line="260" w:lineRule="auto"/></w:pPr>
          <w:r>
            <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/><w:color w:val="1E293B"/></w:rPr>
            <w:t xml:space="preserve">${escapeXml(line)}</w:t>
          </w:r>
        </w:p>`);
      }
    }
  } else {
    // Render from DocumentModel with Images, Tables, and Formatting
    for (let sIdx = 0; sIdx < contentOrModel.sections.length; sIdx++) {
      const section = contentOrModel.sections[sIdx];
      for (const block of section.blocks) {
        if (block.type === "paragraph") {
          const pPrElements: string[] = [];
          if (block.pageBreakBefore || (block.isHeading && block.headingLevel === 1 && bodyXmlParts.length > 0)) {
            pPrElements.push(`<w:pageBreakBefore/>`);
          }
          if (block.alignment && block.alignment !== "left") {
            const jc = block.alignment === "justify" ? "both" : block.alignment;
            pPrElements.push(`<w:jc w:val="${jc}"/>`);
          }
          if (block.isHeading) {
            pPrElements.push(`<w:pStyle w:val="Heading${block.headingLevel || 1}"/>`);
          }

          // Paragraph Indentation
          const indParts: string[] = [];
          if (block.leftIndent !== undefined) indParts.push(`w:left="${Math.round(block.leftIndent * 20)}"`);
          if (block.rightIndent !== undefined) indParts.push(`w:right="${Math.round(block.rightIndent * 20)}"`);
          if (block.firstLineIndent !== undefined) indParts.push(`w:firstLine="${Math.round(block.firstLineIndent * 20)}"`);
          if (block.hangingIndent !== undefined) indParts.push(`w:hanging="${Math.round(block.hangingIndent * 20)}"`);
          else if (block.isListItem && block.leftIndent === undefined) indParts.push(`w:left="400"`);
          if (indParts.length > 0) {
            pPrElements.push(`<w:ind ${indParts.join(" ")}/>`);
          }

          // Spacing
          const before = (block.spacingBefore || 0) * 20;
          const after = (block.spacingAfter !== undefined ? block.spacingAfter : (block.isHeading ? 6 : 4)) * 20;
          let spAttrs = `w:before="${before}" w:after="${after}"`;
          if (block.lineSpacing && block.lineSpacing > 0) {
            spAttrs += ` w:line="${Math.round(block.lineSpacing * 20)}" w:lineRule="exact"`;
          }
          pPrElements.push(`<w:spacing ${spAttrs}/>`);

          const runsXml = block.runs
            .map((r) => {
              const rPrParts: string[] = [];
              if (r.fontFamily) rPrParts.push(`<w:rFonts w:ascii="${escapeXml(r.fontFamily)}" w:hAnsi="${escapeXml(r.fontFamily)}"/>`);
              if (r.bold) rPrParts.push("<w:b/>");
              if (r.italic) rPrParts.push("<w:i/>");
              if (r.underline) rPrParts.push('<w:u w:val="single"/>');
              if (r.strike) rPrParts.push('<w:strike/>');
              if (r.superscript) rPrParts.push('<w:vertAlign w:val="superscript"/>');
              if (r.subscript) rPrParts.push('<w:vertAlign w:val="subscript"/>');
              if (r.highlight) rPrParts.push(`<w:highlight w:val="${escapeXml(r.highlight)}"/>`);
              if (r.fontSize) rPrParts.push(`<w:sz w:val="${Math.round(r.fontSize * 2)}"/>`);
              if (r.color) {
                const hex = r.color.replace("#", "");
                rPrParts.push(`<w:color w:val="${hex}"/>`);
              }
              const rPr = rPrParts.length > 0 ? `<w:rPr>${rPrParts.join("")}</w:rPr>` : "";
              const textContent = r.text.includes("\n")
                ? r.text.split("\n").map((part) => `<w:t xml:space="preserve">${escapeXml(part)}</w:t>`).join("<w:br/>")
                : `<w:t xml:space="preserve">${escapeXml(r.text)}</w:t>`;
              return `<w:r>${rPr}${textContent}</w:r>`;
            })
            .join("");

          const pPr = pPrElements.length > 0 ? `<w:pPr>${pPrElements.join("")}</w:pPr>` : "";
          bodyXmlParts.push(`<w:p>${pPr}${runsXml}</w:p>`);
        } else if (block.type === "table") {
          const tbl = block as DocxTableBlock;
          const rowsXml = tbl.rows
            .map((row) => {
              const cellsXml = row.cells
                .map((cell) => {
                  const tcPrParts: string[] = [];
                  if (cell.bgColor) {
                    tcPrParts.push(`<w:shd w:val="clear" w:color="auto" w:fill="${cell.bgColor.replace("#", "")}"/>`);
                  }
                  if (cell.width) {
                    tcPrParts.push(`<w:tcW w:w="${Math.round(cell.width * 20)}" w:type="dxa"/>`);
                  }
                  if (cell.colSpan && cell.colSpan > 1) {
                    tcPrParts.push(`<w:gridSpan w:val="${cell.colSpan}"/>`);
                  }
                  tcPrParts.push(`<w:tcMar><w:top w:w="120"/><w:bottom w:w="120"/><w:left w:w="140"/><w:right w:w="140"/></w:tcMar>`);

                  const pContent = cell.blocks
                    .map((p) => {
                      const runs = p.runs
                        .map((r) => {
                          const rPrParts: string[] = [];
                          if (r.fontFamily) rPrParts.push(`<w:rFonts w:ascii="${escapeXml(r.fontFamily)}" w:hAnsi="${escapeXml(r.fontFamily)}"/>`);
                          if (r.bold) rPrParts.push("<w:b/>");
                          if (r.italic) rPrParts.push("<w:i/>");
                          if (r.underline) rPrParts.push('<w:u w:val="single"/>');
                          if (r.strike) rPrParts.push('<w:strike/>');
                          if (r.superscript) rPrParts.push('<w:vertAlign w:val="superscript"/>');
                          if (r.subscript) rPrParts.push('<w:vertAlign w:val="subscript"/>');
                          if (r.highlight) rPrParts.push(`<w:highlight w:val="${escapeXml(r.highlight)}"/>`);
                          if (r.fontSize) rPrParts.push(`<w:sz w:val="${Math.round(r.fontSize * 2)}"/>`);
                          if (r.color) rPrParts.push(`<w:color w:val="${r.color.replace("#", "")}"/>`);
                          const rPr = rPrParts.length > 0 ? `<w:rPr>${rPrParts.join("")}</w:rPr>` : "";
                          const textContent = r.text.includes("\n")
                            ? r.text.split("\n").map((part) => `<w:t xml:space="preserve">${escapeXml(part)}</w:t>`).join("<w:br/>")
                            : `<w:t xml:space="preserve">${escapeXml(r.text)}</w:t>`;
                          return `<w:r>${rPr}${textContent}</w:r>`;
                        })
                        .join("");
                      return `<w:p><w:pPr><w:spacing w:after="0"/></w:pPr>${runs}</w:p>`;
                    })
                    .join("");

                  return `<w:tc><w:tcPr>${tcPrParts.join("")}</w:tcPr>${pContent || "<w:p/>"}</w:tc>`;
                })
                .join("");
              return `<w:tr>${cellsXml}</w:tr>`;
            })
            .join("");

          bodyXmlParts.push(`<w:tbl>
            <w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/><w:insideV w:val="none"/></w:tblBorders></w:tblPr>
            ${rowsXml}
          </w:tbl>`);
        } else if (block.type === "image") {
          const img = block as DocxImageBlock;
          imageCounter++;
          const ext = img.mimeType === "image/png" ? "png" : "jpeg";
          const imgFileName = `media/image${imageCounter}.${ext}`;
          const rId = `rIdImg${imageCounter}`;

          imageEntries.push({
            name: `word/${imgFileName}`,
            data: img.data,
          });

          imageRelationships.push(
            `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${imgFileName}"/>`
          );

          let ptWidth = img.width || 120;
          let ptHeight = img.height || 120;
          const maxPtWidth = 460;
          if (ptWidth > maxPtWidth) {
            const scale = maxPtWidth / ptWidth;
            ptWidth = maxPtWidth;
            ptHeight *= scale;
          }

          const emuWidth = Math.round(ptWidth * 12700);
          const emuHeight = Math.round(ptHeight * 12700);

          const picXml = `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:nvPicPr>
              <pic:cNvPr id="${imageCounter}" name="Picture ${imageCounter}"/>
              <pic:cNvPicPr/>
            </pic:nvPicPr>
            <pic:blipFill>
              <a:blip r:embed="${rId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
              <a:stretch><a:fillRect/></a:stretch>
            </pic:blipFill>
            <pic:spPr>
              <a:xfrm>
                <a:off x="0" y="0"/>
                <a:ext cx="${emuWidth}" cy="${emuHeight}"/>
              </a:xfrm>
              <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
            </pic:spPr>
          </pic:pic>`;

          /*
           * Absolute positioned image — use wp:anchor
           */
          if (
            img.position === "absolute" &&
            img.x !== undefined &&
            img.y !== undefined
          ) {
            const posX = Math.round(img.x * 12700);
            const posY = Math.round(img.y * 12700);

            bodyXmlParts.push(`<w:p>
              <w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>
              <w:r>
                <w:drawing>
                  <wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="251658240" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1">
                    <wp:simplePos x="0" y="0"/>
                    <wp:positionH relativeFrom="page"><wp:posOffset>${posX}</wp:posOffset></wp:positionH>
                    <wp:positionV relativeFrom="page"><wp:posOffset>${posY}</wp:posOffset></wp:positionV>
                    <wp:extent cx="${emuWidth}" cy="${emuHeight}"/>
                    <wp:effectExtent l="0" t="0" r="0" b="0"/>
                    <wp:wrapNone/>
                    <wp:docPr id="${imageCounter}" name="Picture ${imageCounter}" descr="${escapeXml(img.altText || 'Document Image')}"/>
                    <wp:cNvGraphicFramePr>
                      <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
                    </wp:cNvGraphicFramePr>
                    <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                      <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                        ${picXml}
                      </a:graphicData>
                    </a:graphic>
                  </wp:anchor>
                </w:drawing>
              </w:r>
            </w:p>`);
          } else {
            /*
             * Normal inline image — use wp:inline
             */
            bodyXmlParts.push(`<w:p>
              <w:pPr><w:jc w:val="center"/><w:spacing w:before="80" w:after="80"/></w:pPr>
              <w:r>
                <w:drawing>
                  <wp:inline distT="0" distB="0" distL="0" distR="0">
                    <wp:extent cx="${emuWidth}" cy="${emuHeight}"/>
                    <wp:effectExtent l="0" t="0" r="0" b="0"/>
                    <wp:docPr id="${imageCounter}" name="Picture ${imageCounter}" descr="${escapeXml(img.altText || 'Document Image')}"/>
                    <wp:cNvGraphicFramePr>
                      <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
                    </wp:cNvGraphicFramePr>
                    <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                      <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                        ${picXml}
                      </a:graphicData>
                    </a:graphic>
                  </wp:inline>
                </w:drawing>
              </w:r>
            </w:p>`);
          }
        }
      }
    }
  }

  const wordRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  ${imageRelationships.join("\n  ")}
</Relationships>`;

  // Dynamic Section Properties (Page Size, Orientation, Margins)
  const firstSec = typeof contentOrModel !== "string" && contentOrModel.sections && contentOrModel.sections[0]
    ? contentOrModel.sections[0]
    : undefined;
  const pgW = firstSec?.pageSize?.width ? Math.round(firstSec.pageSize.width * 20) : 11906; // A4 pt -> dxa
  const pgH = firstSec?.pageSize?.height ? Math.round(firstSec.pageSize.height * 20) : 16838;
  const topM = firstSec?.margins?.top ? Math.round(firstSec.margins.top * 20) : 1080;
  const rightM = firstSec?.margins?.right ? Math.round(firstSec.margins.right * 20) : 1080;
  const botM = firstSec?.margins?.bottom ? Math.round(firstSec.margins.bottom * 20) : 1080;
  const leftM = firstSec?.margins?.left ? Math.round(firstSec.margins.left * 20) : 1080;
  const orientAttr = firstSec?.orientation === "landscape" ? ` w:orient="landscape"` : "";

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document 
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:w10="urn:schemas-microsoft-com:office:word"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    ${bodyXmlParts.join("")}
    <w:sectPr>
      <w:pgSz w:w="${pgW}" w:h="${pgH}"${orientAttr}/>
      <w:pgMar w:top="${topM}" w:right="${rightM}" w:bottom="${botM}" w:left="${leftM}" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const entries: ZipEntry[] = [
    { name: "[Content_Types].xml", data: encoder.encode(contentTypesXml) },
    { name: "_rels/.rels", data: encoder.encode(relsXml) },
    { name: "word/_rels/document.xml.rels", data: encoder.encode(wordRelsXml) },
    { name: "word/styles.xml", data: encoder.encode(stylesXml) },
    { name: "word/document.xml", data: encoder.encode(documentXml) },
    ...imageEntries,
  ];

  const zipBytes = buildZip(entries);
  return new Blob([new Uint8Array(zipBytes)], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}
