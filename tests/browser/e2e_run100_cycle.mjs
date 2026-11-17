// Run 100: once this month's income is recorded, Home also says what the accounts cover until the NEXT income.
// Run 103 (owner decision D1): that figure is now the main card whenever it can be worked out; Safe to Spend follows as the
// calendar-month figure. When it cannot be worked out, Safe to Spend stays the main figure and a note says what is missing.
// Run 103 (D9): a loan instalment still due this month is taken out of Safe to Spend. Synthetic data only.
import { launch, openPage, settle, ok, section, finish, baseSeed, tx, ymd } from "./lib.mjs";
const browser = await launch();
const ahead = (n) => { const d = new Date(); return ymd(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)); };
// baseSeed: 2,000 income this month, a goal saving of 500, 30 spent -> Safe to Spend 1,470. Added: the next income dated 3 days ahead.
const seed = (language) => { const s = baseSeed({ language }); s.transactions = [...s.transactions, tx({ type: "income", category: "salary", amount: 2000, merchant: "Employer", date: ahead(3) })]; return s; };
const acc = `try{if(!sessionStorage.getItem("__a")){sessionStorage.setItem("__a","1");localStorage.setItem("expense_ledger_v5__accounts",JSON.stringify({version:1,accounts:[{id:"a_card01",name:"My card",kind:"card",opening:{amount:200,date:""},hidden:false}],transfers:[]}));}}catch(e){}`;
const read = (page) => page.evaluate(() => { const q = (s) => { const e = document.querySelector(s); return e ? e.textContent : null; }; const u = document.querySelector('[data-section="home-untilpay"]'), s = document.querySelector('[data-section="home-safe"]');
  return { amount: q('[data-section="home-safe"] .safe-amount'), safe: s ? s.textContent : null, until: u ? u.textContent : null, untilAmount: u ? (u.querySelector(".safe-amount") || {}).textContent : null,
    daily: q('[data-section="until-daily"]'), why: q('[data-section="until-why"]'), untilFirst: !!(u && s && (u.compareDocumentPosition(s) & 4)), secondary: !!(s && s.classList.contains("safe-secondary")) }; });
section("R100-B1. No accounts: Safe to Spend is the main figure, and a note says what is missing");
{
  const page = await openPage(browser, { seed: seed("en") }); await settle(page);
  const r = await read(page);
  ok(r.until === null && /1,470\.00/.test(r.amount || "") && !r.secondary, "no accounts: Safe to Spend 1,470.00 is the main card", r);
  ok(r.why !== null && /Add an account/.test(r.why), "the note says an account with its balance is needed", r.why);
  await page.close();
}
section("R100-B2. Accounts and a next income date: the until-income card leads, the month figure follows");
{
  const page = await openPage(browser, { seed: seed("en"), pre: new Function(acc) }); await settle(page);
  const r = await read(page);
  // 200 held, nothing due before the income in 3 days: 200.00; 20000 qapik / 3 = 6666.6 -> 66.66 a day
  ok(r.until !== null && /Until your next income/.test(r.until) && /200\.00/.test(r.untilAmount || "") && /66\.66/.test(r.daily || "") && !/\{[a-z]+\}/i.test(r.until), "the main card: 200.00 in the accounts, 66.66 a day", r);
  ok(r.untilFirst && r.secondary && /Safe to Spend this month/.test(r.safe || "") && /1,470\.00/.test(r.amount || ""), "below it: 'Safe to Spend this month', 1,470.00, as the second figure", r);
  ok(r.why === null, "nothing is missing, so no note", r.why);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R100-B3. az and ru");
for (const [l, re] of [["az", /Növbəti gəlirə qədər/], ["ru", /До следующего дохода/]]) {
  const page = await openPage(browser, { seed: seed(l), pre: new Function(acc) }); await settle(page);
  const r = await read(page);
  ok(r.until !== null && re.test(r.until) && /200[.,]00/.test(r.untilAmount || "") && /66[.,]66/.test(r.daily || "") && !/\{[a-z]+\}/i.test(r.until + r.safe), `${l}: translated, same figures`, r);
  // "What if" now sits on the main card only
  const w = await page.evaluate(() => ({ until: !!document.querySelector('[data-section="whatif-open"][data-kind="until"]'), safe: !!document.querySelector('[data-section="whatif-open"][data-kind="safe"]') }));
  ok(w.until && !w.safe, `${l}: "What if" is on the main card only`, w);
  await page.close();
}
section("R100-B4. A loan instalment still due this month is taken out of Safe to Spend (D9)");
{
  // 1,200.00 over 12 months without interest, first payment today: 100.00 due this month, not paid. 1,470 - 100 = 1,370
  const loan = `try{localStorage.setItem("expense_ledger_v5__debts",JSON.stringify({version:1,debts:[],loans:[{id:"l1",lender:"Bank",principal:120000,months:12,rateType:"none",ratePct:0,firstPayment:"${ymd(new Date())}",bankPayment:null,payments:[]}]}));}catch(e){}`;
  const page = await openPage(browser, { seed: seed("en"), pre: new Function(loan) }); await settle(page);
  await page.evaluate(() => document.querySelector('[data-section="home-safe"] .safe-toggle').click()); await new Promise((r) => setTimeout(r, 400));
  const r = await page.evaluate(() => { const q = (s) => { const e = document.querySelector(s); return e ? e.textContent : null; }; return { row: q('[data-section="safe-loan-due"]'), amount: q('[data-section="home-safe"] .safe-amount'), old: q('[data-section="home-safe-loans"]') }; });
  ok(/1,370\.00/.test(r.amount || ""), "Safe to Spend is 1,370.00 (1,470 - 100)", r.amount);
  ok(r.row !== null && /Loan instalments still due \(1\)/.test(r.row) && /100\.00/.test(r.row), "the breakdown names the loan instalment: 100.00", r.row);
  ok(r.old === null, "the old 'not taken out' note is gone", r.old);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
await finish("e2e_run100_cycle", browser);
