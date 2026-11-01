// Run 8 item 4 — evidence only (not part of the suite): two distinct bills with the same merchant, category, subcategory and
// frequency (different amounts and notes) still collide. Run: node tests/evidence-item4-identity.mjs (via run-logic env).
import { H, setNow, reset, T } from "./logic/lib.mjs";
const { buildSchedules, calcSafeToSpend } = H;
reset(); setNow(2026, 9, 13);
const R = (id, date, amount, note) => T({ id, date, amount, note, recurring: true, recurFreq: "monthly", category: "housing", subcategory: "Utilities", merchant: "Kommunal" });
const txns = [T({ id: 1, type: "income", category: "salary", amount: 2000, date: "2026-10-02" }),
  R(10, "2026-09-05", 90, "Electricity"), R(11, "2026-09-05", 18, "Water"), R(12, "2026-10-05", 18, "Water")];
const sch = buildSchedules(txns);
const sts = calcSafeToSpend(txns, { savingsTarget: 0 }, [], new Date(globalThis.__NOW));
console.log(JSON.stringify({ schedules: sch.map((s) => ({ key: s.key, amount: s.amount, occurrences: s.occurrences })), futureCommitments: sts.futureCommitments, remaining: sts.remaining, expectedRemaining: 2000 - 18 - 90 }, null, 1));
console.log(sch.length === 1 ? "CONFIRMED: the two bills form ONE schedule; the 18 water payment on 5 Oct settles it, so the unpaid 90 electricity is not set aside (Safe to Spend " + sts.remaining + " instead of 1,892)." : "NOT REPRODUCED");
