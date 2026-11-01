// Run 13 (2026-10-28): migration and backup safety for the bill model, and the date cases the Run 12 tests did not reach.
// Synthetic data only. Expected values are worked out by hand in the comments. Today (harness default) = 13 Oct 2026.
import { H, ok, section, eq, reset, finish } from "./lib.mjs";
const { buildSchedules, scheduleOccurrences, calcSafeToSpend, buildBackup, planImport, applyImport, BACKUP_VERSION, localDateStr } = H;
reset();
const cfg = { enabled: true, savingsTarget: 0 };
const safe = (txns, bills) => calcSafeToSpend(txns, cfg, [], new Date(2026, 9, 13, 12), bills).remaining;
const T = (o) => ({ id: o.id, type: "expense", category: "housing", subcategory: "Utilities", merchant: "Kommunal", note: "", recurring: true, recurFreq: "monthly", isActive: true, createdAt: "2026-09-01T00:00:00Z", ...o });
const income = { id: "inc1", type: "income", amount: 2000, category: "salary", subcategory: "", merchant: "Employer", note: "", date: "2026-10-01", recurring: false, recurFreq: null, isActive: true, createdAt: "x" };
const bill = (o) => ({ id: o.id, name: "Kommunal", type: "expense", category: "housing", subcategory: "Utilities", amount: 18, freq: "monthly", anchorDate: "2026-09-05", active: true, createdAt: "2026-09-01T00:00:00Z", ...o });
// The app lists entries newest first, so lists are compared by id; objects are compared with their keys sorted.
const proj = (txns) => txns.map((t) => [String(t.id), t.type, t.amount, t.category, t.subcategory, t.merchant, t.note, t.date, t.recurring, t.recurFreq, t.isActive, t.billId]).sort((a, b) => (a[0] < b[0] ? -1 : 1));
const canon = (o) => JSON.stringify(o, (k, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((x) => [x, v[x]])) : v));
const same = (a, b) => canon(a) === canon(b);
const sum = (txns, type) => Math.round(txns.filter((t) => t.type === type).reduce((a, t) => a + t.amount, 0) * 100) / 100;
const bills = [bill({ id: "bE", amount: 90 }), bill({ id: "bW", amount: 18 })];
const txns = [income, T({ id: "e1", amount: 90, note: "Electricity", date: "2026-09-05", billId: "bE" }), T({ id: "w1", amount: 18, note: "Water", date: "2026-09-05", billId: "bW" }),
  T({ id: "w2", amount: 18, note: "Water", date: "2026-10-05", billId: "bW" }), { ...income, id: 1790000000007, type: "expense", category: "food", amount: 12.34, merchant: "Shop", date: "2026-10-09", recurring: false }];
const settings = { budgets: { food: 400 }, templates: [{ id: "t1", name: "Bus", amount: 0.6, catId: "transport", subcat: "Bus", merchant: "", note: "" }], currency: "₼",
  goals: [{ id: "g1", name: "Laptop", target: 4000, saved: 300, monthlyTarget: 200, targetDate: null }], safeToSpend: cfg };
const empty = { transactions: [], bills: [], budgets: {}, templates: [], currency: "₼", goals: [], safeToSpend: { enabled: false, savingsTarget: 0 } };

