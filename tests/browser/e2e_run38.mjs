// Run 38 (2026-11-07), owner list: smooth everywhere, Analytics tab bar, account sheet / page, tab scroll memory, language fade, add form details,
// accounts instead of wallets, categories on Budgets & Goals, Car category, most-used first, touch-drag spending chart, exact reminders. Synthetic data.
import { launch, openPage, openAdd, openCategories, openSettings, tab, wait, ok, section, finish, baseSeed, tx, settle, state, TODAY } from "./lib.mjs";
const browser = await launch();
const phone = (page) => page.setViewport({ width: 400, height: 860, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const ACC = { version: 1, accounts: [{ id: "a_card01", name: "Kapital card", kind: "card", opening: { amount: 100, date: "" }, hidden: false }, { id: "a_cash01", name: "Cash", kind: "cash", opening: { amount: 20, date: "" }, hidden: false }], transfers: [] };
const withAcc = `(() => { if (!sessionStorage.getItem("__acc")) { sessionStorage.setItem("__acc","1"); localStorage.setItem("expense_ledger_v5__accounts", ${JSON.stringify(JSON.stringify(ACC))}); } })()`;
const rect = (page, s) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: b.left, width: b.width }; }, s);

section("R38-1. Analytics: the tab bar never covers the first card, and sticks right under the top bar (owner's screenshot)");
{
  const css = ".topbar{min-height:110px !important}.app{height:100vh}.page{flex:1;min-height:0}";
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ amount: 16.9, date: TODAY })] }), pre: `(() => { const s=document.createElement('style'); s.textContent=${JSON.stringify(css)}; document.addEventListener('DOMContentLoaded',()=>document.head.appendChild(s)); })()` });
  await phone(page); await settle(page); await tab(page, "Monthly"); await wait(500);
  const seg = await rect(page, ".an-seg"), sum = await rect(page, '[data-section="an-summary"]'), mon = await rect(page, ".month-selector");
  ok(seg.top - mon.bottom < 40 && seg.bottom <= sum.top + 1, "at rest: right under the month, above the summary (no gap, no overlap)", { mon, seg, sum });
  await page.evaluate(() => { document.querySelector("main.page").scrollTop += 220; }); await wait(300);
  const seg2 = await rect(page, ".an-seg"), bar = await rect(page, ".topbar");
  ok(Math.abs(seg2.top - bar.bottom) <= 1, "scrolled: it sticks exactly under the top bar", { seg2, bar });
  await page.close();
}

section("R38-2. Tabs remember where they were scrolled (no 'refresh' to the top)");
{
  const many = Array.from({ length: 40 }, (_, i) => tx({ id: 9000 + i, amount: i + 1, merchant: "Shop " + i, date: TODAY }));
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: many }) }); await phone(page); await settle(page);
  await tab(page, "Ledger"); await wait(400);
  await page.evaluate(() => window.scrollTo({ top: 600, behavior: "instant" })); await wait(200);
  // what the person sees: the entry at the top of the screen (scroll anchoring may shift the raw number when content above settles)
  const topRow = () => page.evaluate(() => { const rows = [...document.querySelectorAll(".txn-row")]; const r = rows.find((e) => e.getBoundingClientRect().bottom > 140); return r ? r.innerText.split("\n")[0] : null; });
  const y0 = await page.evaluate(() => window.scrollY), r0 = await topRow();
  await tab(page, "Home"); await wait(400); await tab(page, "Ledger"); await wait(500);
  const r1 = await topRow();
  ok(y0 > 100 && r0 && r0 === r1, "Transactions comes back showing the same entry at the top", { y0, r0, r1 });
  ok(await page.evaluate(() => getComputedStyle(document.querySelector("main.page")).animationName) === "pageIn", "a short fade, not a blank start");
  await page.close();
}

