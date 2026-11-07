// Run 32 (backlog item 4): hand-worked expectations added because the mutation check (tests/mutation/run-mutation.mjs) showed three deliberate bugs
// that no test noticed. Synthetic data only.
import { H, ok, section, reset, T, setNow, finish } from "./lib.mjs";
const { accountBalances, calcSafeToSpend, loanSchedule } = H;
reset(); setNow(2026, 9, 13);
section("R32-X1. Account money is added in whole cents, rounded to nearest (0.29 and 0.57 are not exact in floating point)");
const acc = { version: 1, accounts: [{ id: "a_card01", name: "Card", kind: "card", opening: { amount: 0.29, date: "" }, hidden: false }], transfers: [] };
let b = accountBalances(acc, [T({ id: 1, type: "income", amount: 0.57, date: "2026-10-05", account: "a_card01" })], "2026-10-20");
ok(b.a_card01 === 0.86, "opening 0.29 + income 0.57 = exactly 0.86 (rounding down would give 0.84)", b);
section("R32-X2. A bill due today and an unlinked look-alike entry dated today: both count (only entries dated AFTER today settle a due payment)");
const now = new Date(2026, 9, 13);
const inc = T({ id: 1, type: "income", amount: 2000, date: "2026-10-01", createdAt: "2026-10-01T00:00:00Z" });
const rent = { id: "bR", name: "Rent", type: "expense", category: "housing", subcategory: "", amount: 500, freq: "monthly", anchorDate: "2026-09-13", active: true, createdAt: "2026-09-01T00:00:00Z" };
const today = T({ id: 2, amount: 500, category: "housing", merchant: "Rent", date: "2026-10-13" });
const r = calcSafeToSpend([inc, today], {}, [], now, [rent]);
ok(r.remaining === 1000 && r.matchedAheadCount === 0, "2000 - 500 entry today - 500 bill due today = 1000, nothing matched ahead (never optimistic)", [r.remaining, r.matchedAheadCount]);
section("R32-X3. Equal-principal loan: the whole amount is repaid, the last instalment absorbs the rounding (100.00 over 3 months)");
const s = loanSchedule({ principal: 10000, months: 3, rateType: "equal", ratePct: 0, firstPayment: "2026-11-01", bankPayment: null });
ok(s && s.payments.map((p) => p.principal).join() === "3333,3333,3334", "principal parts 33.33, 33.33, 33.34 (qapik: 3333, 3333, 3334)", s && s.payments.map((p) => p.principal));
ok(s && s.totalPaid === 10000 && s.payments[2].balance === 0, "total paid is exactly 100.00 and the balance ends at 0", s && [s.totalPaid, s.payments[2].balance]);
finish("run32mut");
