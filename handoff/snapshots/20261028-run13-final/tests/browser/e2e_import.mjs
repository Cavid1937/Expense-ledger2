// Import / export / recovery / undo flows in the real UI.
import { launch, openPage, state, storageKeys, toast, clickText, setInput, openSettings, openData, openAdd, tab, wait, ok, section, finish, tx, baseSeed, TODAY, bodyText, fs, path, KEY } from "./lib.mjs";
// Windows: DL / IMP come from tests/run-browser.mjs
const DL = process.env.E2E_DL_DIR || "/tmp/tools/dl", IMP = process.env.E2E_IMP_DIR || "/tmp/tools/imp"; fs.mkdirSync(DL, { recursive: true }); fs.mkdirSync(IMP, { recursive: true });
const write = (name, content) => { const p = path.join(IMP, name); fs.writeFileSync(p, content); return p; };
const browser = await launch();
const dlClient = await browser.target().createCDPSession(); await dlClient.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: DL });
const sheetText = (page) => page.evaluate(() => (document.querySelector('[aria-label="Restore backup"]') || {}).innerText || "");
// Run 8: wait until the import sheet shows THIS file's name (it is built after the FileReader finishes), instead of a
// fixed 250 ms after any import sheet appears — the I6 check failed once inside a full run.
const upload = async (page, file) => { const input = await page.$(".io-page input[type=file]"); await input.uploadFile(file);
  await page.waitForFunction((n) => { const s = document.querySelector('[aria-label="Restore backup"]'); return !!s && s.innerText.includes(n); }, { timeout: 5000, polling: 50 }, path.basename(file)).catch(() => {}); await wait(100); };
const sheetBtn = (page, re) => clickText(page, '[aria-label="Restore backup"] .btn', re);
// Run 8: a download counts as finished only when its size is stable over two polls and (for JSON) it parses completely.
const newestDownload = async (re, ms = 6000) => { const t0 = Date.now(); let last = null;
  while (Date.now() - t0 < ms) {
    const f = fs.readdirSync(DL).filter((x) => re.test(x) && !x.endsWith(".crdownload")).map((x) => ({ x, t: fs.statSync(path.join(DL, x)).mtimeMs })).sort((a, b) => b.t - a.t)[0];
    if (f) { const p = path.join(DL, f.x), size = fs.statSync(p).size;
      if (last && last.p === p && last.size === size && size > 0) { if (!/\.json$/.test(p)) return p; try { JSON.parse(fs.readFileSync(p, "utf8")); return p; } catch {} }
      last = { p, size }; }
    await wait(150); }
  return null; };
const strip = (s) => JSON.parse(JSON.stringify(s));

section("I1. CSV with BOM and bad rows");
let page = await openPage(browser); await openData(page);
const n0 = (await state(page)).transactions.length;
const csv = "\uFEFFDate,Type,Category,Subcategory,Merchant,Amount,Note,Recurring\r\n" + [
  "2026-09-01,expense,Food & Dining,Coffee,Costa,-5,neg,", "2026-09-02,expense,Food & Dining,,M,0,zero,", "2026-09-03,expense,Food & Dining,,M,,empty,", "2026-09-04,expense,Food & Dining,,M,abc,bad,",
  "2026-09-05,expense,Food & Dining,,M,12.50,good1,", "2026-09-06,expense,Food & Dining,,M,7,good2,", "2026-09-07,expense,Food & Dining,,M,1e3,sci,", ",expense,Food & Dining,,M,5,nodate,"].join("\r\n");