section("R38-3. Home accounts: a calm sheet for one account; Manage opens the Accounts page; Back returns Home");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ amount: 30, date: TODAY, account: "a_card01", merchant: "Bazar" })] }), pre: withAcc }); await phone(page); await settle(page);
  await page.evaluate(() => document.querySelector('[data-acc-card="a_card01"]').click()); await wait(450);
  const sh = await page.evaluate(() => { const s = document.querySelector('[data-section="acc-sheet"]'); return s ? s.innerText : ""; });
  ok(/Kapital card/.test(sh) && /70\.00/.test(sh) && /Bazar/.test(sh), "the sheet shows the account, its balance (100 - 30 = 70.00) and its latest entry", sh.slice(0, 200));
  ok(await page.evaluate(() => !!document.querySelector(".home, [data-section='home-month']")), "Home stays where it is underneath (no tab switch)");
  await page.evaluate(() => document.querySelector('[data-section="acc-sheet-manage"]').click()); await wait(600);
  ok(await page.evaluate(() => !!document.querySelector('[data-section="accounts-page"] [data-section="my-accounts"]') && /Accounts/.test(document.querySelector(".wordmark").innerText)), "Manage opens the Accounts page with its own title");
  await page.evaluate(() => document.querySelector(".topbar-back .topbar-btn").click()); await wait(500);
  ok(await page.evaluate(() => !!document.querySelector('[data-section="home-month"]')), "Back returns to Home");
  await page.close();
}

section("R38-4. Changing the language cross-fades the page");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page); await openSettings(page);
  await page.evaluate(() => { const b = [...document.querySelectorAll("input[type=radio], button")].find((x) => (x.value === "az") || /Azərbaycan/.test(x.innerText || "")); if (b) b.click(); }); await wait(120);
  const cls = await page.evaluate(() => document.querySelector("main.page").className);
  ok(/pf-[ab]/.test(cls), "the page gets the soft re-draw class when the language changes", cls);
  await page.close();
}

section("R38-5. Edit / Cancel trade places smoothly (templates, goals) and debts forms ease");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en", goals: [{ id: "g1", name: "Car", target: 1000, saved: 100, monthlyTarget: 0, targetDate: null }] }) }); await phone(page); await settle(page);
  await openCategories(page);
  await page.evaluate(() => document.querySelector('[data-section="tpl-edit"]').click()); await wait(400);
  ok(await page.evaluate(() => !!document.querySelector("#tpl-name") || !!document.querySelector('[data-section="gl-templates"] input')), "Edit opens the template form");
  await page.evaluate(() => { const b = [...document.querySelectorAll('[data-section="gl-templates"] .btn-sm')].find((x) => /Cancel/.test(x.innerText)); b.click(); }); await wait(80);
  const mid = await page.evaluate(() => { const c = [...document.querySelectorAll('[data-section="gl-templates"] .collapse')]; return c.some((x) => !x.classList.contains("is-open") && x.querySelector("input")); });
  ok(mid, "80 ms after Cancel the form is still there, easing closed (it used to vanish in one frame)");
  await wait(400);
  ok(await page.evaluate(() => ![...document.querySelectorAll('[data-section="gl-templates"] input')].length), "and then it is gone");
  await page.evaluate(() => document.querySelector('[data-section="goal-edit"]').click()); await wait(80);
  ok(await page.evaluate(() => !!document.querySelector('[data-section="goal-form"]') && !!document.querySelector('[data-section="goal-card"]')), "goal: card and form are both drawn while they trade places");
  await page.close();
  const p2 = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(p2);
  await p2.evaluate(() => document.querySelectorAll(".tab-btn")[4].click()); await wait(300);
  await p2.evaluate(() => document.querySelector('.more-page [data-more="debts"]').click()); await p2.waitForSelector('[data-section="debts-page"]'); await wait(300);
  await p2.evaluate(() => document.querySelector('[data-section="debt-add-btn"]').click()); await wait(60);
  ok(await p2.evaluate(() => !!document.querySelector('[data-section="debt-form"]')?.closest(".collapse")), "debts: the add form opens inside an easing fold");
  await p2.close();
}

