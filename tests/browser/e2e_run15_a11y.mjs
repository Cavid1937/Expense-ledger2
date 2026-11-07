// Run 15 follow-up (2026-10-29): what a screen reader would be given for the controls Run 15 added or changed. Uses the browser's
// accessibility tree (names, roles, states), NOT a real screen reader: whether it sounds right when spoken is NOT ASSESSED here.
import { launch, openPage, openGoals, wait, ok, section, finish, tx, baseSeed, settle } from "./lib.mjs";
const browser = await launch();
const d = new Date(), pad = (n) => String(n).padStart(2, "0");
const dl = new Date(d.getFullYear(), d.getMonth() + 8, 1); const DEADLINE = `${dl.getFullYear()}-${pad(dl.getMonth() + 1)}-01`;
const goals = [{ id: "g1", name: "Trip", target: 1500, saved: 300, monthlyTarget: 100, targetDate: DEADLINE }];
const flat = (n, out = []) => { if (!n) return out; out.push(n); (n.children || []).forEach((c) => flat(c, out)); return out; };
const find = (nodes, pred) => nodes.filter(pred);

for (const lang of ["en", "az", "ru"]) {
  section(`R15-A1. Accessibility tree (${lang})`);
  const page = await openPage(browser, { seed: baseSeed({ goals, language: lang }) }); await settle(page);
  let nodes = flat(await page.accessibility.snapshot());
  const seeAll = find(nodes, (n) => n.role === "button" && /Все операции|Bütün əməliyyatlara|See all transactions/.test(n.name || ""));
  ok(seeAll.length === 1, `${lang}: Home has one named 'see all transactions' button`, seeAll.map((n) => n.name));
  await openGoals(page, "goals"); await settle(page);
  nodes = flat(await page.accessibility.snapshot());
  const note = find(nodes, (n) => n.role === "note" && /150[.,]00/.test(n.name || n.description || ""));
  const noteText = await page.evaluate(() => document.querySelector('[data-section="goal-need"]').getAttribute("role"));
  ok(noteText === "note", `${lang}: the required-monthly block has role=note, so it is announced as supporting information`, noteText);
  const summary = find(nodes, (n) => /triangle|DisclosureTriangle|button|summary/i.test(n.role) && /Try a different|Başqa aylıq|Попробовать другую/.test(n.name || ""));
  ok(summary.length >= 1, `${lang}: the what-if opener has an accessible name and a disclosure role`, nodes.filter((n) => /Try a|Başqa|Попробовать/.test(n.name || "")).map((n) => [n.role, n.name, n.expanded]));
  const collapsed = summary.some((n) => n.expanded === false || n.expanded === undefined);
  ok(collapsed, `${lang}: the what-if is reported as collapsed until opened`, summary.map((n) => n.expanded));
  await page.evaluate(() => { document.querySelector(".goal-scenario .gs-toggle").click(); }); await wait(400);
  nodes = flat(await page.accessibility.snapshot());
  const input = find(nodes, (n) => /textbox|spinbutton/.test(n.role) && /Amount per month|Aylıq məbləğ|Сумма в месяц/.test(n.name || ""));
  ok(input.length === 1, `${lang}: the amount field is labelled 'amount per month'`, nodes.filter((n) => /textbox|spinbutton/.test(n.role)).map((n) => [n.role, n.name]));
  await page.evaluate(() => { const el = document.querySelector(".goal-scenario input"); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(el, "100"); el.dispatchEvent(new Event("input", { bubbles: true })); }); await wait(200);
  const live = await page.evaluate(() => { const e = document.querySelector(".goal-scenario-out"); return e ? [e.getAttribute("role"), e.getAttribute("aria-live"), e.innerText.length > 10] : null; });
  ok(!!live && live[0] === "status" && live[1] === "polite" && live[2], `${lang}: the estimate is a polite live status, so it is announced when it appears`, live);
  await page.close();
}
await browser.close();
finish("e2e_run15_a11y");
