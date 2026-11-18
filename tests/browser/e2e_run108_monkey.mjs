// Run 108 (release readiness): a "monkey" walk. Thousands of random taps, typed values (good, odd and hostile), Back presses and Escapes
// all over the app, from fixed random seeds (the same seed always takes the same walk, so any failure can be replayed). After every step:
// no JavaScript error, no crash screen, no "NaN", "undefined", "Infinity" or "[object Object]" on screen, and the saved ledger still reads
// as valid data with whole-cent amounts. Synthetic data only; downloads go to the test profile; the network is blocked by the test page.
import { launch, openPage, openSettings, openCategories, wait, ok, section, finish, settle, baseSeed, tx, daysAgo, KEY } from "./lib.mjs";
import { MESSAGES } from "../../i18n.js";
const STEPS = Number(process.env.MONKEY_STEPS || 300), SEEDS = (process.env.MONKEY_SEEDS || "1,2,3").split(",").map(Number);
const LANGS = ["en", "az", "ru"];   // seed 1 walks in English, 2 in Azerbaijani, 3 in Russian, and so on
// every text key of the app: one of them on screen means a text is missing in that language (t() shows the key itself)
const KEYS = Object.keys(MESSAGES).filter((k) => k.includes("."));
const browser = await launch();
const rng = (s) => () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const TEXTS = ["12.50", "0", "-3", "1,5", "36 753,80", "9999999999", "abc", "", "  ", "<b>x</b>", "=SUM(A1)", "12.345", "0.01", "1e5", "Kafe Nova", "Ресторан", "Çörək", "2026-02-30", "50", "7"];
// side stores (each under "expense_ledger_v5__" + name) and the damaged values MONKEY_JUNK puts in them
const SIDE = ["cats", "catprefs", "fxcache", "fxwarm", "subcats", "accounts", "opencounted", "fx", "coachmute", "patmute", "workhours", "rollover", "tidydismiss", "recsug", "budgetcarry", "leftovergoal", "iosnote", "install", "reminders", "widget", "notices", "bankq", "bankacc", "drive", "account", "learn", "screens", "layouts", "feedback", "count", "debts", "crashlog", "first_choices", "welcome", "show_gifts", "acchint", "linkdismiss", "reportseen", "onboard", "photos"];
const JUNK = ["{", "null", "[]", "\"\"", "123", "true", "{\"a\":1}", "{\"version\":1,\"loans\":\"x\",\"debts\":{},\"accounts\":null,\"cats\":[{\"id\":5}],\"transfers\":[null],\"hidden\":7,\"order\":\"x\",\"items\":[{}]}", "[null,1,\"x\",{}]", "{\"version\":99,\"loans\":[{\"id\":1,\"payments\":null,\"principal\":\"x\"}],\"debts\":[{\"payments\":[{\"amount\":-5}]}],\"accounts\":[{\"id\":\"a\",\"opening\":null}],\"cats\":[null,{\"id\":\"u_x\",\"name\":\"\"}]}"];
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
  // the page must never scroll sideways (something wider than the screen)
  let over = "";
  if (document.documentElement.scrollWidth > innerWidth + 1) {
    const x0 = scrollX; scrollTo(9999, scrollY); const can = scrollX; scrollTo(x0, scrollY);
    const wide = [...document.querySelectorAll("body *")].filter((e) => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 1 && r.width > 0; }).slice(-4).map((e) => (e.className || e.tagName).toString().slice(0, 40) + "@" + Math.round(e.getBoundingClientRect().right) + (getComputedStyle(e).transform !== "none" ? " T" : ""));
    // a page sliding out during Back is briefly wider, but the screen cannot be moved sideways; only a real sideways scroll counts
    if (can > 0) over = `page ${document.documentElement.scrollWidth}px wide on a ${innerWidth}px screen, sideways scroll ${can}px; ${wide.join(" | ")}`;
  }
  return { crash: !!document.querySelector(".crash-screen"), bad: bad.slice(0, 3), dataOk, why, over, n: data && data.transactions ? data.transactions.length : -1 };
}, KEY, KEYS);

