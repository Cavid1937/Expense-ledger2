// Run 15 follow-up (2026-10-29): the Android shell reports the phone's Back button to the page through window.__ledgerNativeBack()
// (found on an emulator: Back closed the whole app even with the add form open; WebView history is unreliable for entries the
// page pushes without a touch). Contract: returns "handled" when the page used the press (closed a sheet, went back to Home, or
// warned "press Back again") and "exit" only when the app may close (a second press within 2 seconds on Home with nothing open).
// Written BEFORE the hook existed. Synthetic data only.
import { launch, openPage, tab, openAdd, wait, ok, section, finish, baseSeed, settle } from "./lib.mjs";
const browser = await launch();
const back = (page) => page.evaluate(() => (typeof window.__ledgerNativeBack === "function" ? window.__ledgerNativeBack() : "missing"));
const toast = (page) => page.evaluate(() => (document.querySelector(".toast") || {}).innerText || "");

section("R15-N1. The hook exists");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page);
  ok((await page.evaluate(() => typeof window.__ledgerNativeBack)) === "function", "window.__ledgerNativeBack is defined once the app has started");
  await page.close();
}
section("R15-N2. Back closes what is open first, then leaves a tab, then warns, then lets the app close");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page);
  await openAdd(page);
  ok((await back(page)) === "handled" && !(await page.$(".add-overlay")), "add form open: Back closes it and the app stays");
  await tab(page, "Goals"); await wait(300);
  ok((await back(page)) === "handled" && (await page.evaluate(() => document.querySelectorAll(".tab-btn")[0].getAttribute("aria-current") === "page")), "on another tab: Back returns to Home");
  const r1 = await back(page); await wait(200);
  ok(r1 === "handled" && /again/i.test(await toast(page)), "on Home with nothing open: the first press warns 'press Back again'", await toast(page));
  ok((await back(page)) === "exit", "a second press within 2 seconds lets the app close");
  await wait(2300);
  ok((await back(page)) === "handled", "after the warning has expired the next press warns again instead of closing");
  await page.close();
}
section("R15-N3. A bottom sheet is closed before anything else");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await tab(page, "Ledger"); await settle(page);
  await page.evaluate(() => document.querySelector(".txn-row").click()); await wait(400);
  ok(!!(await page.$(".sheet-overlay")), "an entry sheet is open");
  const handled = await back(page); await wait(450);   // the sheet slides away for ~0.2 s before it is removed
  ok(handled === "handled" && !(await page.$(".sheet-overlay")), "Back closes the sheet, not the app");
  await page.close();
}
await browser.close();
finish("e2e_run15_back");
