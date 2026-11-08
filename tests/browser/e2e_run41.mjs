// Run 41 (2026-11-08), owner wishlist: budget rebalance card, yearly cost on recurring rows, coach cards on screen. Synthetic data only.
import { launch, openPage, openGoals, openAdd, openSettings, tab, wait, ok, section, finish, baseSeed, tx, settle, state, TODAY } from "./lib.mjs";
const browser = await launch();
const phone = (page) => page.setViewport({ width: 400, height: 860, deviceScaleFactor: 1, isMobile: true, hasTouch: true });

section("R41-1. Rebalance card");
{
  const seed = baseSeed({ language: "en", budgets: { food: 200, transport: 100, health: 100 },
    transactions: [tx({ amount: 250, category: "food", merchant: "Big dinner" }), tx({ amount: 40, category: "transport", merchant: "Bus" }), tx({ amount: 60, category: "health", merchant: "Pharmacy" })] });
  const page = await openPage(browser, { seed }); await phone(page); await settle(page);
  await openGoals(page, "budgets");
  const card = await page.evaluate(() => { const c = document.querySelector('[data-section="bg-rebalance"]'); return c ? c.innerText : null; });
  ok(!!card && /50/.test(card) && /undo|every month/i.test(card), "the card is shown with the amount and a note that it applies to every month", card);
  await page.evaluate(() => document.querySelector('[data-action="rebalance"]').click()); await wait(500);
  let b = (await state(page)).budgets;
  ok(b.food === 250 && b.transport === 70 && b.health === 80, "limits moved: food 250, transport 70, health 80", b);
  ok(await page.evaluate(() => !document.querySelector('[data-section="bg-rebalance"]')), "the card is gone once the month is balanced");
  const undo = await page.evaluate(() => { const bt = [...document.querySelectorAll("button")].find((x) => /^undo$/i.test(x.textContent.trim())); if (bt) { bt.click(); return true; } return false; });
  await wait(500);
  b = (await state(page)).budgets;
  ok(undo && b.food === 200 && b.transport === 100 && b.health === 100, "Undo puts every limit back", { undo, b });
  ok((await state(page)).transactions.length === 3, "no entry was changed");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
{
  const seed = baseSeed({ language: "en", budgets: { food: 200, transport: 100 }, transactions: [tx({ amount: 150, category: "food" }), tx({ amount: 20, category: "transport" })] });
  const page = await openPage(browser, { seed }); await phone(page); await settle(page);
  await openGoals(page, "budgets");
  ok(await page.evaluate(() => !document.querySelector('[data-section="bg-rebalance"]')), "nothing over: no card");
  await page.close();
}

section("R41-2. Yearly cost on a bill row");
{
  const seed = baseSeed({ language: "en", bills: [{ id: "b1", name: "Netflix", type: "expense", amount: 15, freq: "monthly", anchorDate: TODAY.slice(0, 8) + "01", active: true, category: "other", subcategory: "", createdAt: "" }] });
  const page = await openPage(browser, { seed }); await phone(page); await settle(page);
  await tab(page, "Recurring"); await wait(500); const found = true;
  const y = await page.evaluate(() => [...document.querySelectorAll('[data-yearly="1"]')].map((e) => e.textContent));
  ok(y.length >= 1 && y.some((s) => /180/.test(s)), "15 a month shows about 180 a year", { found, y });
  await page.close();
}
section("R41-3. Hours of work");
{
  const m = (n) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - n); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-02"; };
  const seed = baseSeed({ language: "en", transactions: [tx({ type: "income", category: "salary", amount: 1600, date: m(1), merchant: "Employer" }), tx({ type: "income", category: "salary", amount: 1600, date: m(2), merchant: "Employer" })] });
  const page = await openPage(browser, { seed }); await phone(page); await settle(page);
  await openAdd(page);
  await page.type(".amount-input", "95"); await wait(500);
  ok(await page.evaluate(() => !document.querySelector('[data-section="work-line"]')), "no hours set: no line");
  await page.close();
  const p2 = await openPage(browser, { seed }); await phone(p2); await settle(p2);
  await openSettings(p2);
  const saved = await p2.evaluate(() => { const i = document.querySelector('[data-section="work-hours"] input'); if (!i) return false; return true; });
  ok(saved, "the hours box is in Settings");
  await p2.focus('[data-section="work-hours"] input'); await p2.type('[data-section="work-hours"] input', "160");
  await p2.evaluate(() => document.querySelector('[data-section="work-hours"] button').click()); await wait(300);
  ok(await p2.evaluate(() => localStorage.getItem("expense_ledger_v5__workhours")) === "160", "160 is saved");
  await openAdd(p2);
  await p2.type(".amount-input", "95"); await wait(600);
  const line = await p2.evaluate(() => (document.querySelector('[data-section="work-line"]') || {}).textContent || "");
  ok(/9\.5/.test(line), "95 at 1600/160 = 10 an hour shows 9.5 hours", line);
  ok(p2.errors.length === 0, "no JavaScript errors", p2.errors[0]);
  await p2.close();
}
finish();
