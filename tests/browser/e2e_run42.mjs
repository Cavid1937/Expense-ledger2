// Run 42 (2026-11-08), owner: language switch feels instant, no straight line under the language / theme labels, two new themes, math in the amount box.
// Synthetic data only.
import { launch, openPage, openAdd, openSettings, wait, ok, section, finish, baseSeed, settle, state } from "./lib.mjs";
const browser = await launch();
const phone = (page) => page.setViewport({ width: 400, height: 860, deviceScaleFactor: 1, isMobile: true, hasTouch: true });

section("R42-B1. Math in the amount box");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [] }) }); await phone(page); await settle(page);
  await openAdd(page);
  ok(await page.evaluate(() => [...document.querySelectorAll('[data-section="amt-ops"] button')].every((b) => b.disabled)), "with nothing typed the four sign buttons are off");
  await page.type(".amount-input", "45"); await wait(200);
  await page.evaluate(() => document.querySelector('[data-op="−"]').click()); await wait(150);
  ok(await page.evaluate(() => document.querySelector(".amount-input").value) === "45−", "the minus button adds the sign after 45");
  await page.type(".amount-input", "20"); await wait(250);
  const line = await page.evaluate(() => (document.querySelector('[data-section="amt-expr"]') || {}).textContent || "");
  ok(/25\.00/.test(line), "45 − 20 shows = 25.00 as you type", line);
  await page.evaluate(() => document.querySelector('[data-op="×"]').click()); await wait(100);
  await page.type(".amount-input", "2"); await wait(250);
  ok(/= 5\.00/.test(await page.evaluate(() => document.querySelector('[data-section="amt-expr"]').textContent)), "45 − 20 × 2: multiplication first, so 45 − 40 = 5.00");
  await page.close();
}
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [] }) }); await phone(page); await settle(page);
  await openAdd(page);
  await page.type(".amount-input", "45.00 - 20"); await wait(250);
  await page.evaluate(() => document.querySelector(".add-foot .btn-primary").click()); await wait(700);
  const tx = (await state(page)).transactions;
  ok(tx.length === 1 && tx[0].amount === 25, "saving 45.00 - 20 stores 25", tx.map((x) => x.amount));
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [] }) }); await phone(page); await settle(page);
  await openAdd(page);
  await page.type(".amount-input", "5-10"); await wait(250);
  ok(/Check the calculation/.test(await page.evaluate(() => document.querySelector('[data-section="amt-expr"]').textContent)), "a negative result shows 'Check the calculation'");
  await page.evaluate(() => document.querySelector(".add-foot .btn-primary").click()); await wait(500);
  ok((await state(page)).transactions.length === 0, "nothing is saved for an invalid calculation");
  await page.close();
}

