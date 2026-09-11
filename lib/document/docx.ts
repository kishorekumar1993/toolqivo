/**
 * Toolqivo Advanced DOCX Document Model, Extraction & Generation Engine
 * Fully parses Microsoft Word (.docx) OpenXML PKZIP structure into a rich Document Model
 * (Sections, Paragraphs, TextRuns, Tables, Styles, Margins, Dimensions)
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
  color?: string; // hex e.g. "0F172A" or "#0F172A"
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
  lineSpacing?: number;
}

export interface DocxTableCell {
  blocks: DocxParagraphBlock[];
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
  hasHeader?: boolean;
}

export type DocxBlock = DocxParagraphBlock | DocxTableBlock;

export interface DocxSection {
  pageSize: { width: number; height: number }; // in pt (e.g. 595.28 x 841.89 for A4)
  margins: { top: number; right: number; bottom: number; left: number }; // in pt
  blocks: DocxBlock[];
}

export interface DocumentModel {
  sections: DocxSection[];
  title?: string;
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

    // Local file header (30 + nameLen bytes) + uncompressed data
    const lh = new Uint8Array(30 + nameBytes.length + size);
    const lView = new DataView(lh.buffer);
    lView.setUint32(0, 0x04034b50, true); // Local file header signature
    lView.setUint16(4, 20, true); // Version needed to extract (2.0)
    lView.setUint16(6, 0, true); // General purpose bit flag
    lView.setUint16(8, 0, true); // Compression method (0 = store)
    lView.setUint16(10, 0, true); // Last mod file time
    lView.setUint16(12, 0, true); // Last mod file date
    lView.setUint32(14, crc, true); // CRC-32
    lView.setUint32(18, size, true); // Compressed size
    lView.setUint32(22, size, true); // Uncompressed size
    lView.setUint16(26, nameBytes.length, true); // File name length
    lView.setUint16(28, 0, true); // Extra field length
    lh.set(nameBytes, 30);
    lh.set(entry.data, 30 + nameBytes.length);
    localHeaders.push(lh);

    // Central directory header (46 + nameLen bytes)
    const ch = new Uint8Array(46 + nameBytes.length);
    const cView = new DataView(ch.buffer);
    cView.setUint32(0, 0x02014b50, true); // Central file header signature
    cView.setUint16(4, 20, true); // Version made by
    cView.setUint16(6, 20, true); // Version needed to extract
    cView.setUint16(8, 0, true); // General purpose bit flag
    cView.setUint16(10, 0, true); // Compression method (0 = store)
    cView.setUint16(12, 0, true); // Last mod file time
    cView.setUint16(14, 0, true); // Last mod file date
    cView.setUint32(16, crc, true); // CRC-32
    cView.setUint32(20, size, true); // Compressed size
    cView.setUint32(24, size, true); // Uncompressed size
    cView.setUint16(28, nameBytes.length, true); // File name length
    cView.setUint16(30, 0, true); // Extra field length
    cView.setUint16(32, 0, true); // File comment length
    cView.setUint16(34, 0, true); // Disk number start
    cView.setUint16(36, 0, true); // Internal file attributes
    cView.setUint32(38, 0, true); // External file attributes
    cView.setUint32(42, offset, true); // Relative offset of local header
    ch.set(nameBytes, 46);
    centralHeaders.push(ch);

    offset += lh.length;
  }

  const centralDirOffset = offset;
  const centralDirSize = centralHeaders.reduce((acc, h) => acc + h.length, 0);

  // End of central directory record (22 bytes)
  const eocd = new Uint8Array(22);
  const eView = new DataView(eocd.buffer);
  eView.setUint32(0, 0x06054b50, true); // EOCD signature
  eView.setUint16(4, 0, true); // Number of this disk
  eView.setUint16(6, 0, true); // Disk with central directory
  eView.setUint16(8, entries.length, true); // Total entries on this disk
  eView.setUint16(10, entries.length, true); // Total entries
  eView.setUint32(12, centralDirSize, true); // Size of central directory
  eView.setUint32(16, centralDirOffset, true); // Offset of start of central directory
  eView.setUint16(20, 0, true); // Comment length

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

export function escapeXml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Robust Central-Directory-first ZIP decompression and file extractor
 */
