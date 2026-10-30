// Run 6 (2026-10-27): ChatGPT research findings D8/D14, D9/D15, D13/D22, D16–D18 (data safety) and D1, D19, D21 (recurring).
// Written before the fixes; each section names the finding. Today is Tue 13 Oct 2026 unless set otherwise.
import { H, KEY, ok, section, eq, setNow, reset, keysLike, T, finish } from "./lib.mjs";
const { migrateAndLoad, planImport, applyImport, validateSettings, buildSchedules, scheduleOccurrences, calcSafeToSpend, localDateStr, getNotice, getSaveBlocked } = H;
const NOW = () => new Date(globalThis.__NOW);
const store = (v) => localStorage.setItem(KEY, typeof v === "string" ? v : JSON.stringify(v));
const okState = (txns) => ({ transactions: txns, budgets: { food: 100 }, templates: [], currency: "₼", goals: [], safeToSpend: { savingsTarget: 0, enabled: false }, language: "en" });
const good = (id, o = {}) => T({ id, amount: 25, date: "2026-10-05", ...o });

section("D16. A failed read of the saved data is never treated as a fresh install");
reset(); store(okState([good(1)])); const before = globalThis.__store.get(KEY);
globalThis.__throwGetKeys = [KEY]; let st = migrateAndLoad(); globalThis.__throwGetKeys = [];
ok(getSaveBlocked() === true, "getItem(expense_ledger_v5) throws → saving is paused (the next save cannot overwrite the stored ledger)");
ok(/could not be read/i.test(getNotice() || "") && /paused/i.test(getNotice() || ""), "the user is told the data could not be read and saving is paused", getNotice());
ok(globalThis.__store.get(KEY) === before, "the stored ledger is byte-for-byte unchanged");
reset(); store(okState([good(1)])); localStorage.setItem("finance_os_v3", JSON.stringify({ transactions: [good(7, { date: "2026-01-02" })] }));
globalThis.__throwGetKeys = [KEY]; st = migrateAndLoad(); globalThis.__throwGetKeys = [];
ok(st.transactions.length === 0 && getSaveBlocked() === true, "…and older-version data is NOT migrated over it while the current data is unreadable", st.transactions.length);
reset(); globalThis.__throwAll = true; st = migrateAndLoad(); globalThis.__throwAll = false;
ok(typeof st === "object" && Array.isArray(st.transactions) && getSaveBlocked() === true, "storage completely unavailable → the app still starts (empty view) with saving paused");

section("D17. An empty string stored under the key is unreadable data, not 'nothing saved'");
reset(); store("");
st = migrateAndLoad();
const cor = keysLike(KEY + "__corrupt_");
ok(cor.length === 1 && localStorage.getItem(cor[0]) === "", "a recovery copy of the empty value is kept before anything can overwrite it", keysLike(KEY));
ok(/could not be read/i.test(getNotice() || ""), "the user is told the saved data could not be read", getNotice());
ok(st.language === "en", "it is treated as an existing user (no first-launch language chooser)", st.language);
reset(); globalThis.__failKeys = ["__corrupt_"]; store(""); migrateAndLoad();
ok(getSaveBlocked() === true, "…and if that copy cannot be made, saving is paused");

section("D18. Older-version data that cannot be read blocks saving instead of being skipped");
reset(); localStorage.setItem("finance_os_v3", JSON.stringify({ transactions: [good(7, { date: "2026-01-02" })] }));
globalThis.__throwGetKeys = ["finance_os_v3"]; st = migrateAndLoad(); globalThis.__throwGetKeys = [];
ok(getSaveBlocked() === true && /older version/i.test(getNotice() || ""), "reading an older key throws → saving is paused and the user is told (the older data is not hidden behind an empty ledger)", getNotice());
reset(); localStorage.setItem("finance_os_v3", JSON.stringify({ transactions: [good(7, { date: "2026-01-02" })] })); localStorage.setItem("finance_app_data", "{{ not json");
st = migrateAndLoad();
const lc = keysLike(KEY + "__legacy_finance_app_data_corrupt_");
ok(st.transactions.length === 1 && lc.length === 1 && localStorage.getItem(lc[0]) === "{{ not json" && !getSaveBlocked(), "an unparseable older key: a recovery copy is kept, the readable older data still migrates", { n: st.transactions.length, keys: keysLike(KEY) });
ok(localStorage.getItem("finance_app_data") === "{{ not json", "older keys are never modified or removed");
reset(); localStorage.setItem("finance_os_v3", JSON.stringify({ transactions: [good(7, { date: "2026-01-02" })] }));
st = migrateAndLoad();
ok(st.transactions.length === 1 && !getSaveBlocked() && getNotice() === null, "control: a normal migration is unchanged (1 record, no notice, not blocked)", getNotice());

