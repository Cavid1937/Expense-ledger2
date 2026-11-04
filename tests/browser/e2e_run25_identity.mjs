// Run 25: identity details - quiet currency sign on the big figures, measuring-cup bars, ledger picture on empty screens. Synthetic data only.
import { launch, openPage, tab, wait, ok, section, finish, baseSeed, settle, tx } from "./lib.mjs";
const browser = await launch();

section("R25-ID1. Big figures: the sign is smaller, the text is unchanged");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ id: 1790001000001, merchant: "Shop", amount: 12.5 }), tx({ id: 1790001000002, type: "income", category: "salary", amount: 900 })] }) }); await settle(page); await wait(400);
  for (const sel of [".hero-amount", ".safe-amount"]) {
    const r = await page.evaluate((s) => { const e = document.querySelector(s), c = e && e.querySelector(".cur"); return e && c ? { text: e.innerText.trim(), big: parseFloat(getComputedStyle(e).fontSize), small: parseFloat(getComputedStyle(c).fontSize) } : null; }, sel);
    ok(r && /^\d{1,3}(,\d{3})*\.\d{2} ₼$/.test(r.text) && r.small < r.big, `${sel}: reads "12.50 ₼" and the sign is set smaller`, r);
  }
  await page.close();
}
section("R25-ID2. Budget bars are measuring cups with quarter marks");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await tab(page, "Goals"); await settle(page); await wait(400);
  const bar = await page.evaluate(() => { const b = document.querySelector(".bar"); return b ? { h: Math.round(b.getBoundingClientRect().height), tick: getComputedStyle(b, "::after").content } : null; });
  ok(bar && bar.h >= 10 && bar.tick !== "none" && bar.tick !== "normal", "the budget bar is a taller well with tick marks", bar);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R25-ID3. Empty Transactions screen shows the ledger picture");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [] }) }); await tab(page, "Ledger"); await settle(page); await wait(400);
  ok(await page.evaluate(() => !!document.querySelector(".empty .empty-icon svg") && document.querySelector(".empty .empty-icon svg").getAttribute("aria-hidden") === "true"), "a decorative (hidden from screen readers) ledger picture is shown");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
await finish("e2e_run25_identity", browser);