async function decompressZipEntry(
  compData: Uint8Array,
  compMethod: number
): Promise<string> {
  if (compMethod === 0) {
    return new TextDecoder("utf-8").decode(compData);
  }

  if (compMethod === 8 && typeof DecompressionStream !== "undefined") {
    try {
      const stream = new Blob([compData as BlobPart])
        .stream()
        .pipeThrough(new DecompressionStream("deflate-raw"));
      return await new Response(stream).text();
    } catch {
      try {
        const stream = new Blob([compData as BlobPart])
          .stream()
          .pipeThrough(new DecompressionStream("deflate"));
        return await new Response(stream).text();
      } catch (err) {
        console.warn("DecompressionStream error in docx:", err);
      }
    }
  }

  return "";
}

/**
 * Extract raw XML string of word/document.xml from a .docx buffer
 */
export async function extractWordDocumentXml(buffer: ArrayBuffer): Promise<string> {
  try {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);

    // 1. Central Directory EOCD scan
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

        if (filename === "word/document.xml" || filename.endsWith("document.xml")) {
          if (view.getUint32(localHeaderOffset, true) === 0x04034b50) {
            const localNameLen = view.getUint16(localHeaderOffset + 26, true);
            const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
            const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
            const dataEnd = dataStart + compSize;

            const compData = bytes.subarray(dataStart, dataEnd);
            const xmlText = await decompressZipEntry(compData, compMethod);
            if (xmlText) return xmlText;
          }
        }

        entryPos += 46 + nameLen + extraLen + commentLen;
      }
    }

    // 2. Sequential Local Header Scan Fallback
    let offset = 0;
    while (offset < bytes.length - 30) {
      if (view.getUint32(offset, true) === 0x04034b50) {
        const compMethod = view.getUint16(offset + 8, true);
        let compSize = view.getUint32(offset + 18, true);
        const nameLen = view.getUint16(offset + 26, true);
        const extraLen = view.getUint16(offset + 28, true);

        const nameBytes = bytes.subarray(offset + 30, offset + 30 + nameLen);
        const filename = new TextDecoder().decode(nameBytes);
        const dataStart = offset + 30 + nameLen + extraLen;

        if (filename === "word/document.xml" || filename.endsWith("document.xml")) {
          if (compSize === 0) {
            let nextSig = dataStart;
            while (nextSig < bytes.length - 4) {
              const sig = view.getUint32(nextSig, true);
              if (sig === 0x04034b50 || sig === 0x02014b50 || sig === 0x08074b50) break;
              nextSig++;
            }
            compSize = nextSig - dataStart;
          }

          const dataEnd = dataStart + compSize;
          const compData = bytes.subarray(dataStart, dataEnd);
          const xmlText = await decompressZipEntry(compData, compMethod);
          if (xmlText) return xmlText;
        }

        offset = (dataStart + (compSize || 1)) > offset ? (dataStart + (compSize || 1)) : offset + 1;
      } else {
        offset++;
      }
    }
  } catch (e) {
    console.warn("Error reading word/document.xml:", e);
  }
  return "";
}

// ==========================================
// OpenXML Parsing to Structured Document Model
// ==========================================

/**
 * Parse an OpenXML paragraph (<w:p>) XML fragment into a DocxParagraphBlock
 */
