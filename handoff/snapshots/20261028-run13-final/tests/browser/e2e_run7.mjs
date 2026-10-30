// Run 7 (2026-10-27) in the real bundled app: Monthly + Analytics merged into one month-aware screen; V9 like-for-like
// comparison wording; V1 no short month name slotted into sentences; V2 surplus/deficit named; V3 date read-out; V4 exact
// small amounts. Dates are relative to the real today; expected numbers are computed below from the seeded entries.
import { launch, openPage, openSettings, openAdd, tab, wait, settle, ok, section, finish, tx, baseSeed, ymd, bodyText } from "./lib.mjs";
const browser = await launch();
const now = new Date(), y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
const dim = (yy, mm) => new Date(yy, mm + 1, 0).getDate();
const D = (mo, day) => ymd(new Date(y, mo, Math.min(day, dim(y, mo))));
// Three months back: 300; two months back: nothing (a real empty month in between); last month: 100 on day 1 and 500 on
// its last day; this month: 40 on day 1 (+ income 1,050).
const seedTx = [tx({ merchant: "Old", amount: 300, date: D(m - 3, 10) }),
  tx({ merchant: "Early", amount: 100, date: D(m - 1, 1) }), tx({ merchant: "Late", amount: 500, date: D(m - 1, 31) }),
  tx({ merchant: "Now", amount: 40, date: D(m, 1) }), tx({ type: "income", category: "salary", amount: 1050, merchant: "Employer", date: D(m, 1) })];
const lastPrevDay = dim(y, m - 1);
const prevWindow = 100 + (d >= lastPrevDay ? 500 : 0);          // same days of last month (1..today)
const seed = (o = {}) => baseSeed({ transactions: seedTx, safeToSpend: { enabled: false, savingsTarget: 0 }, goals: [], ...o });
const money = (n) => n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

section("R7-1. One month-aware screen instead of Monthly + Analytics");
let page = await openPage(browser, { seed: seed() });
const tabs = await page.evaluate(() => [...document.querySelectorAll(".tab-btn")].map((b) => b.innerText.trim()));
// Redesign (2026-10-27): five tabs; the merged month screen is the Analytics tab and there is no second analytics screen.
ok(tabs.length === 5 && tabs.filter((x) => /Analytics|Monthly/i.test(x)).length === 1 && tabs.join("|") === "Home|Transactions|Analytics|Goals|More", "the tab bar has 5 sections (Home, Transactions, Analytics, Goals, More); one month-aware analytics screen", tabs);
await tab(page, "Monthly"); await settle(page);
let txt = await bodyText(page);
ok(/spent/i.test(txt) && /Trends up to today/i.test(txt) && /6-Month Overview|6-month/i.test(txt) && /does not change with the month selected above/.test(txt), "Monthly shows the month summary AND the former Analytics trends, which say they do not follow the selected month", txt.slice(0, 300));

section("R7-2. Every calendar month can be selected, including an empty one; figures follow the month");
const spentNow = await page.evaluate(() => document.querySelector(".month-stat-val").innerText);
await page.evaluate(() => document.querySelector('.month-nav-btn[aria-label="Previous month"]').click()); await wait(300);
const prevSpent = await page.evaluate(() => document.querySelector(".month-stat-val").innerText);
ok(/600\.00/.test(prevSpent) && /40\.00/.test(spentNow), `this month 40.00 → previous month 600.00 (no stale figure)`, { spentNow, prevSpent });
await page.evaluate(() => document.querySelector('.month-nav-btn[aria-label="Previous month"]').click()); await wait(300);
txt = await bodyText(page);
ok(/0\.00 ₼/.test(await page.evaluate(() => document.querySelector(".month-stat-val").innerText)) && /No transactions/i.test(txt), "two months back (no entries) can be selected and shows an empty month, not skipped", txt.slice(0, 200));
await page.evaluate(() => document.querySelector('.month-nav-btn[aria-label="Previous month"]').click()); await wait(300);
ok(/300\.00/.test(await page.evaluate(() => document.querySelector(".month-stat-val").innerText)), "three months back shows its 300.00");
ok(await page.evaluate(() => document.querySelector('.month-nav-btn[aria-label="Previous month"]').disabled), "…and is the first selectable month (Previous is disabled)");
await page.close();
// A finished month compared with a non-empty month before it: last month 600 vs the month before 200 → 400 more.
page = await openPage(browser, { seed: seed({ transactions: [tx({ merchant: "A", amount: 200, date: D(m - 2, 5) }), tx({ merchant: "B", amount: 600, date: D(m - 1, 5) }), tx({ merchant: "C", amount: 10, date: D(m, 1) })] }) });
await tab(page, "Monthly"); await settle(page);
await page.evaluate(() => document.querySelector('.month-nav-btn[aria-label="Previous month"]').click()); await wait(300);
txt = await bodyText(page);
ok(/400\.00 ₼ more than the previous month/.test(txt) && /previous month: 200\.00/.test(txt) && !/same days last month|Days 1–/.test(txt), "a finished month: '400.00 ₼ more than the previous month' (600 vs 200, whole months) — no 'same days' wording", txt.match(/.{0,40}previous month.{0,20}/)?.[0]);
await page.close();

