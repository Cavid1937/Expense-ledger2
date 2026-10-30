// Run 13 (2026-10-28) in the real bundled app: failure paths around bills. Written BEFORE the import-sheet note.
// (1) Replace with an older (version 9) backup on a device that has bills: the sheet says the bills stay. (2) Converting when the
// recovery copy cannot be kept. (3) The ledger itself cannot be saved. (4) Restoring bills when the recovery copy cannot be kept.
// Synthetic data; downloads/imports go to the temp folders set by tests/run-browser.mjs.
import { launch, openPage, state, tab, openData, openSafe, wait, ok, section, finish, tx, baseSeed, clickText, bodyText, fs, path, KEY } from "./lib.mjs";
const IMP = process.env.E2E_IMP_DIR || path.join(process.env.TEMP || ".", "ledger-e2e-imp"); fs.mkdirSync(IMP, { recursive: true });
const MIRROR = KEY + "__bills_mirror";
const browser = await launch();
const d = new Date(), pad = (n) => String(n).padStart(2, "0");
const ym = (o) => { const x = new Date(d.getFullYear(), d.getMonth() + o, 1); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}`; };
const DAY = pad(Math.min(d.getDate() - 1, 28) || 1);
const income = tx({ id: 1790000200001, type: "income", category: "salary", amount: 2000, merchant: "Employer", date: `${ym(0)}-01` });
const K = (o) => tx({ merchant: "Kommunal", category: "housing", subcategory: "Utilities", recurring: true, recurFreq: "monthly", ...o });
const BILL = (o) => ({ name: "Kommunal", type: "expense", category: "housing", subcategory: "Utilities", freq: "monthly", anchorDate: `${ym(-1)}-${DAY}`, active: true, createdAt: "2026-09-01T00:00:00Z", ...o });
const withBills = () => baseSeed({ transactions: [income, K({ id: 1790000200002, amount: 90, note: "Electricity", date: `${ym(-1)}-${DAY}`, billId: "bE" }), K({ id: 1790000200003, amount: 18, note: "Water", date: `${ym(0)}-${DAY}`, billId: "bW" })],
  bills: [BILL({ id: "bE", amount: 90 }), BILL({ id: "bW", amount: 18 })], goals: [], safeToSpend: { enabled: true, savingsTarget: 0 } });
const legacy = () => baseSeed({ transactions: [income, K({ amount: 90, note: "Electricity", date: `${ym(-1)}-${DAY}` }), K({ amount: 18, note: "Water", date: `${ym(-1)}-${DAY}` }), K({ amount: 18, note: "Water", date: `${ym(0)}-${DAY}` })], goals: [], safeToSpend: { enabled: true, savingsTarget: 0 } });
const stored = (page, k = KEY) => page.evaluate((key) => { const r = localStorage.getItem(key); return r === null ? null : JSON.parse(r); }, k);
const keys = (page) => page.evaluate(() => Object.keys(localStorage));
const failWrites = (page, re) => page.evaluate((src) => { const r = new RegExp(src); const orig = Storage.prototype.setItem; window.__origSet = orig; Storage.prototype.setItem = function (k, v) { if (r.test(k)) throw new DOMException("full", "QuotaExceededError"); return orig.call(this, k, v); }; }, re.source);
const allowWrites = (page) => page.evaluate(() => { if (window.__origSet) Storage.prototype.setItem = window.__origSet; });
const discretionary = async (page) => { await tab(page, "Home"); await wait(250); await openSafe(page); return page.evaluate(() => ([...document.querySelectorAll(".safe-row")].map((e) => e.innerText.replace(/\s+/g, " ")).find((x) => /Discretionary/.test(x)) || "")); };
const upload = async (page, file) => { const input = await page.$(".io-page input[type=file]"); await input.uploadFile(file);
  await page.waitForFunction((n) => { const s = document.querySelector('[aria-label="Restore backup"]'); return !!s && s.innerText.includes(n); }, { timeout: 5000, polling: 50 }, path.basename(file)).catch(() => {}); await wait(150); };

section("R13-B1. Replace with an older (version 9) backup while the device has bills");
{
  const v9 = { version: 9, exportedAt: new Date().toISOString(), transactions: [tx({ id: "old1", amount: 30, merchant: "Cafe", date: `${ym(0)}-02`, note: "from the old file" }), { ...income, id: "old2" }], budgets: { food: 400 }, templates: [], currency: "₼", goals: [], safeToSpend: { enabled: true, savingsTarget: 0 } };
  const file = path.join(IMP, "v9-backup.json"); fs.writeFileSync(file, JSON.stringify(v9));
  const page = await openPage(browser, { seed: withBills() }); await openData(page);
  await upload(page, file);
  const sheet = await page.evaluate(() => (document.querySelector('[aria-label="Restore backup"]') || {}).innerText || "");
  ok(/2 transactions ready to import/.test(sheet) && !!(await page.$(".import-bills-stay")) && /2 bills stay/.test(await page.evaluate(() => (document.querySelector(".import-bills-stay") || {}).innerText || "")), "the Replace sheet says: this file has no bills, so your 2 bills stay and its payments will not be linked to them", sheet.slice(0, 200));
  await clickText(page, '[aria-label="Restore backup"] .btn', /^Replace/); await wait(500);
  let st = await state(page);
  ok(st.transactions.length === 2 && st.bills.length === 2 && st.transactions.every((t) => !t.billId), "after Replace: the 2 entries of the file, the 2 bills still there, no entry linked to a bill");
  ok((await keys(page)).some((k) => /before_import/.test(k)), "a recovery copy was kept first");
  await clickText(page, ".snackbar-undo", /Undo/); await wait(400);
  st = await state(page);
  ok(st.transactions.length === 3 && st.transactions.filter((t) => t.billId).length === 2 && st.bills.length === 2 && JSON.stringify(st.bills.map((b) => b.id)) === JSON.stringify(["bE", "bW"]), "Undo brings back all 3 entries, both links and both bills");
  ok(/\+1,892\.00/.test(await discretionary(page)), "Safe to Spend is back to +1,892");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
{
  const page = await openPage(browser, { seed: baseSeed({ transactions: [income], goals: [] }) }); await openData(page);
  const file = path.join(IMP, "v9-backup.json"); await upload(page, file);
  ok(!(await page.$(".import-bills-stay")), "a device without bills sees no such note");
  await page.close();
}

section("R13-B2. Converting to bills when the recovery copy cannot be kept");
{
  const page = await openPage(browser, { seed: legacy() });
  await failWrites(page, /before_bills/);
  await tab(page, "Recurring"); await clickText(page, ".rec-convert", /Convert to bills/); await wait(500);
  let st = await state(page);
  ok(!st.bills?.length && st.transactions.every((t) => !t.billId), "nothing is converted: no bills, no links");
  ok(/Couldn't keep a copy/.test(await page.evaluate(() => (document.querySelector(".toast") || {}).textContent || "")) && !!(await page.$(".rec-convert")), "the user is told why, and the Convert offer is still there");
  await allowWrites(page);
  await clickText(page, ".rec-convert", /Convert to bills/); await wait(500);
  st = await state(page);
  ok(st.bills.length === 1 && st.transactions.filter((t) => t.billId).length === 3, "once copies can be kept again, the same step works (1 bill, 3 links)");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R13-B3. The ledger itself cannot be saved (storage full)");
{
  const page = await openPage(browser, { seed: withBills() }); await wait(400);
  const stored0 = JSON.stringify(await stored(page)), mirror0 = JSON.stringify(await stored(page, MIRROR));
  await failWrites(page, new RegExp("^" + KEY + "$"));
  await tab(page, "Recurring"); await page.evaluate(() => document.querySelector(".topbar .topbar-add").click()); await page.waitForSelector(".bill-sheet"); await wait(300);
  await page.evaluate((dd) => { const set = (el, v) => { Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); };
    set(document.querySelector("#bill-name"), "Internet"); set(document.querySelector("#bill-amount"), "25"); set(document.querySelector("#bill-date"), dd); }, `${ym(0)}-${DAY}`);
  await wait(150); await page.evaluate(() => document.querySelector(".bill-save").click()); await wait(500);
  ok(/could not be saved|can't be saved|not saved|full/i.test(await page.evaluate(() => (document.querySelector(".backup-banner[role=alert]") || {}).innerText || "")), "a red banner says the data could not be saved");
  ok(JSON.stringify(await stored(page)) === stored0 && JSON.stringify(await stored(page, MIRROR)) === mirror0, "the saved ledger and the mirror are exactly as they were (nothing half-written)");
  await allowWrites(page); await page.reload(); await page.waitForSelector(".tabbar"); await wait(500);
  const st = await state(page);
  ok(st.bills.length === 2 && !(await page.$(".bill-restore")), "after reloading: the 2 earlier bills are intact (the unsaved third is gone, as the banner said) and no restore offer appears");
  await page.close();
}

section("R13-B4. Restoring bills when the recovery copy cannot be kept");
{
  const ledger = withBills(), wiped = { ...ledger, bills: undefined, transactions: ledger.transactions.map(({ billId, ...r }) => r) };
  const mirror = { v: 1, savedAt: new Date().toISOString(), bills: ledger.bills, links: { 1790000200002: "bE", 1790000200003: "bW" } };
  const page = await openPage(browser, { seed: wiped, pre: `if(!sessionStorage.getItem("__m")){sessionStorage.setItem("__m","1");localStorage.setItem(${JSON.stringify(MIRROR)},${JSON.stringify(JSON.stringify(mirror))});}` });
  ok(!!(await page.$(".bill-restore")), "(setup) the ledger without bills plus its mirror: the restore offer is shown");
  await failWrites(page, /before_bills_restore/);
  await page.evaluate(() => document.querySelector(".bill-restore-yes").click()); await wait(500);
  let st = await state(page);
  ok(!st.bills?.length && !!(await page.$(".bill-restore")) && /Couldn't keep a copy/.test(await page.evaluate(() => (document.querySelector(".toast") || {}).textContent || "")), "no recovery copy possible: nothing is restored, the user is told why, and the offer stays");
  await allowWrites(page);
  await page.evaluate(() => document.querySelector(".bill-restore-yes").click()); await wait(500);
  st = await state(page);
  ok(st.bills.length === 2 && st.transactions.filter((t) => t.billId).length === 2 && !(await page.$(".bill-restore")), "once a copy can be kept, Restore brings back the 2 bills and the 2 links");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R13-B5. The whole chain: version-9 backup → import (Replace) → convert to bills → export a version-10 backup → restore it on another device");
{
  const DL = process.env.E2E_DL_DIR || path.join(process.env.TEMP || ".", "ledger-e2e-dl"); fs.mkdirSync(DL, { recursive: true });
  const v9 = { version: 9, exportedAt: new Date().toISOString(), transactions: [income, K({ id: "v9a", amount: 90, note: "Electricity", date: `${ym(-1)}-${DAY}` }), K({ id: "v9b", amount: 18, note: "Water", date: `${ym(-1)}-${DAY}` }), K({ id: "v9c", amount: 18, note: "Water", date: `${ym(0)}-${DAY}` })],
    budgets: { food: 400 }, templates: [], currency: "₼", goals: [], safeToSpend: { enabled: true, savingsTarget: 0 } };
  const v9file = path.join(IMP, "chain-v9.json"); fs.writeFileSync(v9file, JSON.stringify(v9));
  const A = await openPage(browser, { seed: baseSeed({ transactions: [tx({ id: "temp1", amount: 5 })], goals: [] }) }); await openData(A);
  await upload(A, v9file); await clickText(A, '[aria-label="Restore backup"] .btn', /^Replace/); await wait(500);
  let st = await state(A);
  ok(st.transactions.length === 4 && !st.bills?.length && st.budgets.food === 400 && /\+1,982\.00/.test(await discretionary(A)), "1. the version-9 file replaced the data: 4 entries, no bills, budgets kept; Safe to Spend +1,982 (the old merged grouping)");
  await tab(A, "Recurring"); await clickText(A, ".rec-convert", /Convert to bills/); await wait(500);
  st = await state(A);
  const before = { bills: JSON.stringify(st.bills), links: JSON.stringify(st.transactions.map((t) => [String(t.id), t.billId || null]).sort()), ids: JSON.stringify(st.transactions.map((t) => String(t.id)).sort()), sum: st.transactions.reduce((a, t) => a + (t.type === "expense" ? t.amount : 0), 0) };
  ok(st.bills.length === 1 && st.transactions.filter((t) => t.billId).length === 3 && /\+1,982\.00/.test(await discretionary(A)), "2. converted: 1 bill (the already-merged pair is not guessed apart), 3 payments linked, Safe to Spend unchanged +1,982");
  // In a full run the downloads folder already holds files from earlier test files with the SAME name (same day), and Chrome
  // overwrites a same-named file in place. So the new file is the one modified after the click, waited for until it is complete
  // (stable size, valid JSON), instead of "a file that was not there before" or a fixed pause.
  const waitNewJson = async (since, ms = 12000) => { const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      for (const x of fs.readdirSync(DL).filter((n) => /^ledger-backup-.*\.json$/.test(n) && !n.endsWith(".crdownload"))) {
        const p = path.join(DL, x); try { if (fs.statSync(p).mtimeMs < since) continue; const s1 = fs.statSync(p).size; await wait(200); if (s1 > 0 && fs.statSync(p).size === s1) { JSON.parse(fs.readFileSync(p, "utf8")); return p; } } catch {} }
      await wait(150); }
    return null; };
  await openData(A); const clickedAt = Date.now() - 50; await clickText(A, ".io-page .btn", /Create backup file/);
  const newFile = await waitNewJson(clickedAt);
  let exported = null; try { exported = JSON.parse(fs.readFileSync(newFile, "utf8")); } catch {}
  ok(exported && exported.version === 10 && exported.bills.length === 1 && exported.transactions.filter((t) => t.billId).length === 3 && exported.transactions.length === 4, "3. the exported file is a version-10 backup holding the 4 entries, the bill and the 3 links", exported && Object.keys(exported));
  await A.close();
  if (!newFile) { ok(false, "4. restored on the other device: identical bills, identical links, identical ids, identical expense total", "no exported file"); ok(false, "5. Safe to Spend, budgets and currency are the same there too", "no exported file"); ok(false, "no JavaScript errors", "skipped: no exported file"); }
  else {
  const B = await openPage(browser, { seed: baseSeed({ transactions: [tx({ id: "temp2", amount: 7 })], goals: [] }) }); await openData(B);
  await upload(B, newFile); await clickText(B, '[aria-label="Restore backup"] .btn', /^Replace/); await wait(500);
  st = await state(B);
  const after ={ bills: JSON.stringify(st.bills), links: JSON.stringify(st.transactions.map((t) => [String(t.id), t.billId || null]).sort()), ids: JSON.stringify(st.transactions.map((t) => String(t.id)).sort()), sum: st.transactions.reduce((a, t) => a + (t.type === "expense" ? t.amount : 0), 0) };
  ok(after.bills === before.bills && after.links === before.links && after.ids === before.ids && after.sum === before.sum, "4. restored on the other device: identical bills, identical links, identical ids, identical expense total", { before, after });
  ok(/\+1,982\.00/.test(await discretionary(B)) && st.budgets.food === 400 && st.currency === "₼", "5. Safe to Spend, budgets and currency are the same there too");
  ok(B.errors.length === 0, "no JavaScript errors", B.errors[0]);
  await B.close();
  }
}
await browser.close();
finish("e2e_run13");
