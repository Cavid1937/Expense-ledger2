// Shared helpers for browser tests (real headless Chromium driving the real bundled app).
// Windows adaptation (original kept in tests/original/browser-lib.mjs): the installed Chrome replaces @sparticuz/chromium,
// each run gets a fresh throw-away browser profile, and the page path comes from PAGE_URL (set by tests/run-browser.mjs).
import puppeteer from "puppeteer-core"; import fs from "fs"; import path from "path"; import os from "os";
export const KEY = "expense_ledger_v5";
export const PAGE = process.env.PAGE_URL || "file:///tmp/tools/page/index.html";
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
// Run 13: a test that stops on an uncaught error used to leave its Chrome (and profile) running. Every launched browser is now
// closed on an uncaught error before the file exits with a failure. No assertion is affected.
// Closing is capped at 4 s and then forced (a browser frozen by a suspended computer must not hang the file for the whole
// 10-minute limit: seen once in Run 13, e2e_run7 ETIMEDOUT). The last page events are printed so that a fault comes with evidence.
const launched = new Set(), trail = [];
const note = (s) => { trail.push(`${new Date().toISOString().slice(11, 23)} ${s}`); if (trail.length > 40) trail.shift(); };
const closeLaunched = async () => { for (const b of [...launched]) { const proc = b.process && b.process(); await Promise.race([b.close().catch(() => {}), new Promise((r) => setTimeout(r, 4000))]); try { proc && proc.kill(); } catch {} launched.delete(b); } };
for (const ev of ["uncaughtException", "unhandledRejection"]) process.on(ev, async (e) => { console.error(String((e && e.stack) || e)); console.error("[lib] last page events before the fault:\n" + trail.join("\n")); await closeLaunched(); process.exit(1); });
export async function launch() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "ledger-e2e-profile-"));
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true, userDataDir, args: ["--no-first-run", "--no-default-browser-check", "--disable-extensions"] });
  launched.add(browser); browser.on("disconnected", () => { note("browser disconnected"); launched.delete(browser); });
  // Every download goes to a throw-away folder, never the user's real Downloads (tests may override with their own folder).
  const dl = process.env.E2E_DL_DIR || path.join(userDataDir, "downloads"); fs.mkdirSync(dl, { recursive: true });
  const cdp = await browser.target().createCDPSession(); await cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: dl });
  return browser;
}
// seed: object written to localStorage before the app starts (only on the first load of this page); pre: extra evaluateOnNewDocument code
// fresh: start from an empty localStorage (a genuinely new install). chooseLang: when the first-launch language chooser
// appears, pick this language (az / en / ru) and continue; false leaves the chooser open for the test to drive.
// (Adaptation for the language chooser added 2026-10-26: tests written before it existed get English, as before.)
// url (Run 13): open another build of the app (e.g. the previous version) in the same browser, to test downgrades.
export async function openPage(browser, { width = 390, height = 844, seed = baseSeed(), seedRaw = null, pre = null, dsf = 1, fresh = false, chooseLang = "en", url = null } = {}) {
  const page = await browser.newPage(); await page.setViewport({ width, height, deviceScaleFactor: dsf });
  page.on("framenavigated", (f) => note(`navigated ${f === page.mainFrame() ? "MAIN" : "sub"} ${String(f.url()).slice(-50)}`)); page.on("framedetached", (f) => note(`frame detached${f === page.mainFrame() ? " (MAIN)" : ""}`));
  page.on("error", (e) => note("PAGE CRASHED " + e.message)); page.on("close", () => note("page closed"));
  await page.setRequestInterception(true); page.on("request", (r) => { const u = r.url(); (u.startsWith("http") ? r.abort() : r.continue()); });
  await page.evaluateOnNewDocument((k, d, raw, fr) => { if (!sessionStorage.getItem("__seeded")) { sessionStorage.setItem("__seeded", "1"); if (fr) localStorage.clear(); if (raw !== null) localStorage.setItem(k, raw); else if (d) localStorage.setItem(k, JSON.stringify(d)); } }, KEY, seed, seedRaw, fresh);
  if (pre) await page.evaluateOnNewDocument(pre);
  page.errors = []; page.on("pageerror", (e) => page.errors.push(String(e)));
  page.dialogAnswer = ""; page.on("dialog", async (d) => { await d.accept(page.dialogAnswer ?? ""); });
  await page.goto(url || PAGE); await page.waitForSelector(".tabbar, .lang-screen");
  if (chooseLang && await page.$(".lang-screen")) {
    await page.evaluate((l) => document.querySelector(`.lang-opt input[value="${l}"]`).click(), chooseLang);
    await page.evaluate(() => document.querySelector(".lang-continue").click());
    await page.waitForSelector(".tabbar");
  }
  if (chooseLang) await wait(450);
  return page;
}
// Waits until every finite CSS animation on the page has finished (at most 2 s). Measuring positions while a section is
// still sliding in (pageIn starts 12 px lower) gave false results, e.g. a button momentarily under the tab bar (Run 5).
export const settle = (page) => page.evaluate(() => Promise.race([
  Promise.all(document.getAnimations().filter((a) => a.effect && a.effect.getTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))),
  new Promise((r) => setTimeout(r, 2000))]));
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
// Redesign (2026-10-27): the tabs are Home · Transactions · Analytics · Goals · More, and Recurring / Import–Export are pages
// under More. Tests keep their original names; this maps them (Ledger → 1st… by position, so it works in every language).
const TAB_POS = { Home: 0, Ledger: 1, Transactions: 1, Monthly: 2, Analytics: 2, Goals: 3, More: 4 };
const MORE_ROW = { Recurring: 0, ImportExport: 1 };
export async function tab(page, name) {
  if (name in MORE_ROW) {
    await page.evaluate(() => document.querySelectorAll(".tab-btn")[4].click()); await wait(200);
    await page.evaluate((i) => document.querySelectorAll(".more-page .list-row")[i].click(), MORE_ROW[name]); await wait(200); return;
  }
  if (name in TAB_POS) { await page.evaluate((i) => document.querySelectorAll(".tab-btn")[i].click(), TAB_POS[name]); await wait(150); return; }
  return clickText(page, ".tab-btn", new RegExp(name));
}
// Run 9: the Safe to Spend calculation opens on tap ("How is this calculated?"); tests that read its rows open it first.
export const openSafe = async (page) => { await page.evaluate(() => { const b = document.querySelector(".safe-toggle"); if (b && b.getAttribute("aria-expanded") === "false") b.click(); }); await wait(150); };
// Import / Export page (the file input, export and backup buttons moved there from Settings).
export const openData = async (page) => { await tab(page, "ImportExport"); await page.waitForSelector(".io-page"); await settle(page); };
// Budgets & Goals page; seg = "budgets" | "goals".
export const openGoals = async (page, seg = "budgets") => { await tab(page, "Goals"); await page.waitForSelector(".goals-page");
  await page.evaluate((i) => document.querySelectorAll(".goals-page .seg-btn")[i].click(), seg === "goals" ? 1 : 0); await wait(150); await settle(page); };