section("R42-B2. No straight line under the language and theme labels");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [] }) }); await phone(page); await settle(page);
  await openSettings(page); await wait(400);
  await page.evaluate(() => { const b = document.querySelector('[data-section="st-look"]'); const f = b && b.closest("section,div"); const head = [...document.querySelectorAll("button,[role=button]")].find((x) => /appearance/i.test(x.textContent)); if (head && !document.querySelector('[data-section="theme-chips"]')) head.click(); }); await wait(500);
  const w = await page.evaluate(() => { const l = document.getElementById("set-lang-lbl"), tl = document.querySelector('[data-section="st-look"] .settings-section-lbl'); return { lang: l ? getComputedStyle(l).borderBottomWidth : null, theme: tl ? getComputedStyle(tl).borderBottomWidth : null }; });
  ok(w.lang === "0px", "language label has no bottom line", w);
  ok(w.theme === "0px", "theme label has no bottom line", w);
  const ids = await page.evaluate(() => [...document.querySelectorAll("[data-theme-id]")].map((e) => e.getAttribute("data-theme-id")));
  ok(ids.join() === "ivory,graphite,sea,nordic,mist,dusk,sand", "seven themes, Ivory first (Run 84); Sapphire, Cocoa and Caspian gone", ids);
  for (const id of ["graphite", "sand"]) {
    await page.evaluate((i) => document.querySelector(`[data-theme-id="${i}"]`).click(), id); await wait(300);
    ok(await page.evaluate(() => document.documentElement.getAttribute("data-theme")) === id && await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${id}: applied, no sideways scroll`);
  }
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R42-B3. Language: the answer to a touch is immediate");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [] }) }); await phone(page); await settle(page);
  await openSettings(page); await wait(400);
  const t0 = await page.evaluate(() => { const l = document.querySelector('.lang-pill input[value="az"]'); const lab = l.closest("label"); const s = performance.now(); l.click(); return { sel: lab.classList.contains("sel"), ms: performance.now() - s }; });
  ok(t0.sel && t0.ms < 50, "the pill is selected in the same instant as the touch (under 50 ms)", t0);
  await wait(700);
  ok(await page.evaluate(() => (document.getElementById("set-lang-lbl") || {}).textContent === "Dil" && JSON.parse(localStorage.getItem("expense_ledger_v5")).language === "az"), "and the whole app is in Azerbaijani a moment later (label reads Dil, saved language is az)");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
{
  const page = await openPage(browser, { seed: null, fresh: true, chooseLang: false }); await phone(page); await wait(900);
  ok(await page.evaluate(() => !!document.querySelector(".lang-opt")), "a new install shows the language chooser");
  await page.evaluate(() => document.querySelector('.lang-opt input[value="ru"]').click()); await wait(120);
  const r = await page.evaluate(() => ({ swap: !!document.querySelector(".lang-swap"), txt: document.querySelector(".lang-continue").textContent, dis: document.querySelector(".lang-continue").disabled }));
  ok(r.swap && /Продолжить|Далее/i.test(r.txt) && !r.dis, "choosing Russian swaps the texts and enables Continue at once", r);
  await page.evaluate(() => document.querySelector('.lang-opt input[value="az"]').click()); await wait(120);
  ok(/Davam/i.test(await page.evaluate(() => document.querySelector(".lang-continue").textContent)), "choosing Azerbaijani changes it again");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}

section("R42-B4. Known places suggest a category");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [] }) }); await phone(page); await settle(page);
  await openAdd(page);
  await page.evaluate(() => document.querySelector('[data-section="add-more-toggle"]').click()); await wait(300);
  await page.focus("#txn-merchant"); await page.type("#txn-merchant", "Netfl"); await wait(250);
  const sug = await page.evaluate(() => [...document.querySelectorAll(".merchant-sug-item")].map((e) => e.innerText.replace(/\s+/g, " ")));
  ok(sug.length === 1 && /Netflix/.test(sug[0]) && /Phone & Subscriptions/.test(sug[0]) && /common place/.test(sug[0]), "typing Netfl offers Netflix with its category", sug);
  await page.evaluate(() => document.querySelector(".merchant-sug-item").dispatchEvent(new MouseEvent("mousedown", { bubbles: true }))); await wait(250);
  ok(await page.evaluate(() => document.querySelector("#txn-merchant").value) === "Netflix" && await page.evaluate(() => !!document.querySelector('.cat-tile.sel[aria-label^="Phone & Subscriptions"]')), "choosing it fills the name and selects Phone & Subscriptions (renamed in Run 58)");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [] }) }); await phone(page); await settle(page);
  await openAdd(page);
  await page.evaluate(() => document.querySelector('[data-section="add-more-toggle"]').click()); await wait(300);
  await page.focus("#txn-merchant"); await page.type("#txn-merchant", "Uber"); await page.evaluate(() => document.querySelector("#txn-merchant").blur()); await wait(500);
  ok(await page.evaluate(() => !!document.querySelector('.cat-tile.sel[aria-label^="Transport"]')), "a whole known name typed and left: the category follows by itself (Transport)");
  ok(await page.evaluate(() => !!document.querySelector('[data-section="auto-cat-note"]')), "and a note says the category was set from the name");
  await page.close();
}finish();
