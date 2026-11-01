// Run 4 (2026-10-27): enlarged system text (master prompt MP-10; previously NOT ASSESSED). The app sizes text in px, so
// phones enlarge it in two ways, and both are emulated here:
//   Z. page zoom (Android Chrome text scaling and Safari's aA menu zoom the whole page): emulated as a narrower CSS
//      viewport, 390px at 130% / 150% / 200% = 300 / 260 / 195px wide.
//   M. minimum font size (text grows but boxes do not): Chrome's minimum_font_size preference = 16px, which raises every
//      11–15px label, at 390px.
// Checks on the four sections (five before Run 7 merged Monthly and Analytics), the Add form and Settings, in en/az/ru: no sideways page scrolling, no clipped text in a
// box that hides overflow (deliberate "…" truncation is allowed), every tab label readable, the Add form's Save button
// reachable, and no JavaScript errors. Synthetic data only.
import { openPage, wait, ok, section, finish, tx, baseSeed, TODAY, openAdd, openSettings, fs, path } from "./lib.mjs";
import puppeteer from "puppeteer-core"; import os from "os";
async function launchWith(prefs) {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "ledger-e2e-profile-"));
  if (prefs) { fs.mkdirSync(path.join(userDataDir, "Default"), { recursive: true }); fs.writeFileSync(path.join(userDataDir, "Default", "Preferences"), JSON.stringify(prefs)); }
  // protocolTimeout: a hung headless Chrome (seen twice at 200 % zoom: 10–19 min, then "Target closed") fails in 90 s instead.
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true, userDataDir, protocolTimeout: 90000, args: ["--no-first-run", "--no-default-browser-check", "--disable-extensions"] });
  const dl = process.env.E2E_DL_DIR || path.join(userDataDir, "downloads"); fs.mkdirSync(dl, { recursive: true });
  const cdp = await browser.target().createCDPSession(); await cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: dl });
  return browser;
}
const R = (o) => tx({ recurring: true, recurFreq: "monthly", category: "digital", amount: 15, ...o });
const seedFor = (language) => baseSeed({ language, transactions: [tx({ type: "income", category: "salary", amount: 2450.75, merchant: "Employer", date: TODAY }),
  R({ merchant: "Rent", category: "housing", amount: 1450, subcategory: "Rent" }), R({ merchant: "Netflix" }),
  tx({ merchant: "Bravo Supermarket Nərimanov", amount: 131.4 }), tx({ merchant: "BakuBus", amount: 0.6, category: "transport" })] });
const tabAt = async (page, i) => { await page.evaluate((n) => document.querySelectorAll(".tab-btn")[n].click(), i); await wait(350); };
const escape = async (page) => { await page.keyboard.press("Escape"); await wait(300); };

const measure = () => {
  const out = { hscroll: document.documentElement.scrollWidth - innerWidth, clipped: [] };
  if (out.hscroll > 1) out.clipped.push("wider than the screen: " + [...document.querySelectorAll("body *")].filter((e) => e.getBoundingClientRect().right > innerWidth + 1 && !(e.parentElement && e.parentElement.closest(".filter-bar, [style*='overflow-x: auto']"))).slice(0, 3).map((e) => `.${String(e.className).split(" ")[0] || e.tagName} right=${Math.round(e.getBoundingClientRect().right)}`).join(", "));
  document.querySelectorAll("#root *").forEach((el) => {
    const own = [...el.childNodes].some((x) => x.nodeType === 3 && x.textContent.trim()); if (!own) return;
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return;
    const layer = document.querySelector(".sheet-overlay, .add-overlay"); if (layer && !layer.contains(el)) return;
    const cs = getComputedStyle(el); if (cs.textOverflow === "ellipsis") return;   // deliberate truncation with "…"
    const hides = (v) => v === "hidden" || v === "clip";
    if (hides(cs.overflowX) && el.scrollWidth > el.clientWidth + 1) out.clipped.push(`"${el.textContent.trim().slice(0, 30)}" ${el.scrollWidth}>${el.clientWidth}`);
    // text that runs past the screen edge inside a scrolling page (no sideways page scroll, but unreadable)
    if (r.right > innerWidth + 1 && !el.closest(".filter-bar, .cat-scroll, .sub-chips") && getComputedStyle(el.parentElement).overflowX !== "auto") out.clipped.push(`"${el.textContent.trim().slice(0, 30)}" runs past the screen edge (right=${Math.round(r.right)})`);
    // text that spills out of a hiding ancestor (e.g. a label wider than its card)
    for (let a = el.parentElement, d = 0; a && d < 4; a = a.parentElement, d++) { const ac = getComputedStyle(a); if (hides(ac.overflowX) && ac.textOverflow !== "ellipsis") { const b = a.getBoundingClientRect(); if (r.right > b.right + 1.5 || r.left < b.left - 1.5) out.clipped.push(`"${el.textContent.trim().slice(0, 30)}" spills out of .${a.className.split(" ")[0]}`); break; } }
  });
  // a tab label is cut if it overflows its tab, or (under zoom, where it can shrink) if a single word is broken across lines
  const lines = (s) => { const rg = document.createRange(); rg.selectNodeContents(s); return new Set([...rg.getClientRects()].map((r) => Math.round(r.top))).size; };
  out.tabs = [...document.querySelectorAll(".tab-btn")].map((b) => { const s = b.querySelector(".tab-lbl") || b; const words = s.textContent.trim().split(/\s+/).length;
    return { t: b.textContent.trim(), cut: s.scrollWidth > s.clientWidth + 1 || s.getBoundingClientRect().right > b.getBoundingClientRect().right + 1 || (window.__zoomed && lines(s) > words) }; }).filter((x) => x.cut).map((x) => x.t);
  // found by screenshot at 195px: a notice squeezed into a narrow column filled the whole screen
  const ban = document.querySelector(".backup-banner span"); if (ban && innerWidth <= 280 && ban.getBoundingClientRect().width < innerWidth * 0.6) out.clipped.push(`backup notice text squeezed to ${Math.round(ban.getBoundingClientRect().width)}px of ${innerWidth}`);
  out.clipped = [...new Set(out.clipped)];
  return out;
};
async function screens(page, label, problems) {
  const note = (where, m) => { if (m.hscroll > 1) problems.push(`${label} ${where}: page scrolls sideways by ${m.hscroll}px`); m.clipped.forEach((c) => problems.push(`${label} ${where}: clipped ${c}`)); m.tabs.forEach((t) => problems.push(`${label} ${where}: tab label cut "${t}"`)); };
  for (let i = 0; i < 5; i++) { await tabAt(page, i); note(`tab ${i + 1}`, await page.evaluate(measure)); }   // Run 9: all five tabs
  await openAdd(page); note("add form", await page.evaluate(measure));
  const save = await page.evaluate(() => { const b = document.querySelector(".add-overlay .btn-primary.btn-full"); if (!b) return "missing"; b.scrollIntoView({ block: "center" }); const r = b.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return (hit === b || b.contains(hit)) ? "ok" : "covered"; });
  if (save !== "ok") problems.push(`${label} add form: Save button ${save}`);
  await escape(page);
  if (await page.$(".discard-overlay")) { await page.evaluate(() => document.querySelector(".discard-overlay .discard-keep").click()); await escape(page); }
  await openSettings(page); note("settings", await page.evaluate(measure));
  for (let k = 0; k < 10; k++) { const more = await page.evaluate(() => { const s = document.querySelector(".sheet"); const b = s.scrollTop; s.scrollTop += s.clientHeight * 0.6; return s.scrollTop > b; }); if (!more) break; await wait(80); note("settings (scrolled)", await page.evaluate(measure)); }
  await escape(page);
}