function parseParagraphXml(pXml: string): DocxParagraphBlock {
  // 1. Paragraph Properties (<w:pPr>)
  let alignment: "left" | "center" | "right" | "justify" = "left";
  let isHeading = false;
  let headingLevel = 1;
  let isListItem = false;
  let spacingBefore = 0;
  let spacingAfter = 4;

  const pPrMatch = pXml.match(/<w:pPr\b[\s\S]*?<\/w:pPr>/);
  if (pPrMatch) {
    const pPr = pPrMatch[0];

    // Alignment
    const jcMatch = pPr.match(/<w:jc\s+w:val="([a-zA-Z]+)"/);
    if (jcMatch) {
      const val = jcMatch[1].toLowerCase();
      if (val === "center") alignment = "center";
      else if (val === "right") alignment = "right";
      else if (val === "both" || val === "justify") alignment = "justify";
    }

    // Heading style
    const styleMatch = pPr.match(/<w:pStyle\s+w:val="([a-zA-Z0-9_-]+)"/i);
    if (styleMatch) {
      const sVal = styleMatch[1].toLowerCase();
      if (sVal.includes("heading1") || sVal === "title") {
        isHeading = true;
        headingLevel = 1;
        spacingBefore = 12;
        spacingAfter = 6;
      } else if (sVal.includes("heading2") || sVal === "subtitle") {
        isHeading = true;
        headingLevel = 2;
        spacingBefore = 10;
        spacingAfter = 4;
      } else if (sVal.includes("heading3")) {
        isHeading = true;
        headingLevel = 3;
        spacingBefore = 8;
        spacingAfter = 3;
      }
    }

    // List item
    if (/<w:numPr\b/i.test(pPr)) {
      isListItem = true;
    }

    // Spacing
    const spMatch = pPr.match(/<w:spacing\b([^>]*)\/>/);
    if (spMatch) {
      const beforeMatch = spMatch[1].match(/w:before="(\d+)"/);
      const afterMatch = spMatch[1].match(/w:after="(\d+)"/);
      if (beforeMatch) spacingBefore = Math.round(parseInt(beforeMatch[1], 10) / 20); // 1 pt = 20 twips
      if (afterMatch) spacingAfter = Math.round(parseInt(afterMatch[1], 10) / 20);
    }
  }

  // 2. Parse Text Runs (<w:r>)
  const runs: DocxTextRun[] = [];
  const runMatches = pXml.match(/<w:r\b[\s\S]*?<\/w:r>/g);

  if (runMatches) {
    for (const rXml of runMatches) {
      let bold = false;
      let italic = false;
      let underline = false;
      let fontSize: number | undefined;
      let color: string | undefined;
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

        // Font size: stored in half-points (e.g. 24 = 12pt)
        const szMatch = rPr.match(/<w:sz\s+w:val="(\d+)"/);
        if (szMatch) {
          fontSize = parseInt(szMatch[1], 10) / 2;
        }

        // Color
        const colorMatch = rPr.match(/<w:color\s+w:val="([0-9a-fA-F]{6})"/);
        if (colorMatch && colorMatch[1].toUpperCase() !== "AUTO") {
          color = `#${colorMatch[1]}`;
        }

        // Font family
        const fontMatch = rPr.match(/<w:rFonts\s+[^>]*w:ascii="([^"]+)"/);
        if (fontMatch) {
          fontFamily = fontMatch[1];
        }
      }

      // Extract text, tabs, line breaks inside the run
      const tokenMatches = rXml.match(/<w:t\b[\s\S]*?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>/g);
      let runText = "";
      if (tokenMatches) {
        for (const token of tokenMatches) {
          if (token === "<w:tab/>") {
            runText += "    ";
          } else if (token === "<w:br/>") {
            runText += "\n";
          } else {
            const clean = token.replace(/<[^>]+>/g, "");
            runText += clean;
          }
        }
      }

      if (runText) {
        runs.push({
          text: runText,
          bold,
          italic,
          underline,
          fontSize,
          color,
          fontFamily,
        });
      }
    }
  }

  // If no runs but plain text exists
  if (runs.length === 0) {
    const rawTextMatches = pXml.match(/<w:t\b[\s\S]*?>([\s\S]*?)<\/w:t>/g);
    if (rawTextMatches) {
      const full = rawTextMatches.map((m) => m.replace(/<[^>]+>/g, "")).join("");
      if (full.trim()) {
        runs.push({ text: full });
      }
    }
  }

  return {
    type: "paragraph",
    runs,
    alignment,
    isHeading,
    headingLevel,
    isListItem,
    spacingBefore,
    spacingAfter,
  };
}

/**
 * Parse an OpenXML table (<w:tbl>) XML fragment into a DocxTableBlock
 */
