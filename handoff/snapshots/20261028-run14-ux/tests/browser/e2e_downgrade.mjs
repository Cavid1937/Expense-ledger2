// Run 13 (2026-10-28): rolling back to the previous app version (version 9 = commit 12a0c19, the exact files in
// tests/fixtures/app-v9) after bills exist. Written BEFORE the protection. The old app is built and run for real, in the same
// browser profile, on a ledger written by the current app. Dates are relative to today. Synthetic data only.
import { spawnSync } from "child_process"; import fs from "fs"; import os from "os"; import path from "path"; import { fileURLToPath, pathToFileURL } from "url";
import { launch, openPage, state, tab, openSafe, wait, ok, section, finish, tx, baseSeed, KEY } from "./lib.mjs";
const here = path.dirname(fileURLToPath(import.meta.url));
const MIRROR = KEY + "__bills_mirror";
const out = fs.mkdtempSync(path.join(os.tmpdir(), "ledger-v9-page-"));
const built = spawnSync(process.execPath, [path.join(here, "build.mjs")], { env: { ...process.env, CANDIDATE: path.join(here, "..", "fixtures", "app-v9", "App.jsx"), PAGE_OUT: out }, encoding: "utf8" });
ok(built.status === 0 && fs.existsSync(path.join(out, "app.js")), "the previous app version (version 9: the exact files of commit 12a0c19) builds for this test", built.stderr);
const V9 = pathToFileURL(path.join(out, "index.html")).href;
const browser = await launch();
const d = new Date(), pad = (n) => String(n).padStart(2, "0");
const ym = (o) => { const x = new Date(d.getFullYear(), d.getMonth() + o, 1); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}`; };
const DAY = pad(Math.min(d.getDate() - 1, 28) || 1);
const income = tx({ id: 1790000100001, type: "income", category: "salary", amount: 2000, merchant: "Employer", date: `${ym(0)}-01` });
const K = (o) => tx({ merchant: "Kommunal", category: "housing", subcategory: "Utilities", recurring: true, recurFreq: "monthly", ...o });
const BILL = (o) => ({ name: "Kommunal", type: "expense", category: "housing", subcategory: "Utilities", freq: "monthly", anchorDate: `${ym(-1)}-${DAY}`, active: true, createdAt: "2026-09-01T00:00:00Z", ...o });
const bills = () => [BILL({ id: "bE", amount: 90 }), BILL({ id: "bW", amount: 18 })];
const ledger = () => baseSeed({ transactions: [income, K({ id: 1790000100002, amount: 90, note: "Electricity", date: `${ym(-1)}-${DAY}`, billId: "bE" }), K({ id: 1790000100003, amount: 18, note: "Water", date: `${ym(-1)}-${DAY}`, billId: "bW" }),
  K({ id: 1790000100004, amount: 18, note: "Water", date: `${ym(0)}-${DAY}`, billId: "bW" })], bills: bills(), goals: [], safeToSpend: { enabled: true, savingsTarget: 0 } });
const discretionary = async (page) => { await tab(page, "Home"); await wait(250); await openSafe(page); return page.evaluate(() => ([...document.querySelectorAll(".safe-row")].map((e) => e.innerText.replace(/\s+/g, " ")).find((x) => /Discretionary/.test(x)) || "")); };
const stored = (page, k = KEY) => page.evaluate((key) => { const r = localStorage.getItem(key); return r === null ? null : JSON.parse(r); }, k);
const rawKeys = (page) => page.evaluate(() => Object.keys(localStorage));
const ids = (st) => JSON.stringify(st.transactions.map((t) => [t.id, t.amount, t.date, t.merchant, t.note, t.category]));
const startRaw = () => { window.__rawAtStart = localStorage.getItem("expense_ledger_v5"); };

section("DG-1. The current app writes the ledger and its mirror");
let page = await openPage(browser, { seed: ledger() });
ok(/\+1,892\.00/.test(await discretionary(page)), "start: bills set electricity (90) aside → discretionary +1,892");
await wait(500);
const before = await stored(page), mirror = await stored(page, MIRROR);
ok(before.bills.length === 2 && before.transactions.filter((t) => t.billId).length === 3, "the ledger holds 2 bills and 3 linked payments");
ok(mirror && mirror.v === 1 && mirror.bills.length === 2 && Object.keys(mirror.links).length === 3 && JSON.stringify(mirror.bills) === JSON.stringify(before.bills), "the mirror (own key) holds the same 2 bills and the 3 links", mirror);
ok(!!mirror && Object.keys(mirror).sort().join() === "bills,links,savedAt,v" && !JSON.stringify(mirror).includes("Employer"), "the mirror holds only bills and links, no other ledger data");
await page.close();

section("DG-2. Starting the previous app version (cannot be patched: it is already live) on that ledger");
page = await openPage(browser, { url: V9, seed: null, pre: startRaw });
const seenByOld = JSON.parse(await page.evaluate(() => window.__rawAtStart) || "null");
ok(seenByOld && seenByOld.bills && seenByOld.bills.length === 2, "(guard) the old app really reads the ledger the new app wrote: it sees the 2 bills at start", seenByOld && Object.keys(seenByOld));
await wait(600);
const wiped = await stored(page);
ok(!wiped.bills && wiped.transactions.every((t) => t.billId === undefined) && wiped.transactions.length === 4, "KNOWN, version 9 cannot change: just opening it rewrites the ledger without the bills and without any payment link (the 4 entries stay)", Object.keys(wiped));
ok(ids(wiped) === ids(before), "every entry keeps its id, amount, date, name, note and category");
ok(!!mirror && (await rawKeys(page)).includes(MIRROR) && JSON.stringify(await stored(page, MIRROR)) === JSON.stringify(mirror), "the old app leaves the mirror key untouched");
ok(/\+1,982\.00/.test(await discretionary(page)), "and its Safe to Spend shows the old collision again: +1,982 (electricity not set aside)");
await page.close();

section("DG-3. Back on the current app: the loss is offered back, never applied silently");
page = await openPage(browser, { seed: null });
ok(!!(await page.$(".bill-restore")) && /2 of your bills/.test(await page.evaluate(() => document.querySelector(".bill-restore").innerText)), "a banner says an older version removed 2 bills and offers to restore them");
let st = await state(page);
ok(!st.bills?.length && st.transactions.every((t) => !t.billId), "nothing was restored by itself");
ok(JSON.stringify((await stored(page, MIRROR))?.bills) === JSON.stringify(before.bills), "while the offer is open the mirror is kept as it was (ignoring the banner loses nothing)");
await page.evaluate(() => document.querySelector(".bill-restore-yes")?.click()); await wait(500);
st = await state(page);
ok(JSON.stringify(st.bills) === JSON.stringify(before.bills) && JSON.stringify(st.transactions.map((t) => t.billId)) === JSON.stringify(before.transactions.map((t) => t.billId)) && ids(st) === ids(before), "Restore brings back the same 2 bills (same ids and fields) and the same 3 links; no entry changed");
ok(/\+1,892\.00/.test(await discretionary(page)), "Safe to Spend is +1,892 again");
ok((await rawKeys(page)).some((k) => /before_bills_restore/.test(k)) && !(await page.$(".bill-restore")), "a recovery copy of the data was kept first, and the banner is gone");
await page.evaluate(() => document.querySelector(".snackbar-undo")?.click()); await wait(400);
st = await state(page);
ok(!st.bills?.length && !!(await page.$(".bill-restore")) && JSON.stringify((await stored(page, MIRROR))?.bills) === JSON.stringify(before.bills), "Undo puts the data back as it was before restoring, and the offer is open again (the mirror still has the bills)");
await page.evaluate(() => document.querySelector(".bill-restore-yes")?.click()); await wait(500);
await page.reload(); await page.waitForSelector(".tabbar"); await wait(500);
st = await state(page);
ok(st.bills.length === 2 && !(await page.$(".bill-restore")) && /\+1,892\.00/.test(await discretionary(page)), "after reloading: the 2 bills are there, no banner, +1,892");
ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
await page.close();

section("DG-4. 'No thanks' is final, and nothing is offered without a real loss");
page = await openPage(browser, { url: V9, seed: null }); await wait(600); await page.close();   // wipe again with the old app
page = await openPage(browser, { seed: null });
ok(!!(await page.$(".bill-restore")), "after another rollback the offer appears again");
await page.evaluate(() => document.querySelector(".bill-restore-no")?.click()); await wait(500);
st = await state(page);
ok(!st.bills?.length && !(await page.$(".bill-restore")) && (await stored(page, MIRROR))?.bills.length === 0, "No thanks: nothing restored, the banner closes, and the mirror now follows the ledger (no repeated nagging)");
await page.reload(); await page.waitForSelector(".tabbar"); await wait(400);
ok(!(await page.$(".bill-restore")), "after reloading there is no banner");
await page.close();
page = await openPage(browser, { fresh: true, seed: null });
ok(!(await page.$(".bill-restore")) && !(await rawKeys(page)).includes(MIRROR), "a brand-new install: no banner and no mirror key (users without bills get no extra storage)");
await page.close();
page = await openPage(browser, { seed: ledger() }); await wait(500);
await tab(page, "Recurring"); await page.evaluate(() => [...document.querySelectorAll(".bill-row")].find((r) => /Kommunal/.test(r.innerText)).click()); await page.waitForSelector(".bill-sheet"); await wait(300);
await page.evaluate(() => document.querySelector(".bill-delete").click()); await wait(400);
const afterDelete = await stored(page, MIRROR);
ok(afterDelete?.bills.length === 1, "deleting a bill on purpose updates the mirror too (1 bill left)", afterDelete?.bills.length);
await page.reload(); await page.waitForSelector(".tabbar"); await wait(500);
ok(!(await page.$(".bill-restore")), "after reloading there is no banner: a deliberate delete is not mistaken for a rollback");
ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
await page.close();
await browser.close();
finish("e2e_downgrade");
