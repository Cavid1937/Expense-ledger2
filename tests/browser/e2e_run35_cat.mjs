// Run 35 (2026-11-07): the add form offers the broader income and expense categories in all three languages, and says so when an
// income kind is not earnings (refund, withdrawal from savings). Synthetic data only.
import { launch, openPage, openAdd, wait, ok, section, finish, baseSeed, settle } from "./lib.mjs";
const browser = await launch();
const labels = (page) => page.evaluate(() => [...document.querySelectorAll(".cat-scroll .cat-tile")].map((b) => b.getAttribute("aria-label")));
const toIncome = (page) => page.evaluate(() => [...document.querySelectorAll(".type-pick")][1].click());
const pick = (page, label) => page.evaluate((l) => { const b = [...document.querySelectorAll(".cat-scroll .cat-tile")].find((x) => x.getAttribute("aria-label") === l); if (b) b.click(); return !!b; }, label);
const hint = (page) => page.evaluate(() => { const e = document.querySelector('[data-section="add-not-income"]'); return e ? e.innerText : ""; });

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
await browser.close();
finish("e2e_run35_cat");
