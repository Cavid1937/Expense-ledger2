// Run 70 evidence, part 2: the less common screens in Graphite, Ivory and Sea glass at 390 px (en): repeating payments, debts, Import/Export
// and its review sheet, the app-lock sheet, an info page, an entry's detail sheet, a delete confirmation and the empty Entries list.
// Also measures text contrast on each (same rule as e2e_run70_themes). Output: SHOTS_OUT. Synthetic data only.
import { launch, openPage, tab, wait, baseSeed, tx, daysAgo, settle, fs, path } from "./lib.mjs";
const OUT = process.env.SHOTS_OUT; if (!OUT) { console.error("SHOTS_OUT must be set"); process.exit(2); }
const IMP = process.env.E2E_IMP_DIR; fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(IMP, { recursive: true });
const browser = await launch();
const seed = () => baseSeed({ language: "en", transactions: [
  tx({ merchant: "Bravo Market", category: "food", amount: 48.6, date: daysAgo(0) }),
  tx({ merchant: "Netflix", category: "digital", amount: 12.99, date: daysAgo(4), recurring: true, recurFreq: "monthly" }),
  tx({ type: "income", category: "salary", merchant: "Employer LLC", amount: 2850, date: daysAgo(9) }),
] });
const DEBTS = JSON.stringify([{ id: "d1", kind: "owe", person: "Rauf", amount: 300, date: daysAgo(20), due: daysAgo(-10), payments: [{ id: "p1", date: daysAgo(5), amount: 100 }] }]);
const scan = (page) => page.evaluate(() => {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const L = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a >= 0.95) return c; } return parse(getComputedStyle(document.body).backgroundColor); };
  const low = [], teal = [];
  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    for (const prop of ["color", "backgroundColor", "borderTopColor"]) { const c = parse(cs[prop]); if (c && c.a > 0.2 && c.r === 76 && c.g === 201 && c.b === 196) teal.push(`${el.className || el.tagName}.${prop}`); }
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight || cs.visibility === "hidden" || +cs.opacity < 0.5 || el.closest('[aria-hidden="true"],[hidden],.theme-mini')) continue;
    const fg = parse(cs.color), bg = bgOf(el); if (!fg || !bg) continue;
    const a = fg.a, mix = { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a) };
    const [x, y] = [L(mix), L(bg)].sort((p, q) => q - p), ratio = (x + 0.05) / (y + 0.05), size = parseFloat(cs.fontSize), big = size >= 24 || (size >= 18.66 && +cs.fontWeight >= 700);
    if (ratio < (big ? 3 : 4.5) && !el.closest(":disabled,[aria-disabled=true]")) low.push(`${(el.innerText || "").trim().slice(0, 30)} ${ratio.toFixed(2)}`);
  }
  return { low, teal };
});
const findings = [];
for (const theme of ["graphite", "ivory", "sea"]) {
  const page = await openPage(browser, { seed: seed(), fresh: true, height: 760, pre: `localStorage.setItem("expense_ledger_v5__theme","${theme}");localStorage.setItem("expense_ledger_v5__debts",${JSON.stringify(DEBTS)})` });
  await settle(page);
  const snap = async (name) => { await page.screenshot({ path: path.join(OUT, `rare-${theme}-${name}.png`) }); const r = await scan(page); if (r.low.length || r.teal.length) findings.push({ theme, name, ...r }); };
  const more = async (id) => { await page.evaluate(() => document.querySelectorAll(".tab-btn")[4].click()); await wait(300); await page.evaluate((i) => document.querySelector(`.more-page [data-more="${i}"]`).click(), id); await wait(500); };
  await more("recurring"); await snap("1-recurring");
  await more("debts"); await snap("2-debts");
  await more("io"); await snap("3-io");
  const f = path.join(IMP, "rare.csv"); fs.writeFileSync(f, "Date,Description,Debit,Credit,Balance\r\n01.10.2026,Market,12.50,,87.50\r\n02.10.2026,Salary,,1000.00,1087.50\r\n");
  await (await page.$(".io-page input[type=file]")).uploadFile(f); await page.waitForSelector('[aria-label="Restore backup"]', { timeout: 10000 }); await wait(600); await snap("4-import-review");
  await page.keyboard.press("Escape"); await wait(500);
  await more("lock"); await wait(300); await snap("5-lock");
  await page.keyboard.press("Escape"); await wait(500);
  await more("privacy"); await wait(300); await snap("6-info");
  await page.keyboard.press("Escape"); await wait(500);
  await tab(page, "Ledger"); await wait(300); await page.evaluate(() => { const r = document.querySelector(".txn-row,.txn-item,[data-section='txn-row']"); if (r) r.click(); }); await wait(600); await snap("7-entry-detail");
  await page.evaluate(() => { window.__noAutoConfirm = true; const b = [...document.querySelectorAll(".sheet button")].find((x) => /delete/i.test(x.innerText)); if (b) b.click(); }); await wait(500); await snap("8-confirm");
  await page.close();
  console.log("done", theme);
}
fs.writeFileSync(path.join(OUT, "rare-findings.json"), JSON.stringify(findings, null, 2));
console.log("findings", JSON.stringify(findings).slice(0, 1500));
await browser.close();
