// Run 69 in the real bundled app: "Help improve the app". Off unless turned on; while off the page never contacts the sharing project.
// Every request the page tries is recorded (the test harness then blocks it), with its body. Synthetic data only.
import { launch, openPage, openSettings, ok, section, finish, baseSeed, tx, wait, TODAY } from "./lib.mjs";
const browser = await launch();
const NOTE = "ZzqLearnNote41";
const seed = () => baseSeed({ language: "en", transactions: [
  tx({ merchant: "Bravo Market", category: "food", amount: 23.45, note: NOTE }), tx({ merchant: "Bravo Market", category: "food", amount: 67.89 }),
  tx({ merchant: "Flower Shop", category: "gifts", amount: 31 }), tx({ merchant: "Flower Shop", category: "gifts", amount: 31 }),
] });
const record = (page) => { const seen = []; page.on("request", (r) => { const u = r.url(); if (/supabase\.co/.test(u)) seen.push({ url: u, body: r.postData() || "" }); }); return seen; };
const learnKey = "expense_ledger_v5__learn";
// the page's own fetch is wrapped so the body of each sharing request can be read (the request itself is still blocked)
const SPY = `{ const f = window.fetch; window.__learn = []; window.fetch = function (u, o) { if (/supabase\\.co/.test(String(u))) window.__learn.push(String((o && o.body) || "")); return f.apply(this, arguments); }; }`;

section("R69-B1. Off by default: the card is there, the switch is off and nothing is sent");
{
  const page = await openPage(browser, { seed: seed() }); const seen = record(page);
  await openSettings(page); await wait(600);
  ok(await page.evaluate(() => (document.querySelector('[data-section="learn-toggle"]') || {}).getAttribute?.("aria-checked")) === "false", "the 'Help improve the app' switch is shown and off");
  await page.evaluate(() => document.querySelector('[data-section="learn-preview-toggle"]').click()); await wait(500);
  const pv = await page.evaluate(() => (document.querySelector('[data-section="learn-preview"]') || {}).innerText || "");
  ok(/Bravo Market/.test(pv) && !/Flower Shop/.test(pv) && !/23\.45|67\.89|ZzqLearnNote/.test(pv), "the preview lists the place used twice, not the gift place, and no amount or note", pv);
  await page.reload(); await wait(1500);
  ok(seen.length === 0, "with the switch off, nothing is sent to the sharing project (also after a reload)", seen);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R69-B2. Turning it on shares only what the preview showed");
{
  const page = await openPage(browser, { seed: seed(), pre: SPY }); const seen = record(page);
  await openSettings(page); await wait(500);
  await page.evaluate(() => document.querySelector('[data-section="learn-toggle"]').click()); await wait(1200);
  const st = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "null"), learnKey);
  ok(st && st.on === true, "the choice is remembered", st);
  ok(seen.length >= 2 && seen.every((s) => /^https:\/\/qkztocsrxhubsljtsjpd\.supabase\.co\/rest\/v1\/(usage_pings|place_reports|crash_reports)$/.test(s.url)), "it adds rows to the project's own tables only", seen.map((s) => s.url));
  const all = (await page.evaluate(() => window.__learn || [])).join("\n");
  ok(/Bravo Market/.test(all) && !/23\.45|67\.89|ZzqLearnNote|Flower Shop|amount|date/i.test(all), "the place is shared; no amount, note, date or gift place is in any request body", all);
  ok(!st.lastDay, "the server did not accept (blocked in this test), so the day is not marked as sent and will be tried again");
  await page.close();
}

section("R69-B3. At most once a day");
{
  const pre = `localStorage.setItem("${learnKey}", JSON.stringify({ on: true, lastDay: "${TODAY}", sent: [], crashSent: "" }))`;
  const page = await openPage(browser, { seed: seed(), pre }); const seen = record(page);
  await page.reload(); await wait(1500);
  ok(seen.length === 0, "already sent today: nothing is sent again", seen);
  await page.close();
}
await browser.close();
finish("e2e_run69_learn");