section("R13-1. A version-9 backup (no bills) imports without changing anything it contains");
const v10file = buildBackup({ ...settings, transactions: txns, bills }, "2026-10-13T00:00:00Z");
const { bills: _b, ...v9rest } = v10file;
const v9file = { ...v9rest, version: 9, transactions: txns.map(({ billId, ...r }) => r) };
const p9 = planImport(JSON.stringify(v9file), "v9.json");
ok(p9.ok && p9.transactions.length === 5 && p9.transactions.every((t) => t.billId === undefined), "the v9 file reads: 5 entries, no bill links invented", p9.error);
const r9 = applyImport(empty, p9, "replace");
ok(eq(proj(r9.transactions), proj(txns.map(({ billId, ...r }) => r))) && sum(r9.transactions, "expense") === 138.34 && sum(r9.transactions, "income") === 2000, "Replace into an empty app: the same 5 ids and fields; expenses 90 + 18 + 18 + 12.34 = 138.34, income 2,000");
ok(same(r9.budgets, settings.budgets) && r9.currency === "₼" && same(r9.goals, settings.goals) && same(r9.safeToSpend, cfg) && same(r9.templates, settings.templates), "budgets, currency, goals, Safe to Spend settings and templates come through unchanged");
const existing = { ...empty, transactions: [{ ...income, id: "mine1", amount: 500, date: "2026-10-02" }], bills: [bill({ id: "bX", name: "Gym", amount: 50 })] };
const m9 = applyImport(existing, p9, "merge");
ok(m9.transactions.length === 6 && m9.transactions.find((t) => t.id === "mine1").amount === 500 && eq(m9.bills, existing.bills), "Merge keeps the app's own entries and its bills untouched, and adds the 5 file entries (6 in total)");
ok(new Set(m9.transactions.map((t) => String(t.id))).size === 6, "no two entries share an id after merging");
const rv9 = applyImport({ ...existing, transactions: txns, bills }, p9, "replace");
ok(rv9.bills.length === 2 && rv9.transactions.length === 5 && rv9.transactions.every((t) => t.billId === undefined), "Replace with a v9 file replaces the entries; a section the file does not contain is kept (documented rule), so the device's 2 bills stay but no entry points to them any more (the sheet says so: e2e_run13)");

section("R13-2. Version 10 → version 10: nothing is lost or changed (ids, counts, totals, settings, links)");
const p10 = planImport(JSON.stringify(v10file), "v10.json");
ok(p10.ok && BACKUP_VERSION === 10 && v10file.version === 10 && p10.warnings.length === 0, "the v10 file reads with no warnings", p10.warnings);
const r10 = applyImport(empty, p10, "replace");
ok(eq(proj(r10.transactions), proj(txns)) && r10.transactions.length === 5, "all 5 entries come back with identical fields, including the 3 bill links");
ok(same(r10.bills, bills) && same(r10.budgets, settings.budgets) && same(r10.goals, settings.goals) && same(r10.templates, settings.templates) && r10.currency === "₼" && same(r10.safeToSpend, cfg), "bills, budgets, goals, templates, currency and Safe to Spend settings are identical");
const near = (a, b) => Math.abs(a - b) < 0.005;
ok(near(safe(txns, bills), 1879.66) && near(safe(r10.transactions, r10.bills), 1879.66), "Safe to Spend before the backup and after restoring it is the same 1,879.66 (2,000 − 18 water − 12.34 shop − 90 electricity set aside)", [safe(txns, bills), safe(r10.transactions, r10.bills)]);
const back2 = planImport(JSON.stringify(buildBackup({ ...settings, transactions: r10.transactions, bills: r10.bills }, "2026-10-13T00:00:00Z")), "again.json");
ok(back2.ok && eq(proj(back2.transactions), proj(txns)) && same(back2.settings.bills, bills), "exporting the restored data again gives the same entries and bills (stable round trip)");

section("R13-3. Damaged, partial, duplicate and future files");
const bad = { ...v10file, bills: [bills[0], { ...bills[1], amount: -5 }, null, 7, bills[0]], transactions: [...v10file.transactions, { ...txns[2], id: "w9", amount: "abc" }, { ...txns[3], id: "w8", billId: "ghost" }] };
const pb = planImport(JSON.stringify(bad), "bad.json");
ok(pb.ok && pb.settings.bills.length === 1 && pb.settings.bills[0].id === "bE", "a file with 1 good, 1 invalid, 2 junk and 1 duplicate bill keeps the good one once", pb.settings.bills);
ok(pb.transactions.length === 6 && pb.transactions.find((t) => t.id === "w8").billId === undefined && pb.transactions.find((t) => t.id === "w9") === undefined, "a bad amount is refused (that entry only), a link to a bill the file does not hold is dropped (the entry stays)", pb.transactions.length);
ok(pb.warnings.length > 0, "and the import sheet is told about it", pb.warnings);
ok(!planImport(JSON.stringify({ ...v10file, version: 11 }), "f.json").ok && !planImport("{not json", "x.json").ok && !planImport("", "e.json").ok && !planImport("[]", "a.json").ok, "a newer version, broken JSON, an empty file and an empty list are all refused with nothing imported");
const noList = planImport(JSON.stringify({ ...v10file, transactions: "x" }), "n.json");
ok(noList.ok && noList.transactions.length === 0 && noList.canReplace === false && noList.warnings.length > 0, "a file whose entry list is damaged (not a list) can still bring its settings, but it can never Replace the ledger, and the sheet WARNS that no entries could be read (was: silent)", noList.warnings);
const noMeta = planImport(JSON.stringify({ version: 10, budgets: { food: 400 }, transactions: "x" }), "hand-made.json");
ok(noMeta.ok && noMeta.transactions.length === 0 && noMeta.canReplace === false && noMeta.warnings.length > 0, "the same damage in a file with no entry count (hand-made or from another app) is ALSO reported, not silent", noMeta.warnings);
const trunc = JSON.stringify(v10file).slice(0, 400);
ok(!planImport(trunc, "cut.json").ok, "a file cut off halfway is refused");
const once = applyImport(empty, p10, "merge"), twice = applyImport(once, p10, "merge");
ok(twice.bills.length === 2 && new Set(twice.transactions.map((t) => String(t.id))).size === twice.transactions.length, "importing the same v10 file twice never duplicates a bill or an id");

