// Run 31: Settings redesign (own design after the Figma prototype review). Closed rows say where things stand; one identity card;
// language sits with Appearance. Nothing about data or formulas changes. Synthetic data only.
import { launch, openPage, wait, ok, section, finish, settle, tab, baseSeed } from "./lib.mjs";
const browser = await launch();
const ACC = `try{if(!sessionStorage.getItem("__a")){sessionStorage.setItem("__a","1");localStorage.setItem("expense_ledger_v5__accounts",JSON.stringify({version:1,accounts:[{id:"a_cash01",name:"Cash",kind:"cash",opening:{amount:120,date:""},hidden:false}],transfers:[]}));}}catch(e){}`;
const sub = (page, k) => page.evaluate((x) => (document.querySelector(`[data-fold-sub="${x}"]`) || {}).textContent || null, k);
section("R31-S1. Summaries on closed rows (en)");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", profileName: "Javid" }), pre: new Function(ACC) }); await settle(page); await tab(page, "More"); await wait(400);
  ok(/120/.test(await sub(page, "accounts")) && /Total/.test(await sub(page, "accounts")), "Accounts row: total of the accounts (120)", await sub(page, "accounts"));
  ok(await page.evaluate(() => !document.querySelector('[data-more="categories"]') && !/Now in Budgets/.test(document.body.innerText)), "no 'categories moved' reminder row any more (Run 40, owner's request)");
  ok(/Safe to Spend on/.test(await sub(page, "money")), "Currency row: currency and Safe to Spend on", await sub(page, "money"));
  ok(/Ivory/.test(await sub(page, "look")), "Appearance row: the current theme (Ivory, the Run 84 default)", await sub(page, "look"));
  ok((await sub(page, "reminders")) === null, "no Reminders row on the website");
  await page.click('[data-fold-head="accounts"]'); await wait(300);
  ok((await sub(page, "accounts")) === null, "an open row drops its summary (its content says it)");
  await page.click('[data-fold-head="accounts"]'); await wait(300);
  ok(/120/.test(await sub(page, "accounts")), "closing brings it back");
  await page.close();
}
section("R31-S2. Identity card and order");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }), pre: new Function(ACC) }); await settle(page); await tab(page, "More"); await wait(400);
  ok(await page.evaluate(() => !!document.querySelector('[data-section="st-profile"] input#profile-name') && !!document.querySelector('[data-section="st-profile"] [data-section="st-local"]') && !document.querySelector(".more-id")), "one identity card holds the name box and the 'stored on this device' line");
  const order = await page.evaluate(() => { const y = (s) => { const e = document.querySelector(s); return e ? e.getBoundingClientRect().top + scrollY : -1; }; return { money: y('[data-fold="accounts"]'), rec: y('[data-more="recurring"]'), lang: y('[data-section="st-language"]'), look: y('[data-fold="look"]'), data: y('[data-more="io"]') }; });
  ok(order.money < order.rec && order.rec < order.lang && order.lang < order.look && order.look < order.data, "order: money rows, then language and appearance, then data and safety", order);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R31-S3. az and ru");
for (const [l, re] of [["az", /Cəmi/], ["ru", /Всего/]]) {
  const page = await openPage(browser, { seed: baseSeed({ language: l }), pre: new Function(ACC) }); await settle(page); await tab(page, "More"); await wait(400);
  ok(re.test(await sub(page, "accounts")) && !/\{|st\.sum/.test(await page.evaluate(() => document.querySelector(".more-page").innerText)), `${l}: summaries translated, no raw keys`, await sub(page, "accounts"));
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${l}: no horizontal scroll`);
  await page.close();
}
await finish("e2e_run31_settings", browser);
