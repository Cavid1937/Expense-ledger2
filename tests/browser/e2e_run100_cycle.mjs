// Run 100: once this month's income is recorded, the Safe to Spend card also says what the accounts cover until the NEXT income
// (one line). Safe to Spend itself is unchanged. Synthetic data only.
import { launch, openPage, settle, ok, section, finish, baseSeed, tx, ymd } from "./lib.mjs";
const browser = await launch();
const ahead = (n) => { const d = new Date(); return ymd(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)); };
// baseSeed: 2,000 income this month, a goal saving of 500, 30 spent -> Safe to Spend 1,470. Added: the next income dated 3 days ahead.
const seed = (language) => { const s = baseSeed({ language }); s.transactions = [...s.transactions, tx({ type: "income", category: "salary", amount: 2000, merchant: "Employer", date: ahead(3) })]; return s; };
const acc = `try{if(!sessionStorage.getItem("__a")){sessionStorage.setItem("__a","1");localStorage.setItem("expense_ledger_v5__accounts",JSON.stringify({version:1,accounts:[{id:"a_card01",name:"My card",kind:"card",opening:{amount:200,date:""},hidden:false}],transfers:[]}));}}catch(e){}`;
const read = (page) => page.evaluate(() => { const q = (s) => { const e = document.querySelector(s); return e ? e.textContent : null; };
  return { line: q('[data-section="safe-untilline"]'), amount: q('[data-section="home-safe"] .safe-amount'), until: q('[data-section="home-untilpay"]') }; });
section("R100-B1. No accounts: no line");
{
  const page = await openPage(browser, { seed: seed("en") }); await settle(page);
  const r = await read(page);
  ok(r.line === null && /1,470\.00/.test(r.amount || ""), "no accounts: Safe to Spend 1,470.00 and no extra line", r);
  await page.close();
}
section("R100-B2. Accounts and a next income date: one line under the figure");
{
  const page = await openPage(browser, { seed: seed("en"), pre: new Function(acc) }); await settle(page);
  const r = await read(page);
  // 200 held, nothing due before the income in 3 days: 200.00; 20000 qapik / 3 = 6666.6 -> 66.66 a day
  ok(r.line !== null && /Until your next income/.test(r.line) && /200\.00/.test(r.line) && /66\.66/.test(r.line) && !/\{[a-z]+\}/i.test(r.line), "the line: 200.00 in the accounts, 66.66 a day", r.line);
  ok(/1,470\.00/.test(r.amount || "") && r.until === null, "Safe to Spend is still 1,470.00; the separate 'until' card is not shown as well", r);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R100-B3. az and ru");
for (const [l, re] of [["az", /Növbəti gəlirə qədər/], ["ru", /До следующего дохода/]]) {
  const page = await openPage(browser, { seed: seed(l), pre: new Function(acc) }); await settle(page);
  const r = await read(page);
  ok(r.line !== null && re.test(r.line) && /200[.,]00/.test(r.line) && /66[.,]66/.test(r.line) && !/\{[a-z]+\}/i.test(r.line), `${l}: translated, same figures`, r.line);
  // found by a screenshot: in az and ru "What if I buy something?" and "How is this calculated?" sat glued together on one row
  const rows = await page.evaluate(() => { const a = document.querySelector('[data-section="whatif-open"][data-kind="safe"]').getBoundingClientRect(), b = document.querySelector(".safe-toggle").getBoundingClientRect(); return { a: a.bottom, b: b.top }; });
  ok(rows.b >= rows.a - 1, `${l}: "What if" and "How is this calculated?" are on separate rows`, rows);
  await page.close();
}
section("R100-B4. A loan payment still due this month is named on the card, and not taken out");
{
  // 1,200.00 over 12 months without interest, first payment today: 100.00 due this month, not paid
  const loan = `try{localStorage.setItem("expense_ledger_v5__debts",JSON.stringify({version:1,debts:[],loans:[{id:"l1",lender:"Bank",principal:120000,months:12,rateType:"none",ratePct:0,firstPayment:"${ymd(new Date())}",bankPayment:null,payments:[]}]}));}catch(e){}`;
  const page = await openPage(browser, { seed: seed("en"), pre: new Function(loan) }); await settle(page);
  const r = await page.evaluate(() => { const q = (s) => { const e = document.querySelector(s); return e ? e.textContent : null; }; return { note: q('[data-section="home-safe-loans"]'), amount: q('[data-section="home-safe"] .safe-amount') }; });
  ok(r.note !== null && /100\.00/.test(r.note) && /not taken out/.test(r.note) && !/\{[a-z]+\}/i.test(r.note), "the note names 100.00 and says it is not taken out", r.note);
  ok(/1,470\.00/.test(r.amount || ""), "Safe to Spend is still 1,470.00", r.amount);
  await page.close();
}
await finish("e2e_run100_cycle", browser);
