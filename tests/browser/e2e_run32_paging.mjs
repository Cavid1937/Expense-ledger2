// Run 32 (backlog item 6): the Transactions list draws the newest days first (150 rows) and adds more on request; search and totals use the full list.
// 400 synthetic entries on 400 different days. Synthetic data only.
import { launch, openPage, wait, ok, section, finish, tx, baseSeed, tab, settle } from "./lib.mjs";
const browser = await launch();
const N = 400;
const day = (i) => { const d = new Date(2025, 0, 1 + i); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const txns = Array.from({ length: N }, (_, i) => tx({ id: 1790004000000 + i, merchant: "Shop" + i, amount: 1 + (i % 7), date: day(i) }));
const rows = (page) => page.evaluate(() => document.querySelectorAll(".txn-row").length);
const more = (page) => page.evaluate(() => { const b = document.querySelector('[data-section="tx-show-more"]'); return b ? b.innerText.trim() : null; });
section("R32-G1. First page, Show more, end of the list");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: txns }) }); await tab(page, "Ledger"); await settle(page);
  ok(await rows(page) === 150, "only the newest 150 rows are drawn at first", await rows(page));
  ok(await more(page) === "Show more (250 left)", "the button says how many are left", await more(page));
  const newest = await page.evaluate(() => document.querySelector(".txn-row").innerText);
  ok(/Shop399/.test(newest), "the newest entry (Shop399) is first", newest);
  await page.evaluate(() => document.querySelector('[data-section="tx-show-more"]').click()); await wait(250);
  ok(await rows(page) === 300 && await more(page) === "Show more (100 left)", "Show more adds 150 rows", [await rows(page), await more(page)]);
  await page.evaluate(() => document.querySelector('[data-section="tx-show-more"]').click()); await wait(250);
  ok(await rows(page) === 400 && await more(page) === null, "the next tap shows everything and the button goes away", [await rows(page), await more(page)]);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R32-G2. Search finds an old entry that is beyond the first page");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: txns }) }); await tab(page, "Ledger"); await settle(page);
  await page.type(".search-input", "Shop5 "); await wait(300);   // trailing space is trimmed; "Shop5" also matches Shop50-59 and Shop500+ (none: N=400) -> Shop5, Shop50..Shop59
  const r = await rows(page);
  ok(r === 11 && await more(page) === null, "searching 'Shop5' finds Shop5 and Shop50-Shop59 (11 entries), no Show more", [r, await more(page)]);
  await page.close();
}
section("R32-G3. az and ru");
for (const [l, re] of [["az", /^Daha çox göstər \(250 qalıb\)$/], ["ru", /^Показать ещё \(осталось 250\)$/]]) {
  const page = await openPage(browser, { seed: baseSeed({ language: l, transactions: txns }) }); await tab(page, "Ledger"); await settle(page);
  ok(re.test(await more(page) || ""), `${l}: the button is translated`, await more(page));
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${l}: no horizontal scroll`);
  await page.close();
}
await finish("e2e_run32_paging", browser);