// The English labels are tried first (as originally written); the class is the fallback when the interface is in az/ru.
// Run 5: both also wait for the opening animation to finish, so a gesture never starts from a grip that is still rising.
// Run 9: Settings has no title-bar shortcut any more; it opens from More → Settings (the third row). The screen behind
// the sheet is therefore More; tests that need another screen afterwards go there with tab().
export const openSettings = async (page) => { await page.evaluate(() => document.querySelectorAll(".tab-btn")[4].click()); await page.waitForSelector(".more-page"); await wait(150); await page.evaluate(() => document.querySelectorAll(".more-page .list-row")[2].click()); await page.waitForSelector(".sheet"); await wait(350); await settle(page); };
// Run 9: "+" adds a transaction only on Home and Transactions (elsewhere it adds a budget, goal or bill, or is absent),
// so the helper goes to Home first when the current screen is not one of those two.
export const openAdd = async (page) => { await page.evaluate(() => { const tabs = [...document.querySelectorAll(".tab-btn")]; const i = tabs.findIndex((b) => b.getAttribute("aria-current") === "page"); if (i > 1 || i < 0) tabs[0].click(); }); await wait(200); await page.evaluate(() => document.querySelector(".topbar .topbar-add").click()); await page.waitForSelector(".amount-input"); await wait(350); await settle(page); };
let fails = 0, passes = 0;
export const ok = (c, m, extra) => { console.log((c ? "  ✓ " : "  ✗ ") + m); if (c) passes++; else { fails++; if (extra !== undefined) console.log("      ↳", typeof extra === "string" ? extra : JSON.stringify(extra)); } };
export const section = (t) => console.log("\n" + t);
export const finish = async (name, browser) => { if (browser) await browser.close(); console.log(`\n${fails === 0 ? name + ": ALL " + passes + " CHECKS PASSED" : name + ": " + fails + " FAILED, " + passes + " passed"}`); process.exit(fails ? 1 : 0); };
export { fs, path };
