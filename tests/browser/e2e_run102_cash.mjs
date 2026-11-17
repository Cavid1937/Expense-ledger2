// Run 102: "Until your next income" starts from what the accounts hold, so money lent to someone and dated ahead must be taken off
// in full. Before Run 102 the card took entries dated ahead from the spending view, which leaves money lent out. Synthetic data only.
import { launch, openPage, settle, ok, section, finish, baseSeed, tx, ymd, daysAgo } from "./lib.mjs";
const browser = await launch();
const ahead = (n) => { const d = new Date(); return ymd(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)); };
// No income this month so far: last pay 40 days ago, the next one dated 3 days ahead, one expense dated tomorrow (30).
const seed = (language) => baseSeed({ language, transactions: [
  tx({ type: "income", category: "salary", amount: 2000, merchant: "Employer", date: daysAgo(40) }),
  tx({ type: "income", category: "salary", amount: 2000, merchant: "Employer", date: ahead(3) }),
  tx({ amount: 30, merchant: "Planned", date: ahead(1) }),
  tx({ amount: 50, category: "other", merchant: "Lent to Sam", date: ahead(1), debtLink: { debtId: "d_sam", paymentId: "p_sam1" } }),
] });
const acc = `try{if(!sessionStorage.getItem("__a")){sessionStorage.setItem("__a","1");localStorage.setItem("expense_ledger_v5__accounts",JSON.stringify({version:1,accounts:[{id:"a_card01",name:"My card",kind:"card",opening:{amount:200,date:""},hidden:false}],transfers:[]}));}}catch(e){}`;
const read = (page) => page.evaluate(() => { const q = (s) => { const e = document.querySelector(s); return e ? e.textContent : null; }; const c = document.querySelector('[data-section="home-untilpay"]');
  return { card: c ? c.textContent : null, amount: c ? (c.querySelector(".safe-amount") || {}).textContent : null, plain: q('[data-section="until-plain"]'), daily: q('[data-section="until-daily"]'), waiting: q('[data-section="home-safe"]') }; });
section("R102-B1. Money lent and dated ahead is taken off the until-income figure");
{
  const page = await openPage(browser, { seed: seed("en"), pre: new Function(acc) }); await settle(page);
  const r = await read(page);
  // 200 held - 30 dated tomorrow - 50 lent tomorrow = 120; 12000 qapik / 3 days = 4000 -> 40.00 a day
  ok(r.card !== null && /120/.test(r.amount || ""), "200 - 30 - 50 = 120 (was 170: the money lent was left out)", r.amount);
  ok(/40[.,]00/.test(r.daily || ""), "40.00 a day for 3 days", r.daily);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
await finish("e2e_run102_cash", browser);