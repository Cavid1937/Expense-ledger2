// Run 99: where balances are shown, Home says how much spending is in none of them and lets the person put each entry on the right
// account. Nothing is decided for them, and the change can be undone. Synthetic data only.
import { launch, openPage, settle, ok, section, finish, baseSeed, tx, daysAgo, wait, state } from "./lib.mjs";
const browser = await launch();
const accs = (openDate) => new Function(`try{if(!sessionStorage.getItem("__a")){sessionStorage.setItem("__a","1");localStorage.setItem("expense_ledger_v5__accounts",JSON.stringify({version:1,accounts:[{id:"a_card01",name:"My card",kind:"card",opening:{amount:200,date:"${openDate}"},hidden:false},{id:"a_cash01",name:"Pocket",kind:"cash",opening:{amount:50,date:"${openDate}"},hidden:false}],transfers:[]}));}}catch(e){}`);
const seed = (language) => baseSeed({ language, transactions: [
  tx({ type: "income", category: "salary", amount: 2000, merchant: "Employer", date: daysAgo(3), account: "a_card01" }),
  tx({ amount: 12.5, merchant: "Bakery", date: daysAgo(1) }),
  tx({ amount: 7.5, merchant: "Taxi", category: "transport", date: daysAgo(2) }),
  tx({ amount: 20, merchant: "On the card", date: daysAgo(1), account: "a_card01" }),
  tx({ amount: 99, merchant: "Before the balance was typed", date: daysAgo(30) }),
] });
const look = (page) => page.evaluate(() => { const q = (s) => { const e = document.querySelector(s); return e ? e.textContent : null; };
  return { note: q('[data-section="home-loose"]'), sheet: q('[data-section="loose-sheet"]'), rows: document.querySelectorAll("[data-loose-row]").length, card: q('[data-acc-card="a_card01"] .acc-bal'), cash: q('[data-acc-card="a_cash01"] .acc-bal'), snack: (document.querySelector(".snackbar") || {}).innerText || "" }; });
const click = async (page, sel) => { await page.evaluate((s) => document.querySelector(s).click(), sel); await wait(350); };
section("R99-B1. The Accounts card says what is in no balance");
{
  const page = await openPage(browser, { seed: seed("en"), pre: accs(daysAgo(10)) }); await settle(page);
  let r = await look(page);
  // card: 200 + 2000 - 20 = 2,180.00; pocket: 50.00; with no account: 12.50 + 7.50 = 20.00 in 2 entries (the 99 is before the opening date)
  ok(/2,180\.00/.test(r.card || "") && /50\.00/.test(r.cash || ""), "balances: card 2,180.00, pocket 50.00", [r.card, r.cash]);
  ok(r.note !== null && /2 entries/.test(r.note) && /20\.00/.test(r.note) && /none of these balances/.test(r.note) && !/\{[a-z]+\}/.test(r.note), "the note: 2 entries, 20.00, in none of these balances", r.note);
  section("R99-B2. Choose accounts: one entry, then undo, then all");
  await click(page, '[data-section="home-loose-fix"]'); r = await look(page);
  ok(r.sheet !== null && r.rows === 2 && /Bakery/.test(r.sheet) && /Taxi/.test(r.sheet) && !/Before the balance/.test(r.sheet) && !/On the card/.test(r.sheet), "the sheet lists exactly the 2 entries", r.sheet);
  // found by a screenshot: inside the Accounts card the sheet was drawn BEHIND the cards that follow. It must be the thing on top.
  ok(await page.evaluate(() => { const s = document.querySelector('[data-section="loose-sheet"]'), t = s.querySelector(".sheet-title").getBoundingClientRect(), b = s.querySelector("[data-loose-pick]").getBoundingClientRect(); const at = (r) => document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return s.contains(at(t)) && s.contains(at(b)); }), "the sheet is on top of the page: its title and its first account button are what a finger would touch");
  const before = await state(page);
  await page.evaluate(() => { const row = [...document.querySelectorAll("[data-loose-row]")].find((e) => /Bakery/.test(e.textContent)); row.querySelector('[data-loose-pick="a_cash01"]').click(); }); await wait(400); r = await look(page);
  let st = await state(page); const bakery = (s) => s.transactions.find((x) => x.merchant === "Bakery"), taxi = (s) => s.transactions.find((x) => x.merchant === "Taxi");
  // pocket 50 - 12.50 = 37.50
  ok(bakery(st).account === "a_cash01" && !taxi(st).account && /37\.50/.test(r.cash || "") && /2,180\.00/.test(r.card || "") && r.rows === 1, "Bakery is on Pocket: pocket 37.50, card unchanged, one row left", [r.cash, r.card, r.rows]);
  ok(bakery(st).amount === 12.5 && bakery(st).date === bakery(before).date && bakery(st).id === bakery(before).id && st.transactions.length === before.transactions.length, "only the account changed: amount, date, id and the number of entries are the same");
  ok(/1 entry put on/.test(r.snack) && /Pocket/.test(r.snack), "a bar says what was done and offers Undo", r.snack);
  await page.evaluate(() => { const b = [...document.querySelectorAll(".snackbar button")].find((e) => /Undo/i.test(e.textContent)); b && b.click(); }); await wait(400); r = await look(page); st = await state(page);
  ok(!bakery(st).account && /50\.00/.test(r.cash || "") && r.rows === 2, "Undo: Bakery has no account again, pocket back to 50.00, two rows", [r.cash, r.rows]);
  await click(page, '[data-loose-all="a_card01"]'); r = await look(page); st = await state(page);
  // card 2,180 - 12.50 - 7.50 = 2,160.00
  ok(bakery(st).account === "a_card01" && taxi(st).account === "a_card01" && /2,160\.00/.test(r.card || "") && r.rows === 0 && /Every entry now has an account/.test(r.sheet || ""), "all on the card: card 2,160.00; the sheet says nothing is left", [r.card, r.sheet]);
  ok(st.transactions.find((x) => x.merchant === "Before the balance was typed").account === undefined, "the entry from before the opening date was not touched");
  await click(page, '[data-section="loose-sheet"] [data-closer="1"]'); r = await look(page);
  ok(r.sheet === null && r.note === null, "closed; the note is gone from the Accounts card");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R99-B3. Nothing to say: no note");
{
  const page = await openPage(browser, { seed: seed("en"), pre: accs("") }); await settle(page);
  ok((await look(page)).note === null, "no opening date on the accounts: the app cannot know, so no note");
  await page.close();
}
for (const [l, re] of [["az", /hesabı yoxdur/], ["ru", /без счёта/]]) {
  const page = await openPage(browser, { seed: seed(l), pre: accs(daysAgo(10)) }); await settle(page);
  const r = await look(page);
  ok(r.note !== null && re.test(r.note) && /20[.,]00/.test(r.note) && !/\{[a-z]+\}/.test(r.note), `${l}: translated, same amount`, r.note);
  await click(page, '[data-section="home-loose-fix"]');
  const s = await look(page);
  ok(s.rows === 2 && !/\{[a-z]+\}/.test(s.sheet || "") && !/Entries with no account/.test(s.sheet || ""), `${l}: the sheet is translated`, (s.sheet || "").slice(0, 200));
  await page.close();
}
await finish("e2e_run99_loose", browser);
