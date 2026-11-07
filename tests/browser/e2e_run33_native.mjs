// Run 33 (APK level): text shared into the app, and the screen-security switch, against a MOCK of the Android shell (window.LedgerNative). The website must show none of it.
// Synthetic data only. Nothing may be saved by receiving shared text.
import { launch, openPage, state, openSettings, wait, ok, section, finish, baseSeed, settle } from "./lib.mjs";
const browser = await launch();
const SHELL = `window.__scr=false;window.__scrFail=false;window.__setCalls=[];window.__share=null;
window.LedgerNative={installId:function(){return "ID-1";},
 screenSecure:{get:function(){return Promise.resolve(window.__scr);},set:function(v){window.__setCalls.push(v);if(window.__scrFail)return Promise.reject(new Error("no"));window.__scr=v;return Promise.resolve(v);}},
 onSharedText:function(cb){window.__share=cb;return function(){window.__share=null;};}}`;
const overlayValues = (page) => page.evaluate(() => [...document.querySelectorAll(".add-overlay input")].map((i) => i.value));
const bodyText = (page) => page.evaluate(() => document.body.innerText);
const send = async (page, txt) => { await page.evaluate((x) => window.__share(x), txt); await page.waitForSelector(".add-overlay", { timeout: 4000 }).catch(() => {}); await wait(500); };

