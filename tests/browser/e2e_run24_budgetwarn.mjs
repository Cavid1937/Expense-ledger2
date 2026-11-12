// Run 24: saving an expense that takes a category past 80% or 100% of its monthly budget says so in the confirmation. Synthetic data only.
import { launch, openPage, openAdd, clickText, wait, ok, section, finish, baseSeed, tx, settle, bodyText, state } from "./lib.mjs";
const browser = await launch();
const seed = (language, spent) => baseSeed({ language, budgets: { food: 100 }, transactions: [tx({ merchant: "Prior", amount: spent, category: "food" })] });
const addNine = async (page, amount, label) => {
  await openAdd(page);
  await page.$eval(".amount-input", (el, v) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); }, amount);
  await clickText(page, ".add-overlay .btn-primary", label); await wait(500);
  return bodyText(page);
};

section("R24-W1. Crossing 80% names the category and the percentage (en)");
{
  const page = await openPage(browser, { seed: seed("en", 70) }); await settle(page);
  const txt = await addNine(page, "15", /record expense/i);
  ok(/Entry recorded/.test(txt) && /85% used/.test(txt), "70 + 15 = 85 of 100 -> recorded, with '85% used'", txt.slice(0, 200));
  ok((await state(page)).transactions.length === 2, "the entry was saved (1 seeded + 1 new)");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R24-W2. Crossing 100% (en), a quiet save, and az / ru");
{
  const page = await openPage(browser, { seed: seed("en", 95) }); await settle(page);
  const txt = await addNine(page, "10", /record expense/i);
  ok(/exceeded this month \(105%\)/.test(txt), "95 + 10 = 105 of 100 -> 'exceeded this month (105%)'", txt.slice(0, 200));
  await page.close();
  const q = await openPage(browser, { seed: seed("en", 10) }); await settle(q);
  const t2 = await addNine(q, "5", /record expense/i);
  ok(/Entry recorded/.test(t2) && !/budget/i.test(t2.split("Entry recorded")[1].slice(0, 60)), "10 + 5 = 15 of 100 stays quiet");
  await q.close();
}
for (const [l, re] of [["az", /büdcəsinin 85%-i/], ["ru", /использован на 85%/]]) {
  const page = await openPage(browser, { seed: seed(l, 70) }); await settle(page);
  const txt = await addNine(page, "15", /./);
  ok(re.test(txt), `${l}: warning shown`, txt.slice(0, 200));
  await page.close();
}
await finish("e2e_run24_budgetwarn", browser);
