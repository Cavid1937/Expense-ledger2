// Phase 2 browser checks (2026-10-26) in the real bundled app: Safe to Spend income timing, the Analytics per-day tile,
// and the backup reminder. Dates are relative to the real today, so the expected numbers are computed below.
import { openSafe, launch, openPage, state, toast, clickText, openSettings, openData, tab, wait, ok, section, finish, tx, baseSeed, TODAY, daysAgo, ymd, bodyText } from "./lib.mjs";
const browser = await launch();
const now = new Date(), y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
const lastDay = new Date(y, m + 1, 0).getDate();
if (d === lastDay) throw new Error("e2e_phase2 cannot run on the last day of a month (it needs a later date in the same month) — rerun tomorrow");
const LATER = ymd(new Date(y, m, d + 1));
const iso = (daysBack) => new Date(Date.now() - daysBack * 86400000).toISOString();
const safeCard = async (page) => { await openSafe(page); return page.evaluate(() => (document.querySelector(".safe-card") || {}).innerText || ""); };

section("E2-B. Safe to Spend card: income dated later this month is shown but not counted");
// baseSeed: income 2000 today, expenses 10 + 20 today, savings floor 300, goal contribution 500 (larger → reserve 500).
let page = await openPage(browser, { seed: baseSeed({ transactions: [...baseSeed().transactions, tx({ type: "income", category: "salary", amount: 1000, merchant: "Bonus", date: LATER })] }) });
let card = await safeCard(page);
ok(/Income received so far\s*2,000\.00/.test(card), "row 'Income received so far' shows 2,000.00 (today's income only)", card);
ok(/Expected later this month \(not counted\)\s*1,000\.00/.test(card) && /Counts income received so far/.test(await page.evaluate(() => document.body.innerText)), "a separate row shows the 1,000.00 dated later as expected, not counted", card);
ok(/^[\s\S]*?1,470\.00/.test(card) && !/2,470\.00/.test(card), "Safe to Spend = 2000 − 500 reserve − 30 spent = 1,470.00 (not 2,470.00)", card.slice(0, 120));
ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
await page.close();
page = await openPage(browser);
card = await safeCard(page);
ok(/Income received so far/.test(card) && !/Expected later this month/.test(card), "without future-dated income the 'expected' row is not shown", card);
await page.close();

section("E2-A. Analytics per-day tile");
const flat = []; for (let i = 1; i <= d; i++) flat.push(tx({ merchant: "Flat", amount: 10, date: ymd(new Date(y, m, i)) }));
page = await openPage(browser, { seed: baseSeed({ transactions: [...flat, tx({ type: "income", category: "salary", amount: 2000, date: TODAY })] }) });
await tab(page, "Monthly");
let txt = await bodyText(page);
const hasWeekend = Array.from({ length: d }, (_, i) => new Date(y, m, i + 1).getDay()).some((g) => g === 0 || g === 6);
// .stat-lbl is upper-cased by CSS, so innerText comparisons ignore case.
if (hasWeekend) ok(/Per day, weekdays = weekends/i.test(txt) && !/heavier/i.test(txt), "₼10 every day so far → 'Per day, weekdays = weekends' (no 'heavier' claim)", txt.match(/.{0,40}Per day.{0,40}/i)?.[0]);
else ok(/Per day: too early to compare/i.test(txt), "no weekend day yet this month → 'too early to compare'");
await page.close();
const split = []; for (let i = 1; i <= d; i++) { const g = new Date(y, m, i).getDay(); split.push(tx({ merchant: "S", amount: (g === 0 || g === 6) ? 30 : 10, date: ymd(new Date(y, m, i)) })); }
split.push(tx({ merchant: "Planned", amount: 5000, date: LATER }));
page = await openPage(browser, { seed: baseSeed({ transactions: split }) });
await tab(page, "Monthly"); txt = await bodyText(page);
if (hasWeekend) ok(/30\.00 ₼\s*Per weekend day \(higher\)/i.test(txt), "weekends 30/day vs weekdays 10/day → '30.00 ₼ Per weekend day (higher)'; the 5,000 planned later is ignored", txt.match(/.{0,40}Per weekend.{0,20}/i)?.[0]);
else ok(/Per day: too early to compare/i.test(txt) && !/Per weekend day/i.test(txt), "no weekend day yet this month → 'too early to compare'; the 5,000 planned later does not create a weekend figure");
ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
await page.close();

