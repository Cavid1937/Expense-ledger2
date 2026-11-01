// Run 13 (2026-10-28): the web app's side of the Android backup export, in the real bundled app. Written BEFORE the code.
// A stand-in for the native shell defines window.__ledgerNativeShare (the real one is in the Capacitor copy: Filesystem + Share).
// What this CANNOT show: that the real Android share chooser opens and delivers the file (needs a device: NOT ASSESSED).
import { launch, openPage, state, openData, wait, ok, section, finish, baseSeed, clickText, fs, path } from "./lib.mjs";
const DL = process.env.E2E_DL_DIR || path.join(process.env.TEMP || ".", "ledger-e2e-dl"); fs.mkdirSync(DL, { recursive: true });
const browser = await launch();
const OLD = "2026-01-01T00:00:00.000Z";
const hook = (body) => `window.__calls=[]; window.__ledgerNativeShare = async (f, t, m) => { window.__calls.push([f, t, m]); ${body} };`;
const files = () => fs.readdirSync(DL).filter((x) => /^ledger-/.test(x));
const calls = (page) => page.evaluate(() => window.__calls);
const toastText = async (page) => { await wait(250); return page.evaluate(() => (document.querySelector(".toast") || {}).textContent || ""); };
const seed = () => baseSeed({ lastBackup: OLD });

section("N-B1. Share succeeded");
{
  const before = files().length;
  const page = await openPage(browser, { seed: seed(), pre: hook('return "shared";') }); await openData(page);
  ok(!!(await page.$(".io-share")), "with the native hook the 'save a backup somewhere else' button is offered");
  await page.evaluate(() => document.querySelector(".io-share").click()); await wait(500);
  const c = await calls(page), st = await state(page);
  ok(c.length === 1 && /^ledger-backup-\d{4}-\d{2}-\d{2}\.json$/.test(c[0][0]) && c[0][2] === "application/json", "the hook gets one call: a ledger-backup-<date>.json file of type application/json", c.map((x) => [x[0], x[2]]));
  let parsed = null; try { parsed = JSON.parse(c[0][1]); } catch {}
  ok(parsed && parsed.version === 10 && parsed.transactions.length === st.transactions.length && Array.isArray(parsed.bills), "the text is the complete version-10 backup (all entries, the bills list)");
  ok(/Backup sent/.test(await toastText(page)) && st.lastBackup !== OLD, "only now does the app say the backup was sent and record the time");
  ok(files().length === before, "no browser download was started as well");
  await page.evaluate(() => { window.__calls.length = 0; });
  await clickText(page, ".io-page .btn", /Create backup file/); await wait(500);
  ok((await calls(page)).length === 1 && files().length === before, "the plain 'Create backup file' button also goes through the native hand-over (a download link would do nothing there)");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("N-B2. The user closes the share sheet");
{
  const page = await openPage(browser, { seed: seed(), pre: hook('return "cancelled";') }); await openData(page);
  await page.evaluate(() => document.querySelector(".io-share").click()); await wait(500);
  const st = await state(page);
  ok((await calls(page)).length === 1 && st.lastBackup === OLD && !/Backup sent|created/i.test(await toastText(page)), "nothing is recorded and no success message is shown");
  await page.close();
}

section("N-B3. The native step fails");
{
  const page = await openPage(browser, { seed: seed(), pre: hook('throw new Error("disk full");') }); await openData(page);
  await page.evaluate(() => document.querySelector(".io-share").click()); await wait(500);
  const st = await state(page);
  ok(/couldn't save the backup/i.test(await toastText(page)) && !/Backup sent/.test(await toastText(page)), "the user is told it failed (and not that it was sent)");
  ok(st.lastBackup === OLD, "the backup time is not updated");
  await page.evaluate(() => { window.__calls.length = 0; });
  await clickText(page, ".io-page .btn", /Create backup file/); await wait(500);
  ok(/couldn't save the backup/i.test(await toastText(page)) && (await state(page)).lastBackup === OLD, "the same through the plain button: told, nothing recorded");
  await page.close();
}

section("N-B4. CSV export goes the same way");
{
  const before = files().length;
  const page = await openPage(browser, { seed: seed(), pre: hook('return "shared";') }); await openData(page);
  await clickText(page, ".io-page .btn", /Export CSV/); await wait(500);
  const c = await calls(page);
  ok(c.length === 1 && /^ledger-\d{4}-\d{2}-\d{2}\.csv$/.test(c[0][0]) && /^text\/csv/.test(c[0][2]) && /^﻿?"?Date"?,/.test(c[0][1]), "the hook gets a ledger-<date>.csv file of type text/csv whose first row is the header", c.map((x) => [x[0], x[2], x[1].slice(0, 12)]));
  ok(/CSV file created/.test(await toastText(page)) && files().length === before, "success message after \"shared\"; no browser download");
  await page.close();
  const p2 = await openPage(browser, { seed: seed(), pre: hook('throw new Error("x");') }); await openData(p2);
  await clickText(p2, ".io-page .btn", /Export CSV/); await wait(500);
  ok(/couldn't save/i.test(await toastText(p2)) && !/CSV file created/.test(await toastText(p2)), "a failed CSV hand-over is reported as a failure, not as created");
  await p2.close();
}
await browser.close();
finish("e2e_native");
