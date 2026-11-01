// Run 18f: coach rules R7 (a category well above its usual) and R10 (interest still to pay on a loan). Hand-computed. Synthetic data.
import { H, ok, section, reset, T, finish } from "./lib.mjs";
const { calcCoach } = H;
reset();
const NOW = new Date(2026, 9, 13, 12);
const e = (date, amount, category, id) => T({ id, amount, category, date });
const hist = [["2026-07-05", "a"], ["2026-08-05", "b"], ["2026-09-05", "c"]].map(([d, i]) => e(d, 100, "food", "f" + i));
const ids = (r) => r.map((c) => c.id);
const loan = (o) => ({ id: "l1", lender: "Bank", kind: "cash", principal: 120000, ratePct: 12, rateType: "annuity", months: 12, firstPayment: "2026-11-01", bankPayment: null, payments: [], ...o });

section("R18-CU1. Category above its usual (R7)");
let r = calcCoach([...hist, e("2026-10-03", 200, "food", "f4")], null, NOW);
const up = r.find((c) => c.id === "catUp");
ok(!!up && up.cat === "food" && up.pct === 100, "food 200 this month against 100 a month before: 100% above", up);
ok(!ids(calcCoach([...hist, e("2026-10-03", 140, "food", "f4")], null, NOW)).includes("catUp"), "40% above is below the 50% line: no card");
ok(!ids(calcCoach([...hist.slice(1), e("2026-10-03", 200, "food", "f4")], null, NOW)).includes("catUp"), "only two earlier months of history: no card");
ok(!ids(calcCoach([e("2026-07-05", 10, "food", "x1"), e("2026-08-05", 10, "food", "x2"), e("2026-09-05", 10, "food", "x3"), e("2026-10-03", 25, "food", "x4")], null, NOW)).includes("catUp"), "rise of only 15 (under 20): too small to mention");

section("R18-CU2. Total interest still to pay (R10)");
r = calcCoach([e("2026-10-01", 5, "food", "z")], { debts: [], loans: [loan()] }, NOW);
const li = r.find((c) => c.id === "loanInterest");
// annuity 1200.00 at 12%/yr over 12 months: payment 106.62, total paid 1279.4, interest about 79.4
ok(!!li && li.lender === "Bank" && li.amount > 7900 && li.amount < 7960, "12% on 1200 over 12 months: about 79.4 of interest in total (qapik)", li);
ok(!ids(calcCoach([e("2026-10-01", 5, "food", "z")], { debts: [], loans: [loan({ rateType: "none", ratePct: 0 })] }, NOW)).includes("loanInterest"), "no interest: no card");
finish("run18coach2");