section("R38-6. Add form: details ease open, in a calm order; accounts replace cash/card/mobile");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }), pre: withAcc }); await phone(page); await settle(page); await openAdd(page);
  ok(await page.evaluate(() => document.querySelector('[data-section="add-more"]').classList.contains("keep-collapse") && !document.querySelector('[data-section="add-more"]').classList.contains("is-open")), "details start folded");
  await page.evaluate(() => document.querySelector('[data-section="add-more-toggle"]').click()); await wait(400);
  const order = await page.evaluate(() => [...document.querySelectorAll('[data-section="add-more"] .keep-collapse-in > .field, [data-section="add-more"] .keep-collapse-in > [data-section]')].map((e) => e.getAttribute("data-section") || (e.querySelector("#txn-date") ? "date" : e.querySelector("#txn-note") ? "note" : e.querySelector("#txn-merchant") ? "merchant" : e.querySelector("#txn-rec-lbl") ? "repeat" : "?")));
  ok(order[0] === "date" && order[1] === "add-account" && order.indexOf("note") > order.indexOf("merchant") && order[order.length - 1] === "add-trip", "order: date, paid from, who, note, repeats, trip", order);
  ok(!(await page.$('[data-section="add-wallet"]')) && !!(await page.$('[data-acc-pick="a_card01"]')), "with accounts there are no cash / card / mobile chips; the accounts are one tap");
  await page.evaluate(() => document.querySelector('[data-acc-pick="a_card01"]').click()); await wait(100);
  ok(await page.evaluate(() => document.querySelector('[data-acc-pick="a_card01"]').getAttribute("aria-checked")) === "true", "tapping an account chooses it");
  await page.close();
}

section("R38-7. Car category, and most-used categories first (a manual order wins)");
{
  const recent = Array.from({ length: 5 }, (_, i) => tx({ id: 7000 + i, category: "car", amount: 10, date: TODAY }));
  let page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: recent }) }); await phone(page); await settle(page); await openAdd(page);
  const tiles = await page.evaluate(() => [...document.querySelectorAll(".cat-scroll .cat-tile")].map((b) => b.getAttribute("aria-label")));
  ok(tiles[0] === "Car" && (await page.evaluate(() => /Car/.test(document.querySelector("#txn-cat-lbl").innerText))), "5 recent Car entries: Car is first and chosen for a new entry", tiles.slice(0, 3));
  await page.close();
  page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: recent }), pre: `(() => { localStorage.setItem("expense_ledger_v5__catprefs", JSON.stringify({ version: 1, hidden: [], order: ["health"] })); })()` }); await phone(page); await settle(page); await openAdd(page);
  const t2 = await page.evaluate(() => [...document.querySelectorAll(".cat-scroll .cat-tile")].map((b) => b.getAttribute("aria-label")));
  ok(t2[0] !== "Car" && /Health/.test(t2[0]), "with a manual order (Health first), the manual order wins", t2.slice(0, 3));
  await page.evaluate(() => localStorage.removeItem("expense_ledger_v5__catprefs"));
  await page.close();
  page = await openPage(browser, { seed: baseSeed({ language: "az" }) }); await settle(page); await openAdd(page);
  ok((await page.evaluate(() => [...document.querySelectorAll(".cat-scroll .cat-tile")].map((b) => b.getAttribute("aria-label")))).includes("Avtomobil"), "az: Avtomobil is offered");
  await page.close();
}

