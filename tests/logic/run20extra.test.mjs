// Run 20: coach rule R12, "what if I pay extra now". Expected values worked out BY HAND, month by month, rounding each month's interest
// to the qapik exactly as the schedule does (see the comments). Synthetic loans.
import { H, ok, section, reset, finish } from "./lib.mjs";
const { loanExtraEffect, loanSchedule } = H;
reset();
const loan = (o = {}) => ({ id: "l1", lender: "Bank", kind: "cash", principal: 100000, ratePct: 12, rateType: "annuity", months: 12, firstPayment: "2026-11-05", bankPayment: null, payments: [], ...o });

section("R20-X1. 1,000 AZN, 12 months, 12% a year, annuity: regular payment 88.85, total interest 66.19 (hand schedule)");
const sc = loanSchedule(loan());
ok(sc.payments[0].payment === 8885 && sc.totalInterest === 6619, "the schedule matches the hand schedule (payment 88.85, interest 66.19)", [sc.payments[0].payment, sc.totalInterest]);

section("R20-X2. Extra 100.00 before any payment");
// hand: start 900.00; interest 9.00, 8.20, 7.40, 6.58, 5.76, 4.93, 4.09, 3.24, 2.38, 1.52, 0.65 = 53.75 over 11 payments (last 65.25)
let r = loanExtraEffect(loan(), 10000);
ok(r && r.newMonths === 11 && r.origMonths === 12 && r.monthsSaved === 1, "ends one month sooner (11 payments instead of 12)", r);
ok(r && r.interestSaved === 1244, "saves 66.19 - 53.75 = 12.44", r);

section("R20-X3. Extra 100.00 after 3 payments");
// hand: balance after 3 payments 761.08, remaining original interest 66.19 - (10.00+9.21+8.42) = 38.56
//       new start 661.08: interest 6.61, 5.79, 4.96, 4.12, 3.27, 2.42, 1.55, 0.68 = 29.40 over 8 payments (last 68.53)
r = loanExtraEffect(loan({ payments: [{ id: "a" }, { id: "b" }, { id: "c" }] }), 10000);
ok(r && r.origMonths === 9 && r.newMonths === 8 && r.monthsSaved === 1, "9 payments were left, 8 would be", r);
ok(r && r.interestSaved === 916, "saves 38.56 - 29.40 = 9.16", r);

section("R20-X4. No interest");
// 1,200.00 over 12 months at 0%: payment 100.00; extra 300.00 leaves 900.00 = 9 payments, 3 sooner, no interest
r = loanExtraEffect(loan({ principal: 120000, ratePct: 0 }), 30000);
ok(r && r.monthsSaved === 3 && r.newMonths === 9 && r.interestSaved === 0, "three months sooner, nothing saved in interest", r);

section("R20-X5. Says nothing when it cannot say something true");
ok(loanExtraEffect(loan({ rateType: "equal" }), 10000) === null && loanExtraEffect(loan({ rateType: "flat" }), 10000) === null && loanExtraEffect(loan({ rateType: "none", ratePct: 0 }), 10000) === null, "only annuity loans");
ok(loanExtraEffect(loan(), 0) === null && loanExtraEffect(loan(), -5) === null && loanExtraEffect(loan(), 10.5) === null && loanExtraEffect(loan(), NaN) === null, "zero, negative, fractional or NaN extra amounts");
ok(loanExtraEffect(loan(), 100000) === null && loanExtraEffect(loan(), 150000) === null, "an extra payment that clears the whole balance is not a 'what if'");
ok(loanExtraEffect(loan({ payments: new Array(12).fill({}) }), 100) === null, "a loan whose payments are all made");
ok(loanExtraEffect(null, 100) === null && loanExtraEffect({}, 100) === null, "invalid loans");
section("R20-X6. Bigger extra never saves less");
const a = loanExtraEffect(loan(), 10000), b = loanExtraEffect(loan(), 30000);
ok(b.monthsSaved >= a.monthsSaved && b.interestSaved > a.interestSaved, "300 saves more than 100", [a, b]);
finish("run20extra");
