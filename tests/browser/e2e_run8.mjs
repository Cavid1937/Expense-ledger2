// Run 8 (2026-10-27) in the real bundled app: item 6 (a second undo message never takes away the open undo), item 3 (a
// file with refused rows does not offer Replace), item 2 (an unknown category goes to Other, no guessing).
import { launch, openPage, state, clickText, openSettings, openData, tab, wait, ok, section, finish, tx, baseSeed, bodyText, fs, path } from "./lib.mjs";
const browser = await launch();
const IMP = process.env.E2E_IMP_DIR || path.join(process.env.TEMP || "/tmp", "ledger-imp"); fs.mkdirSync(IMP, { recursive: true });
const write = (name, content) => { const p = path.join(IMP, name); fs.writeFileSync(p, content); return p; };
const sheetText = (page) => page.evaluate(() => (document.querySelector('[aria-label="Restore backup"]') || {}).innerText || "");
const upload = async (page, file) => { await openData(page); const input = await page.$(".io-page input[type=file]"); await input.uploadFile(file);
  await page.waitForFunction((n) => { const s = document.querySelector('[aria-label="Restore backup"]'); return !!s && s.innerText.includes(n); }, { timeout: 5000, polling: 50 }, path.basename(file)); await wait(100); };
const snack = (page) => page.evaluate(() => (document.querySelector(".snackbar") || {}).innerText || "");
const A = tx({ merchant: "AAA", amount: 11 }), B = tx({ merchant: "BBB", amount: 22 });

section("R8-B1. Item 6: an import during a delete's undo window does not take the delete's Undo away");
let page = await openPage(browser, { seed: baseSeed({ transactions: [A, B], currency: "₼" }) });
await tab(page, "Ledger");
await page.evaluate(() => [...document.querySelectorAll(".txn-row")].find((r) => r.innerText.includes("AAA")).click()); await page.waitForSelector(".sheet"); await wait(300);
await clickText(page, ".sheet .btn", /^Delete/); await wait(250);
ok(/Transaction deleted/.test(await snack(page)), "delete shows 'Transaction deleted · Undo'");
await upload(page, write("settings8.json", JSON.stringify({ currency: "$" })));
await page.evaluate(() => document.querySelector(".import-settings-only").click()); await wait(300);
ok(/Transaction deleted/.test(await snack(page)) && (await state(page)).currency === "$", "the import is applied, but the delete's Undo is still the one on screen (was: replaced by the import's message)", await snack(page));
await clickText(page, ".snackbar-undo", /Undo/); await wait(400);
let st = await state(page);
ok(st.transactions.some((t) => t.id === A.id) && st.currency === "$", "Undo brings AAA back and leaves the imported currency in place", { ids: st.transactions.map((t) => t.merchant), cur: st.currency });
await page.waitForFunction(() => /Settings from the file applied/.test((document.querySelector(".snackbar") || {}).innerText || ""), { timeout: 3000 }).catch(() => {});
ok(/Settings from the file applied/.test(await snack(page)), "then the import's own message (with its Undo) is shown", await snack(page));
ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
await page.close();

section("R8-B2. Item 3: a file with refused rows does not offer Replace");
page = await openPage(browser, { seed: baseSeed({ transactions: [A, B, tx({ merchant: "CCC", amount: 33 })] }) });
await upload(page, write("mixed8.json", JSON.stringify({ version: 9, transactions: [tx({ merchant: "New1", amount: 5 }), tx({ merchant: "New2", amount: 6 }), { amount: 7, date: "2026-10-01Tgarbage", category: "food" }] })));
const sh = await sheetText(page);
ok(/Replace is not offered/.test(sh) && /1 row in this file could not be read/.test(sh) && !/Replace — use the file's data/.test(sh) && /Merge/.test(sh), "the sheet says Replace is not offered because 1 row could not be read; Merge is still there", sh);
await clickText(page, '[aria-label="Restore backup"] .btn', /^Merge/); await wait(300);
st = await state(page);
ok(st.transactions.length === 5 && st.transactions.some((t) => t.merchant === "New1") && st.transactions.some((t) => t.merchant === "CCC"), "Merge adds the 2 readable rows and keeps all 3 existing ones", st.transactions.map((t) => t.merchant));
await page.close();

section("R8-B3. Item 2: an unknown category goes to Other and the import says so");
page = await openPage(browser, { seed: baseSeed({ transactions: [A] }) });
await upload(page, write("cats8.csv", "Date,Amount,Category,Merchant\r\n2026-10-01,7,Payment,Shop1\r\n2026-10-01,8,Groceries,Shop2\r\n"));
const sh3 = await sheetText(page);
ok(/1 transaction has a category the app does not recognise and was filed under Other/.test(sh3), "the sheet warns: 1 category not recognised → Other", sh3);
await clickText(page, '[aria-label="Restore backup"] .btn', /^Merge/); await wait(300);
st = await state(page);
ok(st.transactions.find((t) => t.merchant === "Shop1")?.category === "other" && st.transactions.find((t) => t.merchant === "Shop2")?.category === "food", "'Payment' → Other (was: Salary, guessed from 'pay'); 'Groceries' → Food", st.transactions.map((t) => [t.merchant, t.category]));
await page.close();
await finish("e2e_run8", browser);
