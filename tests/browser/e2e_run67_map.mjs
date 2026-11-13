// Run 67 in the real bundled app: bank CSV files through the statement reader, and "Match the columns" for a table the app cannot work out.
// Every file is made up. Synthetic data only.
import { launch, openPage, openData, state, ok, section, finish, baseSeed, wait, fs, path } from "./lib.mjs";
const IMP = process.env.E2E_IMP_DIR || "/tmp/tools/imp"; fs.mkdirSync(IMP, { recursive: true });
const browser = await launch();
const upload = async (page, name, text) => { const f = path.join(IMP, name); fs.writeFileSync(f, text); const input = await page.$(".io-page input[type=file]"); await input.uploadFile(f); await page.waitForSelector('[aria-label="Restore backup"]', { timeout: 10000 }); await wait(400); };
const sheet = (page) => page.evaluate(() => (document.querySelector('[aria-label="Restore backup"]') || {}).innerText || "");
const add = async (page) => { await page.evaluate(() => document.querySelector('[data-section="import-go"]').click()); await wait(700); };

section("R67-B1. A bank CSV the reader understands goes straight to the statement review, and adding it twice adds nothing new");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [] }) }); await openData(page);
  const csv = "Date,Description,Debit,Credit,Balance\r\n01.10.2026,Market,12.50,,87.50\r\n02.10.2026,Salary,,1000.00,1087.50\r\n";
  await upload(page, "bank.csv", csv);
  let sh = await sheet(page);
  ok(/Bank statement/.test(sh) && /every row adds up/.test(sh) && /2 entries ready/.test(sh), "the CSV opens the bank statement review: 2 rows, confirmed by the running balance", sh.slice(0, 300));
  await add(page);
  let st = await state(page);
  ok(st.transactions.length === 2 && st.transactions.some((x) => x.type === "income" && x.amount === 1000) && st.transactions.some((x) => x.type === "expense" && x.amount === 12.5), "added: 12.50 out and 1,000.00 in");
  await openData(page); await upload(page, "bank.csv", csv); sh = await sheet(page);
  ok(/Already here, left as they are: 2/.test(sh) && /New, will be added: 0/.test(sh), "the same file again: both rows are recognised as already here", sh.slice(-300));
  await page.close();
}

section("R67-B2. Unknown column names: match them, check, add");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [] }) }); await openData(page);
  await upload(page, "other-bank.csv", "Data;Açıqlama;Çıxış;Giriş\r\n01.10.2026;Market;12,50;\r\n02.10.2026;Maaş;;1000\r\n03.10.2026;Taksi;6,50;\r\n");
  let sh = await sheet(page);
  ok(/Match the columns/.test(sh) && /Nothing is added yet/.test(sh), "'Match the columns' opens and says nothing is added yet", sh.slice(0, 200));
  ok((await page.evaluate(() => document.querySelector('[data-map="date"]').value)) === "0" && (await page.evaluate(() => document.querySelector('[data-map="desc"]').value)) === "1", "its guess: date in A, words in B");
  await page.evaluate(() => document.querySelector('[data-map-mode="inout"]').click()); await wait(200);
  await page.select('[data-map="debit"]', "2"); await wait(150); await page.select('[data-map="credit"]', "3"); await wait(300);
  const res = await page.evaluate(() => document.querySelector('[data-section="map-result"]').innerText);
  ok(/3 rows read/.test(res) && /Market/.test(res) && /−12\.50/.test(res) && /\+1,000\.00/.test(res), "the live preview shows 3 rows: Market −12.50, Maaş +1,000.00 …", res);
  await page.evaluate(() => document.querySelector('[data-section="map-go"]').click()); await wait(500);
  sh = await sheet(page);
  ok(/Bank statement/.test(sh) && /3 entries ready/.test(sh), "Continue opens the usual statement review with the 3 rows", sh.slice(0, 200));
  ok((await state(page)).transactions.length === 0, "nothing was added before the review");
  await add(page);
  const st = await state(page);
  ok(st.transactions.length === 3 && st.transactions.filter((x) => x.type === "expense").reduce((s, x) => s + x.amount, 0) === 19 && st.transactions.find((x) => x.type === "income").amount === 1000, "added: 12.50 + 6.50 = 19.00 out, 1,000.00 in");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R67-B3. The app's own CSV export still imports the old way");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [] }) }); await openData(page);
  await upload(page, "ledger.csv", "Date,Type,Category,Subcategory,Merchant,Amount,Note\r\n2026-10-01,expense,Food & Dining,Groceries,Bravo,12.50,\r\n");
  const sh = await sheet(page);
  ok(/Restore Backup/i.test(sh) && !/Bank statement/.test(sh) && !/Match the columns/.test(sh), "an Expense Ledger CSV opens the normal import sheet, not the bank one", sh.slice(0, 200));
  await page.close();
}
await browser.close();
finish("e2e_run67_map");
