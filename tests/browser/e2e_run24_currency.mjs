// Run 24: currency is chosen from common currencies with one tap (the free-text box still works). Synthetic data only.
import { launch, openPage, state, wait, ok, section, finish, baseSeed, tx, settle, openSettings } from "./lib.mjs";
const browser = await launch();
const seed = (language) => baseSeed({ language, transactions: [tx({ merchant: "Bravo", amount: 12.5, category: "food" })] });

section("R24-C1. One tap changes the currency everywhere; the ledger is otherwise untouched");
{
  const page = await openPage(browser, { seed: seed("en") }); await settle(page);
  const before = await state(page);
  await openSettings(page);
  const chips = await page.evaluate(() => [...document.querySelectorAll('[data-section="currency-chips"] .chip')].map((b) => b.innerText));
  ok(chips.length === 9 && chips.includes("₼") && chips.includes("$") && chips.includes("€") && chips.includes("₽"), "nine common currencies are offered", chips);
  ok(await page.evaluate(() => document.querySelector('[data-section="currency-chips"] .chip.on').innerText === "₼"), "the current one (₼) is marked");
  await page.evaluate(() => [...document.querySelectorAll('[data-section="currency-chips"] .chip')].find((b) => b.innerText === "€").click()); await wait(400);
  const after = await state(page);
  ok(after.currency === "€", "the saved currency is now €", after.currency);
  ok(JSON.stringify(after.transactions) === JSON.stringify(before.transactions), "no entry was changed");
  ok(await page.evaluate(() => document.querySelector('[data-section="currency-chips"] .chip.on').innerText === "€" && document.querySelector('[data-section="currency-chips"] .chip[aria-pressed="true"]') !== null), "the chip shows the new choice");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R24-C2. Labels in az and ru");
for (const [l, re] of [["az", /Geniş yayılmış valyutalar/], ["ru", /Частые валюты/]]) {
  const page = await openPage(browser, { seed: seed(l) }); await settle(page);
  await openSettings(page);
  ok(await page.evaluate((s) => new RegExp(s).test(document.querySelector('[data-section="currency-chips"]').getAttribute("aria-label")), re.source), `${l}: group label`);
  await page.close();
}
await finish("e2e_run24_currency", browser);
