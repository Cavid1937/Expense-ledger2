// Run 32 (backlog item 3): the restore sheet shows what the file holds next to what this device holds. Display only; Merge/Replace are unchanged.
// Synthetic data only; files go to the temp folder set by tests/run-browser.mjs.
import { launch, openPage, state, openData, wait, ok, section, finish, tx, baseSeed, fs, path, settle } from "./lib.mjs";
const IMP = process.env.E2E_IMP_DIR || path.join(process.env.TEMP || ".", "ledger-e2e-imp"); fs.mkdirSync(IMP, { recursive: true });
const browser = await launch();
const upload = async (page, file) => { const input = await page.$(".io-page input[type=file]"); await input.uploadFile(file);
  await page.waitForSelector('[data-section="import-compare"]', { timeout: 5000 }).catch(() => {}); await wait(150); };
const bk = (name, txns) => { const file = path.join(IMP, name); fs.writeFileSync(file, JSON.stringify({ version: 9, exportedAt: new Date().toISOString(), transactions: txns, budgets: {}, templates: [], currency: "₼", goals: [], safeToSpend: { enabled: false, savingsTarget: 0 }, subcategories: {}, debts: [], loans: [] })); return file; };
const two = () => [tx({ id: "i1", amount: 12, merchant: "Cafe", date: "2026-09-01" }), tx({ id: "i2", amount: 8, merchant: "Bus", date: "2026-10-05" })];
const cmp = (page) => page.evaluate(() => (document.querySelector('[data-section="import-compare"]') || {}).textContent || null);
const fresh = async (lang) => { const page = await openPage(browser, { seed: baseSeed({ language: lang, transactions: [tx({ id: "old1", amount: 5, merchant: "Shop", date: "2026-10-04" })] }) }); await settle(page); return page; };

section("R32-R1. The restore sheet compares the file with this device");
{
  const page = await fresh("en"); await openData(page); await upload(page, bk("two.json", two()));
  const t = await cmp(page);
  ok(/^Entries in this file: 2 \(.+ – .+\)\. On this device now: 1\.$/.test(t || ""), "2 entries in the file with their date range, 1 on this device", t);
  ok((await state(page)).transactions.length === 1, "nothing was changed by just opening the sheet");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R32-R2. A file with no entries shows 0 and no date range");
{
  const page = await fresh("en"); await openData(page); await upload(page, bk("none.json", []));
  const t = await cmp(page);
  ok(t === "Entries in this file: 0. On this device now: 1.", "0 entries: no empty brackets", t);
  await page.close();
}
section("R32-R3. az and ru");
for (const [l, re] of [["az", /^Fayldakı əməliyyatlar: 2 \(.+\)\. Bu cihazda hazırda: 1\.$/], ["ru", /^Операций в файле: 2 \(.+\)\. Сейчас на этом устройстве: 1\.$/]]) {
  const page = await fresh(l); await openData(page); await upload(page, bk(`two-${l}.json`, two()));
  const t = await cmp(page);
  ok(re.test(t || ""), `${l}: the line is translated and filled in`, t);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${l}: no horizontal scroll`);
  await page.close();
}
await finish("e2e_run32_restore", browser);