section("D8/D14. A file with no usable transactions can never empty the ledger with Replace");
const device = okState([good(1), good(2, { amount: 40 })]);
let plan = planImport(JSON.stringify({ currency: "$" }), "s.json");
ok(plan.ok && plan.transactions.length === 0 && plan.canReplace === false, "settings-only file: importable for its settings, but Replace is not offered (canReplace=false)", { ok: plan.ok, n: plan.transactions?.length, canReplace: plan.canReplace });
let next = applyImport(device, plan, "replace");
ok(next.transactions.length === 2 && next.currency === "$", "even if Replace is forced, the 2 existing transactions stay; only the valid settings are applied", { n: next.transactions.length, cur: next.currency });
plan = planImport(JSON.stringify({ currency: "$", transactions: [{ amount: "abc", date: "x" }] }), "s.json");
ok(plan.ok && plan.transactions.length === 0 && plan.canReplace === false && plan.skippedCount === 1, "settings + only invalid rows: same (1 skipped, Replace not offered)", plan);
plan = planImport(JSON.stringify({ currency: "$", transactions: [] }), "s.json");
ok(plan.ok && plan.canReplace === false && applyImport(device, plan, "replace").transactions.length === 2, "settings + an explicitly empty list: Replace not offered and cannot empty the ledger");
plan = planImport(JSON.stringify({ transactions: [good(9, { amount: 5 })], currency: "€" }), "b.json");
next = applyImport(device, plan, "replace");
ok(plan.canReplace === true && next.transactions.length === 1 && next.transactions[0].id === 9 && next.currency === "€", "control: a backup with 1 valid transaction still replaces as before", { canReplace: plan.canReplace, n: next.transactions.length });

section("D9/D15. isActive and recurring accept only true/false (or the words true/false)");
const rows = [["true", true], [false, false], ["false", false], [" FALSE ", false], ["True", true]].map(([v, want], i) => ({ v, want, rec: { id: 100 + i, amount: 9, date: "2026-10-01", category: "food", isActive: v } }));
plan = planImport(JSON.stringify([...rows.map((r) => r.rec), { id: 199, amount: 9, date: "2026-10-01", category: "food" }]), "a.json");
ok(plan.ok && plan.transactions.length === 6 && rows.every((r) => plan.transactions.find((t) => t.id === r.rec.id)?.isActive === r.want) && plan.transactions.find((t) => t.id === 199).isActive === true,
  "true/false, \"true\"/\"false\" (any case, trimmed) are read as written; a missing flag means active", plan.transactions.map((t) => [t.id, t.isActive]));
const badFlags = [0, 1, "yes", "no", {}, []];   // Run 8: null is now read as paused (its old meaning) — see run8 §10
plan = planImport(JSON.stringify(badFlags.map((v, i) => ({ id: 300 + i, amount: 9, date: "2026-10-01", category: "food", isActive: v }))), "a.json");
ok(!plan.ok || (plan.transactions.length === 0), "isActive 0 / 1 / \"yes\" / \"no\" / {} / [] → every record refused (never guessed)", plan.ok ? plan.transactions.map((t) => [t.id, t.isActive]) : plan.error);
plan = planImport(JSON.stringify([{ id: 400, amount: 9, date: "2026-10-01", category: "food", recurring: "yes", recurFreq: "monthly" }, { id: 401, amount: 9, date: "2026-10-01", category: "food", recurring: 1, recurFreq: "monthly" }, { id: 402, amount: 9, date: "2026-10-01", category: "food", recurring: "false" }, { id: 403, amount: 9, date: "2026-10-01", category: "food", recurring: true, recurFreq: "monthly" }]), "a.json");
ok(plan.ok && eq(plan.transactions.map((t) => t.id).sort(), [402, 403]) && plan.transactions.find((t) => t.id === 402).recurring === false && plan.skippedCount === 2, "recurring \"yes\" / 1 refused; \"false\" → not recurring; true + monthly → recurring", plan.transactions.map((t) => [t.id, t.recurring]));
reset(); store(okState([good(1), good(2, { isActive: "false", recurring: true, recurFreq: "monthly" }), good(3, { isActive: "maybe" })]));
st = migrateAndLoad();
ok(st.transactions.length === 2 && st.transactions.find((t) => t.id === 2).isActive === false && keysLike(KEY + "__rejected_").length === 1, "stored data: \"false\" stays paused; an unreadable flag is set aside with a recovery copy (not silently activated)", st.transactions.map((t) => [t.id, t.isActive]));

