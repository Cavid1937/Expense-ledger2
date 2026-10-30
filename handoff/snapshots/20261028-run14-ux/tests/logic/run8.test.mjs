// Run 8 (2026-10-27): ChatGPT independent audit, items 1–3, 5, 10, 11. Written before the fixes.
import { H, KEY, ok, section, eq, setNow, reset, keysLike, T, finish } from "./lib.mjs";
const { planImport, migrateAndLoad, resolveCategory, buildSchedules, scheduleOccurrences, localDateStr, applyImport, getNotice } = H;
const rec = (date, o = {}) => ({ id: Math.random(), amount: 5, category: "food", date, ...o });

section("1. Dates: a date, or a date with a valid time — nothing else");
const goodDates = ["2026-10-01", "2026-10-01T10:30", "2026-10-01T10:30:15", "2026-10-01T10:30:15.123Z", "2026-10-01T10:30:15+04:00", "2026-10-01 10:30", "2026-10-01T23:59:59-05:30"];
let plan = planImport(JSON.stringify(goodDates.map((d) => rec(d))), "a.json");
ok(plan.ok && plan.transactions.length === goodDates.length && plan.transactions.every((t) => t.date === "2026-10-01"), "date-only and valid ISO date-times (with/without seconds, ms, Z or ±hh:mm offset, T or space) are accepted as 2026-10-01", plan.transactions?.map((t) => t.date));
const badDates = ["2026-10-01Tgarbage", "2026-10-01T25:00", "2026-10-01T10:61", "2026-10-01T10:30:61", "2026-10-01T", "2026-10-01T10", "2026-10-01T10:30:15+25:00", "2026-10-01 garbage", "2026-10-01T10:30Zjunk"];
plan = planImport(JSON.stringify([...badDates.map((d) => rec(d)), rec("2026-10-02")]), "a.json");
ok(plan.ok && plan.transactions.length === 1 && plan.skippedCount === badDates.length && /invalid date/.test(plan.skippedSummary), "malformed suffixes / impossible times are refused (never cut down to a valid date)", { kept: plan.transactions?.length, skipped: plan.skippedCount, s: plan.skippedSummary });
plan = planImport("date,amount\n2026-10-01Tgarbage,5\n2026-10-02T09:15,6\n", "a.csv");
ok(plan.ok && plan.transactions.length === 1 && plan.transactions[0].amount === 6 && plan.skippedCount === 1, "CSV: '2026-10-01Tgarbage' refused, '2026-10-02T09:15' accepted", plan);
reset(); localStorage.setItem(KEY, JSON.stringify({ transactions: [T({ id: 1, date: "2026-10-01Tgarbage" }), T({ id: 2, date: "2026-10-03" })], budgets: {}, templates: [], currency: "₼", goals: [], safeToSpend: {} }));
let st = migrateAndLoad();
ok(st.transactions.length === 1 && st.transactions[0].id === 2 && keysLike(KEY + "__rejected_").length === 1, "stored data: the malformed date is set aside with a recovery copy", st.transactions.map((t) => t.id));
reset(); localStorage.setItem("finance_os_v3", JSON.stringify({ transactions: [T({ id: 7, date: "2026-01-02T99:00" }), T({ id: 8, date: "2026-01-03" })] }));
st = migrateAndLoad();
ok(st.transactions.length === 1 && st.transactions[0].id === 8 && keysLike(KEY + "__legacy_finance_os_v3_rejected_").length === 1, "older-version data: the impossible time is set aside too", st.transactions.map((t) => t.id));

section("2. Categories: exact names only — no guessing from part of a word");
const exact = [["food", "food"], ["Groceries", "food"], ["  groceries  ", "food"], ["Food and Dining", "food"], ["food   &   dining", "food"], ["Groceries & Cafes", "food"], ["Bills & Subscriptions", "digital"], ["Pay", "salary"], ["TAXI", "transport"]];
ok(exact.every(([raw, want]) => resolveCategory(raw) === want), "exact ids, names and aliases still map (case, spaces and 'and'/'&' normalised)", exact.map(([raw]) => [raw, resolveCategory(raw)]));
const unknown = ["Payment", "Bus ticket", "x", "ca", "Car repair", "Foodtruck festival", "Pet supplies", "Subway sandwich"];
ok(unknown.every((raw) => resolveCategory(raw) === "other"), "unknown text → Other (was: substring guess, e.g. 'Payment' → Salary, 'x' → Taxi/Exercise)", unknown.map((raw) => [raw, resolveCategory(raw)]));
plan = planImport(JSON.stringify([rec("2026-10-01", { category: "Payment" }), rec("2026-10-01", { category: "food" })]), "a.json");
ok(plan.warnings.some((w) => /1 .*(Other|category)/i.test(w)), "the import warns that 1 row's category was not recognised and goes to Other", plan.warnings);

