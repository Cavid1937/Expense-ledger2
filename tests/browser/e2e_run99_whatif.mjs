// Run 99: "What if I buy something?" on the Safe to Spend card and on the "Until your next income" card. It only reads the figure on
// the card; nothing is saved. Synthetic data only.
import { launch, openPage, settle, ok, section, finish, baseSeed, tx, ymd, daysAgo, wait, state } from "./lib.mjs";
const browser = await launch();
const ahead = (n) => { const d = new Date(); return ymd(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)); };
const acc = new Function(`try{if(!sessionStorage.getItem("__a")){sessionStorage.setItem("__a","1");localStorage.setItem("expense_ledger_v5__accounts",JSON.stringify({version:1,accounts:[{id:"a_card01",name:"My card",kind:"card",opening:{amount:200,date:""},hidden:false}],transfers:[]}));}}catch(e){}`);
const look = (page, kind) => page.evaluate((k) => { const q = (s) => { const e = document.querySelector(s); return e ? e.textContent : null; };
  return { open: !!document.querySelector(`[data-section="whatif-open"][data-kind="${k}"]`), box: q(`[data-section="whatif"][data-kind="${k}"]`), result: q(`[data-section="whatif"][data-kind="${k}"] [data-section="whatif-result"]`), amount: q(".safe-amount") }; }, kind);
const type = async (page, text) => { await page.evaluate(() => { const i = document.querySelector('[data-section="whatif-amount"]'); i.focus(); i.select(); }); await page.keyboard.press("Backspace"); await page.keyboard.type(text); await wait(200); };
const d = new Date(), daysLeft = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() - d.getDate() + 1, money = (x) => (Math.round(x * 100) / 100).toFixed(2);
section("R99-QB1. On Safe to Spend");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page);
  const before = await state(page);
  let r = await look(page, "safe");
  // Safe to Spend here: 2,000 income - 500 goal saving - 30 spent = 1,470.00
  ok(r.open && r.box === null && /1,470\.00/.test(r.amount || ""), "the card shows 1,470.00 and offers 'What if I buy something?'", r);
  await page.evaluate(() => document.querySelector('[data-section="whatif-open"][data-kind="safe"]').click()); await wait(250);
  await type(page, "470"); r = await look(page, "safe");
  // 1,470 - 470 = 1,000.00; per day 1,000 / days left instead of 1,470 / days left
  ok(/1,000\.00/.test(r.result || "") && (r.result || "").includes(money(1000 / daysLeft)) && (r.result || "").includes(money(1470 / daysLeft)), `1,470 - 470 = 1,000.00; ${money(1000 / daysLeft)} a day instead of ${money(1470 / daysLeft)}`, r.result);
  ok(/1,470\.00/.test(r.amount || "") && /Nothing is saved/.test(r.box || ""), "the real figure on the card is unchanged, and the box says nothing is saved", r.amount);
  await type(page, "2000"); r = await look(page, "safe");
  // 1,470 - 2,000 = -530.00
  ok(/530\.00/.test(r.result || "") && /more than what is left/.test(r.result || ""), "2,000 is 530.00 more than what is left", r.result);
  await type(page, "abc"); r = await look(page, "safe");
  ok((r.result || "").trim() === "", "letters: no answer is shown", r.result);
  await page.evaluate(() => document.querySelector('[data-section="whatif-close"]').click()); await wait(200); r = await look(page, "safe");
  const after = await state(page);
  ok(r.box === null && r.open && JSON.stringify(after.transactions) === JSON.stringify(before.transactions) && JSON.stringify(after.safeToSpend) === JSON.stringify(before.safeToSpend), "closed; the saved entries and settings are exactly as before");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R99-QB2. On 'Until your next income'");
const seed2 = (language) => baseSeed({ language, transactions: [tx({ type: "income", category: "salary", amount: 2000, merchant: "Employer", date: daysAgo(40) }), tx({ type: "income", category: "salary", amount: 2000, merchant: "Employer", date: ahead(3) }), tx({ amount: 30, merchant: "Planned", date: ahead(1) })] });
{
  const page = await openPage(browser, { seed: seed2("en"), pre: acc }); await settle(page);
  await page.evaluate(() => document.querySelector('[data-section="whatif-open"][data-kind="until"]').click()); await wait(250);
  await type(page, "20");
  const r = await look(page, "until");
  // left 200 - 30 = 170; buy 20 -> 150.00; 15000 / 3 = 50.00 a day instead of 56.66
  ok(/150\.00/.test(r.result || "") && /50\.00/.test(r.result || "") && /56\.66/.test(r.result || "") && /170\.00/.test(r.amount || ""), "170 - 20 = 150.00; 50.00 a day instead of 56.66; the card still shows 170.00", r);
  await page.close();
}
for (const [l, re] of [["az", /fərziyyədir/], ["ru", /предположение/]]) {
  const page = await openPage(browser, { seed: seed2(l), pre: acc }); await settle(page);
  await page.evaluate(() => document.querySelector('[data-section="whatif-open"][data-kind="until"]').click()); await wait(250);
  await type(page, "20");
  const r = await look(page, "until");
  ok(re.test(r.box || "") && /150[.,]00/.test(r.result || "") && !/\{[a-z]+\}/.test(r.box || ""), `${l}: translated, same figure`, r.box);
  await page.close();
}
await finish("e2e_run99_whatif", browser);