section("R13-4. Dates and payments (hand-worked)");
const occ = (b, mon) => scheduleOccurrences(buildSchedules([], [b])[0], mon).map(localDateStr);
const jan31 = bill({ id: "bJ", anchorDate: "2028-01-31" });
ok(eq(occ(jan31, "2028-01"), ["2028-01-31"]) && eq(occ(jan31, "2028-02"), ["2028-02-29"]) && eq(occ(jan31, "2028-03"), ["2028-03-31"]), "31 Jan → 29 Feb (2028 is a leap year) → 31 Mar");
const jan31b = bill({ id: "bJ2", anchorDate: "2027-01-31" });
ok(eq(occ(jan31b, "2027-01"), ["2027-01-31"]) && eq(occ(jan31b, "2027-02"), ["2027-02-28"]) && eq(occ(jan31b, "2027-03"), ["2027-03-31"]), "31 Jan → 28 Feb (2027) → 31 Mar");
const y29 = bill({ id: "bY", freq: "yearly", anchorDate: "2028-02-29" });
ok(eq(occ(y29, "2028-02"), ["2028-02-29"]) && eq(occ(y29, "2029-02"), ["2029-02-28"]) && eq(occ(y29, "2032-02"), ["2032-02-29"]) && eq(occ(y29, "2028-03"), []), "yearly on 29 Feb: 29 Feb 2028, 28 Feb 2029, 29 Feb 2032, nothing in March");
const gym = bill({ id: "bG", name: "Gym", amount: 40, anchorDate: "2026-09-05", category: "health", subcategory: "" });
const pay = (id, date, amount = 40) => T({ id, amount, date, merchant: "Gym", category: "health", subcategory: "", billId: "bG" });
ok(safe([income], [gym]) === 1960, "no October payment yet (due 5 Oct, today 13 Oct): 2,000 set aside 40 for the missed one → 1,960");
ok(safe([income, pay("g1", "2026-10-01")], [gym]) === 1960 && safe([income, pay("g2", "2026-10-12")], [gym]) === 1960, "paid early (1 Oct) or late (12 Oct): 2,000 − 40 spent, nothing set aside → 1,960");
ok(safe([income, pay("g3", "2026-09-28")], [gym]) === 1960, "a September payment does not settle October: 40 set aside → 1,960, and the September spend is not this month's");
ok(safe([income, pay("g4", "2026-10-05"), pay("g5", "2026-10-06")], [gym]) === 1920, "paid twice in October: both are real spending (2,000 − 80 = 1,920) and nothing more is set aside");
ok(safe([income, pay("g6", "2026-10-05", 55)], [gym]) === 1945, "paid 55 instead of 40 (a variable amount): 2,000 − 55 = 1,945; the bill's own amount is not forced onto the payment");
const prevLen = JSON.stringify([income, gym]);
safe([income], [gym]); ok(JSON.stringify([income, gym]) === prevLen, "calculating never changes the stored bills or entries");

finish("run13");
