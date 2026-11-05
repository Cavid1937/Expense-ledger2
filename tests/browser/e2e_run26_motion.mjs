// Run 26: Accounts are reachable from Settings in one tap and several (cash, card, mobile wallet) can be added with quick-start chips;
// editing a goal opens the form in the goal's own place (no jump to the top) and eases in. Synthetic data only.
import { launch, openPage, tab, wait, ok, section, finish, baseSeed, settle } from "./lib.mjs";
const browser = await launch();
const AK = "expense_ledger_v5__accounts";
const store = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "null"), AK);
const click = (page, sel) => page.evaluate((s) => document.querySelector(s).click(), sel);

section("R26-M1. Accounts row on Settings; three accounts from quick-start chips");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page);
  await tab(page, "More"); await wait(200);
  const row = await page.evaluate(() => { const r = [...document.querySelectorAll(".more-page .list-row")].find((x) => /Accounts/i.test(x.innerText)); if (r) r.click(); return !!r; });
  ok(row, "the Settings tab has an Accounts row");
  await page.waitForSelector('[data-section="my-accounts"]'); await wait(900);
  for (const k of ["cash", "card", "wallet"]) { await click(page, `[data-preset="${k}"]`); await wait(120); await click(page, '[data-section="acc-add"]'); await wait(300); }
  const s = await store(page);
  ok(s && s.accounts.length === 3, "three accounts are saved", s && s.accounts.map((a) => a.name));
  ok(s && s.accounts.map((a) => a.kind).join() === "cash,card,wallet", "kinds are cash, card and wallet", s && s.accounts.map((a) => a.kind));
  ok(await page.evaluate(() => !document.querySelector('[data-preset="cash"]') && !!document.querySelector('[data-preset="savings"]')), "a used quick-start chip disappears; the others stay");
  ok(await page.evaluate(() => /Mobile wallet/.test(document.querySelector('[data-section="my-accounts"]').innerText)), "the wallet account shows its type");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R26-M2. Editing a goal: the form appears where the goal was, with an ease-in, and the page does not jump");
{
  const seed = baseSeed({ language: "en", goals: [{ id: "g1", name: "Trip", target: 1000, saved: 100, monthlyTarget: 0, targetDate: null }, { id: "g2", name: "Laptop", target: 2000, saved: 0, monthlyTarget: 0, targetDate: null }] });
  const page = await openPage(browser, { seed }); await settle(page);
  await tab(page, /goals/); await wait(400);
  await page.evaluate(() => [...document.querySelectorAll(".seg-btn")].find((b) => /goals/i.test(b.innerText))?.click()); await wait(300);
  const before = await page.evaluate(() => { const c = document.querySelectorAll('[data-section="goal-card"]')[1]; return { y: window.scrollY, n: document.querySelectorAll('[data-section="goal-card"]').length, name: c.innerText.split("\n")[0] }; });
  await page.evaluate(() => document.querySelectorAll('[data-section="goal-edit"]')[1].click());
  const right = await page.evaluate(() => { const f = document.querySelector('[data-section="goal-form"]'); return { y: window.scrollY, anim: f ? getComputedStyle(f).animationName : "", cards: document.querySelectorAll('[data-section="goal-card"]').length, formIdx: f ? [...f.parentElement.children].indexOf(f) : -1 }; });
  ok(right.y === before.y, "the page has not jumped at the moment of the tap", { before: before.y, right: right.y });
  ok(right.anim === "revealIn", "the form eases in", right.anim);
  ok(right.cards === before.n - 1, "the edited goal's card is replaced by the form (the other goal stays)", right);
  await wait(600);
  ok(await page.evaluate(() => document.getElementById("goal-name").value === "Laptop"), "the form holds the second goal's data");
  ok(await page.evaluate(() => document.activeElement && document.activeElement.id === "goal-name"), "the name box is focused");
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
  await page.close();
}
section("R26-M3. Reduced motion: no ease-in");
{
  const seed = baseSeed({ language: "en", goals: [{ id: "g1", name: "Trip", target: 1000, saved: 100, monthlyTarget: 0, targetDate: null }] });
  const page = await openPage(browser, { seed });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]); await settle(page);
  await tab(page, /goals/); await wait(400);
  await page.evaluate(() => [...document.querySelectorAll(".seg-btn")].find((b) => /goals/i.test(b.innerText))?.click()); await wait(300);
  await page.evaluate(() => document.querySelector('[data-section="goal-edit"]').click()); await wait(100);
  ok(await page.evaluate(() => getComputedStyle(document.querySelector('[data-section="goal-form"]')).animationName === "none"), "with reduced motion the form appears without animation");
  await page.close();
}
await finish("e2e_run26_motion", browser);
