// Offline-readiness evidence (Run 3, 2026-10-27). Not part of run-browser (it needs the production build and a local server).
// Usage: npm run build && node tests/offline-check.mjs
// Serves ./dist with `vite preview`, opens it once online (seeding synthetic data), then switches the browser offline and
// reloads — exactly what happens when a user opens the app with no connection. Prints what was observed; it asserts nothing,
// because offline launch is a known gap (no service worker) that this script documents.
import { spawn } from "child_process"; import puppeteer from "puppeteer-core"; import fs from "fs"; import os from "os"; import path from "path";
const PORT = 4319, URL = `http://localhost:${PORT}/`, wait = (ms) => new Promise((r) => setTimeout(r, ms));
const srv = spawn(process.platform === "win32" ? "npx.cmd" : "npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { shell: true, stdio: "ignore" });
await wait(4000);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ledger-offline-"));
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true, userDataDir: dir });
const page = await browser.newPage();
const fontReqs = []; page.on("request", (r) => { if (/fonts\.(googleapis|gstatic)\.com/.test(r.url())) fontReqs.push(r.url().slice(0, 60)); });
await page.goto(URL, { waitUntil: "networkidle2" });
await page.evaluate(() => localStorage.setItem("expense_ledger_v5", JSON.stringify({ language: "en", transactions: [{ id: 1, type: "expense", amount: 12.5, category: "food", subcategory: "", merchant: "Offline test", note: "", date: new Date().toISOString().slice(0, 10), recurring: false, recurFreq: null, isActive: true, createdAt: new Date().toISOString() }], budgets: {}, templates: [], currency: "₼", goals: [], safeToSpend: { enabled: false, savingsTarget: 0 } })));
await page.reload({ waitUntil: "networkidle2" });
const online = await page.evaluate(() => ({ app: !!document.querySelector(".tabbar"), text: document.body.innerText.includes("12.50"), sw: !!navigator.serviceWorker?.controller, persisted: null }));
online.persisted = await page.evaluate(async () => navigator.storage?.persisted ? await navigator.storage.persisted() : "n/a");
console.log("ONLINE  : app shown =", online.app, "| seeded entry visible =", online.text, "| service worker controlling page =", online.sw, "| storage persisted =", online.persisted);
console.log("ONLINE  : requests to Google Fonts =", fontReqs.length);
await page.setOfflineMode(true);
let offline;
try { await page.reload({ waitUntil: "domcontentloaded", timeout: 15000 }); offline = await page.evaluate(() => ({ app: !!document.querySelector(".tabbar"), body: document.body.innerText.slice(0, 120).replace(/\s+/g, " ") })); }
catch (e) { offline = { app: false, error: String(e.message).slice(0, 120) }; }
console.log("OFFLINE : reload → app shown =", offline.app, "|", offline.error || offline.body);
await page.setOfflineMode(false); await page.goto(URL, { waitUntil: "networkidle2" });
const back = await page.evaluate(() => JSON.parse(localStorage.getItem("expense_ledger_v5") || "null")?.transactions?.length ?? null);
console.log("BACK ONLINE: entries still stored in expense_ledger_v5 =", back);
await browser.close(); srv.kill(); process.exit(0);
