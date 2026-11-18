// Run 108: a page left open across a new release imports a PDF bank statement. The PDF reader is a separate file of the old release that
// the server no longer has. Before Run 108 the app said "This PDF could not be opened" (the PDF was not the problem). Now it says a new
// version is ready and shows the Update button. Checked on the BUILT app (vite build + preview), with the reader's files deleted from the
// build as a new deploy would. Usage: node tests/pwa/stalechunk-check.mjs (builds into a temp folder; never touches dist/ or user folders).
// Synthetic data only.
import { spawn, spawnSync } from "child_process"; import fs from "fs"; import os from "os"; import path from "path";
import { fileURLToPath } from "url"; import { launch, wait, ok, section, finish, openData } from "../browser/lib.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const out = fs.mkdtempSync(path.join(os.tmpdir(), "ledger-stale-")); const PORT = 4177, URL0 = `http://localhost:${PORT}/`;
const vite = path.join(root, "node_modules", "vite", "bin", "vite.js");
const b = spawnSync(process.execPath, [vite, "build", "--outDir", out, "--emptyOutDir"], { cwd: root, encoding: "utf8" });
console.log(`build exit=${b.status} -> ${out}`); if (b.status !== 0) { console.log(b.stdout, b.stderr); process.exit(1); }
const chunks = fs.readdirSync(path.join(out, "assets")).filter((f) => /^pdf/i.test(f));
for (const c of chunks) fs.unlinkSync(path.join(out, "assets", c));
const server = spawn(process.execPath, [vite, "preview", "--outDir", out, "--port", String(PORT), "--strictPort"], { cwd: root });
for (let i = 0; i < 50; i++) { try { const r = await fetch(URL0); if (r.ok) break; } catch {} await wait(200); }
const browser = await launch();
try {
  section("STALE-1. The PDF reader's files are gone (new release deployed): importing a PDF says a new version is ready");
  ok(chunks.length >= 1 && chunks.some((c) => /^pdfText/.test(c)), "the build has the PDF reader as separate files (they were removed for this check)", chunks);
  const page = await browser.newPage(); await page.setViewport({ width: 390, height: 844 });
  page.errors = []; page.on("pageerror", (e) => page.errors.push(String(e)));
  await page.evaluateOnNewDocument(() => { if (!localStorage.getItem("expense_ledger_v5")) localStorage.setItem("expense_ledger_v5", JSON.stringify({ language: "en", transactions: [], budgets: {}, templates: [], currency: "₼", goals: [], safeToSpend: { enabled: false, savingsTarget: 0 } })); });
  await page.goto(URL0, { waitUntil: "load" }); await page.waitForSelector(".tabbar"); await wait(800);
  await openData(page);
  const f = path.join(out, "st.pdf"); fs.writeFileSync(f, "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF");
  const input = await page.$(".io-page input[type=file]"); await input.uploadFile(f); await wait(2500);
  const text = await page.evaluate(() => document.body.innerText);
  ok(/A new version of the app is ready/.test(text) && !/This PDF could not be opened/.test(text), "the message says a new version is ready, not that the PDF is broken");
  ok(!!(await page.$(".update-now")), "the Update button is shown");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
} finally { await browser.close(); server.kill(); fs.rmSync(out, { recursive: true, force: true }); }
finish("stalechunk-check");
