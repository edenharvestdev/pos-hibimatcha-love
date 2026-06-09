// ============================================
// Universal export utilities
// CSV / XLSX (Excel-readable) / PNG / PDF
// No external libraries — uses browser APIs only.
// ============================================

export type ExportFormat = "csv" | "xlsx" | "json" | "pdf" | "png";

// ============================================================
// CSV
// ============================================================
function escapeCSV(v: any): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCSV(rows: Record<string, any>[], headers?: string[]): string {
  if (rows.length === 0) return headers ? headers.join(",") : "";
  const cols = headers || Object.keys(rows[0]);
  const lines = [cols.join(",")];
  for (const r of rows) {
    lines.push(cols.map((c) => escapeCSV(r[c])).join(","));
  }
  return lines.join("\r\n");
}

export function downloadCSV(filename: string, rows: Record<string, any>[], headers?: string[]) {
  const csv = "﻿" + toCSV(rows, headers); // BOM for Excel UTF-8
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

// ============================================================
// XLSX (Excel-readable XML — SpreadsheetML 2003 format)
// No library required, opens directly in Excel/LibreOffice/Numbers.
// ============================================================
function escapeXML(v: any): string {
  if (v == null) return "";
  return String(v).replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!));
}

function xlsxCell(v: any): string {
  if (v == null || v === "") return `<Cell><Data ss:Type="String"></Data></Cell>`;
  if (typeof v === "number" || (typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v))) {
    return `<Cell><Data ss:Type="Number">${v}</Data></Cell>`;
  }
  return `<Cell><Data ss:Type="String">${escapeXML(v)}</Data></Cell>`;
}

export function toXLSX(rows: Record<string, any>[], headers?: string[], sheetName = "Sheet1"): string {
  const cols = headers || (rows[0] ? Object.keys(rows[0]) : []);
  const headerRow = `<Row>${cols.map((c) => `<Cell><Data ss:Type="String">${escapeXML(c)}</Data></Cell>`).join("")}</Row>`;
  const dataRows = rows.map((r) => `<Row>${cols.map((c) => xlsxCell(r[c])).join("")}</Row>`).join("");
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
          xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="${escapeXML(sheetName)}">
    <Table>
      ${headerRow}
      ${dataRows}
    </Table>
  </Worksheet>
</Workbook>`;
}

export function downloadXLSX(filename: string, rows: Record<string, any>[], headers?: string[], sheetName?: string) {
  const xml = toXLSX(rows, headers, sheetName);
  const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8;" });
  downloadBlob(blob, filename.endsWith(".xls") || filename.endsWith(".xlsx") ? filename : `${filename}.xls`);
}

// ============================================================
// JSON
// ============================================================
export function downloadJSON(filename: string, data: any) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  downloadBlob(blob, filename.endsWith(".json") ? filename : `${filename}.json`);
}

// ============================================================
// PNG (via SVG → canvas)
// Captures a DOM element's bounding-box rendering to PNG.
// Uses inline SVG with <foreignObject> trick — works without html2canvas.
// ============================================================
export async function downloadPNG(filename: string, element: HTMLElement): Promise<void> {
  const { width, height } = element.getBoundingClientRect();
  const cloned = element.cloneNode(true) as HTMLElement;
  // Inline computed styles so the SVG render preserves look
  inlineStyles(element, cloned);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <foreignObject width="100%" height="100%">
      <div xmlns="http://www.w3.org/1999/xhtml" style="background: #fdfdfb; font-family: Inter, sans-serif;">
        ${new XMLSerializer().serializeToString(cloned)}
      </div>
    </foreignObject>
  </svg>`;

  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = (e) => reject(e);
    img.src = url;
  });
  const canvas = document.createElement("canvas");
  canvas.width = width * 2; // 2x for retina
  canvas.height = height * 2;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(2, 2);
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(url);
  const dataUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename.endsWith(".png") ? filename : `${filename}.png`;
  a.click();
}

function inlineStyles(source: HTMLElement, target: HTMLElement) {
  const sourceComp = window.getComputedStyle(source);
  const props = ["color", "background", "background-color", "font-size", "font-weight", "font-family", "padding", "margin", "border", "border-radius", "display", "text-align", "line-height"];
  props.forEach((p) => target.style.setProperty(p, sourceComp.getPropertyValue(p)));
  const sourceKids = Array.from(source.children) as HTMLElement[];
  const targetKids = Array.from(target.children) as HTMLElement[];
  sourceKids.forEach((sk, i) => targetKids[i] && inlineStyles(sk, targetKids[i]));
}

// ============================================================
// PDF (via browser print to PDF)
// Opens a new window with the content and triggers print dialog → user chooses "Save as PDF".
// ============================================================
export function downloadPDF(title: string, htmlContent: string) {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) { alert("Pop-up blocked — please allow pop-ups to export PDF."); return; }
  w.document.write(`
    <!doctype html><html><head><title>${escapeXML(title)}</title>
    <style>
      @page { margin: 16mm; }
      body { font-family: Inter, system-ui, -apple-system, sans-serif; color: #1a1a17; }
      h1 { font-size: 24px; margin: 0 0 4px; }
      h2 { font-size: 16px; margin: 24px 0 8px; color: #555; }
      .meta { font-size: 12px; color: #888; margin-bottom: 24px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th { text-align: left; padding: 8px; background: #f5f5f0; border-bottom: 1px solid #ddd; font-weight: 600; }
      td { padding: 8px; border-bottom: 1px solid #eee; }
      .right { text-align: right; }
      .stat-row { display: flex; gap: 24px; margin: 16px 0; padding: 16px; background: #f9f9f5; border-radius: 8px; }
      .stat { flex: 1; }
      .stat-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.06em; }
      .stat-value { font-size: 20px; font-weight: 600; margin-top: 4px; }
      .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; font-size: 11px; color: #aaa; }
    </style></head><body>
      ${htmlContent}
      <div class="footer">Generated by Hibi Matcha · ${new Date().toLocaleString()}</div>
      <script>window.onload = () => { setTimeout(() => window.print(), 200); }<\/script>
    </body></html>
  `);
  w.document.close();
}

// ============================================================
// Common helper
// ============================================================
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

// ============================================================
// Multi-format dispatcher
// ============================================================
export function exportAs(
  format: ExportFormat,
  filename: string,
  data: { rows?: Record<string, any>[]; headers?: string[]; element?: HTMLElement; html?: string; title?: string }
) {
  switch (format) {
    case "csv":  return downloadCSV(filename, data.rows ?? [], data.headers);
    case "xlsx": return downloadXLSX(filename, data.rows ?? [], data.headers);
    case "json": return downloadJSON(filename, data.rows);
    case "png":  if (data.element) return downloadPNG(filename, data.element); break;
    case "pdf":  return downloadPDF(data.title ?? filename, data.html ?? tableHTMLFromRows(data.rows ?? [], data.headers));
  }
}

export function tableHTMLFromRows(rows: Record<string, any>[], headers?: string[]): string {
  const cols = headers || (rows[0] ? Object.keys(rows[0]) : []);
  return `<table>
    <thead><tr>${cols.map((c) => `<th>${escapeXML(c)}</th>`).join("")}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td>${escapeXML(r[c])}</td>`).join("")}</tr>`).join("")}</tbody>
  </table>`;
}