section("R38-8. Spending trend: touch and drag shows each day");
{
  const d1 = TODAY.slice(0, 8) + "01";
  const page = await openPage(browser, { seed: baseSeed({ language: "en", transactions: [tx({ amount: 12.5, date: d1 })] }) }); await phone(page); await settle(page); await tab(page, "Monthly"); await wait(500);
  await page.evaluate(() => { const e = [...document.querySelectorAll('[data-section="trend-chart"]')].find((x) => x.getBoundingClientRect().width > 0); if (e) e.scrollIntoView({ block: "center", behavior: "instant" }); }); await wait(500);
  const svg = await page.evaluate(() => { const e = [...document.querySelectorAll('[data-section="trend-chart"]')].find((x) => x.getBoundingClientRect().width > 0); if (!e) return null; const b = e.getBoundingClientRect(); return { top: b.top, left: b.left, width: b.width }; });
  ok(!!svg, "the chart is on the page");
  await page.mouse.move(svg.left + 1, svg.top + 40); await page.mouse.down(); await wait(80);
  const r1 = await page.evaluate(() => document.querySelector('[data-section="trend-readout"]').innerText);
  ok(/12\.50\D{0,3}spent that day/.test(r1) && /12\.50\D{0,3}so far this month/.test(r1), "touching the first day: 12.50 that day, 12.50 so far", r1);
  ok(!!(await page.$('[data-section="trend-cursor"]')), "a line and dot mark the day");
  await page.mouse.up();
  ok(/12\.50/.test(await page.evaluate(() => document.querySelector('[data-section="trend-readout"]').innerText)), "the readout stays after lifting the finger");
  if (Number(TODAY.slice(8, 10)) >= 2) {
    await page.evaluate(() => [...document.querySelectorAll('[data-section="trend-chart"]')].find((x) => x.getBoundingClientRect().width > 0).focus()); await page.keyboard.press("ArrowRight"); await wait(80);
    ok(/0\.00\D{0,3}spent that day/.test(await page.evaluate(() => document.querySelector('[data-section="trend-readout"]').innerText)), "the arrow key moves to day 2: nothing spent that day");
  } else ok(true, "(today is the 1st: no day 2 to move to)");
  await page.close();
}

section("R38-9. Reminders: 'exact time' asks Android once and is kept only when allowed");
{
  const fake = (allow) => `(() => { window.LedgerNative = { reminders: { requestPermission: async () => ({ granted: true }), sync: async () => {}, exactState: async () => false, requestExact: async () => ${allow} } }; })()`;
  let page = await openPage(browser, { seed: baseSeed({ language: "en" }), pre: fake(true) }); await settle(page); await openSettings(page);
  await page.evaluate(() => document.querySelector('[data-section="rem-exact"]').click()); await wait(300);
  ok(JSON.parse(await page.evaluate(() => localStorage.getItem("expense_ledger_v5__reminders"))).exact === true && /exact time you chose/.test(await page.evaluate(() => document.body.innerText)), "allowed: saved on, and it says so");
  await page.close();
  page = await openPage(browser, { seed: baseSeed({ language: "en" }), pre: fake(false) }); await settle(page);
  await page.evaluate(() => localStorage.removeItem("expense_ledger_v5__reminders")); await page.reload(); await settle(page); await openSettings(page);
  await page.evaluate(() => document.querySelector('[data-section="rem-exact"]').click()); await wait(300);
  const st = JSON.parse((await page.evaluate(() => localStorage.getItem("expense_ledger_v5__reminders"))) || "{}");
  ok(st.exact !== true && /did not allow exact alarms/.test(await page.evaluate(() => document.body.innerText)), "refused: stays off, and says how to allow it", st);
  await page.evaluate(() => localStorage.removeItem("expense_ledger_v5__reminders"));
  await page.close();
}

section("R38-10. Categories live in Budgets & Goals (Run 40: the Settings pointer row was removed at the owner's request)");
{
  const page = await openPage(browser, { seed: baseSeed({ language: "en" }) }); await settle(page);
  await openCategories(page);
  ok(await page.evaluate(() => !!document.querySelector('[data-section="gl-categories"] [data-section="my-categories"]') && !!document.querySelector('[data-section="cat-order"]')), "Goals has My categories and Order and visibility");
  await page.close();
}
await browser.close();
finish("e2e_run38");