section("E2-D. Analytics 'by day of week' card shows the typical purchase, not an outlier-driven average");
// Day 1: 1000 + 4 × 5 (average 204.00, median 5.00); every other day so far: one purchase of 5. Every weekday's typical purchase is 5.
const dowSeed = [1000, 5, 5, 5, 5].map((a) => tx({ merchant: "D", amount: a, date: ymd(new Date(y, m, 1)) }));
for (let i = 2; i <= d; i++) dowSeed.push(tx({ merchant: "D", amount: 5, date: ymd(new Date(y, m, i)) }));
page = await openPage(browser, { seed: baseSeed({ transactions: dowSeed }) });
await tab(page, "Monthly"); await wait(300);
const dowCard = await page.evaluate(() => { const c = [...document.querySelectorAll(".a-card")].find((e) => /Typical Purchase by Day of Week/i.test(e.innerText)); return c ? { text: c.innerText, widths: [...c.querySelectorAll(".dow-row")].map((r) => r.children[1].firstChild.style.width), amounts: [...c.querySelectorAll(".dow-row")].map((r) => r.children[2].innerText.trim()) } : null; });
ok(dowCard && /Median amount per transaction/.test(dowCard.text), "the card is titled 'Typical Purchase by Day of Week' and says it shows the median per transaction", dowCard && dowCard.text.slice(0, 120));
// Every row, including the weekday of day 1, must read 5.00 ₼ (an average would read e.g. 204.00 or 129.38, depending on the date).
ok(dowCard && dowCard.amounts.length > 0 && dowCard.amounts.every((a) => a === "5.00 ₼"), "every weekday shows 5.00 ₼ (typical), including the day with one 1,000 purchase", dowCard && dowCard.amounts);
ok(dowCard && dowCard.widths.length > 0 && dowCard.widths.every((w) => w === "100%"), "every weekday bar is equally long (same typical purchase); no bar towers because of one purchase", dowCard && dowCard.widths);
ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
await page.close();

section("E2-C. Backup reminder");
const banners = (page) => page.evaluate(() => [...document.querySelectorAll(".backup-banner")].map((b) => b.innerText));
page = await openPage(browser, { seed: baseSeed({ lastBackup: iso(0.01) }) });
let b = (await banners(page)).join(" | ");
ok(/A backup file was created/.test(b) && /I have the file/.test(b) && !/Back up your data to avoid losing it/.test(b), "file created but never confirmed → the banner asks the user to confirm (not hidden for 7 days)", b);
await clickText(page, ".backup-banner-btn", /I have the file/); await wait(250);
let st = await state(page);
ok(typeof st.backupConfirmedAt === "string" && Date.parse(st.backupConfirmedAt) >= Date.parse(st.lastBackup), "tapping 'I have the file' stores backupConfirmedAt (not earlier than the file's creation)", st.backupConfirmedAt);
ok(!(await banners(page)).some((t) => /backup/i.test(t)), "…and the reminder disappears");
ok(/next reminder is in 7 days/.test(await toast(page, 50)), "…with a short confirmation toast");
await page.reload(); await page.waitForSelector(".tabbar"); await wait(400);
ok(!(await banners(page)).some((t) => /backup/i.test(t)), "after a reload the confirmed backup still suppresses the reminder (persisted)");
await openData(page); txt = await bodyText(page);
ok(/Last backup file created/.test(txt) && /You confirmed you have it on/.test(txt), "Import / Export shows the file's creation date and that the user confirmed it");
await clickText(page, ".io-page .btn", /backup file/); await wait(300);
st = await state(page);
ok(Date.parse(st.lastBackup) > Date.parse(st.backupConfirmedAt), "a new export records a newer file date; the earlier confirmation is not carried over to it");
await wait(300);
b = (await banners(page)).join(" | ");
ok(/A backup file was created/.test(b), "…so the confirm banner returns for the new file", b);
await page.close();
page = await openPage(browser, { seed: baseSeed({ lastBackup: iso(8), backupConfirmedAt: iso(8) }) });
b = (await banners(page)).join(" | ");
ok(/Back up your data to avoid losing it/.test(b), "last confirmed backup 8 days ago → 'Back up your data' reminder", b);
await page.evaluate(() => [...document.querySelectorAll(".backup-banner")].find((x) => /Back up your data/.test(x.innerText)).querySelector(".backup-dismiss").click()); await wait(200);
ok(!(await banners(page)).some((t) => /Back up your data/.test(t)), "dismiss hides it for this visit");
await page.close();
page = await openPage(browser, { seed: baseSeed({ lastBackup: iso(1), backupConfirmedAt: iso(1) }) });
ok(!(await banners(page)).some((t) => /backup/i.test(t)), "confirmed yesterday → no reminder");
ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
await finish("e2e_phase2", browser);
