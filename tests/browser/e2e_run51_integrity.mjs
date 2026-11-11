// Run 51 (owner reports, 10 Nov): a merge double counted; an account could vanish without a question and without Undo.
// The real screens: Accounts (remove with confirmation, move entries, Undo; transfer Undo) and the import sheet (what a merge will do).
// Synthetic data only.
import { launch, openPage, openSettings, openData, clickText, wait, ok, section, finish, baseSeed, tx, settle, state, fs, path, TODAY } from "./lib.mjs";
const IMP = process.env.E2E_IMP_DIR || "/tmp/tools/imp"; fs.mkdirSync(IMP, { recursive: true });
const browser = await launch();
const AK = "expense_ledger_v5__accounts";
const store = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "null"), AK);
const accSeed = (data) => `(() => { try { if (!sessionStorage.getItem("__a")) { sessionStorage.setItem("__a", "1"); localStorage.setItem("${AK}", ${JSON.stringify(JSON.stringify({ version: 1, ...data }))}); } } catch {} })`;
const A = (id, name, kind, amount) => ({ id, name, kind, opening: { amount, date: "" }, hidden: false });
const rowBtn = (page, id, i) => page.evaluate((id, i) => document.querySelectorAll(`[data-account="${id}"] > div:nth-child(2) button`)[i].click(), id, i);
const panel = (page) => page.evaluate(() => (document.querySelector('[data-section="acc-remove-confirm"]') || {}).innerText || "");
const snack = (page) => page.evaluate(() => (document.querySelector(".snackbar") || {}).innerText || "");
const undo = (page) => page.evaluate(() => { const b = document.querySelector(".snackbar-undo"); if (b) b.click(); return !!b; });
const balances = (page) => page.evaluate(() => Object.fromEntries([...document.querySelectorAll("[data-balance]")].map((e) => [e.getAttribute("data-balance"), e.innerText.replace(/[^\d.,-]/g, "")])));

