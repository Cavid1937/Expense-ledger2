// Run 52: the text of a PDF, with where each piece sits on the page, read on the phone itself (nothing is uploaded anywhere).
// The PDF library is large, so it is loaded only at the moment a PDF file is chosen; the rest of the app never pays for it.
// Output: lines for statement.js -> [{ page, y, cells:[text...], xs:[x...] }], top of the page first, cells left to right.
export const PDF_MAX_BYTES = 30 * 1024 * 1024, PDF_MAX_PAGES = 400;
export async function pdfLines(buf) {
  if (!buf || buf.byteLength > PDF_MAX_BYTES) throw new Error("size");
  const lib = await import("pdfjs-dist/legacy/build/pdf.js"), pdfjs = lib.getDocument ? lib : lib.default;
  // No separate worker file: the reading code runs in the page (a statement is small). The library uses this hook when it is present.
  if (!globalThis.pdfjsWorker) { const w = await import("pdfjs-dist/legacy/build/pdf.worker.js"); globalThis.pdfjsWorker = w.WorkerMessageHandler ? w : w.default; }
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), isEvalSupported: false, disableFontFace: true, useSystemFonts: false, stopAtErrors: false }).promise;
  if (doc.numPages > PDF_MAX_PAGES) throw new Error("pages");
  const lines = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const tc = await (await doc.getPage(p)).getTextContent(), rows = [];
    for (const it of tc.items) {
      if (!it.str || !it.str.trim()) continue;
      const y = it.transform[5]; let r = rows.find((q) => Math.abs(q.y - y) <= 2);
      if (!r) { r = { y, its: [] }; rows.push(r); }
      r.its.push({ x: it.transform[4], s: it.str.trim() });
    }
    rows.sort((a, b) => b.y - a.y).forEach((r) => { const its = r.its.sort((a, b) => a.x - b.x); lines.push({ page: p, y: r.y, cells: its.map((i) => i.s), xs: its.map((i) => i.x) }); });
  }
  try { await doc.destroy(); } catch { /* nothing to release */ }
  return lines;
}