await upload(page, write("mixed.csv", csv));
let sh = await sheetText(page);
ok(/2 transactions ready to import/.test(sh), "sheet: '2 transactions ready to import'", sh.slice(0, 160));
ok(/6 rows skipped/.test(sh) && /1 negative amount/.test(sh) && /1 zero amount/.test(sh) && /1 missing amount/.test(sh) && /2 invalid amount/.test(sh) && /1 missing date/.test(sh), "sheet explains each skipped row by reason (−5, 0, empty, abc+1e3, no date)", sh);
ok(/Merge/.test(sh) && /Replace/.test(sh) && /currency and Safe to Spend/.test(sh), "sheet explains what Merge and Replace do");
await sheetBtn(page, /^Merge/); await wait(300);
let st = await state(page);
const added = st.transactions.slice(0, st.transactions.length).filter((t) => ["good1", "good2"].includes(t.note));
ok(st.transactions.length === n0 + 2 && eq2(added.map((t) => t.amount).sort((a, b) => a - b), [7, 12.5]), "merge adds exactly the 2 valid rows with exact amounts 12.5 and 7", added.map((t) => t.amount));
ok(!st.transactions.some((t) => ["neg", "zero", "empty", "bad", "sci", "nodate"].includes(t.note)) && added.every((t) => t.date.startsWith("2026-09-0")), "no rejected row slipped in; the −5 did not become +5; no row got today's date");
ok(/Added 2 transactions/.test(await bodyText(page)), "snackbar confirms 'Added 2 transactions'");
function eq2(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
await page.close();

section("I2. Replace keeps a recovery copy and can be undone");
page = await openPage(browser); await openData(page);
const pre = strip(await state(page));
const bk = { version: 9, exportedAt: new Date().toISOString(), meta: { app: "expense-ledger", transactionCount: 2 }, transactions: [tx({ merchant: "Z1", amount: 11 }), tx({ merchant: "Z2", amount: 22 })], budgets: { food: 55 }, currency: "€" };
await upload(page, write("replace.json", JSON.stringify(bk)));
await sheetBtn(page, /^Replace/); await wait(350);
st = await state(page);
ok(st.transactions.length === 2 && st.budgets.food === 55 && st.currency === "€" && eq2(st.goals, pre.goals) && eq2(st.templates, pre.templates), "replace: transactions, budgets and currency replaced; goals and templates (absent from the file) kept");
const copies = (await storageKeys(page)).filter((k) => k.startsWith(KEY + "__before_import_"));
ok(copies.length === 1, "a recovery copy of the previous data was stored before replacing");
const copy = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), copies[0]);
ok(eq2(copy.transactions, pre.transactions) && eq2(copy.budgets, pre.budgets) && copy.currency === pre.currency, "…and it equals the pre-import data exactly");
ok(/Replaced with 2 transactions/.test(await bodyText(page)), "snackbar offers Undo");
await clickText(page, ".snackbar-undo", /Undo/); await wait(300);
st = await state(page); ok(eq2(st.transactions, pre.transactions) && eq2(st.budgets, pre.budgets) && st.currency === pre.currency, "Undo restores the previous data exactly");
await upload(page, write("replace.json", JSON.stringify(bk))); await sheetBtn(page, /^Replace/); await wait(300);
await openSettings(page);   // redesign: the import is on Import / Export, the currency change that follows is in Settings
const curInput = () => [...document.querySelectorAll(".settings-row")].find((r) => /Currency symbol/i.test(r.textContent)).querySelector("input");
await setInput(page, curInput, "$"); await page.evaluate(() => [...document.querySelectorAll(".settings-row")].find((r) => /Currency symbol/i.test(r.textContent)).querySelector(".btn-sm-primary").click()); await wait(200);
await clickText(page, ".snackbar-undo", /Undo/); await wait(250);
st = await state(page); ok(st.transactions.length === 2 && st.currency === "$", "Undo after a later change refuses (it would erase newer work)", { n: st.transactions.length, cur: st.currency });
ok(/Can't undo/.test(await toast(page, 50)), "…and says why");
await page.close();

section("I3. Malformed settings in an otherwise valid backup");
page = await openPage(browser); await openData(page); const pre3 = strip(await state(page));
await upload(page, write("badsettings.json", JSON.stringify({ version: 9, transactions: [tx({ merchant: "Q", amount: 5 })], budgets: { food: -5 }, currency: "abcd", goals: "x", safeToSpend: { enabled: "y" }, templates: [{}] })));
sh = await sheetText(page);
ok(/budget entries were invalid/.test(sh) && /currency symbol was not valid/.test(sh) && /Goals are not a valid list/.test(sh) && /Safe to Spend settings were not valid/.test(sh) && /All 1 templates were invalid/.test(sh), "each rejected section is reported", sh.slice(0, 500));
await sheetBtn(page, /^Merge/); await wait(300); st = await state(page);
ok(st.transactions.length === pre3.transactions.length + 1 && eq2(st.budgets, pre3.budgets) && st.currency === pre3.currency && eq2(st.goals, pre3.goals) && eq2(st.safeToSpend, pre3.safeToSpend), "merge adds the valid transaction and leaves every current setting untouched");
await page.close();

section("I4. Files that must be refused");
page = await openPage(browser); await openData(page); const pre4 = strip(await state(page));
for (const [name, content, re] of [["unterminated.csv", 'Date,Amount,Merchant\r\n2026-09-01,5,"never closed\r\n2026-09-02,6,ok', /never closed/], ["nocols.csv", "When,How much\r\n2026-09-01,5", /needs a date and amount column/], ["future.json", JSON.stringify({ version: 11, transactions: [tx()] }), /newer version/], ["junk.json", "{not json", /not valid JSON or CSV/], ["allbad.csv", "Date,Amount\r\n2026-09-01,-1\r\n2026-09-02,0", /Nothing could be imported/]]) {
  await upload(page, write(name, content)); sh = await sheetText(page);
  ok(re.test(sh), `${name}: refused with a clear message`, sh.slice(0, 200));
  await sheetBtn(page, /^OK/); await wait(200);
  ok(eq2((await state(page)).transactions, pre4.transactions), `${name}: saved data unchanged`);
}
await page.close();

section("I5. Look-alike transactions (re-importing the same CSV)");
page = await openPage(browser); await openData(page); const pre5 = strip(await state(page));
const dupFile = write("dups.json", JSON.stringify({ transactions: [{ ...pre5.transactions[0], id: 777001 }, tx({ merchant: "Brand new", amount: 99 })] }));
await upload(page, dupFile); sh = await sheetText(page);
ok(/skip 1 that look like transactions you already have/.test(sh), "sheet counts the look-alike and offers to skip it (checked by default)", sh.slice(0, 400));
await sheetBtn(page, /^Merge/); await wait(300); st = await state(page);
ok(st.transactions.length === pre5.transactions.length + 1 && st.transactions.some((t) => t.merchant === "Brand new") && !st.transactions.some((t) => t.id === 777001), "merge with the box checked adds only the new one");
await page.close();

section("I6. Export files, then import them back");
page = await openPage(browser); await openData(page); const pre6 = strip(await state(page));
for (const f of fs.readdirSync(DL)) fs.unlinkSync(path.join(DL, f));
await clickText(page, ".io-page .btn", /backup file/); const jf = await newestDownload(/ledger-backup.*\.json$/);
ok(!!jf, "JSON backup file was downloaded");
const bj = JSON.parse(fs.readFileSync(jf, "utf8"));
ok(bj.version === 10 && /* Run 12: backup format 10 */ bj.meta.transactionCount === pre6.transactions.length && eq2(bj.transactions, pre6.transactions) && eq2(bj.budgets, pre6.budgets) && eq2(bj.goals, pre6.goals) && bj.currency === "₼", "…its content equals the saved state (transactions, budgets, goals, currency) and carries version and count");
const bt = await bodyText(page);
ok(/Backup file created/.test(bt) && /can't confirm it was saved/.test(bt), "message says the file was CREATED and that the app can't confirm it was saved (no 'backup saved')", bt.match(/Backup[^\n]*/)?.[0]);
ok(/Last backup file created/.test(await bodyText(page)), "Import / Export labels the date 'Last backup file created'");
await upload(page, jf); sh = await sheetText(page);
// Run 7: on failure, report what the import sheet showed (this failed once inside a full suite run and passed 5/5 alone).
ok(/skip \d+ that look like/.test(sh), "importing the same backup back → every transaction is recognised as already present", { sheet: sh.slice(0, 400), file: path.basename(jf), bytes: fs.statSync(jf).size });
await sheetBtn(page, /^Merge/); await wait(300); st = await state(page);
ok(st.transactions.length === pre6.transactions.length && eq2(st.budgets, pre6.budgets) && st.currency === pre6.currency, "merging your own backup changes nothing");
await openData(page).catch(() => {});
for (const f of fs.readdirSync(DL)) fs.unlinkSync(path.join(DL, f));
await clickText(page, ".io-page .btn-sm", /Export/); const cf = await newestDownload(/ledger-\d.*\.csv$/);
const ctext = cf ? fs.readFileSync(cf, "utf8") : "";
ok(ctext.startsWith("\uFEFF") && /CategoryId/.test(ctext.split("\r\n")[0]) && ctext.split("\r\n").length === pre6.transactions.length + 1, "CSV export: BOM, CategoryId column, one row per transaction");
await upload(page, cf); sh = await sheetText(page);
ok(new RegExp(`${pre6.transactions.length} transactions ready to import`).test(sh) && !/skipped/.test(sh), "re-importing the CSV: every row accepted, none skipped", sh.slice(0, 200));
await page.close();

section("R1. Recovery notices stay until dismissed");
const badSeed = JSON.stringify({ ...baseSeed(), transactions: [tx({ merchant: "OK", amount: 5 }), tx({ merchant: "Bad", amount: -5 }), tx({ merchant: "NoDate", date: "" })] });
page = await openPage(browser, { seed: null, seedRaw: badSeed });
const banner = () => page.evaluate(() => [...document.querySelectorAll(".backup-banner")].map((b) => b.innerText));
ok((await banner()).some((t) => /2 unreadable records set aside/.test(t) && /negative amount/.test(t) && /missing date/.test(t)), "recovery banner explains what was set aside and why", await banner());
await openSettings(page);
const cur2 = () => [...document.querySelectorAll(".settings-row")].find((r) => /Currency symbol/i.test(r.textContent)).querySelector("input");
for (let i = 0; i < 3; i++) { await setInput(page, cur2, ""); await page.evaluate(() => [...document.querySelectorAll(".settings-row")].find((r) => /Currency symbol/i.test(r.textContent)).querySelector(".btn-sm-primary").click()); await wait(120); }
ok((await banner()).some((t) => /unreadable records set aside/.test(t)), "…and it is still there after several toasts (nothing can replace it)");
await page.evaluate(() => document.querySelector(".sheet-overlay").click()); await wait(300);
await page.evaluate(() => [...document.querySelectorAll(".backup-banner")].find((b) => /unreadable/.test(b.innerText)).querySelector(".backup-dismiss").click()); await wait(200);
ok(!(await banner()).some((t) => /unreadable/.test(t)), "dismissing it removes it");
ok((await storageKeys(page)).some((k) => k.startsWith(KEY + "__rejected_")), "the set-aside records remain recoverable in storage");
await page.close();

section("R2. localStorage unavailable");
page = await openPage(browser, { seed: null, pre: () => { Object.defineProperty(window, "localStorage", { get() { throw new Error("SecurityError: denied"); } }); } });
// Run 6 (D16): unreadable storage is detected at start-up, so saving is paused from the first moment and the banner names
// the real cause (before: an attempted save failed and the banner said "Could not save changes").
ok(!!(await page.$(".tabbar")) && /Saving is paused because your saved data could not be read/.test((await banner()).join(" ")), "app still starts; a visible banner says saving is paused because the saved data could not be read", await banner());
await openAdd(page); await page.$eval(".amount-input", (el) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(el, "5"); el.dispatchEvent(new Event("input", { bubbles: true })); });
await clickText(page, ".add-overlay .btn-primary", /record expense/); await wait(300);
await tab(page, "Ledger"); ok(/5\.00/.test(await bodyText(page)), "the app keeps working in memory (a recorded entry appears in the Ledger)");
ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
await page.close();

section("R3. Save fails (quota)");
page = await openPage(browser, { pre: () => { const orig = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === "expense_ledger_v5" && sessionStorage.getItem("__seeded") && window.__failSave) throw new Error("QuotaExceededError"); return orig.call(this, k, v); }; } });
await page.evaluate(() => { window.__failSave = true; }); await openAdd(page);
await page.$eval(".amount-input", (el) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(el, "9"); el.dispatchEvent(new Event("input", { bubbles: true })); });
await clickText(page, ".add-overlay .btn-primary", /record expense/); await wait(400);
const b3 = (await banner()).join(" "); ok(/Could not save changes/.test(b3) && /Back up/.test(await bodyText(page)), "a failed write shows 'Could not save changes' with a Back up button");
await page.close();