section("R7-3. V9: the current month is compared with the same days of last month (en)");
page = await openPage(browser, { seed: seed() });
txt = await bodyText(page);
const diff = Math.abs(40 - prevWindow);
ok(new RegExp(`${money(diff).replace(".", "\\.")} ₼ less than the same days last month`).test(txt), `Home: 40.00 vs ${money(prevWindow)} (days 1–${d} of last month) → ${money(diff)} less than the same days last month`, txt.match(/.{0,30}same days.{0,20}/)?.[0]);
await tab(page, "Monthly"); await settle(page); txt = await bodyText(page);
ok(new RegExp(`Days 1–${d} of both months compared`).test(txt) && new RegExp(`same days last month: ${money(prevWindow).replace(".", "\\.")}`).test(txt), `Monthly names the window (days 1–${d}) and last month's figure for it (${money(prevWindow)})`, txt.match(/.{0,30}Days 1–.{0,30}/)?.[0]);
ok(/What changed vs the same days last month/i.test(txt), "the 'What changed' title names the same window");
await page.close();

section("R7-4. V1: Azerbaijani sentences no longer contain a short month name");
page = await openPage(browser, { seed: seed({ language: "az" }) });
txt = await bodyText(page);
const shorts = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avq", "sen", "okt", "noy", "dek"];
ok(/keçən ayın eyni günləri ilə müqayisədə/.test(txt) && !shorts.some((s) => new RegExp(`\\b${s} ilə müqayisədə`, "i").test(txt)), "Home (az): 'keçən ayın eyni günləri ilə müqayisədə … az' and no 'sen ilə müqayisədə'", txt.match(/.{0,40}müqayisədə.{0,20}/)?.[0]);
await tab(page, "Monthly");   /* redesign: by position (the az label is now "Analitika") */ await settle(page); txt = await bodyText(page);
ok(!shorts.some((s) => new RegExp(`\\b${s} ilə müqayisədə`, "i").test(txt)) && /Hər iki ayın 1–\d+ arası günləri müqayisə edilir/.test(txt), "Monthly (az): the window line is shown, no short month name in a sentence", txt.match(/.{0,30}Hər iki.{0,40}/)?.[0]);
await page.close();

section("R7-5. V2: Settings names a surplus or a deficit in words");
page = await openPage(browser, { seed: baseSeed({ transactions: [tx({ amount: 900 }), tx({ type: "income", category: "salary", amount: 400 })] }) });
await openSettings(page); txt = await page.evaluate(() => document.querySelector(".sheet").innerText);
ok(/Net deficit\s*500\.00/.test(txt), "income 400, expenses 900 → 'Net deficit 500.00' (not an unsigned 'Net 500.00' in red only)", txt.match(/.{0,20}Net.{0,30}/)?.[0]);
await page.close();
page = await openPage(browser, { seed: baseSeed({ transactions: [tx({ amount: 100 }), tx({ type: "income", category: "salary", amount: 400 })] }) });
await openSettings(page); txt = await page.evaluate(() => document.querySelector(".sheet").innerText);
ok(/Net surplus\s*300\.00/.test(txt), "income 400, expenses 100 → 'Net surplus 300.00'", txt.match(/.{0,20}Net.{0,30}/)?.[0]);
await page.close();

section("R7-6. V4: Home tiles show exact amounts below 10,000, and they fit at 320 px");
for (const width of [320, 390]) {
  page = await openPage(browser, { width, seed: baseSeed({ transactions: [tx({ amount: 9999.99 }), tx({ type: "income", category: "salary", amount: 1050 })], safeToSpend: { enabled: false, savingsTarget: 0 } }) });
  const tiles = await page.evaluate(() => [...document.querySelectorAll(".hero-stat-val")].map((e) => ({ t: e.innerText, cut: e.scrollWidth > e.clientWidth + 1 })));
  ok(tiles.some((x) => x.t === "1,050.00 ₼") && tiles.some((x) => x.t === "9,999.99 ₼") && !tiles.some((x) => /k ₼/.test(x.t)) && tiles.every((x) => !x.cut), `${width}px: income tile "1,050.00 ₼" (was "1.1k ₼"), expenses "9,999.99 ₼", nothing cut off`, tiles);
  await page.close();
}
page = await openPage(browser, { seed: baseSeed({ transactions: [tx({ type: "income", category: "salary", amount: 25500 })] }) });
ok((await page.evaluate(() => [...document.querySelectorAll(".hero-stat-val")].map((e) => e.innerText))).includes("≈25.5k ₼"), "25,500 still shortens, marked as approximate: '≈25.5k ₼'");
await page.close();

section("R7-7. V3: the Add form repeats the chosen date in the interface language");
page = await openPage(browser, { seed: seed({ language: "az" }) });
await openAdd(page);
const azMonths = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avqust", "sentyabr", "oktyabr", "noyabr", "dekabr"];
const readout = await page.evaluate(() => (document.querySelector(".add-overlay .date-readout") || {}).innerText || "");
ok(readout === `${d} ${azMonths[m]} ${y}`, `az: under the date box "${d} ${azMonths[m]} ${y}" (the box itself follows the phone's language)`, readout);
await page.close();

section("R7-8. The 4-tab bar fits in Azerbaijani at 320 / 360 / 390 px");
for (const width of [320, 360, 390]) {
  page = await openPage(browser, { width, seed: seed({ language: "az" }) });
  const bad = await page.evaluate(() => [...document.querySelectorAll(".tab-btn")].filter((b) => { const l = b.querySelector(".tab-lbl") || b; return l.scrollWidth > l.clientWidth + 1 || l.getBoundingClientRect().right > b.getBoundingClientRect().right + 1; }).map((b) => b.innerText));
  ok(bad.length === 0 && page.errors.length === 0, `${width}px az: all 4 tab labels inside their tab, no JavaScript errors`, { bad, err: page.errors[0] });
  await page.close();
}
await finish("e2e_run7", browser);
