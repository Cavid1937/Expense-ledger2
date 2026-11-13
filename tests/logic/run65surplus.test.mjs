// Run 65 (owner decision 13 Nov): one monthly surplus / deficit, worked out by the app's own classification rules: earned income minus
// spending. Money taken from savings is NOT income (it was counted when it was earned); refunds lower spending. Safe to Spend keeps
// treating savings taken out as money available. Written BEFORE the change. Expected values worked out by hand. Synthetic data only.
import { H, ok, section, finish, reset, eq } from "./lib.mjs";
const { calcMonthSummary, notSpentMonth, rolloverOffer, calcSafeToSpend, forSpending } = H;
reset();
let n = 0;
const T = (o) => ({ id: ++n, type: "expense", amount: 10, category: "food", subcategory: "", merchant: "", note: "", date: "2026-10-10", recurring: false, recurFreq: null, isActive: true, ...o });
const inc = (category, amount, date = "2026-10-05") => T({ type: "income", category, amount, date });
const exp = (category, amount, date = "2026-10-10") => T({ category, amount, date });
const NOW = new Date(2026, 10, 3, 12);   // 3 Nov 2026: October is finished
const month = (list, mon = "2026-10", prv = "2026-09") => calcMonthSummary(forSpending(list), mon, prv, NOW);

section("R65-1. The monthly surplus: earned income minus spending; savings taken out are not income");
const mixed = [inc("salary", 1000), inc("refund", 50), inc("savout", 300), exp("food", 600)];
const s = month(mixed);
ok(s.curNet === 450, "1000 earned + 50 refund (lowers spending) - 600 spent = 450; the 300 taken from savings is not counted", s.curNet);
ok(s.curSavOut === 300 && s.curRefundIn === 50, "the card can say how much came from savings (300) and from refunds (50)", [s.curSavOut, s.curRefundIn]);
ok(s.surplusRate === 43, "surplus share: 450 / (1000 + 50) = 42.9% -> 43%", s.surplusRate);
ok(s.curIn === 1350 && s.curInc === 1000, "the raw figures stay as they were: all money in 1,350; income 1,000", [s.curIn, s.curInc]);
const ns = notSpentMonth(mixed, "2026-10", NOW);
ok(ns.net === s.curNet, "with no cost spread over months, the month card and 'Not spent' give the same number", [ns.net, s.curNet]);

section("R65-2. Someone living on savings now sees the true picture");
const living = [inc("giftin", 120), inc("savout", 300), inc("familyin", 80), exp("food", 200)];
const l = month(living);
ok(l.curNet === 0 && l.surplusRate === 0 && l.curSavOut === 300, "earned 200 (gifts and family), spent 200: break-even, and 300 came from savings", [l.curNet, l.surplusRate, l.curSavOut]);
const short = month([inc("savout", 500), exp("food", 120)]);
ok(short.curNet === -120 && short.surplusRate === null, "no income at all, 120 spent from savings: a deficit of 120; no percentage (nothing earned)", [short.curNet, short.surplusRate]);
// Safe to Spend looks at the current month, so the same three amounts are dated in November here
const livingNov = [inc("giftin", 120, "2026-11-01"), inc("savout", 300, "2026-11-01"), inc("familyin", 80, "2026-11-02"), exp("food", 200, "2026-11-02")];
const safe = calcSafeToSpend(forSpending(livingNov), { enabled: true, savingsTarget: 0 }, [], NOW);
ok(safe.curInc === 500, "Safe to Spend is unchanged: the 300 taken from savings is still money available (120 + 300 + 80)", safe.curInc);

section("R65-3. A cost spread over months: the card counts this month's part, 'Not spent' counts it on the day it was paid");
const spread = [inc("salary", 1000), exp("shopping", 1200, "2026-10-02"), exp("food", 100)];
spread[1].spread = 12;
const sp = month(spread);
ok(sp.curExp === 200 && sp.curNet === 800, "the card: 100 food + 1,200 / 12 = 100 this month -> 1000 - 200 = 800", [sp.curExp, sp.curNet]);
ok(notSpentMonth(spread, "2026-10", NOW).net === -300, "'Not spent' (running total): 1000 - 1,300 paid that month = -300", notSpentMonth(spread, "2026-10", NOW).net);
ok(sp.hasSpread === true && month(mixed).hasSpread === false, "the card knows when a spread cost is involved, to explain the difference");

section("R65-4. The month-start goal offer uses the same rule");
const o = rolloverOffer(forSpending([inc("salary", 400, "2026-10-05"), inc("savout", 300, "2026-10-06"), exp("food", 100, "2026-10-07")]), [{ id: "g1", name: "Trip", target: 5000, saved: 0 }], "", NOW);
ok(o && o.kept === 300, "October: earned 400 - spent 100 = 300 kept (the 300 taken from savings is not offered back to a goal)", o);
finish("run65surplus");
