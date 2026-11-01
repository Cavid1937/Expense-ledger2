// Run 17 (2026-10-30), owner decisions: the last tab becomes "Settings" with a Profile name (used in the Home greeting) and the language
// choice on the page itself; the all-time Overview moves to Analytics; the savings floor and the quick-add templates move to Goals
// (the Safe to Spend on/off switch stays in Settings, with the currency); a template can carry a subcategory. Written BEFORE the change.
// Synthetic data only.
import { launch, openPage, state, tab, wait, ok, section, finish, baseSeed, tx, settle, setInput, openGoals, openSettings, openAdd, clickText } from "./lib.mjs";
const browser = await launch();
const seed = (over = {}) => baseSeed({ language: "en", ...over });
const goToSettings = async (page) => { await page.evaluate(() => document.querySelectorAll(".tab-btn")[4].click()); await page.waitForSelector(".more-page"); await wait(200); };

section("R17-T1. The last tab is Settings and holds the profile and the language");
{
  const page = await openPage(browser, { seed: seed() }); await settle(page);
  const lbl = await page.evaluate(() => document.querySelectorAll(".tab-btn")[4].innerText.trim());
  ok(/^settings$/i.test(lbl), "the fifth tab is called Settings", lbl);
  await goToSettings(page);
  ok(await page.evaluate(() => !!document.querySelector('[data-section="st-profile"] input#profile-name')), "a Profile card with a name box");
  const langs = await page.evaluate(() => [...document.querySelectorAll('[data-section="st-language"] input[name="settings-language"]')].map((r) => [r.value, r.checked]));
  ok(langs.length === 3 && langs.find((x) => x[0] === "en")[1], "three language choices on the page, English selected", langs);
  await openSettings(page);
  const sheet = await page.evaluate(() => ({ lang: !!document.querySelector(".sheet .lang-pill"), tpl: !!document.querySelector(".sheet #tpl-name") || /Quick-Add/i.test(document.querySelector(".sheet").innerText), over: /Overview/i.test(document.querySelector(".sheet").innerText), cur: !!document.querySelector(".sheet input[maxlength='3']"), sw: !!document.querySelector('.sheet [role="switch"]'), floor: /savings floor/i.test(document.querySelector(".sheet").innerText) }));
  ok(!sheet.lang && !sheet.tpl && !sheet.over, "the Preferences sheet no longer holds language, templates or the overview", sheet);
  ok(sheet.cur && sheet.sw, "it keeps the currency and the Safe to Spend switch", sheet);
  await page.close();
}
section("R17-T2. Language change from the page");
{
  const page = await openPage(browser, { seed: seed() }); await settle(page); await goToSettings(page);
  await page.evaluate(() => document.querySelector('[data-section="st-language"] input[value="ru"]').click()); await wait(300);
  ok(await page.evaluate(() => document.documentElement.lang === "ru" && /Настройки/.test(document.querySelectorAll(".tab-btn")[4].innerText)), "choosing Русский switches the whole interface");
  ok((await state(page)).language === "ru", "and is saved");
  await page.close();
}
section("R17-T3. Profile name in the greeting");
{
  const page = await openPage(browser, { seed: seed() }); await settle(page);
  const h0 = await page.evaluate(() => document.querySelector(".wordmark").innerText);
  ok(!/,/.test(h0), "no name yet: the greeting is unchanged", h0);
  await goToSettings(page);
  await setInput(page, () => document.querySelector("#profile-name"), "  Aysel   Məmmədova  "); await wait(100);
  await clickText(page, '[data-section="st-profile"] button', /save/i); await wait(300);
  ok((await state(page)).profileName === "Aysel Məmmədova", "the name is trimmed, inner spaces collapsed and saved", (await state(page)).profileName);
  await page.evaluate(() => document.querySelectorAll(".tab-btn")[0].click()); await wait(300);
  const h1 = await page.evaluate(() => document.querySelector(".wordmark").innerText);
  ok(/^Good (morning|afternoon|evening), Aysel Məmmədova$/.test(h1), "Home greets by name", h1);
  await goToSettings(page);
  await setInput(page, () => document.querySelector("#profile-name"), "<b>x</b>" + "y".repeat(60)); await wait(100);
  await clickText(page, '[data-section="st-profile"] button', /save/i); await wait(300);
  const n = (await state(page)).profileName; ok(n.length === 30, "a long name is cut to 30 characters", n.length);
  await page.evaluate(() => document.querySelectorAll(".tab-btn")[0].click()); await wait(300);
  ok(await page.evaluate(() => !document.querySelector(".wordmark b")), "markup in a name is shown as text, never run");
  await goToSettings(page);
  await setInput(page, () => document.querySelector("#profile-name"), "   "); await wait(100);
  await clickText(page, '[data-section="st-profile"] button', /save/i); await wait(300);
  ok(((await state(page)).profileName || "") === "", "an empty name removes it");
  await page.reload(); await settle(page);
  ok(!/,/.test(await page.evaluate(() => document.querySelector(".wordmark").innerText)), "and the greeting is plain again after a reload");
  await page.close();
}
section("R17-T4. The all-time overview is on Analytics");
{
  const page = await openPage(browser, { seed: seed() }); await settle(page); await tab(page, "Analytics"); await wait(400);
  const o = await page.evaluate(() => (document.querySelector('[data-section="an-overview"]') || {}).innerText || "");
  ok(/2,000\.00/.test(o) && /30\.00/.test(o), "total income 2,000.00 and total expenses 30.00", o);
  await page.close();
}
section("R17-T5. Savings floor and templates are on Goals");
{
  const page = await openPage(browser, { seed: seed({ safeToSpend: { enabled: true, savingsTarget: 0 } }) }); await settle(page);
  await openGoals(page, "goals");
  ok(await page.evaluate(() => !!document.querySelector('[data-section="gl-floor"] input')), "the monthly savings floor box is on Goals while Safe to Spend is on");
  await setInput(page, () => document.querySelector('[data-section="gl-floor"] input'), "120"); await wait(100);
  await clickText(page, '[data-section="gl-floor"] button', /save/i); await wait(300);
  ok((await state(page)).safeToSpend.savingsTarget === 120, "saving it stores 120", (await state(page)).safeToSpend);
  ok(await page.evaluate(() => !!document.querySelector('[data-section="gl-templates"]')), "a Quick-add templates section is on Goals");
  await page.close();
  const p2 = await openPage(browser, { seed: seed({ safeToSpend: { enabled: false, savingsTarget: 0 } }) }); await settle(p2); await openGoals(p2, "goals");
  ok(await p2.evaluate(() => !document.querySelector('[data-section="gl-floor"]')), "with Safe to Spend off there is no floor box");
  await p2.close();
}
section("R17-T6. A template can carry a subcategory");
{
  const page = await openPage(browser, { seed: seed({ templates: [] }) }); await settle(page); await openGoals(page, "goals");
  await clickText(page, '[data-section="gl-templates"] button', /add/i); await wait(200);
  await setInput(page, () => document.querySelector("#tpl-name"), "Lunch"); await setInput(page, () => document.querySelector("#tpl-amt"), "6.5");
  await page.select("#tpl-cat", "food"); await wait(150);
  const opts = await page.evaluate(() => [...document.querySelectorAll("#tpl-subcat option")].map((o) => o.value));
  ok(opts.length > 1 && opts[0] === "" && opts.includes("Coffee"), "a subcategory list for Food appears, starting with 'none'", opts);
  await page.select("#tpl-subcat", "Coffee"); await wait(100);
  await page.select("#tpl-cat", "transport"); await wait(150);
  ok((await page.evaluate(() => document.querySelector("#tpl-subcat").value)) === "", "changing the category clears the subcategory");
  await page.select("#tpl-cat", "food"); await wait(100); await page.select("#tpl-subcat", "Coffee");
  await clickText(page, '[data-section="gl-templates"] button', /save template/i); await wait(300);
  const tpl = (await state(page)).templates; ok(tpl.length === 1 && tpl[0].subcat === "Coffee" && tpl[0].catId === "food" && tpl[0].amount === 6.5, "the template stores Food / Coffee / 6.5", tpl);
  await openAdd(page);
  await page.evaluate(() => [...document.querySelectorAll(".tpl-card")].find((b) => /Lunch/.test(b.innerText)).click()); await wait(500);
  const pressed = await page.evaluate(() => [...document.querySelectorAll('[data-section="add-subcat"] .sub-chip')].filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.innerText.trim()));
  ok(pressed.includes("Coffee"), "tapping it in the add form selects Food and Coffee", pressed);
  await page.close();
}
await browser.close();
finish("e2e_run17_settings");