function parseTableXml(tblXml: string): DocxTableBlock {
  const rows: DocxTableRow[] = [];
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

          // Shading / Background color
          const shdMatch = tcXml.match(/<w:shd\s+[^>]*w:fill="([0-9a-fA-F]{6})"/i);
          if (shdMatch && shdMatch[1].toUpperCase() !== "AUTO") {
            bgColor = `#${shdMatch[1]}`;
          }

          // Cell width in twips
          const wMatch = tcXml.match(/<w:tcW\s+[^>]*w:w="(\d+)"/);
          if (wMatch) {
            width = Math.round(parseInt(wMatch[1], 10) / 20); // convert twips to pt
          }

          // Cell paragraphs
          const cellBlocks: DocxParagraphBlock[] = [];
          const cellPMatches = tcXml.match(/<w:p\b[\s\S]*?<\/w:p>/g);
          if (cellPMatches) {
            for (const cellP of cellPMatches) {
              const parsedP = parseParagraphXml(cellP);
              cellBlocks.push(parsedP);
            }
          }

          if (cellBlocks.length === 0) {
            const tMatches = tcXml.match(/<w:t\b[\s\S]*?>([\s\S]*?)<\/w:t>/g);
            const str = tMatches ? tMatches.map((t) => t.replace(/<[^>]+>/g, "")).join("").trim() : "";
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
    hasHeader: rows.some((r) => r.isHeader),
  };
}

/**
 * Parses a Word .docx buffer into a high-fidelity DocumentModel
 */
export async function parseDocxToDocumentModel(buffer: ArrayBuffer): Promise<DocumentModel> {
  const xmlStr = await extractWordDocumentXml(buffer);
  if (!xmlStr) {
    // Fallback: create single paragraph from extracted text
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
          pageSize: { width: 595.28, height: 841.89 }, // A4
          margins: { top: 54, right: 54, bottom: 54, left: 54 },
          blocks,
        },
      ],
    };
  }

  // Parse Section Properties (<w:sectPr>) for page size and margins
  let pageWidth = 595.28; // Default A4 in pt
  let pageHeight = 841.89;
  let marginTop = 54;
  let marginRight = 54;
  let marginBottom = 54;
  let marginLeft = 54;

  const sectPrMatch = xmlStr.match(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/);
  if (sectPrMatch) {
    const sectPr = sectPrMatch[0];
    const pgSzMatch = sectPr.match(/<w:pgSz\s+[^>]*w:w="(\d+)"[^>]*w:h="(\d+)"/);
    if (pgSzMatch) {
      pageWidth = parseInt(pgSzMatch[1], 10) / 20;
      pageHeight = parseInt(pgSzMatch[2], 10) / 20;
    }
    const pgMarMatch = sectPr.match(/<w:pgMar\s+([^>]*)\/>/);
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
  }

  // Match top-level blocks in <w:body> (<w:p> and <w:tbl>)
  const blocks: DocxBlock[] = [];
  const bodyMatch = xmlStr.match(/<w:body\b[\s\S]*?<\/w:body>/);
  const bodyContent = bodyMatch ? bodyMatch[0] : xmlStr;

  const blockRegex = /<w:p\b[\s\S]*?<\/w:p>|<w:tbl\b[\s\S]*?<\/w:tbl>/g;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(bodyContent)) !== null) {
    const blockXml = match[0];
    if (blockXml.startsWith("<w:p")) {
      const para = parseParagraphXml(blockXml);
      const hasContent = para.runs.some((r) => r.text && r.text.trim().length > 0);
      if (hasContent) {
        blocks.push(para);
      }
    } else if (blockXml.startsWith("<w:tbl")) {
      const tbl = parseTableXml(blockXml);
      if (tbl.rows.length > 0) {
        blocks.push(tbl);
      }
    }
  }

  return {
    sections: [
      {
        pageSize: { width: pageWidth, height: pageHeight },
        margins: { top: marginTop, right: marginRight, bottom: marginBottom, left: marginLeft },
        blocks,
      },
    ],
  };
}

/**
 * Extract clean, structured text representation from Word .docx
 */
