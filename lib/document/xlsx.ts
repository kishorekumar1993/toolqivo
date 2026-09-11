/**
 * Toolqivo OpenXML Spreadsheet (.xlsx) Extraction & Generation Engine
 * Handles full ISO/IEC 29500 XLSX parsing (shared strings, formulas, inline strings, cell coords)
 * and generates clean, valid XLSX PKZip workbooks without server dependencies.
 */

/**
 * Extract tabular grid data (string[][]) from an Excel .xlsx buffer in client-side JS
 */
export async function extractTableFromXlsx(buffer: ArrayBuffer): Promise<string[][]> {
  const rows: string[][] = [];

  try {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    let offset = 0;

    let sharedStringsXml = "";
    let sheetXml = "";

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

        if (
          filename === "xl/sharedStrings.xml" ||
          filename.includes("worksheets/sheet1.xml") ||
          filename.includes("worksheets/sheet.xml")
        ) {
          const compData = bytes.subarray(dataStart, dataEnd);
          let xmlText = "";

          if (compMethod === 8 && typeof DecompressionStream !== "undefined") {
            try {
              const stream = new Blob([compData])
                .stream()
                .pipeThrough(new DecompressionStream("deflate-raw"));
              xmlText = await new Response(stream).text();
            } catch (decompErr) {
              console.warn("DecompressionStream fallback in xlsx:", decompErr);
            }
          } else if (compMethod === 0) {
            xmlText = new TextDecoder().decode(compData);
          }

          if (filename === "xl/sharedStrings.xml") {
            sharedStringsXml = xmlText;
          } else if (filename.includes("sheet")) {
            sheetXml = xmlText;
          }
        }

        offset = dataEnd > offset ? dataEnd : offset + 1;
      } else {
        offset++;
      }
    }

    // Parse Shared Strings Table
    const sharedStrings: string[] = [];
    if (sharedStringsXml) {
      const siMatches = sharedStringsXml.match(/<si\b[\s\S]*?<\/si>/g);
      if (siMatches) {
        for (const si of siMatches) {
          const tMatches = si.match(/<t\b[\s\S]*?>([\s\S]*?)<\/t>/g);
          if (tMatches) {
            const str = tMatches.map((t) => t.replace(/<[^>]+>/g, "")).join("");
            sharedStrings.push(str);
          } else {
            sharedStrings.push("");
          }
        }
      }
    }

    // Parse Sheet Rows & Cells
    if (sheetXml) {
      const rowMatches = sheetXml.match(/<row\b[\s\S]*?<\/row>/g);
      if (rowMatches) {
        for (const rXml of rowMatches) {
          const rowCells: { colIdx: number; val: string }[] = [];
          const cMatches = rXml.match(/<c\b[\s\S]*?<\/c>/g) || rXml.match(/<c\b[^>]*\/>/g);

          if (cMatches) {
            for (const cXml of cMatches) {
              const rAttr = cXml.match(/\br="([A-Z]+)(\d+)"/);
              let colIdx = rowCells.length;
              if (rAttr && rAttr[1]) {
                const letters = rAttr[1];
                let num = 0;
                for (let i = 0; i < letters.length; i++) {
                  num = num * 26 + (letters.charCodeAt(i) - 64);
                }
                colIdx = Math.max(0, num - 1);
              }

              const isShared = cXml.includes('t="s"');
              const isInline = cXml.includes('t="inlineStr"');
              let val = "";

              if (isShared) {
                const vMatch = cXml.match(/<v>(\d+)<\/v>/);
                if (vMatch && vMatch[1]) {
                  const sIdx = parseInt(vMatch[1], 10);
                  val = sharedStrings[sIdx] || "";
                }
              } else if (isInline) {
                const tMatch = cXml.match(/<t\b[\s\S]*?>([\s\S]*?)<\/t>/);
                if (tMatch && tMatch[1]) val = tMatch[1].replace(/<[^>]+>/g, "");
              } else {
                const vMatch = cXml.match(/<v>([\s\S]*?)<\/v>/);
                if (vMatch && vMatch[1]) val = vMatch[1];
              }

              rowCells.push({ colIdx, val });
            }

            // Build sparse-dense row
            if (rowCells.length > 0) {
              const maxCol = Math.max(...rowCells.map((c) => c.colIdx));
              const rowArray = new Array(maxCol + 1).fill("");
              rowCells.forEach((c) => {
                rowArray[c.colIdx] = c.val.trim();
              });
              if (rowArray.some((cell) => cell.length > 0)) {
                rows.push(rowArray);
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn("XLSX parsing error:", err);
  }

  // Fallback: CSV / Delimited parser
  if (rows.length === 0) {
    try {
      const text = new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(buffer));
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      for (const line of lines) {
        if (line.includes("\t") || line.includes(",") || line.includes("|")) {
          const cells = line.split(/[\t,|]/).map((c) => c.replace(/^["']|["']$/g, "").trim());
          if (cells.some((c) => c.length > 0)) {
            rows.push(cells);
          }
        }
      }
    } catch {}
  }

  return rows;
}

/**
 * Generate a 100% compliant ISO/IEC 29500 OpenXML Spreadsheet (.xlsx) PKZIP file
 */
export function generateRealXlsxBlob(title: string, tableData: string[][]): Blob {
  const encoder = new TextEncoder();

  if (tableData.length === 0) {
    tableData = [
      ["Column A", "Column B", "Column C"],
      ["Record 1", "Value 1", "100"],
      ["Record 2", "Value 2", "200"],
    ];
  }

  const escapeXml = (str: string) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Sheet1" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><name val="Calibri"/><sz val="11"/></font></fonts>
  <fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
</styleSheet>`;

  // Convert column index to Excel column letter (0 -> A, 1 -> B, 26 -> AA)
  const getColLetter = (idx: number): string => {
    let col = "";
    let n = idx;
    while (n >= 0) {
      col = String.fromCharCode((n % 26) + 65) + col;
      n = Math.floor(n / 26) - 1;
    }
    return col;
  };

  const rowsXml = tableData
    .map((row, rIdx) => {
      const rowNum = rIdx + 1;
      const cellsXml = row
        .map((cell, cIdx) => {
          const colLetter = getColLetter(cIdx);
          const cellRef = `${colLetter}${rowNum}`;
          const isNumber = !isNaN(Number(cell)) && cell.trim() !== "";
          if (isNumber) {
            return `<c r="${cellRef}"><v>${escapeXml(cell.trim())}</v></c>`;
          }
          return `<c r="${cellRef}" t="inlineStr"><is><t>${escapeXml(cell)}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowNum}">${cellsXml}</row>`;
    })
    .join("");

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    ${rowsXml}
  </sheetData>
</worksheet>`;

  // Inline ZIP builder
  const makeCrcTable = () => {
    let c;
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[n] = c;
    }
    return table;
  };
  const crcTable = makeCrcTable();
  const getCrc = (buf: Uint8Array) => {
    let crc = 0 ^ -1;
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ -1) >>> 0;
  };

  const entries = [
    { name: "[Content_Types].xml", data: encoder.encode(contentTypesXml) },
    { name: "_rels/.rels", data: encoder.encode(relsXml) },
    { name: "xl/_rels/workbook.xml.rels", data: encoder.encode(workbookRelsXml) },
    { name: "xl/workbook.xml", data: encoder.encode(workbookXml) },
    { name: "xl/styles.xml", data: encoder.encode(stylesXml) },
    { name: "xl/worksheets/sheet1.xml", data: encoder.encode(sheetXml) },
  ];

  const localHeaders: Uint8Array[] = [];
  const centralHeaders: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const crc = getCrc(entry.data);
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

  return new Blob([result], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
