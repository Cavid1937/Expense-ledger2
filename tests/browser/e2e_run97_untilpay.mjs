// Run 97: before this month's income arrives, Home shows what the accounts cover until the next income ("Until your next income").
// Safe to Spend itself is unchanged; with no accounts the earlier "waiting" card stays. Synthetic data only.
import { launch, openPage, settle, ok, section, finish, baseSeed, tx, ymd, daysAgo } from "./lib.mjs";
const browser = await launch();
const ahead = (n) => { const d = new Date(); return ymd(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)); };
// No income this month so far: last pay 40 days ago, the next one dated 3 days ahead, one expense dated tomorrow (30).
const seed = (language) => baseSeed({ language, transactions: [
  tx({ type: "income", category: "salary", amount: 2000, merchant: "Employer", date: daysAgo(40) }),
  tx({ type: "income", category: "salary", amount: 2000, merchant: "Employer", date: ahead(3) }),
  tx({ amount: 30, merchant: "Planned", date: ahead(1) }),
] });
const acc = `try{if(!sessionStorage.getItem("__a")){sessionStorage.setItem("__a","1");localStorage.setItem("expense_ledger_v5__accounts",JSON.stringify({version:1,accounts:[{id:"a_card01",name:"My card",kind:"card",opening:{amount:200,date:""},hidden:false}],transfers:[]}));}}catch(e){}`;
const read = (page) => page.evaluate(() => { const q = (s) => { const e = document.querySelector(s); return e ? e.textContent : null; }; const c = document.querySelector('[data-section="home-untilpay"]');
  return { card: c ? c.textContent : null, amount: c ? (c.querySelector(".safe-amount") || {}).textContent : null, plain: q('[data-section="until-plain"]'), daily: q('[data-section="until-daily"]'), waiting: q('[data-section="home-safe"]') }; });
section("R97-B1. No accounts: nothing new, the earlier card stays");
{
  const page = await openPage(browser, { seed: seed("en") }); await settle(page);
  const r = await read(page);
  ok(r.card === null && r.waiting !== null, "no accounts: no 'until' card, the earlier card is there", r);
  await page.close();
}
section("R97-B2. Accounts set up, income not in yet: the card shows what is left until the next income");
{
  const page = await openPage(browser, { seed: seed("en"), pre: new Function(acc) }); await settle(page);
  const r = await read(page);
  // 200 held - 30 dated tomorrow = 170; 3 days -> 56.66 a day (17000 qapik / 3 = 5666.6, rounded down)
  ok(r.card !== null && /Until your next income/.test(r.card), "the card is shown with its title", r.card);
  ok(/170/.test(r.amount || ""), "200 held - 30 dated ahead = 170", r.amount);
  ok(/56[.,]66/.test(r.daily || "") && /3 days/.test(r.daily || ""), "56.66 a day for 3 days (rounded down)", r.daily);
  ok(/200/.test(r.card) && /30/.test(r.card) && !/\{[a-z]+\}/i.test(r.card), "the rows show what is held and what is set aside; nothing left unfilled", r.card);
  ok(r.waiting === null, "the earlier 'waiting' card is not shown beside it", r.waiting);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R97-B3. Income already in this month: Safe to Spend as before");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }), pre: new Function(acc) }); await settle(page);
  const r = await read(page);
  ok(r.card === null && /1,470/.test(r.waiting || ""), "income recorded this month: no 'until' card, the usual Safe to Spend figure (2000 - 500 goal saving - 30 = 1,470)", r);
  await page.close();
}
section("R97-B4. az and ru");
for (const l of ["az", "ru"]) {
  const page = await openPage(browser, { seed: seed(l), pre: new Function(acc) }); await settle(page);
  const r = await read(page);
  ok(r.card !== null && /170/.test(r.amount || "") && !/\{[a-z]+\}/i.test(r.card) && !/Until your next income/.test(r.card) && (l === "az" ? /gün/.test(r.daily || "") : /дн|день/.test(r.daily || "")), `${l}: translated, same figure, nothing left unfilled`, r);
  await page.close();
}
await finish("e2e_run97_untilpay", browser);