section("D13/D22. Every stored or imported money value must be whole cents");
reset(); store(okState([good(1, { amount: 12.34 }), good(2, { amount: 12.345 }), good(3, { amount: 0.1 + 0.2 })]));
st = migrateAndLoad();
const rj = keysLike(KEY + "__rejected_");
ok(eq(st.transactions.map((t) => t.id), [1]) && rj.length === 1 && eq(JSON.parse(localStorage.getItem(rj[0])).map((t) => t.id).sort(), [2, 3]), "stored 12.345 and 0.1+0.2 (0.30000000000000004) are set aside with a recovery copy, not rounded; 12.34 kept", st.transactions.map((t) => [t.id, t.amount]));
ok(/2 unreadable records set aside/.test(getNotice() || "") && /more than 2 decimal places/.test(getNotice() || ""), "the user is told 2 records were set aside, and why", getNotice());
let v = validateSettings({ budgets: { food: 12.345, transport: 50 } });
ok(v.settings.budgets && v.settings.budgets.food === undefined && v.settings.budgets.transport === 50 && v.problems.length === 1, "budget 12.345 refused (transport 50 kept)", v);
v = validateSettings({ goals: [{ name: "A", target: 100, saved: 12.345 }, { name: "B", target: 100, monthlyTarget: 10.005 }, { name: "C", target: 100.5, saved: 10.01, monthlyTarget: 5 }] });
ok(v.settings.goals && v.settings.goals.length === 1 && v.settings.goals[0].name === "C", "goals with saved 12.345 or monthly 10.005 refused; a whole-cent goal kept", v.settings.goals);
v = validateSettings({ safeToSpend: { savingsTarget: 12.345, enabled: true } });
ok(v.settings.safeToSpend === undefined && v.problems.length === 1, "Safe to Spend savings floor 12.345 refused (your current value is kept)", v);
v = validateSettings({ templates: [{ name: "Bus", amount: 1.005, catId: "transport" }, { name: "Tea", amount: 1.5, catId: "food" }] });
ok(v.settings.templates && v.settings.templates.length === 1 && v.settings.templates[0].name === "Tea", "template 1.005 refused; 1.50 kept", v.settings.templates);
v = validateSettings({ budgets: { food: 12.34 }, safeToSpend: { savingsTarget: 300, enabled: true } });
ok(v.problems.length === 0 && v.settings.budgets.food === 12.34 && v.settings.safeToSpend.savingsTarget === 300, "control: whole-cent settings are accepted unchanged");

section("D1. Two different bills from the same merchant stay two schedules");
const R = (id, date, amount, o = {}) => T({ id, date, amount, recurring: true, recurFreq: "monthly", category: "housing", merchant: "Kommunal", ...o });
let sch = buildSchedules([R(1, "2026-09-05", 90, { subcategory: "Electricity" }), R(2, "2026-09-05", 18, { subcategory: "Water" })]);
ok(sch.length === 2 && eq(sch.map((s) => s.amount).sort((a, b) => a - b), [18, 90]), "electricity 90 and water 18 (same merchant, category, monthly) → 2 schedules", sch.map((s) => [s.subcategory, s.amount]));
reset(); setNow(2026, 9, 13);
const inc = T({ id: 50, type: "income", category: "salary", amount: 2000, date: "2026-10-02" });
const sts = calcSafeToSpend([inc, R(1, "2026-09-05", 90, { subcategory: "Electricity" }), R(2, "2026-09-05", 18, { subcategory: "Water" }), R(3, "2026-10-05", 18, { subcategory: "Water" })], { savingsTarget: 0 }, [], NOW());
ok(sts.futureCommitments === 90 && Math.abs(sts.remaining - 1892) < 1e-9, "water paid on 5 Oct does not settle electricity: 90 still owed → 2000 − 18 − 90 = 1,892 (was 1,982)", { fc: sts.futureCommitments, remaining: sts.remaining });
sch = buildSchedules([R(1, "2026-08-10", 30, { merchant: "ISP", category: "digital", subcategory: "Internet" }), R(2, "2026-09-10", 35, { merchant: "ISP", category: "digital", subcategory: "Internet" })]);
ok(sch.length === 1 && sch[0].amount === 35 && sch[0].occurrences.length === 2, "control: one bill whose price changed 30 → 35 stays ONE schedule (latest amount 35)", sch.map((s) => [s.amount, s.occurrences]));

