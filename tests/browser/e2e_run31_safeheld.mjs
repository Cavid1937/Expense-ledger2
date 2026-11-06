// Run 31 (GPT design review, P0): Safe to Spend is a month-flow figure, not an account balance. When the accounts hold less than it, Home says so.
// Display only: the Safe to Spend number itself must not change. Synthetic data only.
import { launch, openPage, settle, ok, section, finish, baseSeed } from "./lib.mjs";
const browser = await launch();
const acc = (amount) => `try{if(!sessionStorage.getItem("__a")){sessionStorage.setItem("__a","1");localStorage.setItem("expense_ledger_v5__accounts",JSON.stringify({version:1,accounts:[{id:"a_card01",name:"My card",kind:"card",opening:{amount:${amount},date:""},hidden:false}],transfers:[]}));}}catch(e){}`;
const read = (page) => page.evaluate(() => ({ note: (document.querySelector('[data-section="home-safe-held"]') || {}).textContent || null, amount: (document.querySelector(".safe-amount") || {}).textContent || null }));
let plain;
section("R31-1. No accounts: no note");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page);
  const r = await read(page); plain = r.amount;
  ok(r.note === null && !!r.amount, "no accounts set up: the Safe to Spend card has no balance note", r);
  await page.close();
}
section("R31-2. Account holds less than Safe to Spend");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }), pre: new Function(acc(100)) }); await settle(page);
  const r = await read(page);
  ok(r.note !== null && /100/.test(r.note) && /less than this figure/.test(r.note) && /not account balances/.test(r.note), "the note names the accounts' total (100) and says the figure is not a balance", r);
  ok(r.amount === plain, "the Safe to Spend number is exactly the same as without accounts (display-only change)", [r.amount, plain]);
  ok(await page.evaluate(() => { const e = document.querySelector('[data-section="home-safe-held"]'); return !!e && !!e.closest('[role="note"]'); }), "the note sits inside a labelled note region for screen readers");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R31-3. Account holds at least Safe to Spend");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }), pre: new Function(acc(50000)) }); await settle(page);
  const r = await read(page);
  ok(r.note === null, "accounts hold more than the figure: no note", r);
  await page.close();
}
section("R31-4. az and ru");
for (const l of ["az", "ru"]) {
  const page = await openPage(browser, { seed: baseSeed({ language: l }), pre: new Function(acc(100)) }); await settle(page);
  const r = await read(page);
  ok(r.note !== null && (l === "az" ? /hesab qalıqlarını/.test(r.note) : /остатки на счетах/.test(r.note)) && !/\{held\}/.test(r.note), `${l}: the note is translated and the amount is filled in`, r.note);
  await page.close();
}
await finish("e2e_run31_safeheld", browser);