for (const s of SEEDS) {
  const lang = LANGS[(s - 1) % 3];
  section(`R108-MK${s}. ${STEPS} random steps from seed ${s} (${lang})`);
  // MONKEY_FULL=0.25: after the app has loaded, about that share of its saves fail as if the phone's storage were full (fixed sequence)
  const full = Number(process.env.MONKEY_FULL || 0);
  // MONKEY_JUNK=1: every side store of the app starts with a damaged value (broken JSON, wrong types; a different kind per seed)
  const junk = process.env.MONKEY_JUNK ? JUNK[s % JUNK.length] : null;
  const junkPre = junk === null ? "" : `try{if(!sessionStorage.getItem("__j")){sessionStorage.setItem("__j","1");for(const k of ${JSON.stringify(SIDE)})localStorage.setItem("expense_ledger_v5__"+k,${JSON.stringify(junk)});}}catch(e){}`;
  const pre = (full || junk !== null) ? new Function(junkPre + (full ?`let x=${s}*2654435761>>>0;const real=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(window.__full&&String(k).startsWith("expense_ledger_v5")){x=(Math.imul(x,1103515245)+12345)>>>0;if(x/4294967296<${full}){window.__fails=(window.__fails||0)+1;throw new DOMException("full","QuotaExceededError");}}return real.call(this,k,v);};` : "")) : undefined;
  // MONKEY_FRESH=1: start as a brand-new install (no data), with the first-launch questions still open
  const fresh = !!process.env.MONKEY_FRESH;
  // MONKEY_BIG=3000: a heavy ledger, that many entries spread over three years (a long-time user)
  const big = Number(process.env.MONKEY_BIG || 0), cats = ["food", "transport", "housing", "gifts", "health", "shopping"];
  const data = seed(lang);
  for (let i = 0; i < big; i++) data.transactions.push(tx({ merchant: "Shop " + (i % 97), amount: ((i * 7919) % 20000 + 5) / 100, category: cats[i % cats.length], date: daysAgo(i % 1095), ...(i % 23 === 0 ? { type: "income", category: "salary", amount: 900 + (i % 5) * 10 } : {}) }));
  // MONKEY_SIZE=320x568: another screen size (default 390x844, a common phone)
  const [width, height] = (process.env.MONKEY_SIZE || "390x844").split("x").map(Number);
  const page = await openPage(browser, fresh ? { width, height, seed: null, fresh: true, chooseLang: lang, onboard: false, pre } : { width, height, seed: data, chooseLang: lang, pre }); await settle(page);
  if (full) await page.evaluate(() => { window.__full = true; });
  if (junk !== null) {
    // with damaged side data, open every tab and every page under More once (a random walk could miss one)
    const seen = [];
    for (let tab = 0; tab < 5; tab++) { await page.evaluate((i) => document.querySelectorAll(".tab-btn")[i]?.click(), tab); await wait(350); }
    const ids = await page.evaluate(() => [...document.querySelectorAll(".more-page [data-more]")].map((b) => b.getAttribute("data-more")));
    for (const id of ids) {
      await page.evaluate(() => document.querySelectorAll(".tab-btn")[4].click()); await wait(300);
      await page.evaluate((m) => document.querySelector(`.more-page [data-more="${m}"]`)?.click(), id); await wait(500);
      await page.evaluate(() => document.querySelectorAll('[data-section="debts-page"] .seg-btn')[1]?.click()); await wait(200);
      const c = await check(page); seen.push(id);
      if (page.errors.length || c.crash || c.bad.length) { ok(false, `seed ${s}: page "${id}" opens with damaged side data`, { err: page.errors[0], crash: c.crash, bad: c.bad }); break; }
      await page.keyboard.press("Escape"); await page.evaluate(() => history.back()); await wait(300);
    }
    for (const [name, go] of [["settings", openSettings], ["categories", openCategories]]) {
      try { await go(page); await wait(400); } catch (e) { ok(false, `seed ${s}: ${name} opens with damaged side data`, String(e).slice(0, 120)); continue; }
      const c = await check(page); seen.push(name);
      if (page.errors.length || c.crash || c.bad.length) ok(false, `seed ${s}: ${name} opens with damaged side data`, { err: page.errors[0], crash: c.crash, bad: c.bad });
      await page.keyboard.press("Escape"); await page.evaluate(() => history.back()); await wait(300);
    }
    console.log(`  (seed ${s}: damaged value ${junk.slice(0, 40)}; opened ${seen.length} pages under More: ${seen.join(", ")})`);
  }
  // spare history entries, so Back never walks out of the test page (on a phone it would close the app, which is not under test here)
  await page.evaluate(() => { window.open = () => null; try { navigator.share = undefined; } catch {} for (let i = 0; i < 400; i++) history.pushState(history.state, ""); });
  const r = rng(s * 7919), log = []; let fail = null, slow = { ms: 0, what: "" };
  for (let i = 0; i < STEPS && !fail; i++) {
    const t0 = Date.now();
    let what; try { what = await step(page, r); } catch (e) { what = "step error: " + String(e).slice(0, 80); }
    if (Date.now() - t0 > slow.ms) slow = { ms: Date.now() - t0, what };
    log.push(what); await wait(60 + Math.floor(r() * 240));
    let c; try { c = await check(page); } catch (e) { await wait(800); try { c = await check(page); } catch (e2) { fail = { i, why: "page unusable: " + String(e2).slice(0, 120) }; break; } }
    if (!page.url().includes("index.html")) { fail = { i, why: "left the app: " + page.url() }; break; }
    if (page.errors.length || c.crash || c.bad.length || !c.dataOk || c.over) fail = { i, err: page.errors[0], crash: c.crash, bad: c.bad, data: c.why, over: c.over };
  }
  if (process.env.MONKEY_LOG) console.log(log.join("\n"));
  if (full) console.log(`  (seed ${s}: ${await page.evaluate(() => window.__fails || 0)} saves failed on purpose)`);
  // the slowest single step (a tap and the redraw it causes); on a fast PC more than 3 s means the phone would freeze
  console.log(`  (seed ${s}: slowest step ${slow.ms} ms: ${slow.what})`);
  ok(slow.ms < 3000, `seed ${s}: no step took 3 s or more`, slow);
  ok(!fail, `seed ${s} (${lang}): ${STEPS} steps with no error, crash, NaN/undefined on screen or damaged data`, fail && { ...fail, last: log.slice(-8) });
  await page.close();
}
await browser.close();
finish("e2e_run108_monkey");
