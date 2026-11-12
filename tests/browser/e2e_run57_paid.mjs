// Run 57 (owner, 10 Nov screenshots: "Bank card" + "ABB Card" gave 0 of 257, "Cash" + "Nağd" gave 0): one "paid from" filter on the entry list,
// and Analytics grouped the same way. Older entries marked Cash / Bank card and newer entries on Nağd / ABB Card belong together. Synthetic data only.
import { launch, openPage, wait, ok, section, finish, settle, tab, baseSeed, TODAY } from "./lib.mjs";
const browser = await launch();
const T = (id, o) => ({ id, type: "expense", amount: 10, category: "food", subcategory: "", merchant: "", note: "", date: TODAY, recurring: false, recurFreq: null, isActive: true, createdAt: TODAY + "T00:00:00.000Z", ...o });
const ACC = `try{if(!sessionStorage.getItem("__a")){sessionStorage.setItem("__a","1");localStorage.setItem("expense_ledger_v5__accounts",JSON.stringify({version:1,accounts:[{id:"a_nagd01",name:"Nağd",kind:"cash",opening:{amount:0,date:""},hidden:false},{id:"a_abbc01",name:"ABB Card",kind:"card",opening:{amount:0,date:""},hidden:false}],transfers:[]}));}}catch(e){}`;
// 2 old Cash (3 + 4), 1 on Nağd (5), 2 old Bank card (6 + 7), 1 on ABB Card (8), 1 with nothing (9)
const seed = (language) => baseSeed({ language, transactions: [T(1790057000001, { merchant: "OldCash1", amount: 3, wallet: "cash" }), T(1790057000002, { merchant: "OldCash2", amount: 4, wallet: "cash" }), T(1790057000003, { merchant: "OnNagd", amount: 5, account: "a_nagd01" }),
  T(1790057000004, { merchant: "OldCard1", amount: 6, wallet: "card" }), T(1790057000005, { merchant: "OldCard2", amount: 7, wallet: "card" }), T(1790057000006, { merchant: "OnABB", amount: 8, account: "a_abbc01" }), T(1790057000007, { merchant: "Nothing", amount: 9 })] });
const rows = (page) => page.evaluate(() => [...document.querySelectorAll(".txn-row")].map((r) => (r.innerText.match(/Old\w+|On\w+|Nothing/) || [""])[0]).sort());
const chips = (page) => page.evaluate(() => [...document.querySelectorAll('[data-section="tx-paid-filter"] .chip')].map((b) => b.innerText.trim()));
const pick = (page, label) => page.evaluate((l) => [...document.querySelectorAll('[data-section="tx-paid-filter"] .chip')].find((b) => b.innerText.trim() === l).click(), label);

section("R57-B1. One row; the owner's case");
{
  const page = await openPage(browser, { seed: seed("en"), pre: new Function(ACC) }); await tab(page, "Ledger"); await settle(page);
  ok(!(await page.$('[data-section="tx-wallet-filter"]')) && !(await page.$('[data-section="tx-acc-filter"]')), "the separate wallet and account rows are gone");
  await page.evaluate(() => document.querySelector('[data-section="tx-more-toggle"]').click()); await wait(300);
  ok((await chips(page)).join("|") === "Any way|All cash|Nağd|All cards|ABB Card|Not set", "one row: Any way, All cash, Nağd, All cards, ABB Card, Not set", await chips(page));
  await pick(page, "All cash"); await wait(250);
  ok(JSON.stringify(await rows(page)) === JSON.stringify(["OldCash1", "OldCash2", "OnNagd"]), "All cash: the 2 older Cash entries AND the 1 on Nağd (this was 0 before)", await rows(page));
  await pick(page, "Nağd"); await wait(250);
  ok(JSON.stringify(await rows(page)) === JSON.stringify(["OnNagd"]), "Nağd: only the entry linked to it", await rows(page));
  await pick(page, "All cards"); await wait(250);
  ok(JSON.stringify(await rows(page)) === JSON.stringify(["OldCard1", "OldCard2", "OnABB"]), "All cards: the 2 older Bank card entries AND the 1 on ABB Card", await rows(page));
  ok(await page.evaluate(() => /·\s*1/.test(document.querySelector('[data-section="tx-more-toggle"]').innerText)), "More filters shows that 1 tucked-away filter is on");
  await pick(page, "Not set"); await wait(250);
  ok(JSON.stringify(await rows(page)) === JSON.stringify(["Nothing"]), "Not set: only the entry with neither", await rows(page));
  // every entry is in exactly one of the kind chips or Not set
  let total = 0; for (const l of ["All cash", "All cards", "Not set"]) { await pick(page, l); await wait(200); total += (await rows(page)).length; }
  ok(total === 7, "All cash + All cards + Not set = all 7 entries, none twice, none missing", total);
  await page.evaluate(() => document.querySelector('[data-section="tx-clear"]').click()); await wait(250);
  ok((await rows(page)).length === 7, "Clear shows all 7 again");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R57-B2. Analytics groups spending the same way");
{
  const page = await openPage(browser, { seed: seed("en"), pre: new Function(ACC) }); await settle(page);
  await page.evaluate(() => document.querySelectorAll(".tab-btn")[2].click()); await wait(700);
  await page.evaluate(() => document.querySelectorAll(".an-panel[hidden]").forEach((p) => p.removeAttribute("hidden"))); await wait(200);
  const card = await page.evaluate(() => { const e = document.querySelector('[data-section="an-wallet"]'); return e ? e.innerText.replace(/\s+/g, " ") : ""; });
  ok(/Spending by how you paid/.test(card) && /Cards 21\.00/.test(card) && /Cash 12\.00/.test(card) && /Not set 9\.00/.test(card), "Cards 21.00 (6 + 7 + 8), Cash 12.00 (3 + 4 + 5), Not set 9.00", card);
  await page.close();
}

section("R57-B3. Azerbaijani and Russian");
for (const [l, re] of [["az", /Bütün nağd\|Nağd\|Bütün kartlar\|ABB Card/], ["ru", /Все наличные\|Nağd\|Все карты\|ABB Card/]]) {
  const page = await openPage(browser, { seed: seed(l), chooseLang: l, pre: new Function(ACC), width: 320, height: 640 }); await tab(page, "Ledger"); await settle(page);
  await page.evaluate(() => document.querySelector('[data-section="tx-more-toggle"]').click()); await wait(300);
  const c = (await chips(page)).join("|");
  ok(re.test(c), `${l}: the kind chips are translated`, c);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${l}: the row does not push the page sideways at 320 px`);
  await page.close();
}
await finish("e2e_run57_paid", browser);