export async function extractTextFromDocx(buffer: ArrayBuffer): Promise<string> {
  const xmlStr = await extractWordDocumentXml(buffer);
  if (!xmlStr) {
    // Binary fallback for legacy .doc or plain text
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
            return tMatches.map((t) => t.replace(/<[^>]+>/g, "")).join("").trim();
          });
          const rowStr = cellTexts.filter(Boolean).join(" | ");
          if (rowStr.trim()) paragraphs.push(rowStr);
        }
        continue;
      }

      // Paragraph
      let pText = "";
      const isHeading = /<w:pStyle\s+w:val="Heading(\d+)"/i.test(block) || /<w:pStyle\s+w:val="Title"/i.test(block);
      const isListItem = /<w:numPr>/i.test(block);

      const tokens = block.match(/<w:t\b[\s\S]*?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>/g);
      if (tokens) {
        for (const token of tokens) {
          if (token === "<w:tab/>") pText += "\t";
          else if (token === "<w:br/>") pText += "\n";
          else pText += token.replace(/<[^>]+>/g, "");
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
// OpenXML Generator: PDF / Text to .DOCX
// ==========================================

/**
 * Generate a complete, valid Microsoft Word (.docx) OpenXML package
 */
export function generateRealDocxBlob(
  title: string,
  contentOrModel: string | DocumentModel
): Blob {
  const encoder = new TextEncoder();

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const wordRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
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
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="0F172A"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:pPr><w:spacing w:before="180" w:after="100"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="26"/><w:color w:val="1E293B"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:pPr><w:spacing w:before="140" w:after="80"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="22"/><w:color w:val="334155"/></w:rPr>
  </w:style>
</w:styles>`;

  const bodyXmlParts: string[] = [];

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
    // Render from DocumentModel
    for (const section of contentOrModel.sections) {
      for (const block of section.blocks) {
        if (block.type === "paragraph") {
          const pPrElements: string[] = [];
          if (block.alignment && block.alignment !== "left") {
            const jc = block.alignment === "justify" ? "both" : block.alignment;
            pPrElements.push(`<w:jc w:val="${jc}"/>`);
          }
          if (block.isHeading) {
            pPrElements.push(`<w:pStyle w:val="Heading${block.headingLevel || 1}"/>`);
          }
          if (block.isListItem) {
            pPrElements.push(`<w:ind w:left="400"/>`);
          }
          const before = (block.spacingBefore || 0) * 20;
          const after = (block.spacingAfter || 6) * 20;
          pPrElements.push(`<w:spacing w:before="${before}" w:after="${after}"/>`);

          const runsXml = block.runs
            .map((r) => {
              const rPrParts: string[] = [];
              if (r.bold) rPrParts.push("<w:b/>");
              if (r.italic) rPrParts.push("<w:i/>");
              if (r.underline) rPrParts.push('<w:u w:val="single"/>');
              if (r.fontSize) rPrParts.push(`<w:sz w:val="${Math.round(r.fontSize * 2)}"/>`);
              if (r.color) {
                const hex = r.color.replace("#", "");
                rPrParts.push(`<w:color w:val="${hex}"/>`);
              }
              const rPr = rPrParts.length > 0 ? `<w:rPr>${rPrParts.join("")}</w:rPr>` : "";
              return `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(r.text)}</w:t></w:r>`;
            })
            .join("");

          const pPr = pPrElements.length > 0 ? `<w:pPr>${pPrElements.join("")}</w:pPr>` : "";
          bodyXmlParts.push(`<w:p>${pPr}${runsXml}</w:p>`);
        } else if (block.type === "table") {
          const rowsXml = block.rows
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
                  tcPrParts.push(`<w:tcMar><w:top w:w="120"/><w:bottom w:w="120"/><w:left w:w="140"/><w:right w:w="140"/></w:tcMar>`);

                  const pContent = cell.blocks
                    .map((p) => {
                      const runs = p.runs
                        .map((r) => `<w:r><w:rPr>${r.bold ? "<w:b/>" : ""}<w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">${escapeXml(r.text)}</w:t></w:r>`)
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
        }
      }
    }
  }

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:spacing w:after="200"/></w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="36"/><w:color w:val="0F172A"/></w:rPr>
        <w:t>${escapeXml(title)}</w:t>
      </w:r>
    </w:p>
    ${bodyXmlParts.join("")}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const entries: ZipEntry[] = [
    { name: "[Content_Types].xml", data: encoder.encode(contentTypesXml) },
    { name: "_rels/.rels", data: encoder.encode(relsXml) },
    { name: "word/_rels/document.xml.rels", data: encoder.encode(wordRelsXml) },
    { name: "word/styles.xml", data: encoder.encode(stylesXml) },
    { name: "word/document.xml", data: encoder.encode(documentXml) },
  ];

  const zipBytes = buildZip(entries);
  return new Blob([new Uint8Array(zipBytes)], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}
