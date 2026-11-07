// Run 17 (2026-10-30): the Financial Coach card on Analytics ("Your numbers"). Rules are checked in logic/run17coach.test.mjs;
// this checks what the person sees. Dates are built from the real "today" so the test works on any day. Synthetic data only.
import { launch, openPage, tab, wait, ok, section, finish, baseSeed, tx, settle } from "./lib.mjs";
const browser = await launch();
const DKEY = "expense_ledger_v5__debts";
const dstr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const back = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return dstr(d); };
const card = (page) => page.evaluate(() => (document.querySelector('[data-section="an-coach"]') || {}).innerText || null);
const full = () => { const a = []; for (let i = 1; i <= 20; i++) a.push(tx({ category: "food", amount: 10, date: back(i) })); a.push(tx({ type: "income", category: "salary", amount: 400, date: back(5) })); return a; };

section("R17-CO1. Enough data: spent and kept, with the window and a note that it is not advice");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: full() }) }); await settle(page); await page.evaluate((k) => localStorage.removeItem(k), DKEY); await tab(page, "Analytics"); await wait(500);
  const c = await card(page);
  ok(!!c && /Your numbers/.test(c), "the card is there", c);
  ok(/spent 50% of the money you recorded coming in and kept 50%/.test(c || ""), "200 of 400 recorded: spent 50%, kept 50%", c);
  ok(/last 30 days/.test(c || "") && /Not advice/.test(c || ""), "it names its window and says it is not advice", c);
  await page.close();
}
section("R17-CO2. Too little data says so instead of showing a figure");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ amount: 10, date: back(1) }), tx({ amount: 10, date: back(2) }), tx({ type: "income", category: "salary", amount: 400, date: back(3) })] }) }); await settle(page); await page.evaluate((k) => localStorage.removeItem(k), DKEY); await tab(page, "Analytics"); await wait(500);
  const c = await card(page);
  ok(/may be incomplete/.test(c || "") && !/spent \d+%/.test(c || ""), "'may be incomplete' and no percentage", c);
  await page.close();
}
section("R17-CO3. A loan payment due soon is shown first, from the Debts page data");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: full() }) }); await settle(page);
  const soon = (() => { const d = new Date(); d.setDate(d.getDate() + 3); return dstr(d); })();
  await page.evaluate((k, first) => localStorage.setItem(k, JSON.stringify({ debts: [], loans: [{ id: "l1", lender: "Test Bank", kind: "cash", principal: 100000, ratePct: 0, rateType: "none", months: 10, firstPayment: first, bankPayment: null, payments: [] }] })), DKEY, soon);
  await tab(page, "Analytics"); await wait(500);
  const lines = await page.evaluate(() => [...document.querySelectorAll('[data-section="an-coach"] .coach-line')].map((e) => e.innerText));
  ok(lines.length === 2 && /Test Bank/.test(lines[0]) && /100\.00/.test(lines[0]) && /spent 50%/.test(lines[1]), "the loan line comes first, then the numbers", lines);
  await page.close();
}
section("R17-CO4. Nothing recorded: no coach card");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [] }) }); await settle(page); await page.evaluate((k) => localStorage.removeItem(k), DKEY); await tab(page, "Analytics"); await wait(400);
  ok((await card(page)) === null, "no card on an empty ledger");
  await page.close();
}
section("R17-CO5. Russian and Azerbaijani");
for (const [l, re] of [["ru", /Ваши цифры/], ["az", /Rəqəmləriniz/]]) {
  const page = await openPage(browser, { seed: baseSeed({ language: l, transactions: full() }), chooseLang: l }); await settle(page); await page.evaluate((k) => localStorage.removeItem(k), DKEY); await tab(page, "Analytics"); await wait(500);
  ok(re.test((await card(page)) || ""), `${l}: the card is in ${l}`, await card(page));
  await page.close();
}
await browser.close();
finish("e2e_run17_coach");
