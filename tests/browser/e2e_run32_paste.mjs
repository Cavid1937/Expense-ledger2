// Run 32 (backlog item 1): pasting a thousands-style amount into the add form. Pasted 1,234 or 1.234 means 1234; typing keeps the older rule. Synthetic data only.
import { launch, openPage, openAdd, state, wait, ok, section, finish, baseSeed, clickText, settle } from "./lib.mjs";
const browser = await launch();
const val = (page) => page.$eval(".amount-input", (el) => el.value);
const pasteReal = async (page, text) => { await page.$eval(".amount-input", (el, t) => { el.focus(); const dt = new DataTransfer(); dt.setData("text/plain", t); el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true })); }, text); await wait(120); return val(page); };
section("R32-P1. Paste into the amount box");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page); await openAdd(page);
  await page.evaluate(() => document.querySelector(".amount-zone").click()); await wait(200);
  ok(await pasteReal(page, "1,234") === "1234", "pasting 1,234 shows 1234");
  ok(await pasteReal(page, "1.234") === "1234", "pasting 1.234 shows 1234");
  ok(await pasteReal(page, "1.234,56") === "1234.56", "pasting 1.234,56 shows 1234.56");
  ok(await pasteReal(page, "145,67") === "145.67", "pasting 145,67 shows 145.67");
  ok(await pasteReal(page, " 12 ") === "12", "pasting ' 12 ' shows 12");
  await pasteReal(page, "1,234");
  await clickText(page, ".add-overlay .btn-primary", /record (expense|income)/); await wait(500);
  const st = await state(page);
  ok(st.transactions[0].amount === 1234, "recording it saves exactly 1234 as the newest entry", st.transactions.map((t) => t.amount));
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R32-P2. Typing is unchanged");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page); await openAdd(page);
  await page.evaluate(() => document.querySelector(".amount-zone").click()); await wait(200);
  await page.click(".amount-input"); await page.keyboard.type("1.234", { delay: 15 }); await wait(80);
  ok(await val(page) === "1.23", "typing 1.234 still shows 1.23");
  await page.close();
}
await finish("e2e_run32_paste", browser);