section("R33-N1. Website: none of the Android-only items");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page); await openSettings(page);
  ok(await page.evaluate(() => !document.querySelector('[data-section="screen-secure"]')), "no screen-security switch on the website");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R33-N2. Screen security switch inside the Android app");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }), pre: SHELL }); await settle(page); await openSettings(page);
  const sw = () => page.evaluate(() => (document.querySelector('[data-section="screen-secure-toggle"]') || {}).getAttribute?.call(document.querySelector('[data-section="screen-secure-toggle"]'), "aria-checked"));
  ok(await page.evaluate(() => !!document.querySelector('[data-section="screen-secure"]')), "the switch is shown inside the Android app");
  ok((await bodyText(page)).includes("Hide app in recent apps and block screenshots"), "it is named in plain words");
  ok((await sw()) === "false", "it starts off (the shell reports off)");
  await page.evaluate(() => document.querySelector('[data-section="screen-secure-toggle"]').click()); await wait(300);
  ok((await sw()) === "true" && JSON.stringify(await page.evaluate(() => window.__setCalls)) === "[true]", "switching on asks the shell for true and shows on");
  await page.evaluate(() => document.querySelector('[data-section="screen-secure-toggle"]').click()); await wait(300);
  ok((await sw()) === "false", "switching off shows off again");
  await page.evaluate(() => { window.__scrFail = true; document.querySelector('[data-section="screen-secure-toggle"]').click(); }); await wait(400);
  ok((await sw()) === "false" && /Could not change this setting/.test(await bodyText(page)), "if the shell fails, the switch stays off and the user is told");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R33-N3. Shared text opens the add form, filled in, and saves nothing");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }), pre: SHELL }); await settle(page);
  const before = (await state(page)).transactions.length;
  await send(page, "Purchase 12.50 AZN at Bravo Market. Balance: 540.00 AZN");
  const v = await overlayValues(page);
  ok(v.includes("12.5") || v.includes("12.50"), "the amount 12.5 is in the form (the balance 540 is not used)", v);
  ok(v.includes("Bravo Market"), "the merchant 'Bravo Market' is in the form", v);
  ok(/Filled in from the shared message\. Check the details, then save\./.test(await bodyText(page)), "a notice says to check the details and save");
  ok((await state(page)).transactions.length === before, "nothing was saved by receiving the text");
  ok(!(JSON.stringify(await page.evaluate(() => JSON.parse(localStorage.getItem("expense_ledger_v5")))).includes("Balance")), "the message text itself is not stored anywhere in the ledger");
  await page.evaluate(() => document.querySelector(".add-overlay .btn-primary.btn-full").click()); await wait(600);
  const after = await state(page);
  ok(after.transactions.length === before + 1 && after.transactions.some((x) => x.merchant === "Bravo Market" && x.amount === 12.5 && x.type === "expense"), "only when the user presses Save is the entry created (12.5, expense, Bravo Market)", after.transactions.map((x) => [x.merchant, x.amount]));
  await page.close();
}
section("R33-N4. Income, unclear text, no amount");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }), pre: SHELL }); await settle(page);
  await send(page, "Maaş mədaxil: 2450.75 AZN");
  ok(await page.evaluate(() => /Income/i.test((document.querySelector(".add-overlay .seg-btn.active, .add-overlay [aria-pressed='true'], .add-overlay .type-btn.active") || {}).textContent || "")) || (await overlayValues(page)).includes("2450.75"), "salary text: income amount 2450.75 in the form", await overlayValues(page));
  await page.keyboard.press("Escape"); await wait(400);
  if (await page.$(".discard-overlay")) { await page.evaluate(() => document.querySelector(".discard-overlay .discard-leave, .discard-overlay .btn-primary").click()); await wait(400); }
  await send(page, "Payment 10 AZN fee 0.50 AZN");
  ok(/Several amounts or kinds were found/.test(await bodyText(page)), "two different amounts: the 'check everything' notice");
  await page.keyboard.press("Escape"); await wait(400);
  if (await page.$(".discard-overlay")) { await page.evaluate(() => document.querySelector(".discard-overlay .discard-leave, .discard-overlay .btn-primary").click()); await wait(400); }
  await send(page, "See you at 5");
  ok(/No amount found in that message\. Enter it yourself\./.test(await bodyText(page)) && (await overlayValues(page)).every((x) => x === "" || /^\d{4}-\d{2}-\d{2}$/.test(x)), "no amount: the form opens empty with the 'enter it yourself' notice");
  await page.close();
}
section("R33-N5. az and ru wording");
for (const [l, sw, chk] of [["az", "Son proqramlarda gizlət və ekran şəkillərini blokla", "Paylaşılan mesajdan dolduruldu"], ["ru", "Скрывать приложение в недавних и блокировать снимки экрана", "Заполнено по полученному сообщению"]]) {
  const page = await openPage(browser, { seed: baseSeed({ language: l }), pre: SHELL }); await settle(page);
  await send(page, "Purchase 5 AZN at Shop");
  ok((await bodyText(page)).includes(chk), `${l}: the shared-text notice is translated`);
  await page.keyboard.press("Escape"); await wait(400);
  if (await page.$(".discard-overlay")) { await page.evaluate(() => document.querySelector(".discard-overlay .discard-leave, .discard-overlay .btn-primary").click()); await wait(400); }
  await openSettings(page);
  ok((await bodyText(page)).includes(sw), `${l}: the screen-security switch is translated`);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${l}: no horizontal scroll`);
  await page.close();
}
section("R33-N6. Home-screen widget settings");
const WSHELL = (can) => `window.__w=[];window.__pin=0;window.LedgerNative={installId:function(){return "ID-1";},
 widget:{canPin:function(){return Promise.resolve(${can});},requestPin:function(){window.__pin++;return Promise.resolve(true);},set:function(o){window.__w.push(JSON.parse(JSON.stringify(o)));return Promise.resolve(true);}}}`;
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page); await openSettings(page);
  ok(await page.evaluate(() => !document.querySelector('[data-section="widget"]')), "website: no widget section");
  await page.close();
}
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }), pre: WSHELL(true) }); await settle(page); await openSettings(page);
  const calls = () => page.evaluate(() => window.__w);
  const c0 = await calls();
  ok(c0.length > 0 && c0.every((x) => x.amount === ""), "by default every update sent to the widget has NO amount (the line stays hidden)", c0);
  ok(await page.evaluate(() => !!document.querySelector('[data-section="widget-add"]')) && await page.evaluate(() => document.querySelector('[data-section="widget-show"]').getAttribute("aria-checked")) === "false", "the Add button is offered and 'show amount' is off");
  await page.evaluate(() => document.querySelector('[data-section="widget-show"]').click()); await wait(400);
  const c1 = (await calls()).pop();
  ok(c1 && c1.label === "Safe to Spend" && /\d/.test(c1.amount) && /₼/.test(c1.amount), "switching the amount on sends label 'Safe to Spend' and a number with the currency", c1);
  await page.evaluate(() => document.querySelector('[data-section="widget-show"]').click()); await wait(400);
  ok((await calls()).pop().amount === "", "switching it off sends an empty amount again");
  await page.evaluate(() => document.querySelector('[data-section="widget-add"]').click()); await wait(400);
  ok((await page.evaluate(() => window.__pin)) === 1 && /Your phone will ask you to confirm/.test(await bodyText(page)), "Add to home screen asks the launcher once and tells the user to confirm");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
{
  const page = await openPage(browser, { seed: baseSeed({ language: "ru" }), pre: WSHELL(false) }); await settle(page); await openSettings(page);
  ok(await page.evaluate(() => !document.querySelector('[data-section="widget-add"]')) && /Чтобы добавить самому/.test(await bodyText(page)), "ru: a launcher that cannot be asked shows the how-to-add-by-hand text instead of a button");
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "ru: no horizontal scroll");
  await page.close();
}await finish("e2e_run33_native", browser);
