// Run 35 (2026-11-07): the add form offers the broader income and expense categories in all three languages, and says so when an
// income kind is not earnings (refund, withdrawal from savings). Synthetic data only.
import { launch, openPage, openAdd, tab, wait, ok, section, finish, baseSeed, settle, tx, TODAY } from "./lib.mjs";
const browser = await launch();
const labels = (page) => page.evaluate(() => [...document.querySelectorAll(".cat-scroll .cat-tile")].map((b) => b.getAttribute("aria-label")));
const toIncome = (page) => page.evaluate(() => [...document.querySelectorAll(".type-pick")][1].click());
const pick = (page, label) => page.evaluate((l) => { const b = [...document.querySelectorAll(".cat-scroll .cat-tile")].find((x) => x.getAttribute("aria-label") === l); if (b) b.click(); return !!b; }, label);
// Run 42: since Run 40 the note sits in a Collapse that stays in the page while closed (height 0, invisible); "shown" now means its Collapse is open.
const hint = (page) => page.evaluate(() => { const e = document.querySelector('[data-section="add-not-income"]'); const c = e && e.closest(".collapse"); return e && (!c || c.classList.contains("is-open")) ? e.innerText : ""; });

const langs = {
  en: { pension: "Pension", refund: "Refunds & Reimbursements", scholarship: "Scholarship & Grants", pets: "Pets", note: /not in your income totals/i },
  az: { pension: "Pensiya", refund: "Geri ödənişlər", scholarship: "Təqaüd və qrantlar", pets: "Ev heyvanları", note: /gəlir cəminə daxil olmur/ },
  ru: { pension: "Пенсия", refund: "Возвраты и компенсации", scholarship: "Стипендия и гранты", pets: "Питомцы", note: /не в сумму доходов/ },
};
for (const [lang, w] of Object.entries(langs)) {
  section(`R35-B1 (${lang}). Income kinds, the not-earnings note, and expense kinds`);
  const page = await openPage(browser, { seed: baseSeed({ language: lang }) }); await page.setViewport({ width: 400, height: 860, deviceScaleFactor: 1, isMobile: true, hasTouch: true }); await settle(page); await openAdd(page);
  let l = await labels(page);
  ok(l.includes(w.pets), `${lang}: the expense list offers "${w.pets}"`, l);
  await toIncome(page); await wait(250);
  l = await labels(page);
  ok(l.includes(w.pension) && l.includes(w.scholarship) && l.includes(w.refund), `${lang}: income offers pension, scholarship and refunds by name`, l);
  ok(l.length >= 15, `${lang}: income now has many kinds`, l.length);
  ok(await pick(page, w.refund), `${lang}: Refunds can be chosen`); await wait(200);
  ok(w.note.test(await hint(page)), `${lang}: choosing Refunds explains it counts in the balance but not in income`, await hint(page));
  ok(await pick(page, w.pension), `${lang}: Pension can be chosen`); await wait(200);
  ok((await hint(page)) === "", `${lang}: an earnings category shows no note`, await hint(page));
  await page.close();
}
section("R35-B2. Run 35b: on screen, income is earnings only; the net and Balance count every money-in entry");
{
  const seed = baseSeed({ language: "en", transactions: [tx({ type: "income", category: "salary", amount: 100, date: TODAY }), tx({ type: "income", category: "refund", amount: 50, date: TODAY }), tx({ type: "income", category: "savout", amount: 25, date: TODAY }), tx({ category: "food", amount: 10, date: TODAY })] });
  const page = await openPage(browser, { seed }); await page.setViewport({ width: 400, height: 860, deviceScaleFactor: 1, isMobile: true, hasTouch: true }); await settle(page);
  const home = await page.evaluate(() => { const h = document.querySelector('[data-section="home-month"]'); return { stats: [...h.querySelectorAll(".hero-stat")].map((s) => s.innerText.replace(/\s+/g, " ").trim()), note: (h.querySelector('[data-section="home-other-in"]') || {}).innerText || "" }; });
  ok(/100/.test(home.stats[0]) && /Income/i.test(home.stats[0]) && !/175/.test(home.stats[0]), "Home: Income shows 100, not 175", home.stats);
  ok(/94%/.test(home.stats[2]), "Home: the kept share uses all money in: (175 - 10) / 175 = 94%", home.stats);
  ok(/75\.00/.test(home.note), "Home: a note says 75.00 of refunds or savings is included, not counted as income", home.note);
  await tab(page, "Monthly"); await wait(400);
  const an = await page.evaluate(() => (document.querySelector('[data-section="an-summary"]') || {}).innerText || "");
  ok(/100\.00/.test(an) && /165\.00/.test(an) && /Net surplus/.test(an) && /75\.00/.test(an), "Analytics: income 100.00, net surplus 165.00, and the 75.00 note", an);
  await page.close();
}
await browser.close();
finish("e2e_run35_cat");
