// Run 64 in the real bundled app (owner batch E11): "Download for Excel (.xlsx)" on Import / Export gives one workbook with a Read me sheet
// and one sheet per kind of thing; the file is read back with the app's own reader. Synthetic data only.
import { launch, openPage, openData, ok, section, finish, baseSeed, tx, wait, fs, path, TODAY } from "./lib.mjs";
import { zipEntries, sheetGrid } from "../../statement.js";
const DL = process.env.E2E_DL_DIR || path.join(process.env.TEMP || ".", "ledger-e2e-dl"); fs.mkdirSync(DL, { recursive: true });
const browser = await launch();
const dlClient = await browser.target().createCDPSession(); await dlClient.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: DL });

section("R64-B1. One Excel file with everything, readable");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ merchant: "Bravo", amount: 12.5, date: TODAY }), tx({ type: "income", category: "salary", amount: 1000, merchant: "Employer", date: TODAY })] }) });
  await openData(page);
  ok(!!(await page.$('[data-section="io-xlsx"]')) && /Download for Excel/.test(await page.evaluate(() => document.querySelector('[data-section="io-xlsx"]').innerText)), "Import / Export offers 'Download for Excel (.xlsx)' and says what it is for");
  for (const f of fs.readdirSync(DL)) if (/^ledger-.*\.xlsx$/.test(f)) fs.unlinkSync(path.join(DL, f));
  await page.evaluate(() => document.querySelector('[data-section="io-xlsx-go"]').click());
  let file = null; for (let i = 0; i < 40 && !file; i++) { await wait(150); file = fs.readdirSync(DL).find((f) => /^ledger-.*\.xlsx$/.test(f)); }
  ok(!!file, "the workbook is downloaded", fs.readdirSync(DL));
  const buf = file ? fs.readFileSync(path.join(DL, file)) : Buffer.alloc(0);
  const z = file ? await zipEntries(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), () => true) : {};
  const names = [...String(z["xl/workbook.xml"] || "").matchAll(/<sheet name="([^"]+)"/g)].map((m) => m[1]);
  ok(names.join("|") === "Read me|Entries|Accounts|Transfers|Budgets|Goals|Goal history|Debts and loans|Repeating bills", "nine sheets, Read me first", names);
  const entries = sheetGrid(z["xl/worksheets/sheet2.xml"] || "", "");
  ok(entries.length === 3 && entries.some((r) => r[4] === "Bravo" && r[5] === "12.5") && entries.some((r) => r[4] === "Employer" && r[1] === "Income"), "Entries holds both entries with their amounts as numbers", entries);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
await browser.close();
finish("e2e_run64_xlsx");