section("D19. A bill due on the 31st returns to the 31st after a short month");
const occ = (dates, freq, mon) => scheduleOccurrences(buildSchedules(dates.map((d, i) => T({ id: 700 + i, date: d, recurring: true, recurFreq: freq, merchant: "X", amount: 10 })))[0], mon).map(localDateStr);
ok(eq(occ(["2026-01-31", "2026-02-28"], "monthly", "2026-03"), ["2026-03-31"]), "31 Jan, 28 Feb → March due 31 Mar (not 28 Mar)", occ(["2026-01-31", "2026-02-28"], "monthly", "2026-03"));
ok(eq(occ(["2026-01-31", "2026-02-28"], "monthly", "2026-04"), ["2026-04-30"]) && eq(occ(["2026-03-31", "2026-04-30"], "monthly", "2026-05"), ["2026-05-31"]), "→ April 30; and 31 Mar, 30 Apr → 31 May");
ok(eq(occ(["2026-01-15", "2026-02-15"], "monthly", "2026-03"), ["2026-03-15"]), "control: the 15th stays the 15th");
ok(eq(occ(["2026-01-31", "2026-02-28", "2026-03-28", "2026-04-28"], "monthly", "2026-05"), ["2026-05-28"]), "a deliberate change (two payments in a row on the 28th) moves the due day to the 28th — Run 8: one alone is read as early");

section("D21. A 29 February yearly payment returns to 29 February in a leap year");
ok(eq(occ(["2024-02-29", "2025-02-28"], "yearly", "2026-02"), ["2026-02-28"]) && eq(occ(["2024-02-29", "2025-02-28"], "yearly", "2028-02"), ["2028-02-29"]), "29 Feb 2024, 28 Feb 2025 → 28 Feb 2026, 29 Feb 2028", [occ(["2024-02-29", "2025-02-28"], "yearly", "2026-02"), occ(["2024-02-29", "2025-02-28"], "yearly", "2028-02")]);
ok(eq(occ(["2025-03-10"], "yearly", "2026-03"), ["2026-03-10"]) && eq(occ(["2025-03-10"], "yearly", "2026-04"), []), "control: a 10 March yearly payment is due 10 March only");
section("D10. Identical rows inside one file: all imported, the user is told; re-importing the file skips them");
const coffee = (id) => ({ id, amount: 3.5, date: "2026-10-07", category: "food", merchant: "Kofe" });
plan = planImport(JSON.stringify([coffee(801), coffee(802), coffee(803), { id: 804, amount: 3.5, date: "2026-10-07", category: "food", merchant: "Kofe", note: "for Ali" }]), "c.json");
ok(plan.ok && plan.transactions.length === 4 && plan.warnings.some((w) => /^2 rows are identical to another row in this file/.test(w)), "3 identical coffees + 1 with a note → all 4 imported; '2 rows are identical…' warning (the first one is not counted)", plan.warnings);
const empty = okState([]);
next = applyImport(empty, plan, "merge", { skipDuplicates: true });
ok(next.transactions.length === 4, "merging into an empty ledger with 'skip look-alikes' on keeps all 4 (look-alikes are judged against the ledger, not the file itself)", next.transactions.length);
const again = planImport(JSON.stringify([coffee(901), coffee(902), coffee(903)]), "c2.json");
const twice = applyImport(next, again, "merge", { skipDuplicates: true });
ok(twice.transactions.length === 4, "importing the same purchases again with new ids and 'skip look-alikes' on adds none", twice.transactions.length);
ok(!planImport(JSON.stringify([coffee(1), { ...coffee(2), amount: 4 }]), "d.json").warnings.some((w) => /identical/.test(w)), "control: different amounts → no warning");
finish("run6");