section("3. Replace is not offered when any row of the file is refused");
plan = planImport(JSON.stringify({ transactions: [rec("2026-10-01"), rec("2026-10-02"), rec("bad-date")] }), "b.json");
ok(plan.ok && plan.transactions.length === 2 && plan.skippedCount === 1 && plan.canReplace === false, "2 readable + 1 refused → Merge only (Replace would silently lose the refused row)", { n: plan.transactions?.length, skipped: plan.skippedCount, canReplace: plan.canReplace });
const device = { transactions: [T({ id: 100 }), T({ id: 101 }), T({ id: 102 })], budgets: {}, templates: [], currency: "₼", goals: [], safeToSpend: { savingsTarget: 0, enabled: false } };
ok(applyImport(device, plan, "replace").transactions.length === 3, "…and even if Replace is forced, the 3 existing transactions stay");
plan = planImport(JSON.stringify({ transactions: [rec("2026-10-01"), rec("2026-10-02")] }), "b.json");
ok(plan.canReplace === true && applyImport(device, plan, "replace").transactions.length === 2, "control: a fully readable backup still replaces");

section("5. One early or late payment does not move a bill's due day");
const occ = (dates, mon, freq = "monthly") => scheduleOccurrences(buildSchedules(dates.map((d, i) => T({ id: 800 + i, date: d, recurring: true, recurFreq: freq, merchant: "Bill", amount: 10 })))[0], mon).map(localDateStr);
ok(eq(occ(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-25"], "2026-05"), ["2026-05-31"]), "due on the 31st, paid early on 25 Apr → May still due 31 May (was: 25 May)", occ(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-25"], "2026-05"));
ok(eq(occ(["2026-01-15", "2026-02-15", "2026-03-20"], "2026-04"), ["2026-04-15"]), "due on the 15th, paid late on 20 Mar → April still due 15 Apr", occ(["2026-01-15", "2026-02-15", "2026-03-20"], "2026-04"));
ok(eq(occ(["2026-01-15", "2026-02-15", "2026-03-20", "2026-04-20"], "2026-05"), ["2026-05-20"]), "two payments in a row on the 20th = a real change → May due 20 May");
ok(eq(occ(["2026-01-31", "2026-02-28"], "2026-03"), ["2026-03-31"]) && eq(occ(["2026-03-31", "2026-04-30"], "2026-05"), ["2026-05-31"]), "controls: 31 Jan/28 Feb → 31 Mar; 31 Mar/30 Apr → 31 May");
ok(eq(occ(["2024-02-29", "2025-02-28"], "2028-02", "yearly"), ["2028-02-29"]), "control: 29 Feb 2024 / 28 Feb 2025 → 29 Feb 2028");

section("10. An older record with isActive: null keeps the meaning it always had (paused), visibly");
reset(); localStorage.setItem(KEY, JSON.stringify({ transactions: [T({ id: 1, recurring: true, recurFreq: "monthly", isActive: null }), T({ id: 2 })], budgets: {}, templates: [], currency: "₼", goals: [], safeToSpend: {} }));
st = migrateAndLoad();
ok(st.transactions.length === 2 && st.transactions.find((t) => t.id === 1).isActive === false && keysLike(KEY + "__rejected_").length === 0, "isActive: null → paused (as the old app read it), not set aside and not re-activated", st.transactions.map((t) => [t.id, t.isActive]));
plan = planImport(JSON.stringify([rec("2026-10-01", { isActive: null }), rec("2026-10-01", { isActive: 0 })]), "a.json");
ok(plan.transactions.length === 1 && plan.transactions[0].isActive === false && plan.skippedCount === 1, "in a file: null → paused; 0 is still refused (ambiguous)", plan.transactions?.map((t) => t.isActive));

section("11. Look-alike checks see whether an entry is recurring");
const one = { id: 1, amount: 9.99, category: "digital", merchant: "Netflix", date: "2026-10-05" };
plan = planImport(JSON.stringify([one, { ...one, id: 2, recurring: true, recurFreq: "monthly" }]), "a.json");
ok(!plan.warnings.some((w) => /identical/.test(w)), "a one-off and a monthly entry with the same date/amount/merchant are not 'identical rows'", plan.warnings);
const ledger = { ...device, transactions: [T({ ...one, id: 50 })] };
plan = planImport(JSON.stringify([{ ...one, id: 60, recurring: true, recurFreq: "monthly" }, { ...one, id: 61 }]), "a.json");
const merged = applyImport(ledger, plan, "merge", { skipDuplicates: true });
ok(merged.transactions.length === 2 && merged.transactions.some((t) => t.id === 60) && !merged.transactions.some((t) => t.id === 61), "skip look-alikes: the identical one-off is skipped, the recurring one is added", merged.transactions.map((t) => t.id));
plan = planImport(JSON.stringify([{ ...one, id: 70, isActive: false }]), "a.json");
ok(applyImport(ledger, plan, "merge", { skipDuplicates: true }).transactions.length === 1, "control: being paused or not does not make an entry different (a re-import is still skipped)");
finish("run8");
