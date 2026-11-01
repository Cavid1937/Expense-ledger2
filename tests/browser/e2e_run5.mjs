// Run 5 (2026-10-27), ChatGPT Review Run 4 R2: the Safe to Spend card says how much of "Recorded expenses" is dated later
// this month, in en / az / ru, so a commitment entered ahead is not read as money already spent. Dates are relative to the
// real today. baseSeed: income 2000 today, expenses 10 + 20 today, goal contribution 500 (larger than the 300 floor).
import { openSafe, launch, openPage, tab, ok, section, finish, tx, baseSeed, ymd, bodyText } from "./lib.mjs";
const browser = await launch();
const now = new Date(), y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
if (d === new Date(y, m + 1, 0).getDate()) throw new Error("e2e_run5 cannot run on the last day of a month (it needs a later date in the same month) — rerun tomorrow");
const LATER = ymd(new Date(y, m, d + 1));
const card = async (page) => { await openSafe(page); return page.evaluate(() => (document.querySelector(".safe-card") || {}).innerText || ""); };
const withLater = (language) => baseSeed({ language, transactions: [...baseSeed().transactions, tx({ merchant: "Landlord", category: "housing", amount: 300, date: LATER })] });
const LABEL = {
  en: /Recorded expenses\s*−330\.00[\s\S]*of which dated later this month \(set aside, not spent yet\)\s*300\.00/,
  az: /Qeydə alınmış xərclər\s*−330[.,]00[\s\S]*o cümlədən bu ayın sonrakı tarixlərinə yazılan \(ayrılıb, hələ xərclənməyib\)\s*300[.,]00/,
  ru: /Записанные расходы\s*−330[.,]00[\s\S]*в том числе на более поздние даты месяца \(отложено, ещё не потрачено\)\s*300[.,]00/,
};

section("R5-B1. The card shows the later-dated part of Recorded expenses, in each language");
for (const lang of ["en", "az", "ru"]) {
  const page = await openPage(browser, { seed: withLater(lang) });
  const c = await card(page);
  ok(LABEL[lang].test(c), `${lang}: 'Recorded expenses −330.00' followed by the later-dated 300.00 (set aside, not spent yet)`, c);
  ok(/1[,\s.]?170[.,]00/.test(c.slice(0, 160)), `${lang}: Safe to Spend = 2000 − 500 reserve − 330 = 1,170.00 (the 300 is still set aside)`, c.slice(0, 160));
  ok(page.errors.length === 0, `${lang}: no JavaScript errors`, page.errors[0]);
  await page.close();
}

section("R5-B2. Without later-dated expenses the extra line is not shown");
let page = await openPage(browser);
let c = await card(page);
ok(/Recorded expenses\s*−30\.00/.test(c) && !/dated later this month/.test(c), "only today's 30.00 recorded → no 'dated later' line", c);
await page.close();

section("R5-B3. Elsewhere the 300 is planned, not spent");
page = await openPage(browser, { seed: withLater("en") });
await tab(page, "Monthly");
const txt = await bodyText(page);
ok(/\+300\.00 ₼ in expenses dated later this month \(not counted yet\)/.test(txt), "Monthly lists +300.00 as dated later this month, not counted yet", txt.match(/.{0,30}dated later.{0,30}/)?.[0]);
await page.close();

section("R5-B4. The new line fits at enlarged text (az, 260 CSS px ≈ 150 % zoom)");
page = await openPage(browser, { seed: withLater("az"), width: 260, height: 700 });
await openSafe(page); const fit = await page.evaluate(() => { const r = [...document.querySelectorAll(".safe-card .safe-row")].map((e) => e.getBoundingClientRect()); return { hs: document.documentElement.scrollWidth - innerWidth, out: r.filter((b) => b.right > innerWidth + 0.5).length }; });
ok(fit.hs <= 0 && fit.out === 0, "no sideways scroll and every Safe to Spend line stays on screen", fit);
await page.close();
await finish("e2e_run5", browser);