section("R4. Recovery copy cannot be made → saving is paused");
page = await openPage(browser, { seed: null, seedRaw: badSeed, pre: () => { const orig = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k.includes("__rejected_")) throw new Error("QuotaExceededError"); return orig.call(this, k, v); }; } });
ok((await banner()).some((t) => /saving is paused/.test(t)), "banner says saving is paused so nothing is overwritten", await banner());
await openAdd(page); await page.$eval(".amount-input", (el) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(el, "9"); el.dispatchEvent(new Event("input", { bubbles: true })); });
await clickText(page, ".add-overlay .btn-primary", /record expense/); await wait(400);
const raw = await page.evaluate((k) => localStorage.getItem(k), KEY);
ok(raw === badSeed, "after making a change, the ORIGINAL stored data is byte-for-byte untouched");
await page.close();

section("U1. Undo restores exactly what was deleted");
const A = tx({ merchant: "AAA", amount: 11, note: "keep me" }), B = tx({ merchant: "BBB", amount: 22 }), C0 = tx({ merchant: "CCC", amount: 33 });
page = await openPage(browser, { seed: baseSeed({ transactions: [A, B, C0] }) });
const delVia = async (merchant) => { await tab(page, "Ledger"); await page.evaluate((m) => [...document.querySelectorAll(".txn-row")].find((r) => r.innerText.includes(m)).click(), merchant); await page.waitForSelector(".sheet"); await wait(300); await clickText(page, ".sheet .btn", /^Delete/); await wait(250); };
await delVia("AAA"); ok(/Transaction deleted/.test(await bodyText(page)), "delete shows 'Transaction deleted' with Undo");
await openAdd(page); await page.$eval(".amount-input", (el) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(el, "44"); el.dispatchEvent(new Event("input", { bubbles: true })); });
await clickText(page, ".add-overlay .btn-primary", /record expense/); await wait(350);
await clickText(page, ".snackbar-undo", /Undo/).catch(() => {}); await wait(300);
st = await state(page); const restored = st.transactions.find((t) => t.id === A.id);
ok(st.transactions.length === 4 && restored && eq2(restored, A) && st.transactions.some((t) => t.amount === 44), "Undo brings back the identical record AND keeps the entry added after the delete", st.transactions.map((t) => t.amount));
await delVia("AAA"); await delVia("BBB"); ok(/2 transactions deleted/.test(await bodyText(page)), "two quick deletes share one undo window ('2 transactions deleted')");
await clickText(page, ".snackbar-undo", /Undo/); await wait(300); st = await state(page);
ok(st.transactions.some((t) => eq2(t, A)) && st.transactions.some((t) => eq2(t, B)) && st.transactions.length === 4, "one Undo restores both, exactly");
await delVia("CCC"); await wait(4600); ok(!(await page.$(".snackbar")), "after the window closes the Undo is gone (no stale undo)");
ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
await finish("e2e_import", browser);
