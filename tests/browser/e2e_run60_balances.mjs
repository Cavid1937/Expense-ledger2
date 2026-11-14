// Run 60 in the real bundled app: the import sheet shows each account's balance now and after adding, before anything is saved, and
// clearing a budget offers Undo. Synthetic data only.
import { launch, openPage, openData, openGoals, settle, state, ok, section, finish, baseSeed, tx, wait, fs, path } from "./lib.mjs";
const IMP = process.env.E2E_IMP_DIR || "/tmp/tools/imp"; fs.mkdirSync(IMP, { recursive: true });
const browser = await launch();
const AK = "expense_ledger_v5__accounts";
const withAcc = `(() => { try { if (!sessionStorage.getItem("__a")) { sessionStorage.setItem("__a", "1"); localStorage.setItem("${AK}", ${JSON.stringify(JSON.stringify({ version: 1, accounts: [{ id: "a_card01", name: "ABB Card", kind: "card", opening: { amount: 100, date: "" }, hidden: false }], transfers: [] }))}); } } catch {} })()`;

section("R60-B1. A pasted bank statement put on an account: balance now and after, before adding");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ merchant: "Old", amount: 30, account: "a_card01", date: "2026-10-01" })] }), pre: withAcc });
  await settle(page); await openData(page);
  await page.evaluate(() => document.querySelector('[data-section="io-paste-open"]').click()); await page.waitForSelector("#st-paste");
  await page.$eval("#st-paste", (el, v) => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); },
    "Date\tDetails\tDebit\tCredit\tBalance\n04.10.2026\tPharmacy Plus\t9.00 AZN\t-\t61.00 AZN\n05.10.2026\tGift from aunt\t-\t100.00 AZN\t161.00 AZN");
  await page.evaluate(() => document.querySelector('[data-section="io-paste-go"]').click());
  await page.waitForSelector('[data-section="import-statement"]', { timeout: 10000 }); await wait(300);
  // Run 88: with no account chosen, the sheet offers a new account that starts at the bank's own opening balance (61 + 9 = 70.00)
  const nb = await page.evaluate(() => (document.querySelector('[data-section="import-balances"]') || {}).innerText || "");
  ok(!!(await page.$('[data-st="newacc"]')) && /161\.00/.test(nb), "with no account chosen, a new account is offered and its line ends at the bank's 161.00", nb);
  const st = await page.evaluate(() => ["balance", "balance-end"].map((k) => { const el = document.querySelector(`[data-st="${k}"]`); return el ? el.innerText + " | same=" + el.getAttribute("data-same") : ""; }));
  ok(/70\.00/.test(st[0]) && /161\.00/.test(st[0]) && /same=true/.test(st[1]), "the sheet says the bank's start 70.00 and end 161.00, and that the app will end at the same 161.00", st);
  await page.evaluate(() => document.querySelector('[data-st="newacc"]').click()); await wait(300);
  ok(!(await page.$('[data-section="import-balances"]')), "with that box unticked, no balance changes, so no lines");
  await page.select('[data-st="account"]', "a_card01"); await wait(300);
  const bal = await page.evaluate(() => (document.querySelector('[data-section="import-balances"]') || {}).innerText || "");
  ok(/ABB Card: 70\.00 ₼ now, 161\.00 ₼ after/.test(bal), "choosing ABB Card shows 100 - 30 = 70.00 now and 70 - 9 + 100 = 161.00 after, before anything is added", bal);
  const before = await state(page);
  ok(before.transactions.length === 1, "nothing was added by looking");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R60-B2. Clearing a budget can be undone");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", budgets: { food: 400 } }) }); await openGoals(page, "budgets");
  await page.evaluate(() => [...document.querySelectorAll(".bud-row .btn-sm")].find((b) => /Edit/.test(b.innerText)).click()); await wait(400);
  await page.evaluate(() => { const i = document.querySelector('.bud-row input.field-input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(i, ""); i.dispatchEvent(new Event("input", { bubbles: true })); }); await wait(100);
  await page.evaluate(() => [...document.querySelectorAll(".bud-row .btn-sm-primary")].find((b) => /Save/.test(b.innerText)).click()); await wait(500);
  ok(!((await state(page)).budgets.food > 0), "saving it empty removes the 400 limit");
  const bar = await page.evaluate(() => (document.querySelector(".snackbar") || {}).innerText || "");
  ok(/Food & Dining budget removed/.test(bar) && /Undo/.test(bar), "an Undo bar says what was removed", bar);
  await page.evaluate(() => document.querySelector(".snackbar-undo").click()); await wait(500);
  ok((await state(page)).budgets.food === 400, "Undo puts the 400 limit back");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
await browser.close();
finish("e2e_run60_balances");
