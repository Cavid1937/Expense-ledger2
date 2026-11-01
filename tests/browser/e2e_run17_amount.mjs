// Run 17 (2026-10-30), owner report: "I am not able to record transactions by using dot, e.g. 145.67 manat, it types like 14567".
// Hypothesis (unreproduced): the amount box was type=number; on phones whose keyboard decimal key is a comma the browser drops
// the separator. Contract after the fix: a plain text box with the decimal keyboard that accepts BOTH "." and "," as the
// decimal mark, keeps at most one mark and two decimals, drops everything else, and never changes the digits typed.
// Written BEFORE the fix. Synthetic data only.
import { launch, openPage, openAdd, state, wait, ok, section, finish, baseSeed, clickText, settle } from "./lib.mjs";
const browser = await launch();
const val = (page) => page.$eval(".amount-input", (el) => el.value);
const clear = async (page) => { await page.click(".amount-input"); await page.keyboard.down("Control"); await page.keyboard.press("a"); await page.keyboard.up("Control"); await page.keyboard.press("Backspace"); };
const typed = async (page, s) => { await clear(page); await page.keyboard.type(s, { delay: 15 }); await wait(80); return val(page); };
const paste = async (page, v) => { await page.$eval(".amount-input", (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); }, v); await wait(80); return val(page); };

section("R17-A1. The amount box is a text box with the decimal keyboard (not type=number)");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page); await openAdd(page);
  const a = await page.$eval(".amount-input", (el) => ({ type: el.type, mode: el.inputMode }));
  ok(a.type === "text" && a.mode === "none", "type=text; inputmode=none while the in-app number pad is open (no phone keyboard)", a);
  await page.evaluate(() => document.querySelector('[data-section="add-more-toggle"]').click()); await wait(200);
  ok((await page.$eval(".amount-input", (el) => el.inputMode)) === "decimal", "with the pad closed the box asks the phone for the decimal keyboard");
  await page.evaluate(() => document.querySelector(".amount-zone").click()); await wait(200);
  ok(await typed(page, "145.67") === "145.67", "typing 145.67 keeps the dot: the box shows 145.67");
  ok(await typed(page, "145,67") === "145.67", "typing 145,67 (comma keyboard) shows 145.67");
  ok(await typed(page, "0.5") === "0.5" && await typed(page, ".5") === "0.5", "0.5 stays and a leading mark becomes 0.5");
  ok(await typed(page, "12") === "12", "whole numbers are unchanged");
  await page.close();
}
section("R17-A2. Junk is dropped, extra marks and a third decimal are ignored, the digits typed never change");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page); await openAdd(page);
  ok(await typed(page, "1.2.3") === "1.23", "a second mark is ignored: 1.2.3 gives 1.23");
  ok(await typed(page, "1.234") === "1.23", "a third decimal is ignored: 1.234 gives 1.23");
  ok(await typed(page, "-5") === "-5", "a minus sign is kept visible, never turned into a positive amount");
  ok(await typed(page, "1e5") === "1e5", "an exponent is kept visible, never turned into another number");
  ok(await typed(page, "abc") === "", "letters alone leave the box empty");
  ok(await paste(page, "1 234,50") === "1234.50", "a pasted 1 234,50 becomes 1234.50");
  ok(await paste(page, "1,234.50") === "1234.50", "a pasted 1,234.50 becomes 1234.50 (comma used as thousands mark)");
  await page.close();
}
section("R17-A2b. Refused at saving: -5 and 1e5 save nothing; 12. saves 12");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page); await openAdd(page);
  const n0 = (await state(page)).transactions.length;
  for (const bad of ["-5", "1e5", "0"]) { await typed(page, bad); await clickText(page, ".add-overlay .btn-primary", /record (expense|income)/); await wait(300); ok((await state(page)).transactions.length === n0, `amount ${JSON.stringify(bad)} saves nothing`); }
  await typed(page, "12."); await clickText(page, ".add-overlay .btn-primary", /record (expense|income)/); await wait(500);
  const st = await state(page); ok(st.transactions.length === n0 + 1 && st.transactions[0].amount === 12, "12. (a decimal mark and nothing after) is saved as 12", st.transactions[0] && st.transactions[0].amount);
  await page.close();
}
section("R17-A3. 145.67 and 145,67 are recorded as 145.67, and 14567 is never recorded");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page);
  await openAdd(page); await typed(page, "145.67"); await clickText(page, ".add-overlay .btn-primary", /record (expense|income)/); await wait(500);
  await openAdd(page); await typed(page, "145,67"); await clickText(page, ".add-overlay .btn-primary", /record (expense|income)/); await wait(500);
  const st = await state(page); const amts = st.transactions.slice(0, 2).map((t) => t.amount);
  ok(amts.length === 2 && amts.every((a) => a === 145.67), "both entries are saved as 145.67", amts);
  await page.close();
}
await browser.close();
finish("e2e_run17_amount");
