// Run 98: entries with no account. The Add form starts on the account used last time (named on the "More details" line, never unseen),
// and the "Until your next income" card says how much spending is in no balance. Synthetic data only.
import { launch, openPage, settle, ok, section, finish, baseSeed, tx, ymd, daysAgo, wait, openAdd } from "./lib.mjs";
const browser = await launch();
const ahead = (n) => { const d = new Date(); return ymd(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)); };
const accs = (openDate) => new Function(`try{if(!sessionStorage.getItem("__a")){sessionStorage.setItem("__a","1");localStorage.setItem("expense_ledger_v5__accounts",JSON.stringify({version:1,accounts:[{id:"a_card01",name:"My card",kind:"card",opening:{amount:200,date:"${openDate}"},hidden:false},{id:"a_cash01",name:"Pocket",kind:"cash",opening:{amount:50,date:"${openDate}"},hidden:false}],transfers:[]}));}}catch(e){}`);
const form = (page) => page.evaluate(() => ({ card: (document.querySelector('[data-acc-pick="a_card01"]') || {}).ariaChecked, cash: (document.querySelector('[data-acc-pick="a_cash01"]') || {}).ariaChecked, line: (document.querySelector('[data-section="add-more-toggle"]') || {}).textContent || "",
  // Run 100: the chips are in the main form: outside the folded details, drawn (they have a size), and above the "More details" toggle
  inView: (() => { const c = document.querySelector('[data-acc-pick="a_card01"]'), t = document.querySelector('[data-section="add-more-toggle"]'); return !!c && !!t && !document.querySelector('[data-section="add-more"] [data-acc-pick]') && c.getBoundingClientRect().height > 0 && c.getBoundingClientRect().top < t.getBoundingClientRect().top; })() }));
section("R98-B1. Add form: same account as last time, shown on the details line");
{
  const seed = baseSeed({ language: "en", transactions: [tx({ merchant: "A", amount: 5, account: "a_cash01" }), tx({ merchant: "B", amount: 6, account: "a_card01" })] });
  const page = await openPage(browser, { seed, pre: accs("") }); await settle(page); await openAdd(page); await wait(300);
  const r = await form(page);
  ok(r.card === "true" && r.cash === "false", "the account of the expense recorded last (My card) is chosen", r);
  ok(r.inView === true, "and the account chips are in view in the main form while the details are closed (Run 100: no longer under 'More details')", r);
  await page.evaluate(() => document.querySelector('[data-acc-pick="a_card01"]').click()); await wait(150);
  const off = await form(page);
  ok(off.card === "false" && !/My card/.test(off.line), "one tap takes it off again", off);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R98-B2. Last entry had no account: nothing is chosen for you");
{
  const seed = baseSeed({ language: "en", transactions: [tx({ merchant: "A", amount: 5, account: "a_card01" }), tx({ merchant: "B", amount: 6 })] });
  const page = await openPage(browser, { seed, pre: accs("") }); await settle(page); await openAdd(page); await wait(300);
  const r = await form(page);
  ok(r.card === "false" && r.cash === "false" && !/My card|Pocket/.test(r.line), "no account chosen, none named", r);
  await page.close();
}
section("R98-B3. The 'until' card says how much spending is in no balance");
const seed3 = (language) => baseSeed({ language, transactions: [
  tx({ type: "income", category: "salary", amount: 2000, merchant: "Employer", date: daysAgo(40) }),
  tx({ type: "income", category: "salary", amount: 2000, merchant: "Employer", date: ahead(3) }),
  tx({ amount: 12.5, merchant: "No account", date: daysAgo(1) }),
  tx({ amount: 20, merchant: "On the card", date: daysAgo(1), account: "a_card01" }),
  tx({ amount: 99, merchant: "Before the balance was typed", date: daysAgo(30) }),
] });
const loose = (page) => page.evaluate(() => { const c = document.querySelector('[data-section="home-untilpay"]'), l = document.querySelector('[data-section="until-loose"]'); return { amount: c ? (c.querySelector(".safe-amount") || {}).textContent : null, loose: l ? l.textContent : null }; });
{
  const page = await openPage(browser, { seed: seed3("en"), pre: accs(daysAgo(10)) }); await settle(page);
  const r = await loose(page);
  // held: 200 - 20 + 50 = 230 (the 12.50 with no account moves nothing); the note names 12.50, one entry; the 99 before the opening date is not named
  ok(/230/.test(r.amount || ""), "the figure is still 230 (200 - 20 on the card + 50): nothing is taken out silently", r.amount);
  ok(r.loose !== null && /12[.,]50/.test(r.loose) && /\(1\)/.test(r.loose) && !/99/.test(r.loose) && /too high/.test(r.loose) && !/\{date\}/.test(r.loose), "the note names 12.50 in 1 entry and says the figure may be too high by that", r.loose);
  await page.close();
  const p2 = await openPage(browser, { seed: seed3("en"), pre: accs("") }); await settle(p2);
  ok((await loose(p2)).loose === null, "no opening date on the accounts: the app cannot know, so no note");
  await p2.close();
}
for (const l of ["az", "ru"]) {
  const page = await openPage(browser, { seed: seed3(l), pre: accs(daysAgo(10)) }); await settle(page);
  const r = await loose(page);
  ok(r.loose !== null && /12[.,]50/.test(r.loose) && !/\{date\}/.test(r.loose) && (l === "az" ? /hesabsız/.test(r.loose) : /без счёта/.test(r.loose)), `${l}: translated, same amount`, r.loose);
  await page.close();
}
await finish("e2e_run98_accounts", browser);
