// Run 25: a saved entry settles in (tinted row, no movement), grouped rows no longer repeat the date, Analytics figures use the quiet currency sign. Synthetic data only.
import { launch, openPage, tab, openAdd, wait, ok, section, finish, baseSeed, clickText, settle, tx } from "./lib.mjs";
const browser = await launch();
const typeAmt = (page, v) => page.$eval(".amount-input", (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); }, v);

section("R25-S1. A new entry's row is tinted for a moment");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ id: 1790001000009, merchant: "Old shop", amount: 5 })] }) }); await settle(page); await openAdd(page);
  await typeAmt(page, "12.5");
  await clickText(page, ".add-foot .btn-primary", /record expense/i); await wait(150);
  const r = await page.evaluate(() => { const f = [...document.querySelectorAll(".txn-row.txn-fresh")]; return { n: f.length, anim: f[0] ? getComputedStyle(f[0]).animationName : "", txt: f[0] ? f[0].innerText : "" }; });
  ok(r.n === 1 && r.anim === "txn-settle" && /12\.50/.test(r.txt), "exactly the new row (12.50) plays the settle tint", r);
  await page.close();
}
section("R25-S2. Reduced motion: no tint animation");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ id: 1790001000009, merchant: "Old shop", amount: 5 })] }) });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]); await settle(page); await openAdd(page);
  await typeAmt(page, "7");
  await clickText(page, ".add-foot .btn-primary", /record expense/i); await wait(150);
  const a = await page.evaluate(() => { const f = document.querySelector(".txn-row.txn-fresh"); return f ? getComputedStyle(f).animationName : "none"; });
  ok(a === "none", "with reduced motion the row does not animate", a);
  await page.close();
}
section("R25-S3. Ledger rows sit under a date heading and do not repeat the date");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await tab(page, "Ledger"); await settle(page); await wait(300);
  const r = await page.evaluate(() => { const s = document.querySelector(".txn-list .txn-sub"); return { sub: s ? s.innerText : "", hdr: !!document.querySelector(".txn-date-hdr") }; });
  ok(r.hdr && r.sub && !/Today|Yesterday|\d{1,2} [A-Z][a-z]{2}/.test(r.sub), "the row subtitle has no date", r);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R25-S4. Analytics month figures use the quiet currency sign");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await tab(page, "Analytics"); await settle(page); await wait(300);
  const r = await page.evaluate(() => [...document.querySelectorAll(".month-stat-val")].map((e) => { const c = e.querySelector(".cur"); return c ? parseFloat(getComputedStyle(c).fontSize) < parseFloat(getComputedStyle(e).fontSize) : false; }));
  ok(r.length === 3 && r.every(Boolean), "all three month figures set the sign smaller", r);
  await page.close();
}
await finish("e2e_run25_settle", browser);
