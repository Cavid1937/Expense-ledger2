// Run 17 (2026-10-30), owner report: "the app sometimes crashes". Before this run any unexpected error while drawing a screen left a blank
// page with no way forward. Contract: a calm recovery screen (never blank), the stored records are not touched, the error is kept in a small
// local log (key expense_ledger_v5__crashlog, newest 5, text only, no amounts) so the cause can be found later, and "Reload the app" brings the app back.
// Written BEFORE the error boundary existed. Synthetic data only.
import { launch, openPage, tab, wait, ok, section, finish, baseSeed, settle } from "./lib.mjs";
const browser = await launch();
const raw = (page, k) => page.evaluate((k) => localStorage.getItem(k), k);

section("R17-C1. A drawing error shows a recovery screen, keeps the records, and writes a log line");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page);
  const before = await raw(page, "expense_ledger_v5");
  ok(!!before && before.length > 10, "the app has records stored before the error", before && before.length);
  await page.evaluate(() => { Object.defineProperty(Intl.NumberFormat.prototype, "format", { get() { throw new Error("synthetic crash for test"); } }); Number.prototype.toLocaleString = function () { throw new Error("synthetic crash for test"); }; });
  await tab(page, "Goals"); await wait(500);
  ok(!!(await page.$(".crash-screen")), "a recovery screen is shown instead of a blank page");
  const txt = await page.evaluate(() => (document.querySelector(".crash-screen") || {}).innerText || "");
  ok(/Something went wrong/.test(txt) && /records are safe/i.test(txt), "it says what happened and that the records are safe", txt.slice(0, 120));
  ok((await page.$$(".crash-screen button")).length === 1, "it offers exactly one action: reload");
  const afterRaw = await raw(page, "expense_ledger_v5");
  ok(afterRaw === before, "the stored records are byte-for-byte unchanged");
  const log = JSON.parse((await raw(page, "expense_ledger_v5__crashlog")) || "null");
  ok(Array.isArray(log) && log.length === 1 && /synthetic crash/.test(log[0].message) && typeof log[0].at === "string", "one crash-log entry with the message and time", log);
  await page.evaluate(() => { document.querySelector(".crash-screen button").click(); });
  await page.waitForSelector(".tabbar", { timeout: 15000 }); await wait(300);
  ok(!(await page.$(".crash-screen")) && !!(await page.$(".tabbar")), "Reload the app brings the normal app back");
  ok((await raw(page, "expense_ledger_v5")) === before, "and the records are still unchanged after the reload");
  await page.close();
}
section("R17-C2. The log keeps only the newest 5 entries");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page);
  await page.evaluate(() => localStorage.setItem("expense_ledger_v5__crashlog", JSON.stringify(Array.from({ length: 5 }, (_, i) => ({ at: "2026-01-0" + (i + 1), message: "old " + i })))));
  await page.evaluate(() => { Object.defineProperty(Intl.NumberFormat.prototype, "format", { get() { throw new Error("newest crash"); } }); Number.prototype.toLocaleString = function () { throw new Error("newest crash"); }; });
  await tab(page, "Goals"); await wait(500);
  const log = JSON.parse(await raw(page, "expense_ledger_v5__crashlog"));
  ok(log.length === 5 && /newest crash/.test(log[log.length - 1].message) && log[0].message === "old 1", "the oldest line was dropped, the new one added last", log.map((x) => x.message));
  await page.close();
}
await browser.close();
finish("e2e_run17_crash");
