// Run 24: the Recurring page offers the calendar file; the download holds upcoming dates and nothing else changes. Synthetic data only.
import { launch, openPage, tab, wait, ok, section, finish, baseSeed, tx, settle, state, daysAgo } from "./lib.mjs";
const browser = await launch();
const seed = (language) => baseSeed({ language, transactions: [tx({ merchant: "Rent", amount: 500, category: "bills", recurring: true, recurFreq: "monthly", date: daysAgo(40) }), tx({ merchant: "Rent", amount: 500, category: "bills", recurring: true, recurFreq: "monthly", date: daysAgo(10) })] });

section("R24-ICS1. Button, download content, ledger untouched");
{
  const page = await openPage(browser, { seed: seed("en") }); await settle(page);
  await tab(page, "Recurring"); await wait(400);
  const btn = await page.evaluate(() => { const b = document.querySelector('[data-section="bills-ics"]'); return b ? { text: b.innerText, disabled: b.disabled } : null; });
  ok(btn && /calendar/i.test(btn.text) && !btn.disabled, "the calendar button is shown and enabled", btn);
  const before = JSON.stringify((await state(page)).transactions);
  await page.evaluate(() => { window.__ics = null; const o = URL.createObjectURL; URL.createObjectURL = (b) => { b.text().then((t) => { window.__ics = t; }); return o.call(URL, b); }; });
  await page.evaluate(() => document.querySelector('[data-section="bills-ics"]').click()); await wait(600);
  const ics = await page.evaluate(() => window.__ics);
  ok(!!ics && ics.startsWith("BEGIN:VCALENDAR") && (ics.match(/BEGIN:VEVENT/g) || []).length >= 11 && /SUMMARY:Rent · /.test(ics), "the file is a calendar with at least 11 Rent events", (ics || "").slice(0, 120));
  ok(JSON.stringify((await state(page)).transactions) === before, "the ledger is unchanged");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R24-ICS2. az and ru labels");
for (const [l, re] of [["az", /təqvim/i], ["ru", /календар/i]]) {
  const page = await openPage(browser, { seed: seed(l) }); await settle(page);
  await tab(page, "Recurring"); await wait(400);
  ok(re.test(await page.evaluate(() => (document.querySelector('[data-section="bills-ics"]') || {}).innerText || "")), `${l}: button label`);
  await page.close();
}
await finish("e2e_run24_ics", browser);
