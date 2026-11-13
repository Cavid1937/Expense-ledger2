// Run 66 in the real bundled app: the Reminders settings get one main switch and say what the phone allows. The Android app is stood in for by a
// small fake (window.LedgerNative.reminders) that records what the app asks it to schedule. Synthetic data only.
import { launch, openPage, openSettings, ok, section, finish, baseSeed, tx, wait, TODAY } from "./lib.mjs";
const browser = await launch();
const SHELL = (perm) => `window.LedgerNative={reminders:{requestPermission:async()=>({granted:true}),permissionState:async()=>"${perm}",sync:function(p){(window.__calls=window.__calls||[]).push(JSON.parse(JSON.stringify(p)));return Promise.resolve();}}}`;
const seed = () => baseSeed({ language: "en", transactions: [tx({ merchant: "Azercell", category: "digital", amount: 15, date: TODAY, recurring: true, recurFreq: "monthly" })] });
const lastItems = (page) => page.evaluate(() => { const c = window.__calls || []; return c.length ? c[c.length - 1].items.length : -1; });
const visible = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); return !!e && e.getBoundingClientRect().height > 0 && !e.closest('[aria-hidden="true"]'); }, sel);

section("R66-B1. One main switch over all reminders");
{
  const page = await openPage(browser, { seed: seed(), pre: SHELL("granted") }); await openSettings(page); await wait(400);
  ok(await page.evaluate(() => document.querySelector('[data-section="rem-master"]').getAttribute("aria-checked")) === "true", "the main switch is there and on by default");
  ok(/allows notifications/.test(await page.evaluate(() => (document.querySelector('[data-section="rem-perm"]') || {}).innerText || "")), "it says the phone allows notifications from this app");
  await page.evaluate(() => document.querySelector('[data-section="rem-recurring"]').click()); await wait(700);
  ok((await lastItems(page)) > 0, "turning on repeating-payment reminders asks the phone to schedule them", await lastItems(page));
  await page.evaluate(() => document.querySelector('[data-section="rem-master"]').click()); await wait(800);
  ok((await lastItems(page)) === 0 && !(await visible(page, '[data-section="rem-recurring"]')), "main switch off: nothing is scheduled any more, and the choices below are hidden", await lastItems(page));
  ok(/no reminders arrive/.test(await page.evaluate(() => document.querySelector('[data-section="st-reminders"]').innerText)), "it says in words that no reminders will arrive");
  await page.evaluate(() => document.querySelector('[data-section="rem-master"]').click()); await wait(800);
  ok((await lastItems(page)) > 0 && (await page.evaluate(() => document.querySelector('[data-section="rem-recurring"]').getAttribute("aria-checked"))) === "true", "back on: the earlier choice (repeating payments) is still on and scheduled again");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R66-B2. When the phone blocks notifications, the screen says so");
{
  const page = await openPage(browser, { seed: seed(), pre: SHELL("denied") }); await openSettings(page); await wait(400);
  const t = await page.evaluate(() => (document.querySelector('[data-section="rem-perm"]') || {}).innerText || "");
  ok(/blocked/.test(t), "the line says notifications are blocked and where to allow them", t);
  await page.close();
}
await browser.close();
finish("e2e_run66_notif");