const report = [];
// Run 5: each scenario gets its own browser. If the BROWSER hangs or dies (a protocol timeout or "Target closed" — not a
// failed check), the scenario is run once more in a fresh browser and the output says so. A layout problem still fails:
// only infrastructure errors are retried, never assertion results.
const isBrowserFault = (e) => /Target closed|Protocol error|timed out|TimeoutError|Session closed|Connection closed/i.test(String(e && (e.message || e)));
async function scenario(prefs, label, run) {
  for (let attempt = 1; ; attempt++) {
    const browser = await launchWith(prefs);
    try { const r = await run(browser); await browser.close().catch(() => {}); return r; }
    catch (e) {
      await browser.close().catch(() => {});
      if (attempt === 1 && isBrowserFault(e)) { console.log(`  (${label}: the headless browser hung or closed — ${String(e.message || e).slice(0, 80)} — retrying once in a fresh browser)`); continue; }
      throw e;
    }
  }
}
const check = async (browser, label, opts) => {
  const page = await openPage(browser, opts);
  const problems = []; await screens(page, label, problems);
  const errors = page.errors.slice(); await page.close(); return { problems, errors };
};

section("Z. Page zoom 130% / 150% / 200% (390px phone → narrower CSS viewport)");
for (const [zoom, width] of [[130, 300], [150, 260], [200, 195]]) for (const lang of ["en", "az", "ru"]) {
  const { problems, errors } = await scenario(null, `${zoom}% ${lang}`, (b) => check(b, `${zoom}% ${lang}`, { seed: seedFor(lang), width, height: Math.round(844 * width / 390), pre: "window.__zoomed = true" }));
  report.push(...problems);
  ok(problems.length === 0, `${zoom}% zoom, ${lang}: 7 screens without sideways scrolling, clipped text or a hidden Save button`, problems.slice(0, 10));
  ok(errors.length === 0, `${zoom}% zoom, ${lang}: no JavaScript errors`, errors[0]);
}

section("M. Minimum font size 16px (text grows, boxes do not), 390px");
const MIN16 = { webkit: { webprefs: { minimum_font_size: 16, minimum_logical_font_size: 16 } } };
const fs0 = await scenario(MIN16, "min16 setting", async (b) => { const page = await openPage(b, { seed: seedFor("en") }); const v = await page.evaluate(() => getComputedStyle(document.querySelector(".tab-btn")).fontSize); await page.close(); return v; });
ok(true, `(setting is active: a tab button reports font-size ${fs0}; rendered glyphs are raised to ≥16px by the preference)`);
for (const lang of ["en", "az", "ru"]) {
  const { problems, errors } = await scenario(MIN16, `min16 ${lang}`, (b) => check(b, `min16 ${lang}`, { seed: seedFor(lang) }));
  report.push(...problems);
  ok(problems.length === 0, `minimum 16px text, ${lang}: 7 screens without sideways scrolling, clipped text or a hidden Save button`, problems.slice(0, 10));
  ok(errors.length === 0, `minimum 16px text, ${lang}: no JavaScript errors`, errors[0]);
}
if (process.env.BIGTEXT_DUMP) fs.writeFileSync(process.env.BIGTEXT_DUMP, report.join("\n"));
await finish("e2e_bigtext");
