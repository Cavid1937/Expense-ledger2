// Run 50 in the real bundled app: "Get ready for yearly bills" on the Goals screen makes a goal in one tap.
import { launch, openPage, openGoals, state, ok, section, finish, baseSeed, wait } from "./lib.mjs";
const browser = await launch();
const clock = `() => { const fixed = new Date(2026, 9, 20, 12, 0, 0).getTime(); const RD = Date; class FD extends RD { constructor(...a) { if (a.length === 0) super(fixed); else super(...a); } static now() { return fixed; } } window.Date = FD; }`;
const seed = baseSeed({
  transactions: [],
  goals: [],
  bills: [{ id: "bins1", name: "Car insurance", type: "expense", category: "transport", subcategory: "", amount: 600, freq: "yearly", anchorDate: "2025-03-15", active: true, createdAt: "" }],
});
section("R50-SB1. The offer, the tap, and the offer going away");
const page = await openPage(browser, { seed, pre: eval(clock) });
await openGoals(page, "goals"); await wait(500);
const card = () => page.evaluate(() => { const c = document.querySelector('[data-section="sinking"]'); return c ? c.innerText : null; });
let txt = await card();
ok(txt && /Car insurance/.test(txt) && /120/.test(txt) && /5 months/.test(txt), "card shows the bill, 120 a month for 5 months", txt);
await page.evaluate(() => document.querySelector('[data-section="sinking-make"]').click()); await wait(600);
const st = await state(page);
const g = (st.goals || []).find((x) => x.name === "Car insurance");
ok(g && g.target === 600 && g.saved === 0 && g.monthlyTarget === 120 && g.targetDate === "2027-03-15", "goal made: 600 target, 120 a month, due 15 Mar 2027", g);
ok((await card()) === null, "the offer disappears once the goal exists");
ok(st.bills.length === 1 && st.bills[0].amount === 600, "the bill itself is unchanged");
ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
await page.close(); await browser.close();
finish("e2e_run50sinking");