section("R51-B1. Removing a used account asks first, keeps the entries, and can be undone");
{
  const data = { accounts: [A("a_card01", "My card", "card", 100), A("a_cash01", "Cash", "cash", 50), A("a_spare1", "Spare", "other", 0)], transfers: [{ id: "t_one111", from: "a_card01", to: "a_cash01", amount: 30, date: TODAY, note: "" }] };
  const seed = baseSeed({ language: "en", transactions: [tx({ merchant: "A", amount: 12, account: "a_card01" }), tx({ merchant: "B", amount: 8, account: "a_card01" }), tx({ merchant: "C", amount: 5, account: "a_cash01" }), tx({ merchant: "D", amount: 6 })] });
  const page = await openPage(browser, { seed, pre: eval(accSeed(data)) }); await settle(page); await openSettings(page);
  const before = { st: await state(page), acc: await store(page), bal: await balances(page) };
  ok(before.bal.a_card01 === "50.00" && before.bal.a_cash01 === "75.00", "start: card 100 - 30 - 12 - 8 = 50.00, cash 50 + 30 - 5 = 75.00", before.bal);
  await rowBtn(page, "a_card01", 1); await wait(300);
  let pt = await panel(page);
  ok((await store(page)).accounts.length === 3 && /Remove “My card”\?/.test(pt), "tapping Remove removes nothing; it asks 'Remove “My card”?'", pt);
  ok(/2 entries use this account/.test(pt) && /1 transfer to or from this account will be deleted/.test(pt) && /50\.00/.test(pt) && /undo/i.test(pt), "it says: 2 entries, 1 transfer, balance 50.00, and that it can be undone", pt);
  await clickText(page, '[data-section="acc-remove-confirm"] .btn', /^Cancel/); await wait(250);
  ok((await panel(page)) === "" && (await store(page)).accounts.length === 3, "Cancel closes the question and nothing changed");
  await rowBtn(page, "a_card01", 1); await wait(300);
  await page.select('[data-rm="move-to"]', "a_cash01"); await wait(150);
  await page.evaluate(() => document.querySelector('[data-rm="go"]').click()); await wait(450);
  let st = await state(page), acc = await store(page), bal = await balances(page);
  ok(acc.accounts.length === 2 && !acc.accounts.some((a) => a.id === "a_card01") && acc.transfers.length === 0, "confirmed: the account and its transfer are gone");
  ok(st.transactions.length === before.st.transactions.length && st.transactions.filter((x) => x.account === "a_cash01").length === 3 && !st.transactions.some((x) => x.account === "a_card01"), "all entries are still there; the card's 2 entries now sit on Cash", st.transactions.map((x) => x.account || ""));
  ok(bal.a_cash01 === "25.00", "Cash shows 50 - 5 - 12 - 8 = 25.00", bal);
  ok(/Account removed/.test(await snack(page)) && /Undo/.test(await snack(page)), "an Undo bar is shown", await snack(page));
  ok(await undo(page), "Undo is tapped"); await wait(450);
  st = await state(page); acc = await store(page); bal = await balances(page);
  ok(JSON.stringify(acc.accounts) === JSON.stringify(before.acc.accounts) && JSON.stringify(acc.transfers) === JSON.stringify(before.acc.transfers), "after Undo the accounts and the transfer are exactly as before");
  ok(JSON.stringify(st.transactions) === JSON.stringify(before.st.transactions), "after Undo every entry is exactly as before");
  ok(bal.a_card01 === "50.00" && bal.a_cash01 === "75.00", "after Undo the balances are back: 50.00 and 75.00", bal);
  await page.reload(); await settle(page); await openSettings(page);
  ok((await store(page)).accounts.length === 3 && (await state(page)).transactions.filter((x) => x.account === "a_card01").length === 2, "and it is still so after closing and opening the app");
  // 'No account' is the default choice
  await rowBtn(page, "a_card01", 1); await wait(300);
  await page.evaluate(() => document.querySelector('[data-rm="go"]').click()); await wait(450);
  st = await state(page);
  ok(st.transactions.length === 4 && st.transactions.filter((x) => "account" in x).length === 1 && (await store(page)).accounts.length === 2, "default choice 'No account': the 2 entries stay, without an account");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R51-B2. An unused account also asks; a removed transfer can be undone");
{
  const data = { accounts: [A("a_card01", "My card", "card", 100), A("a_cash01", "Cash", "cash", 50), A("a_spare1", "Spare", "other", 0)], transfers: [{ id: "t_one111", from: "a_card01", to: "a_cash01", amount: 30, date: TODAY, note: "" }] };
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }), pre: eval(accSeed(data)) }); await settle(page); await openSettings(page);
  await rowBtn(page, "a_spare1", 1); await wait(300);
  const pt = await panel(page);
  ok((await store(page)).accounts.length === 3 && /Nothing uses this account/.test(pt) && !/entries use/.test(pt), "Spare: the question says nothing uses it, and nothing is removed yet", pt);
  await page.evaluate(() => document.querySelector('[data-rm="go"]').click()); await wait(450);
  ok((await store(page)).accounts.length === 2 && /Undo/.test(await snack(page)), "confirmed: removed, with an Undo bar");
  await undo(page); await wait(400);
  const acc = await store(page);
  ok(acc.accounts.length === 3 && acc.accounts[2].id === "a_spare1", "Undo: Spare is back in its place");
  await page.evaluate(() => document.querySelector("[data-transfer] button").click()); await wait(400);
  ok((await store(page)).transfers.length === 0 && /Transfer removed/.test(await snack(page)) && /Undo/.test(await snack(page)), "removing a transfer shows an Undo bar");
  await undo(page); await wait(400);
  const back = await store(page), bal = await balances(page);
  ok(back.transfers.length === 1 && back.transfers[0].id === "t_one111" && bal.a_card01 === "70.00" && bal.a_cash01 === "80.00", "Undo: the transfer is back; balances 70.00 and 80.00", bal);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R51-B3. The import sheet says what a merge will do, and a merge does not count twice");
{
  const data = { accounts: [A("a_bbbbbb", "ABB Card", "card", 100)], transfers: [] };
  const mine = [tx({ id: 101, note: "Metro", amount: 0.6 }), tx({ id: 102, merchant: "Bravo", amount: 12.5 }), tx({ id: 103, merchant: "Cafe", amount: 8 })];
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: mine }), pre: eval(accSeed(data)) }); await settle(page); await openData(page);
  const before = await state(page);
  // The phone's file: the same three payments typed separately (other ids; two with other words), one new payment, the same account under another id.
  const theirs = [tx({ id: 901, note: "8 Noyabr Metro", amount: 0.6, category: "transport", account: "a_pppppp" }), tx({ id: 902, merchant: "Bravo", subcategory: "Groceries", amount: 12.5, account: "a_pppppp" }), tx({ id: 903, merchant: "Cafe", amount: 8 }), tx({ id: 904, merchant: "Pharmacy", amount: 7, account: "a_pppppp" })];
  const file = path.join(IMP, "phone-r51.json");
  fs.writeFileSync(file, JSON.stringify({ version: 10, transactions: theirs, accounts: [A("a_pppppp", "abb card", "card", 250)], transfers: [] }));
  const input = await page.$(".io-page input[type=file]"); await input.uploadFile(file);
  await page.waitForFunction(() => { const s = document.querySelector('[data-section="import-merge-plan"]'); return !!s; }, { timeout: 5000 }).catch(() => {}); await wait(150);
  const sh = await page.evaluate(() => (document.querySelector('[data-section="import-merge-plan"]') || {}).innerText || "");
  ok(/New, will be added: 1/.test(sh) && /Skip 1 that are exactly the same/.test(sh) && /Skip 2 that look like entries you already have/.test(sh), "the sheet says: 1 new, 1 exactly the same, 2 look the same", sh);
  ok(/here “Metro, [^”]+”, in the file “8 Noyabr Metro, [^”]+”/.test(sh) && /here “Bravo, [^”]+”, in the file “Bravo, Groceries, [^”]+”/.test(sh) && /Accounts in the file with the same name as yours: 1/.test(sh), "it shows an example pair and says one account is the same as yours", sh);
  ok(await page.evaluate(() => document.querySelector('[data-merge="skip-identical"]').checked && document.querySelector('[data-merge="skip-similar"]').checked), "both 'skip' boxes are ticked to begin with");
  await clickText(page, '[aria-label="Restore backup"] .btn', /^Merge/); await wait(450);
  let st = await state(page), acc = await store(page);
  const spent = (l) => l.filter((x) => x.type === "expense").reduce((s, x) => s + Math.round(x.amount * 100), 0);
  ok(st.transactions.length === 4 && spent(st.transactions) === spent(before.transactions) + 700, "after the merge: 4 entries, spending grew by exactly 7.00 (not by 28.10)", [st.transactions.length, spent(st.transactions)]);
  ok(acc.accounts.length === 1 && acc.accounts[0].id === "a_bbbbbb" && acc.accounts[0].opening.amount === 100 && st.transactions.find((x) => x.id === 904).account === "a_bbbbbb", "still one ABB Card (opening 100, not 350), and the new payment sits on it");
  ok(/Undo/.test(await snack(page)), "the merge can be undone"); await undo(page); await wait(450);
  st = await state(page);
  ok(JSON.stringify(st.transactions) === JSON.stringify(before.transactions) && (await store(page)).accounts.length === 1, "Undo: the entries are exactly as before the merge");
  // The person may choose to keep the look-alikes as separate entries.
  await openData(page); const input2 = await page.$(".io-page input[type=file]"); await input2.uploadFile(file);
  await page.waitForFunction(() => !!document.querySelector('[data-merge="skip-similar"]'), { timeout: 5000 }).catch(() => {}); await wait(150);
  await page.evaluate(() => document.querySelector('[data-merge="skip-similar"]').click()); await wait(150);
  await clickText(page, '[aria-label="Restore backup"] .btn', /^Merge/); await wait(450);
  st = await state(page);
  ok(st.transactions.length === 6 && !st.transactions.some((x) => x.id === 903), "box unticked: the 2 look-alikes are added too (6 entries); the identical one still is not");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
await finish("e2e_run51_integrity", browser);
