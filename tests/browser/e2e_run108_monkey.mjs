// Run 108 (release readiness): a "monkey" walk. Thousands of random taps, typed values (good, odd and hostile), Back presses and Escapes
// all over the app, from fixed random seeds (the same seed always takes the same walk, so any failure can be replayed). After every step:
// no JavaScript error, no crash screen, no "NaN", "undefined", "Infinity" or "[object Object]" on screen, and the saved ledger still reads
// as valid data with whole-cent amounts. Synthetic data only; downloads go to the test profile; the network is blocked by the test page.
import { launch, openPage, wait, ok, section, finish, settle, baseSeed, tx, daysAgo, KEY } from "./lib.mjs";
import { MESSAGES } from "../../i18n.js";
const STEPS = Number(process.env.MONKEY_STEPS || 300), SEEDS = (process.env.MONKEY_SEEDS || "1,2,3").split(",").map(Number);
const LANGS = ["en", "az", "ru"];   // seed 1 walks in English, 2 in Azerbaijani, 3 in Russian, and so on
// every text key of the app: one of them on screen means a text is missing in that language (t() shows the key itself)
const KEYS = Object.keys(MESSAGES).filter((k) => k.includes("."));
const browser = await launch();
const rng = (s) => () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const TEXTS = ["12.50", "0", "-3", "1,5", "36 753,80", "9999999999", "abc", "", "  ", "<b>x</b>", "=SUM(A1)", "12.345", "0.01", "1e5", "Kafe Nova", "Ресторан", "Çörək", "2026-02-30", "50", "7"];
const seed = (language) => baseSeed({ language, transactions: [
  tx({ merchant: "Bravo", amount: 23.4, date: daysAgo(1) }), tx({ merchant: "Bus", amount: 0.6, category: "transport", date: daysAgo(2) }),
  tx({ type: "income", merchant: "Salary", amount: 1500, category: "salary", date: daysAgo(10) }), tx({ merchant: "Rent", amount: 400, category: "housing", date: daysAgo(20), recurring: true, recurFreq: "monthly" }),
  tx({ merchant: "Old", amount: 12, date: daysAgo(70) }), tx({ merchant: "Gift", amount: 30, category: "gifts", date: daysAgo(5) }) ],
  goals: [{ id: "g1", name: "Bike", target: 300, saved: 40, monthlyTarget: 0, targetDate: null }], budgets: { food: 200 } });

// one random action; returns a short description for the replay log
async function step(page, r) {
  return page.evaluate((x, y, texts) => {
    const vis = (el) => { const b = el.getBoundingClientRect(); if (b.width < 2 || b.height < 2 || b.bottom < 0 || b.top > innerHeight) return false; if (el.closest("[inert],[aria-hidden=true]")) return false; const s = getComputedStyle(el); return s.visibility !== "hidden" && s.display !== "none" && s.pointerEvents !== "none"; };
    const name = (el) => (el.getAttribute("aria-label") || el.innerText || el.placeholder || el.className || el.tagName).toString().trim().slice(0, 40).replace(/\s+/g, " ");
    if (x < 0.06) { history.back(); return "Back"; }
    if (x < 0.1) { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); return "Escape"; }
    if (x < 0.14) { window.scrollBy(0, (y - 0.5) * 1600); document.querySelectorAll(".sheet, .add-overlay .sheet-body, .page").forEach((s) => { s.scrollTop += (y - 0.5) * 1200; }); return "scroll"; }
    const fields = [...document.querySelectorAll("input:not([type=file]):not([type=hidden]), textarea")].filter(vis);
    if (x < 0.38 && fields.length) {
      const el = fields[Math.floor(y * fields.length)];
      if (el.type === "checkbox" || el.type === "radio") { el.click(); return "toggle " + name(el); }
      const v = el.type === "date" ? ["2026-11-01", "", "2025-02-28", "2027-01-31"][Math.floor(y * 4)] : texts[Math.floor((y * 997) % 1 * texts.length)];
      const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      try { Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v); } catch { return "skip"; }
      el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true }));
      if (y > 0.8) el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      return `type "${v}" into ${name(el)}`;
    }
    const sel = [...document.querySelectorAll("button, [role=button], [role=tab], [role=switch], select, summary, .txn-row, .tab-btn")].filter(vis).filter((el) => !el.disabled && !el.closest("a[href]"));
    if (!sel.length) return "nothing";
    const el = sel[Math.floor(y * sel.length)];
    if (el.tagName === "SELECT") { const o = el.options; if (o.length) { el.selectedIndex = Math.floor(y * 7919 % o.length); el.dispatchEvent(new Event("change", { bubbles: true })); } return "select " + name(el); }
    el.click(); return "tap " + name(el);
  }, r(), r(), TEXTS);
}
const check = (page) => page.evaluate((k, keys) => {
  const text = document.body.innerText, words = new Set(text.split(/[\s"'«»(),:;!?]+/));
  const bad = [...(text.match(/\bNaN\b|\bundefined\b|\bInfinity\b|\[object Object\]|\{[a-z][A-Za-z]*\}/g) || []), ...keys.filter((x) => words.has(x) || words.has(x + "."))];
  let data = null, dataOk = true, why = "";
  try { data = JSON.parse(localStorage.getItem(k) || "null"); } catch { dataOk = false; why = "not JSON"; }
  if (data && Array.isArray(data.transactions)) for (const t of data.transactions) { if (!t || !Number.isFinite(t.amount) || t.amount <= 0 || Math.round(t.amount * 100) !== Math.round(t.amount * 100 * 1e6) / 1e6 || !/^\d{4}-\d\d-\d\d$/.test(t.date)) { dataOk = false; why = JSON.stringify(t).slice(0, 160); break; } }
  return { crash: !!document.querySelector(".crash-screen"), bad: bad.slice(0, 3), dataOk, why, n: data && data.transactions ? data.transactions.length : -1 };
}, KEY, KEYS);

for (const s of SEEDS) {
  const lang = LANGS[(s - 1) % 3];
  section(`R108-MK${s}. ${STEPS} random steps from seed ${s} (${lang})`);
  const page = await openPage(browser, { seed: seed(lang), chooseLang: lang }); await settle(page);
  // spare history entries, so Back never walks out of the test page (on a phone it would close the app, which is not under test here)
  await page.evaluate(() => { window.open = () => null; try { navigator.share = undefined; } catch {} for (let i = 0; i < 400; i++) history.pushState(history.state, ""); });
  const r = rng(s * 7919), log = []; let fail = null;
  for (let i = 0; i < STEPS && !fail; i++) {
    let what; try { what = await step(page, r); } catch (e) { what = "step error: " + String(e).slice(0, 80); }
    log.push(what); await wait(60 + Math.floor(r() * 240));
    let c; try { c = await check(page); } catch (e) { await wait(800); try { c = await check(page); } catch (e2) { fail = { i, why: "page unusable: " + String(e2).slice(0, 120) }; break; } }
    if (!page.url().includes("index.html")) { fail = { i, why: "left the app: " + page.url() }; break; }
    if (page.errors.length || c.crash || c.bad.length || !c.dataOk) fail = { i, err: page.errors[0], crash: c.crash, bad: c.bad, data: c.why };
  }
  if (process.env.MONKEY_LOG) console.log(log.join("\n"));
  ok(!fail, `seed ${s} (${lang}): ${STEPS} steps with no error, crash, NaN/undefined on screen or damaged data`, fail && { ...fail, last: log.slice(-8) });
  await page.close();
}
await browser.close();
finish("e2e_run108_monkey");
