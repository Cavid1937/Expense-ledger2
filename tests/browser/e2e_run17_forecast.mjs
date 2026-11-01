// Run 17 (2026-10-30): the month-end forecast card on Analytics (current month only). The arithmetic is checked in logic/run17.test.mjs;
// this checks what the person sees. Dates are built from the real "today" so the test works on any day.
import { launch, openPage, tab, wait, ok, section, finish, baseSeed, tx, settle } from "./lib.mjs";
const browser = await launch();
const dstr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const back = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return dstr(d); };
const card = (page) => page.evaluate(() => (document.querySelector('[data-section="an-forecast"]') || {}).innerText || null);

section("R17-FC1. Enough history: one estimate with its explanation (no earlier months, so no range)");
{
  const txns = []; for (let i = 1; i <= 20; i++) txns.push(tx({ category: "food", amount: 10, date: back(i) }));
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: txns }) }); await settle(page); await tab(page, "Analytics"); await wait(500);
  const c = await card(page);
  ok(!!c && /Expected by month end/.test(c), "the card is there", c);
  ok(/One estimate only/.test(c) && !/Likely between/.test(c), "a single estimate; the range is not shown without proof from earlier months", c);
  ok(/usual 10\.00/.test(c), "it names the usual daily spend (10.00)", c);
  ok(!/Projected/.test(await page.evaluate(() => document.body.innerText)), "the old 'Projected' line is gone");
  await page.close();
}
section("R17-FC2. Too little history says what to do");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ amount: 10, date: back(1) }), tx({ amount: 10, date: back(2) })] }) }); await settle(page); await tab(page, "Analytics"); await wait(500);
  ok(/Record about a week/.test((await card(page)) || ""), "asks for about a week of spending", await card(page));
  await page.close();
}
section("R17-FC3. Not shown for an earlier month");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ amount: 10, date: back(1) }), tx({ amount: 10, date: back(45) })] }) }); await settle(page); await tab(page, "Analytics"); await wait(400);
  await page.evaluate(() => document.querySelector(".month-nav-btn").click()); await wait(400);
  ok((await card(page)) === null, "viewing last month: no forecast card");
  await page.close();
}
section("R17-FC4. Russian and Azerbaijani");
for (const [l, re] of [["ru", /Ожидается к концу месяца/], ["az", /Ay sonuna gözlənilən/]]) {
  const txns = []; for (let i = 1; i <= 20; i++) txns.push(tx({ category: "food", amount: 10, date: back(i) }));
  const page = await openPage(browser, { seed: baseSeed({ language: l, transactions: txns }), chooseLang: l }); await settle(page); await tab(page, "Analytics"); await wait(500);
  ok(re.test((await card(page)) || ""), `${l}: the card is in ${l}`, await card(page));
  await page.close();
}
await browser.close();
finish("e2e_run17_forecast");
