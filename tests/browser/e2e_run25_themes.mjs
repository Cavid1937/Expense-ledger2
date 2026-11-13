// Run 25: colour themes in the real bundled app. Synthetic data only.
import { launch, openPage, openSettings, wait, ok, section, finish, baseSeed, settle, tx } from "./lib.mjs";
const browser = await launch();
const rootVar = (page, v) => page.evaluate((v) => document.documentElement.style.getPropertyValue(v).trim(), v);
const bodyBg = (page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const pick = (page, id) => page.evaluate((id) => document.querySelector(`[data-theme-id="${id}"]`).click(), id);
const shot = process.env.THEME_SHOTS;
const seed = baseSeed({ language: "en", transactions: [tx({ id: 1790001000001, merchant: "Shop", amount: 12 })] });

section("R25-TB1. Choosing a theme changes the colours at once and is remembered");
{
  const page = await openPage(browser, { seed }); await settle(page); await openSettings(page); await wait(300);
  ok((await page.$$('[data-section="theme-chips"] [role=radio]')).length === 8, "eight themes are offered (Run 70: Graphite, Ivory, Sea glass, the original look and four earlier palettes)");
  ok(await page.evaluate(() => document.querySelector('[data-theme-id="sea"]').getAttribute("aria-checked")) === "true", "a phone that already has data and no saved theme starts on Sea glass (Run 70)");
  await pick(page, "mist"); await wait(400);
  ok((await rootVar(page, "--bg")) === "#DEDCDC" && (await bodyBg(page)) === "rgb(222, 220, 220)", "Mist: the page background is now #DEDCDC");
  ok(await page.evaluate(() => localStorage.getItem("expense_ledger_v5__theme")) === "mist", "the choice is saved under its own key");
  ok(/Theme changed/.test(await page.evaluate(() => (document.querySelector(".toast") || {}).innerText || "")), "a notice confirms it");
  ok(await page.evaluate(() => document.querySelector('[data-theme-id="mist"]').getAttribute("aria-checked")) === "true", "the Mist button shows as selected");
  if (shot) await page.screenshot({ path: `${shot}/mist-settings.png` });
  await page.reload(); await settle(page);
  ok((await rootVar(page, "--bg")) === "#DEDCDC", "after a reload the theme is still applied");
  ok(await page.evaluate(() => JSON.parse(localStorage.getItem("expense_ledger_v5")).transactions.length) === 1, "the ledger is untouched by theme changes");
  if (shot) await page.screenshot({ path: `${shot}/mist-home.png` });
  await openSettings(page); await wait(300); await pick(page, "caspian"); await wait(300);
  ok((await rootVar(page, "--bg")) === "" && await page.evaluate(() => localStorage.getItem("expense_ledger_v5__theme")) === "caspian", "choosing the original look (Caspian) clears the overrides and is saved by name");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R25-TB2. Every theme: no horizontal scroll, accent applied, no errors");
for (const id of ["graphite", "ivory", "caspian", "nordic", "mist", "dusk", "sand"]) {
  const page = await openPage(browser, { seed }); await settle(page); await openSettings(page); await wait(300);
  await pick(page, id); await wait(350);
  const info = await page.evaluate(() => ({ ov: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, scheme: getComputedStyle(document.documentElement).colorScheme, th: document.documentElement.getAttribute("data-theme") }));
  ok(!info.ov && info.th === id, `${id}: applied without horizontal scroll`, info);
  if (shot) await page.screenshot({ path: `${shot}/${id}-settings.png` });
  ok(page.errors.length === 0, `${id}: no JavaScript errors`, page.errors[0]);
  await page.close();
}
section("R25-TB3. A damaged saved value falls back to the original look");
{
  const page = await openPage(browser, { seed, pre: () => { try { localStorage.setItem("expense_ledger_v5__theme", "<script>"); } catch {} } }); await settle(page);
  ok((await rootVar(page, "--bg")) === "#101B1B", "an unknown saved theme is ignored: a phone with data falls back to Sea glass");
  await page.close();
}
await finish("e2e_run25_themes", browser);
