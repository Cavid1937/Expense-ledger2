// Run 10 (2026-10-27) in the real bundled app: data safety on the Import / Export page — storage protection, the backup sent
// through the share menu, and the install offer. The browser's storage manager, share menu and install event are simulated
// (headless Chrome has no real share menu and no install prompt), so each possible answer is tested.
import { launch, openPage, state, tab, wait, ok, section, finish, baseSeed, fs, path } from "./lib.mjs";
const browser = await launch();
// pre-scripts run before the app: they replace navigator.storage / share with recording fakes
const fakeStorage = (persisted, grant) => `(() => { window.__persistCalls = 0; let p = ${persisted}; Object.defineProperty(navigator, "storage", { configurable: true, value: {
  persisted: async () => p, persist: async () => { window.__persistCalls++; if (window.__grantNext) p = true; else p = ${grant}; return p; }, estimate: async () => ({}) } }); })();`;
const fakeShare = (mode) => `(() => { window.__shared = []; navigator.canShare = () => ${mode !== "none"}; navigator.share = async (d) => {
  if ("${mode}" === "cancel") { const e = new Error("cancel"); e.name = "AbortError"; throw e; } window.__shared.push({ name: d.files[0].name, type: d.files[0].type, text: await d.files[0].text() }); }; })();`;
const goIO = async (page) => { await tab(page, "ImportExport"); await page.waitForSelector(".io-page"); await wait(300); };
const ioText = (page) => page.evaluate(() => document.querySelector(".io-page").innerText);

section("R10-1. Storage protection: asked once at start; shown honestly; can be asked again");
{
  const page = await openPage(browser, { pre: fakeStorage(false, false) + fakeShare("none") });
  await goIO(page);
  ok((await page.evaluate(() => window.__persistCalls)) === 1, "the app asked the browser once when it started");
  const t0 = await ioText(page);
  ok(/Storage protection/.test(t0) && /Off — the browser may clear/.test(t0) && !!(await page.$(".io-protect")), "refused → 'Off', with what that means and an 'Ask the browser again' button", t0.slice(0, 300));
  await page.evaluate(() => { window.__grantNext = true; document.querySelector(".io-protect").click(); }); await wait(300);
  const t1 = await ioText(page);
  ok(/On — the browser has agreed/.test(t1) && !(await page.$(".io-protect")) && (await page.evaluate(() => window.__persistCalls)) === 2, "asking again (a tap) → 'On'; the button goes away", t1.slice(0, 200));
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
{
  const page = await openPage(browser, { pre: `Object.defineProperty(navigator, "storage", { configurable: true, value: undefined });` });
  await goIO(page);
  ok(/does not say whether it keeps/.test(await ioText(page)) && page.errors.length === 0, "a browser without storage protection → says so plainly, no error");
  await page.close();
}

section("R10-2. Backup through the share menu");
{
  const seed = baseSeed({ lastBackup: null, backupConfirmedAt: null });
  let page = await openPage(browser, { seed, pre: fakeStorage(true, true) + fakeShare("ok") });
  await goIO(page); const before = await state(page);
  ok(/Save a backup to Google Drive, Telegram/.test(await ioText(page)), "the share button is offered where files can be shared");
  await page.evaluate(() => document.querySelector(".io-share").click()); await wait(500);
  const sent = await page.evaluate(() => window.__shared);
  const file = sent[0] && JSON.parse(sent[0].text), after = await state(page);
  ok(sent.length === 1 && /^ledger-backup-\d{4}-\d{2}-\d{2}\.json$/.test(sent[0].name) && sent[0].type === "application/json", "one JSON file named ledger-backup-<date>.json goes to the share menu", sent.map((x) => x.name));
  ok(file && JSON.stringify(file.transactions) === JSON.stringify(before.transactions) && JSON.stringify(file.budgets) === JSON.stringify(before.budgets) && file.version === 10,   /* Run 12: backup format 10 */ "the file holds exactly the saved transactions and settings (same as a downloaded backup)");
  ok(typeof after.lastBackup === "string" && !after.backupConfirmedAt && JSON.stringify(after.transactions) === JSON.stringify(before.transactions), "the backup date is recorded (not 'confirmed' — the app can't see that it arrived); nothing else changes");
  ok(/Backup sent/.test(await page.evaluate(() => document.querySelector(".toast")?.innerText || "")), "the message says to check that it arrived");
  await page.close();
  page = await openPage(browser, { seed, pre: fakeStorage(true, true) + fakeShare("cancel") });
  await goIO(page); await page.evaluate(() => document.querySelector(".io-share").click()); await wait(400);
  ok(!(await state(page)).lastBackup, "closing the share menu without choosing → nothing is recorded");
  await page.close();
  page = await openPage(browser, { seed, pre: fakeStorage(true, true) + fakeShare("none") });
  await goIO(page);
  ok(!(await page.$(".io-share")) && (await page.evaluate(() => [...document.querySelectorAll(".io-page .btn-primary")].some((b) => /Create backup file/.test(b.innerText)))), "where files can't be shared, the share button is hidden and 'Create backup file' is the main action");
  await page.close();
}

section("R10-3. Install offer");
{
  const page = await openPage(browser, { pre: fakeStorage(true, true) + fakeShare("none") });
  await goIO(page);
  ok(/Install on the Home Screen/.test(await ioText(page)) && /Add to Home screen/.test(await ioText(page)) && !(await page.$(".io-install")), "the steps to install are shown; no Install button until the browser offers one");
  await page.evaluate(() => { const e = new Event("beforeinstallprompt", { cancelable: true }); window.__prompted = 0; e.prompt = () => { window.__prompted++; }; e.userChoice = Promise.resolve({ outcome: "accepted" }); window.dispatchEvent(e); }); await wait(300);
  ok(!!(await page.$(".io-install")), "when the browser offers installing, an 'Install the app' button appears");
  await page.evaluate(() => document.querySelector(".io-install").click()); await wait(300);
  ok((await page.evaluate(() => window.__prompted)) === 1, "tapping it opens the browser's own install dialog");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
await finish("e2e_run10", browser);
