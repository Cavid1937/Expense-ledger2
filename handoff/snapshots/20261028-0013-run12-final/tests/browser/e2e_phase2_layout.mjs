// Phase 2 layout check for the components changed in this phase (Safe to Spend card, Analytics per-day tile, backup banner)
// at 320 / 360 / 390 px and a desktop width. Measures overflow; saves screenshots to tests/evidence/screens for a human look.
import { openSafe, launch, openPage, tab, wait, ok, section, finish, tx, baseSeed, TODAY, ymd, fs, path } from "./lib.mjs";
import { fileURLToPath } from "url";
const shots = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "evidence", "screens"); fs.mkdirSync(shots, { recursive: true });
const browser = await launch();
const now = new Date(), y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
const LATER = ymd(new Date(y, m, Math.min(d + 1, new Date(y, m + 1, 0).getDate())));
const days = []; for (let i = 1; i <= d; i++) { const g = new Date(y, m, i).getDay(); days.push(tx({ merchant: "A long merchant name for wrapping", amount: (g === 0 || g === 6) ? 123456.78 : 10, date: ymd(new Date(y, m, i)) })); }
const seed = baseSeed({ lastBackup: new Date().toISOString(), transactions: [...days, tx({ type: "income", category: "salary", amount: 987654.32, date: TODAY }), tx({ type: "income", category: "salary", amount: 765432.1, merchant: "Bonus", date: LATER })] });
// Overflow = the element's own contents (text, icons) wider than its box, or the box past the screen edge. scrollWidth alone
// is not used: it also counts the invisible enlarged tap areas (::after) that deliberately extend past small buttons.
const overflow = (page, sel) => page.evaluate((sel) => [...document.querySelectorAll(sel)].filter((e) => {
  const rg = document.createRange(); rg.selectNodeContents(e); const cw = rg.getBoundingClientRect().width;
  const cs = getComputedStyle(e), inner = e.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  return (cw > inner + 1 && e.scrollWidth > e.clientWidth + 1) || e.getBoundingClientRect().right > document.documentElement.clientWidth + 1;
}).map((e) => e.className + ": " + e.innerText.slice(0, 50)), sel);
for (const width of [320, 360, 390, 1280]) {
  section(`width ${width}px`);
  const page = await openPage(browser, { width, height: 800, seed });
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${width}px Home: no horizontal page scroll`);
  await openSafe(page); const sc = await overflow(page, ".safe-card, .safe-row, .safe-lbl, .safe-val, .backup-banner, .backup-banner span, .backup-banner-btn");
  ok(sc.length === 0, `${width}px Home: Safe to Spend rows and backup banner fit (large amounts, long labels)`, sc);
  const wrapped = await page.evaluate(() => [...document.querySelectorAll(".safe-val")].filter((e) => e.getClientRects().length > 1 || e.getBoundingClientRect().height > parseFloat(getComputedStyle(e).fontSize) * 2).map((e) => e.innerText));
  ok(wrapped.length === 0, `${width}px Home: every Safe to Spend amount stays on one line (an amount split from its ₼ is misleading)`, wrapped);
  await page.screenshot({ path: path.join(shots, `home-${width}.png`), fullPage: true });
  await tab(page, "Monthly"); await wait(300); // Run 7: the Analytics content is on Monthly
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${width}px Monthly (with the former Analytics content): no horizontal page scroll`);
  const st = await overflow(page, ".stat-row, .stat-cell, .stat-val");
  ok(st.length === 0, `${width}px Monthly: stat tiles (incl. the per-day tile with a 6-digit amount) fit`, st);
  await page.screenshot({ path: path.join(shots, `analytics-${width}.png`), fullPage: false });
  ok(page.errors.length === 0, `${width}px no JavaScript errors`, page.errors[0]);
  await page.close();
}
await finish("e2e_phase2_layout", browser);
