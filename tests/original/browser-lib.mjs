// Shared helpers for browser tests (real headless Chromium driving the real bundled app).
import chromium from "@sparticuz/chromium"; import puppeteer from "puppeteer-core"; import fs from "fs"; import path from "path";
export const KEY = "expense_ledger_v5";
export const PAGE = "file:///tmp/tools/page/index.html";
const pad = (n) => String(n).padStart(2, "0");
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const TODAY = ymd(new Date());
export const daysAgo = (n) => { const d = new Date(); return ymd(new Date(d.getFullYear(), d.getMonth(), d.getDate() - n)); };
let _id = 1790000000000;
export const tx = (o = {}) => ({ id: ++_id, type: "expense", amount: 10, category: "food", subcategory: "", merchant: "", note: "", date: TODAY, recurring: false, recurFreq: null, isActive: true, createdAt: new Date().toISOString(), ...o });
export const baseSeed = (over = {}) => ({ transactions: [tx({ merchant: "M1", amount: 10 }), tx({ merchant: "M2", amount: 20, category: "transport" }), tx({ type: "income", category: "salary", amount: 2000, merchant: "Employer" })],
  budgets: { food: 400 }, templates: [{ id: "t1", name: "Bus", amount: 0.6, catId: "transport", subcat: "Bus", merchant: "", note: "" }], currency: "₼",
  goals: [{ id: "g1", name: "Master's", target: 40000, saved: 3200, monthlyTarget: 500, targetDate: null }], safeToSpend: { enabled: true, savingsTarget: 300 }, lastBackup: new Date().toISOString(), ...over });
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export async function launch() { return puppeteer.launch({ args: [...chromium.args, "--no-sandbox"], executablePath: await chromium.executablePath(), headless: "shell" }); }
// seed: object written to localStorage before the app starts (only on the first load of this page); pre: extra evaluateOnNewDocument code
export async function openPage(browser, { width = 390, height = 844, seed = baseSeed(), seedRaw = null, pre = null, dsf = 1 } = {}) {
  const page = await browser.newPage(); await page.setViewport({ width, height, deviceScaleFactor: dsf });
  await page.setRequestInterception(true); page.on("request", (r) => { const u = r.url(); (u.startsWith("http") ? r.abort() : r.continue()); });
  await page.evaluateOnNewDocument((k, d, raw) => { if (!sessionStorage.getItem("__seeded")) { sessionStorage.setItem("__seeded", "1"); if (raw !== null) localStorage.setItem(k, raw); else if (d) localStorage.setItem(k, JSON.stringify(d)); } }, KEY, seed, seedRaw);
  if (pre) await page.evaluateOnNewDocument(pre);
  page.errors = []; page.on("pageerror", (e) => page.errors.push(String(e)));
  page.dialogAnswer = ""; page.on("dialog", async (d) => { await d.accept(page.dialogAnswer ?? ""); });
  await page.goto(PAGE); await page.waitForSelector(".tabbar"); await wait(450);
  return page;
}
export const state = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
export const storageKeys = (page) => page.evaluate(() => Object.keys(localStorage));
export const toast = async (page, ms = 150) => { await wait(ms); return page.evaluate(() => (document.querySelector(".toast") || {}).textContent || ""); };
export const bodyText = (page) => page.evaluate(() => document.body.innerText);
export async function clickText(page, sel, re) {
  const found = await page.evaluate((sel, src) => { const r = new RegExp(src, "i"); const el = [...document.querySelectorAll(sel)].find((e) => r.test(e.textContent)); if (el) { el.click(); return true; } return false; }, sel, re.source);
  if (!found) throw new Error(`no element ${sel} matching ${re}`); await wait(150);
}
export async function setInput(page, finder, v) {   // React-compatible value set; finder is a self-contained function
  await page.evaluate((src, v) => { const el = eval("(" + src + ")")(); if (!el) throw new Error("field not found"); const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value").set; set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); }, finder.toString(), v);
}
export async function clickIn(page, finder) { await page.evaluate((src) => { const el = eval("(" + src + ")")(); if (!el) throw new Error("element not found"); el.click(); }, finder.toString()); await wait(120); }
export const tab = (page, name) => clickText(page, ".tab-btn", new RegExp(name));
export const openSettings = async (page) => { await page.evaluate(() => document.querySelector('button[aria-label="Settings"]').click()); await page.waitForSelector(".sheet"); await wait(350); };
export const openAdd = async (page) => { await page.evaluate(() => document.querySelector('button[aria-label="Add transaction"]').click()); await page.waitForSelector(".amount-input"); await wait(350); };
let fails = 0, passes = 0;
export const ok = (c, m, extra) => { console.log((c ? "  ✓ " : "  ✗ ") + m); if (c) passes++; else { fails++; if (extra !== undefined) console.log("      ↳", typeof extra === "string" ? extra : JSON.stringify(extra)); } };
export const section = (t) => console.log("\n" + t);
export const finish = async (name, browser) => { if (browser) await browser.close(); console.log(`\n${fails === 0 ? name + ": ALL " + passes + " CHECKS PASSED" : name + ": " + fails + " FAILED, " + passes + " passed"}`); process.exit(fails ? 1 : 0); };
export { fs, path };
