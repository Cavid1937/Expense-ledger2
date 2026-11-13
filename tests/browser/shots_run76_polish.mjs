// Run 76 polish pass: the newest screens in Graphite, Ivory and Sea glass, in az and ru at 320 px (and en at 390): subscriptions group,
// Write to us, monthly summary, bank-notifications card, Drive card, option/date sheets. Screenshots + a contrast / overflow / tap-size scan.
// Output: SHOTS_OUT. Synthetic data only; the clock is 3 Nov 2026 so the summary card shows.
import { launch, openPage, openSettings, openData, tab, wait, baseSeed, tx, settle, fs, path } from "./lib.mjs";
const OUT = process.env.SHOTS_OUT; if (!OUT) { console.error("SHOTS_OUT must be set"); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const browser = await launch();
const PRE = (theme) => `{ const R = Date, T = new R(2026, 10, 3, 10, 0, 0).getTime(); class D extends R { constructor(...a) { if (a.length === 0) super(T); else super(...a); } static now() { return T; } } window.Date = D; }
  localStorage.setItem("expense_ledger_v5__theme","${theme}");
  window.LedgerNative = { notices: { status: async () => false, openSettings: async () => {}, take: async () => [], onAdded: async () => ({ remove() {} }) } };`;
const bill = (id, name, amount, category) => ({ id, name, type: "expense", amount, freq: "monthly", anchorDate: "2026-10-05", category, subcategory: "", active: true, createdAt: "2026-10-01T00:00:00Z" });
const seed = (lang) => baseSeed({ language: lang, budgets: { food: 150 }, transactions: [
  tx({ type: "income", category: "salary", merchant: "Employer LLC", amount: 2850, date: "2026-10-01" }),
  tx({ merchant: "Bravo Market", category: "food", amount: 170.4, date: "2026-10-06" }), tx({ merchant: "Bakı Metro", category: "transport", amount: 30, date: "2026-10-21" }),
  tx({ merchant: "Bravo Market", category: "food", amount: 12.5, date: "2026-11-02" }),
], bills: [bill("b1", "Netflix", 12.99, "digital"), bill("b2", "Spotify", 6.99, "entertain"), bill("b3", "Kirayə", 450, "housing")] });
const scan = (page) => page.evaluate(() => {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const L = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a >= 0.95) return c; } return parse(getComputedStyle(document.body).backgroundColor); };
  const low = [], wide = [], small = [];
  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight || cs.visibility === "hidden" || el.closest('[aria-hidden="true"],[hidden],.theme-mini,.pick-native')) continue;
    if (r.right > innerWidth + 1 && cs.position !== "fixed") wide.push((el.className || el.tagName) + ":" + (el.innerText || "").slice(0, 20));
    if (el.matches("button,[role=switch],[role=option],a[href]") && (r.height < 32 || r.width < 32) && !el.closest(".chip,.filter-bar")) small.push(((el.getAttribute("data-section") || el.innerText || el.tagName) + "").slice(0, 24) + ` ${Math.round(r.width)}x${Math.round(r.height)}`);
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const fg = parse(cs.color), bg = bgOf(el); if (!fg || !bg) continue;
    const a = fg.a, mix = { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a) };
    const [x, y] = [L(mix), L(bg)].sort((p, q) => q - p), ratio = (x + 0.05) / (y + 0.05), size = parseFloat(cs.fontSize), big = size >= 24 || (size >= 18.66 && +cs.fontWeight >= 700);
    if (ratio < (big ? 3 : 4.5) && !el.closest(":disabled,[aria-disabled=true]")) low.push(`${(el.innerText || "").trim().slice(0, 24)} ${ratio.toFixed(2)}`);
  }
  return { low: [...new Set(low)].slice(0, 6), wide: [...new Set(wide)].slice(0, 6), small: [...new Set(small)].slice(0, 6), pageWide: document.documentElement.scrollWidth > innerWidth + 1 };
});
const findings = [];
const runs = [["graphite", "az", 320], ["ivory", "ru", 320], ["sea", "az", 320], ["ivory", "en", 390]];
for (const [theme, lang, w] of runs) {
  const page = await openPage(browser, { seed: seed(lang), width: w, height: 700, fresh: true, chooseLang: lang, pre: PRE(theme) }); await settle(page);
  const snap = async (name) => { await page.screenshot({ path: path.join(OUT, `p76-${theme}-${lang}-${w}-${name}.png`) }); const r = await scan(page); if (r.low.length || r.wide.length || r.small.length || r.pageWide) findings.push({ theme, lang, w, name, ...r }); };
  await tab(page, "Home"); await wait(400); await snap("1-home-summary-card");
  await page.evaluate(() => { const b = document.querySelector('[data-section="home-report-open"]'); if (b) b.click(); }); await wait(500); await snap("2-summary-sheet");
  await page.evaluate(() => { const b = document.querySelector('[data-section="report-sheet"] [data-closer]'); if (b) b.click(); }); await wait(300);
  await tab(page, "Recurring"); await wait(500); await snap("3-recurring-subs");
  await page.evaluate(() => { const r = document.querySelector('[data-section="rec-subs"] .bill-row'); if (r) r.click(); }); await wait(500); await snap("4-bill-sheet");
  await page.evaluate(() => { const b = document.querySelector('[data-pick-for="bill-kind"]'); if (b) b.click(); }); await wait(400); await snap("5-kind-sheet");
  await page.keyboard.press("Escape"); await wait(250); await page.keyboard.press("Escape"); await wait(300);
  await openData(page); await page.evaluate(() => { const c = document.querySelector('[data-section="io-drive"]'); if (c) c.scrollIntoView({ block: "start" }); }); await wait(300); await snap("6-io-drive-notices");
  await openSettings(page); await page.evaluate(() => document.querySelector('.more-page [data-more="feedback"]').click()); await wait(500); await snap("7-feedback-sheet");
  await page.close();
  console.log("done", theme, lang, w);
}
fs.writeFileSync(path.join(OUT, "p76-findings.json"), JSON.stringify(findings, null, 2));
console.log(JSON.stringify(findings, null, 1).slice(0, 4000));
await browser.close();
