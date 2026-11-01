// Run 22 (2026-11-01), formula audit part 1: loan schedules against values worked out independently (by hand / closed-form), not by
// re-running the app's own code. Units are qapik (1 AZN = 100). Synthetic data only.
import { H, ok, section, eq, reset, finish } from "./lib.mjs";
const { loanSchedule, impliedNominalPct } = H;
reset();
const L = (o) => ({ principal: 1000000, ratePct: 12, rateType: "annuity", months: 12, firstPayment: "2026-11-25", ...o });
const sum = (rows, k) => rows.reduce((s, r) => s + r[k], 0);

section("R22-A1. Annuity 10,000.00 at 12% for 12 months: textbook payment 888.49");
let s = loanSchedule(L({}));
ok(s.payments[0].payment === 88849, "monthly payment 888.49 (10000 * 0.01 / (1 - 1.01^-12) = 888.4879)", s.payments[0].payment);
ok(s.payments[0].interest === 10000, "month 1 interest is exactly 1% of 10,000.00 = 100.00", s.payments[0].interest);
ok(sum(s.payments, "principal") === 1000000 && s.payments[11].balance === 0, "principal parts add up to the loan and the balance ends at exactly 0");
ok(s.totalPaid === sum(s.payments, "payment") && s.totalInterest === s.totalPaid - 1000000, "total interest = total paid - principal");
ok(Math.abs(s.totalPaid - 1066185) <= 12, "total paid is about 10,661.85 (12 x 888.49 = 10,661.88, last payment absorbs rounding)", s.totalPaid);
ok(s.payments.every((r) => r.payment === r.interest + r.principal), "every row: payment = interest + principal");

section("R22-A2. Equal principal 12,000.00 at 12% for 12 months: interest 780.00 in total");
s = loanSchedule(L({ principal: 1200000, rateType: "equal" }));
ok(s.payments.every((r) => r.principal === 100000), "principal part is 1,000.00 every month", s.payments.map((r) => r.principal));
ok(s.payments[0].interest === 12000 && s.payments[11].interest === 1000, "interest goes from 120.00 down to 10.00");
ok(s.totalInterest === 78000, "total interest = 1% x (12000+11000+...+1000) = 780.00", s.totalInterest);

section("R22-A3. Flat 12% on 10,000.00 for 12 months: interest on the original sum");
s = loanSchedule(L({ rateType: "flat" }));
ok(s.totalInterest === 120000 && s.totalPaid === 1120000, "interest 1,200.00, total 11,200.00", [s.totalInterest, s.totalPaid]);
ok(s.payments[0].payment === 93333 && s.payments[11].payment === 93337, "payment 933.33; the last one 933.37 so the total is exact", [s.payments[0].payment, s.payments[11].payment]);
const imp = impliedNominalPct(1000000, 12, 93333);
ok(imp > 21 && imp < 22.5, "flat 12% is about 21.6% a year on the falling balance (closed-form check)", imp);

section("R22-A4. No interest: 10,000.00 over 3 months does not lose or invent a qapik");
s = loanSchedule(L({ rateType: "none", months: 3, ratePct: 0 }));
ok(eq(s.payments.map((r) => r.payment), [333333, 333333, 333334]) && s.totalInterest === 0, "333.33, 333.33, 333.34 and no interest", s.payments.map((r) => r.payment));

section("R22-A5. Dates: same day each month, short months do not drift");
s = loanSchedule(L({ firstPayment: "2026-01-31", months: 4 }));
ok(eq(s.payments.map((r) => r.date), ["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]), "31 Jan, 28 Feb, 31 Mar, 30 Apr", s.payments.map((r) => r.date));
s = loanSchedule(L({ firstPayment: "2027-12-15", months: 3 }));
ok(eq(s.payments.map((r) => r.date), ["2027-12-15", "2028-01-15", "2028-02-15"]), "year rollover is correct", s.payments.map((r) => r.date));
ok(loanSchedule(L({ firstPayment: "2026-02-30" })) === null, "an impossible date is refused, not guessed");
finish("run22audit");
