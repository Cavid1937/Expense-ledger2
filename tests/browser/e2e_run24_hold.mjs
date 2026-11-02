// Run 24: press and hold a transaction to start selecting several; delete them together. Synthetic data only.
import { launch, openPage, wait, ok, section, finish, baseSeed, tx, settle, state } from "./lib.mjs";
const browser = await launch();
section("R24-HD1. Long-press starts selection");
{
  const seed = baseSeed({ language: "en", transactions: [tx({ merchant: "A", amount: 5, date: "2026-10-20" }), tx({ merchant: "B", amount: 6, date: "2026-10-21" }), tx({ merchant: "C", amount: 7, date: "2026-10-22" })] });
  const page = await openPage(browser, { seed }); await settle(page);
  await page.evaluate(() => { [...document.querySelectorAll(".tab-btn")].find((b) => /transactions|ledger/i.test(b.innerText))?.click(); }); await wait(400);
  const box = await page.evaluate(() => { const r = document.querySelector(".txn-row").getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await page.mouse.move(box.x, box.y); await page.mouse.down(); await wait(700); await page.mouse.up(); await wait(300);
  ok(await page.evaluate(() => !!document.querySelector('[data-section="tx-select"]')), "holding a row opens selection mode");
  ok(await page.evaluate(() => document.querySelectorAll('[data-picked="1"]').length === 1), "the held row is already ticked");
  ok(!(await page.$(".sheet-overlay")), "no detail sheet opened by the release");
  await page.evaluate(() => document.querySelectorAll('[data-section="tx-select"] [role="checkbox"]')[1].click()); await wait(150);
  await page.evaluate(() => document.querySelector('[data-section="tx-select-delete"]').click()); await wait(400);
  const st = await state(page);
  ok(st.transactions.length === 1, "two entries were deleted in one go", st.transactions.length);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
await finish("e2e_run24_hold", browser);
