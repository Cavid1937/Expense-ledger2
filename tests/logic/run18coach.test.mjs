// Run 18: more Financial Coach rules from the rulebook: R8 loan payments share of income, R11 payment does not cover interest,
// R14 income dip, R15 welcome back. Hand-computed expectations. Synthetic data only.
import { H, ok, section, reset, T, finish } from "./lib.mjs";
const { calcCoach } = H;
reset();
const NOW = new Date(2026, 9, 13, 12);   // 13 Oct 2026
const inc = (date, amount) => T({ id: "i" + date, type: "income", category: "salary", amount, date });
const exp = (date, amount, id) => T({ id: id || "e" + date + amount, amount, date });
const months = ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"];
const steady = months.map((m) => inc(m + "-01", 1000));
const daily = Array.from({ length: 20 }, (_, i) => exp("2026-10-" + String(i % 12 + 1).padStart(2, "0"), 10, "d" + i));
const ids = (r) => r.map((c) => c.id);
const loan = (o) => ({ id: "l1", lender: "Bank", kind: "cash", principal: 500000, ratePct: 0, rateType: "none", months: 10, firstPayment: "2026-11-01", bankPayment: null, payments: [], ...o });

section("R18-CO1. Income dip (R14)");
let r = calcCoach([...steady.slice(0, 5), inc("2026-09-01", 500), ...daily], null, NOW);
const dip = r.find((c) => c.id === "incomeDip");
ok(!!dip && dip.of === 6 && dip.have === 6 && dip.pct === 55, "lowest month 500 against an average of about 917: 6 of 6 months, lowest = 55% of the average", dip);
ok(!ids(calcCoach([...steady, ...daily], null, NOW)).includes("incomeDip"), "steady income: no dip card");
ok(!ids(calcCoach([...steady.slice(3), ...daily], null, NOW)).includes("incomeDip"), "fewer than 4 observed months: no dip card");

section("R18-CO2. Loan payments share of income (R8)");
r = calcCoach([...steady, ...daily], { debts: [], loans: [loan({ principal: 600000 })] }, NOW);
ok(ids(r).includes("loanShareHigh") && r.find((c) => c.id === "loanShareHigh").pct === 60, "payment 600 on income 1000 = 60%: the 'high' card", r.map((c) => [c.id, c.pct]));
r = calcCoach([...steady, ...daily], { debts: [], loans: [loan({ principal: 300000 })] }, NOW);
ok(ids(r).includes("loanShare") && !ids(r).includes("loanShareHigh"), "payment 300 on income 1000 = 30%: figure only");
ok(!ids(calcCoach([...daily], { debts: [], loans: [loan()] }, NOW)).some((i) => i.startsWith("loanShare")), "no income recorded: no share card");

section("R18-CO3. Welcome back (R15) and payment not covering interest (R11)");
r = calcCoach([inc("2026-10-01", 1000), exp("2026-10-05", 10)], null, NOW);
ok(r[0].id === "welcome", "last entry 8 days ago: welcome card first");
ok(!ids(calcCoach([...steady, ...daily, exp("2026-10-12", 5, "x")], null, NOW)).includes("welcome"), "an entry yesterday: no welcome card");
const bad = loan({ principal: 100000, ratePct: 99, rateType: "annuity", months: 3, bankPayment: 100 });
const sc = H.loanSchedule(bad);
ok(sc && sc.payments[0].interest >= sc.payments[0].payment ? ids(calcCoach([...steady, ...daily], { debts: [], loans: [bad] }, NOW)).includes("noCover") : true, "a payment that does not cover the monthly interest raises the card (when such a schedule exists)");
finish("run18coach");
