// Polish probe (Run 45): performs the everyday interactions on a realistic ledger and reports, for each one, whether the screen MOVED SMOOTHLY
// (an animation or transition was running within 40 ms of the action) or CHANGED INSTANTLY (the page changed but nothing animated), plus layout problems
// (sideways scroll, text overflowing its box, controls smaller than 36 px). Screenshots of every screen go to PROBE_DIR. It reports; it does not fail.
import { launch, openPage, wait, baseSeed, tx, settle, ymd } from "./lib.mjs";
import fs from "node:fs";
const DIR = process.env.PROBE_DIR || "probe-out"; fs.mkdirSync(DIR, { recursive: true });
const browser = await launch();
const cats = ["food", "transport", "shopping", "bills", "entertainment", "health"];
const txns = [];
for (let i = 0; i < 40; i++) txns.push(tx({ amount: 5 + ((i * 7) % 60), category: cats[i % cats.length], merchant: ["Bravo", "Bolt", "Zara", "Azercell", "Cinema", "Pharmacy"][i % 6], date: ymd(new Date(Date.now() - i * 86400000 * 0.8)) }));
txns.push(tx({ type: "income", category: "salary", amount: 1800, date: ymd(new Date(new Date().getFullYear(), new Date().getMonth(), 1)), merchant: "Employer" }));
const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: txns }) });
await page.setViewport({ width: 400, height: 860, deviceScaleFactor: 1, isMobile: true, hasTouch: true }); await settle(page);
await page.evaluate(() => { window.__mut = 0; new MutationObserver((l) => { window.__mut += l.length; }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "hidden", "style", "aria-expanded"] }); });
const results = [];
const shot = async (n) => { try { await page.screenshot({ path: `${DIR}/${n}.png` }); } catch {} };
async function act(name, fn) {
  await page.evaluate(() => { window.__mut = 0; });
  let miss = false;
  try {
    const r = await page.evaluate(async (src) => {
      const f = new Function("return (" + src + ")")();
      const before = performance.now();
      const res = f();
      await new Promise((r) => setTimeout(r, 40));
      const anims = document.getAnimations().filter((a) => a.playState === "running").length;
      return { anims, mut: window.__mut, miss: res === false };
    }, fn.toString());
    miss = r.miss;
    await wait(500);
    const w = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth > window.innerWidth + 1 }));
    results.push({ name, anims: r.anims, mut: r.mut, miss, sideways: w.sw });
  } catch (e) { results.push({ name, error: String(e).slice(0, 80) }); }
}
const click = (sel, i = 0) => `() => { const e = document.querySelectorAll(${JSON.stringify(sel)})[${i}]; if (!e) return false; e.click(); return true; }`;
const run = (sel, i) => act(sel + (i ? "[" + i + "]" : ""), eval(click(sel, i)));
// Because act() serialises the function, build them as source strings instead:
async function actSel(name, sel, i = 0) { await act(name, new Function(`return () => { const e = document.querySelectorAll(${JSON.stringify(sel)})[${i}]; if (!e) return false; e.click(); return true; }`)()); }

for (const [i, n] of ["home", "ledger", "analytics", "goals", "more"].entries()) {
  await actSel("tab -> " + n, ".tab-btn", i); await shot("screen-" + n);
}
await actSel("tab -> home", ".tab-btn", 0);
await actSel("open add form (+)", ".fab-add"); await shot("add-form");
await actSel("add: switch to Income", ".type-pick", 1);
await actSel("add: switch back to Expense", ".type-pick", 0);
await actSel("add: show More details", '[data-section="add-more-toggle"]'); await shot("add-form-more");
await actSel("add: close", ".add-close");
await actSel("open an entry (sheet)", '[data-section="home-latest"] .txn-row'); await shot("entry-sheet");
await actSel("close entry sheet", '[data-closer]');
await actSel("tab -> ledger", ".tab-btn", 1);
await actSel("ledger: filter Expenses chip", ".filter-bar .chip", 1);
await actSel("ledger: filter All chip", ".filter-bar .chip", 0);
await actSel("ledger: more filters", '[data-section="tx-more-toggle"]'); await shot("ledger-filters");
await actSel("ledger: more filters close", '[data-section="tx-more-toggle"]');
await actSel("ledger: select mode", '[data-section="tx-select-toggle"]'); await shot("ledger-select");
await actSel("ledger: pick a row", ".txn-row", 0);
await actSel("ledger: pick another row", ".txn-row", 1);
await actSel("ledger: select all", '[data-section="tx-select-all"]');
await actSel("ledger: leave select mode", '[data-section="tx-select-toggle"]');
await actSel("ledger: open entry", ".txn-row", 2);
await actSel("entry: Delete", ".sheet .btn-ghost[style*='neg']");
await shot("after-delete");
await actSel("tab -> analytics", ".tab-btn", 2);
for (let i = 1; i < 4; i++) await actSel("analytics: segment " + i, '[data-section="an-seg"] [data-seg]', i);
await shot("analytics-seg");
await actSel("tab -> goals", ".tab-btn", 3);
await actSel("goals: second segment", ".goals-page .seg-btn", 1); await shot("goals-seg2");
await actSel("goals: first segment", ".goals-page .seg-btn", 0);
await actSel("tab -> more", ".tab-btn", 4);
await actSel("more: open How it works", '.more-page [data-more="how"]'); await shot("how-sheet");
await actSel("close How sheet", "[data-closer]");
await actSel("more: open Settings fold", "[data-fold-head]", 0); await shot("settings-fold");
await actSel("more: close Settings fold", "[data-fold-head]", 0);
await actSel("theme: Graphite", '[data-theme-id="graphite"]');
await actSel("theme: Sea", '[data-theme-id="sea"]');

// Layout checks on every screen
const lay = [];
for (const [i, n] of ["home", "ledger", "analytics", "goals", "more"].entries()) {
  await page.evaluate((k) => document.querySelectorAll(".tab-btn")[k].click(), i); await wait(500);
  lay.push({ screen: n, ...(await page.evaluate(() => {
    const small = [...document.querySelectorAll("button,[role=button],a,input,select")].filter((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && (r.height < 32 || r.width < 32) && !e.closest("[hidden]") && cs.opacity !== "0"; }).map((e) => (e.getAttribute("aria-label") || e.textContent || e.className).trim().slice(0, 24) + " " + Math.round(e.getBoundingClientRect().width) + "x" + Math.round(e.getBoundingClientRect().height)).slice(0, 8);
    const over = [...document.querySelectorAll("*")].filter((e) => e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflowX === "visible" && e.clientWidth > 0 && e.children.length === 0 && e.textContent.trim().length > 3).map((e) => e.textContent.trim().slice(0, 30)).slice(0, 6);
    return { sideways: document.documentElement.scrollWidth > window.innerWidth + 1, small, over };
  })) });
}
console.log("\n== MOTION (anims = animations running 40 ms after the action; mut = DOM changes in that time)");
for (const r of results) console.log((r.error ? "ERR " : r.miss ? "MISSING " : (r.anims === 0 && r.mut > 0) ? "INSTANT " : r.anims === 0 ? "none    " : "smooth  ") + r.name + (r.error ? " " + r.error : ` anims=${r.anims} mut=${r.mut}` + (r.sideways ? " SIDEWAYS-SCROLL" : "")));
console.log("\n== LAYOUT"); for (const l of lay) console.log(JSON.stringify(l));
console.log("\nerrors:", page.errors.slice(0, 3));
await browser.close();
