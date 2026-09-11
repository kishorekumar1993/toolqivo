/**
 * Toolqivo DOCX Document Extraction Engine
 * Parses Microsoft Word (.docx) OpenXML PKZIP structure into formatted text, headings, and paragraphs
 */

/**
 * Parse Word XML document.xml into clean text paragraphs with headings and lists
 */
function parseWordXmlToText(xmlStr: string): string {
  try {
    const paragraphs: string[] = [];
    const pMatches = xmlStr.match(/<w:p\b[\s\S]*?<\/w:p>/g);
    if (pMatches) {
      for (const p of pMatches) {
        let pText = "";
        const isHeading = /<w:pStyle\s+w:val="Heading\d+"/i.test(p);
        const isListItem = /<w:numPr>/i.test(p);

        const tMatches = p.match(/<w:t\b[\s\S]*?>([\s\S]*?)<\/w:t>/g);
        if (tMatches) {
          for (const t of tMatches) {
            const inner = t.replace(/<[^>]+>/g, "");
            pText += inner;
          }
        }
        if (pText.trim()) {
          if (isHeading) {
            paragraphs.push(`\n### ${pText.trim()}`);
          } else if (isListItem) {
            paragraphs.push(`* ${pText.trim()}`);
          } else {
            paragraphs.push(pText.trim());
          }
        }
      }
    }
    if (paragraphs.length > 0) {
      return paragraphs.join("\n\n");
    }
  } catch (e) {
    console.warn("XML text parse fallback:", e);
  }
  return xmlStr.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Extract text from a .docx file buffer using client-side ZIP parsing and decompression
 */
export async function extractTextFromDocx(buffer: ArrayBuffer): Promise<string> {
  try {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    let offset = 0;

    while (offset < bytes.length - 30) {
      if (view.getUint32(offset, true) === 0x04034b50) {
        const compMethod = view.getUint16(offset + 8, true);
        const compSize = view.getUint32(offset + 18, true);
        const nameLen = view.getUint16(offset + 26, true);
        const extraLen = view.getUint16(offset + 28, true);

        const nameBytes = bytes.subarray(offset + 30, offset + 30 + nameLen);
        const filename = new TextDecoder().decode(nameBytes);

        const dataStart = offset + 30 + nameLen + extraLen;
        const dataEnd = dataStart + compSize;

        if (filename === "word/document.xml") {
          const compData = bytes.subarray(dataStart, dataEnd);
          let xmlText = "";

          if (compMethod === 8 && typeof DecompressionStream !== "undefined") {
            try {
              const stream = new Blob([compData])
                .stream()
                .pipeThrough(new DecompressionStream("deflate-raw"));
              xmlText = await new Response(stream).text();
            } catch (decompErr) {
              console.warn("DecompressionStream fallback in docx:", decompErr);
            }
          } else if (compMethod === 0) {
            xmlText = new TextDecoder().decode(compData);
          }

          if (xmlText) {
            const parsed = parseWordXmlToText(xmlText);
            if (parsed.trim()) return parsed;
          }
        }

        offset = dataEnd > offset ? dataEnd : offset + 1;
      } else {
        offset++;
      }
    }
  } catch (err) {
    console.warn("Error parsing DOCX PKZIP structure:", err);
  }

  // Fallback for .doc or plain text
  try {
    const text = new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(buffer));
    const clean = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, " ").replace(/\s+/g, " ").trim();
    if (clean.length > 30) return clean;
  } catch {}

  return "";
}
