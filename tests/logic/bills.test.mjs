// Run 12 (2026-10-27): explicit bills. Written BEFORE the implementation. Expected values are worked out by hand.
// Today (harness default) = 13 Oct 2026. Fixture = the Run 8 item 4 collision (log 179): one utility company "Kommunal",
// electricity 90 and water 18, both Home / Utilities, monthly, due on the 5th; income 2,000 on 1 Oct.
import { H, ok, section, eq, setNow, reset, finish } from "./lib.mjs";
const { buildSchedules, scheduleOccurrences, scheduleMonthStatus, calcSafeToSpend, validateSettings, normaliseTxn, buildBackup, planImport, applyImport,
  validateBill, convertLegacySchedules, assignToBill, BACKUP_VERSION, localDateStr } = H;
reset();
const cfg = { enabled: true, savingsTarget: 0 };
const T = (o) => ({ id: o.id, type: "expense", category: "housing", subcategory: "Utilities", merchant: "Kommunal", note: "", recurring: true, recurFreq: "monthly", isActive: true, createdAt: "2026-09-01T00:00:00Z", ...o });
const income = { id: "inc1", type: "income", amount: 2000, category: "salary", subcategory: "", merchant: "Employer", note: "", date: "2026-10-01", recurring: false, recurFreq: null, isActive: true, createdAt: "x" };
const legacy = [ T({ id: "e1", amount: 90, note: "Electricity", date: "2026-09-05" }), T({ id: "w1", amount: 18, note: "Water", date: "2026-09-05" }), T({ id: "w2", amount: 18, note: "Water", date: "2026-10-05" }), income ];
const safe = (txns, bills) => calcSafeToSpend(txns, cfg, [], new Date(2026, 9, 13, 12), bills).remaining;
const bill = (o) => ({ id: o.id, name: "Kommunal", type: "expense", category: "housing", subcategory: "Utilities", amount: 18, freq: "monthly", anchorDate: "2026-09-05", active: true, createdAt: "2026-09-01T00:00:00Z", ...o });

section("1. Data saved by earlier versions behaves exactly as before until the user converts it");
ok(buildSchedules(legacy).length === 1 && buildSchedules(legacy, []).length === 1, "no bills: the two utility bills are still one inferred schedule (the known collision, unchanged)");
ok(safe(legacy, []) === 1982, "…and Safe to Spend is still 1,982 (2,000 − 18 spent; the merged schedule counts as paid)", safe(legacy, []));

section("2. Converting old recurring payments into bills — explicit, complete, repeatable, non-destructive");
const before = JSON.stringify(legacy);
const c1 = convertLegacySchedules(legacy, [], new Date(2026, 9, 13, 12));
ok(JSON.stringify(legacy) === before, "the input is not changed (the app keeps it for Undo)");
ok(c1.created === 1 && c1.bills.length === 1 && c1.bills[0].name === "Kommunal" && c1.bills[0].amount === 18 && c1.bills[0].freq === "monthly" && c1.bills[0].active === true && /^\d{4}-\d{2}-05$/.test(c1.bills[0].anchorDate),
  "one bill per old schedule: name, latest amount (18), frequency, due day 5, active", c1.bills);
const recur = c1.transactions.filter((t) => t.recurring);
ok(recur.length === 3 && recur.every((t) => t.billId === c1.bills[0].id) && !c1.transactions.find((t) => t.id === "inc1").billId, "every old recurring payment now points to its bill; other entries untouched");
ok(eq(c1.transactions.map((t) => [t.id, t.amount, t.date, t.category, t.merchant, t.note]), legacy.map((t) => [t.id, t.amount, t.date, t.category, t.merchant, t.note])), "ids, amounts, dates, categories, names and notes are unchanged");
const c2 = convertLegacySchedules(c1.transactions, c1.bills, new Date(2026, 9, 13, 12));
ok(c2.created === 0 && eq(c2.transactions, c1.transactions) && eq(c2.bills, c1.bills), "running it again changes nothing (idempotent)");
ok(safe(c1.transactions, c1.bills) === 1982, "an already-merged pair stays merged after conversion (it is not guessed apart) — still 1,982");

section("3. Splitting a merged bill: the user moves the electricity payment to a new bill");
const s1 = assignToBill(c1.transactions, c1.bills, "e1", "new");
const elec = s1.bills.find((b) => b.id === s1.billId);
ok(s1.bills.length === 2 && elec && elec.amount === 90 && elec.anchorDate === "2026-09-05" && elec.freq === "monthly" && elec.name === "Kommunal" && s1.transactions.find((t) => t.id === "e1").billId === elec.id,
  "a new bill is made from that payment (90, monthly, due on the 5th) and the payment points to it", s1.bills);
ok(safe(s1.transactions, s1.bills) === 1892, "Safe to Spend now sets electricity aside: 1,892 (was 1,982 — overstated by 90)", safe(s1.transactions, s1.bills));
const back = assignToBill(s1.transactions, s1.bills, "e1", c1.bills[0].id);
ok(back.transactions.find((t) => t.id === "e1").billId === c1.bills[0].id && back.bills.length === 2, "moving it back to the first bill works; the now-empty bill is kept (the user deletes bills, never the app)");

section("4. New bills: same company, category and frequency, different obligations");
const bills4 = [bill({ id: "bE", amount: 90 }), bill({ id: "bW", amount: 18 })];
const tx4 = [income, T({ id: "p1", amount: 18, date: "2026-10-05", billId: "bW" })];
const sch4 = buildSchedules(tx4, bills4);
ok(sch4.length === 2 && sch4.every((s) => s.billId), "two bills → two schedules, never merged");
const stE = scheduleMonthStatus(sch4.find((s) => s.billId === "bE"), tx4, "2026-10", new Date(2026, 9, 13, 12)), stW = scheduleMonthStatus(sch4.find((s) => s.billId === "bW"), tx4, "2026-10", new Date(2026, 9, 13, 12));
ok(eq(stE.overdue, ["2026-10-05"]) && stW.remaining.length === 0, "the water payment settles water only; electricity (due 5 Oct) is still unpaid");
ok(safe(tx4, bills4) === 1892, "Safe to Spend 2,000 − 18 spent − 90 set aside = 1,892");
const tx5 = [...tx4, { ...income, id: "o1", type: "expense", category: "housing", amount: 90, merchant: "Kommunal", date: "2026-10-06" }];
ok(safe(tx5, bills4) === 1802, "an ordinary 'Kommunal 90' expense is NOT taken as the electricity payment (same name and amount are not enough): 1,802 until the user links it");
const l5 = assignToBill(tx5, bills4, "o1", "bE");
const o1 = l5.transactions.find((t) => t.id === "o1");
ok(o1.billId === "bE" && o1.recurring === true && o1.recurFreq === "monthly" && o1.amount === 90 && o1.date === "2026-10-06" && safe(l5.transactions, l5.bills) === 1892, "after the user links it: one payment, counted once → 1,892");

section("5. Due dates come from the bill, not from guessing");
const occ = (b, mon) => scheduleOccurrences(buildSchedules([], [b])[0], mon).map(localDateStr);
const eom = bill({ id: "bM", anchorDate: "2026-01-31" });
ok(eq(occ(eom, "2026-02"), ["2026-02-28"]) && eq(occ(eom, "2026-04"), ["2026-04-30"]) && eq(occ(eom, "2026-05"), ["2026-05-31"]) && eq(occ(eom, "2028-02"), ["2028-02-29"]), "due on the 31st: 28 Feb, 30 Apr, 31 May; 29 Feb in a leap year");
ok(eq(occ(eom, "2025-12"), []), "no due dates before the bill starts");
ok(eq(occ(bill({ id: "bY", freq: "yearly", anchorDate: "2024-02-29" }), "2026-02"), ["2026-02-28"]) && eq(occ(bill({ id: "bY", freq: "yearly", anchorDate: "2024-02-29" }), "2026-03"), []), "yearly on 29 Feb: 28 Feb in other years, nothing in other months");
const wk = bill({ id: "bK", freq: "weekly", amount: 10, anchorDate: "2026-10-02" });
ok(eq(occ(wk, "2026-10"), ["2026-10-02", "2026-10-09", "2026-10-16", "2026-10-23", "2026-10-30"]), "weekly from Fri 2 Oct: 2, 9, 16, 23, 30 Oct");
const txW = [income, T({ id: "k1", amount: 10, date: "2026-10-02", billId: "bK", recurFreq: "weekly" }), T({ id: "k2", amount: 10, date: "2026-10-09", billId: "bK", recurFreq: "weekly" })];
ok(safe(txW, [wk]) === 2000 - 20 - 30, "two weekly payments made; 16, 23, 30 Oct still to come → 3 × 10 set aside: 1,950", safe(txW, [wk]));

section("6. Amount changes, pausing, future bills");
const p6 = [income, T({ id: "q1", amount: 30, date: "2026-09-10", billId: "bI", category: "digital", subcategory: "", merchant: "ISP" })];
const isp = bill({ id: "bI", name: "ISP", category: "digital", subcategory: "", amount: 35, anchorDate: "2026-09-10" });
ok(safe(p6, [isp]) === 2000 - 35, "the bill's amount (35, after a price rise) is what is set aside for October; September's 30 stays as it was paid", safe(p6, [isp]));
ok(safe(p6, [{ ...isp, active: false }]) === 2000, "a paused bill sets nothing aside");
ok(safe([income], [bill({ id: "bF", amount: 50, anchorDate: "2026-11-01" })]) === 2000, "a bill that starts in November sets nothing aside in October");

section("7. Saving, loading, backups and imports keep bills and links");
ok(validateBill(bill({ id: "b1" })) !== null && validateBill(bill({ id: "b1", amount: -5 })) === null && validateBill(bill({ id: "b1", freq: "daily" })) === null && validateBill(bill({ id: "b1", anchorDate: "2026-02-30" })) === null && validateBill(bill({ id: "b1", name: "" })) === null && validateBill(bill({ id: "b1", amount: 12.345 })) === null && validateBill(bill({ id: "b1", type: "gift" })) === null,
  "a bill needs a name, a positive whole-cent amount, a known frequency and type, and a real date");
const vs = validateSettings({ bills: [bill({ id: "ok1" }), bill({ id: "bad", amount: 0 })] });
ok(vs.settings.bills && vs.settings.bills.length === 1 && vs.settings.bills[0].id === "ok1" && vs.problems.length === 1, "stored/imported bills: valid ones kept, invalid ones dropped and reported", vs);
ok(validateSettings({ bills: "x" }).settings.bills === undefined && validateSettings({ bills: "x" }).problems.length === 1, "bills that are not a list are rejected and reported");
ok(normaliseTxn({ ...legacy[0], billId: "bE" }).billId === "bE" && normaliseTxn(legacy[0]).billId === undefined && normaliseTxn({ ...legacy[0], billId: 7 }).billId === undefined,
  "a payment keeps its bill link when loaded; records without one get no new field; a malformed link is dropped");
const st7 = { transactions: tx4, budgets: {}, templates: [], currency: "₼", goals: [], safeToSpend: cfg, bills: bills4 };
const bk = buildBackup(st7, "2026-10-13T00:00:00Z");
ok(BACKUP_VERSION === 10 && bk.version === 10 && eq(bk.bills, bills4), "backups carry the bills (backup format version 10)");
const plan = planImport(JSON.stringify(bk), "b.json");
ok(plan.ok && eq(plan.settings.bills, bills4) && plan.transactions.find((t) => t.id === "p1").billId === "bW", "importing the backup reads the bills and the payment's link");
const rep = applyImport({ ...st7, transactions: [], bills: [] }, plan, "replace");
ok(eq(rep.bills, bills4) && rep.transactions.find((t) => t.id === "p1").billId === "bW", "Replace restores the bills and links");
const mer = applyImport({ ...st7, bills: [bill({ id: "bE", amount: 90 })] }, plan, "merge");
ok(mer.bills.length === 2 && mer.bills.filter((b) => b.id === "bE").length === 1, "Merge adds bills that are not there yet, never duplicates one with the same id");
ok(planImport(JSON.stringify({ ...bk, version: 9, bills: undefined }), "old.json").ok, "older backups (version 9, no bills) still import");
const orphan = planImport(JSON.stringify({ ...bk, bills: [] }), "o.json");
ok(orphan.ok && orphan.transactions.find((t) => t.id === "p1").billId === undefined && orphan.warnings.some((w) => /bill/i.test(w)), "a payment pointing to a bill the file does not contain loses only that link (it stays a recurring payment) and the sheet says so", orphan.warnings);
section("8. Month-end due day survives conversion (28 Feb and 31 Mar payments → due on the 31st)");
const eomTx = [T({ id: "m1", amount: 40, merchant: "Gym", subcategory: "", category: "health", note: "", date: "2026-02-28" }), T({ id: "m2", amount: 40, merchant: "Gym", subcategory: "", category: "health", note: "", date: "2026-03-31" })];
const cE = convertLegacySchedules(eomTx, [], new Date(2026, 3, 10, 12));
ok(cE.bills.length === 1 && cE.bills[0].dueDay === 31, "the converter records the due day the old rules found (31), not just the first payment's day", cE.bills[0]);
const occE = (mon) => scheduleOccurrences(buildSchedules(cE.transactions, cE.bills)[0], mon).map(localDateStr);
ok(eq(occE("2026-04"), ["2026-04-30"]) && eq(occE("2026-05"), ["2026-05-31"]) && eq(occE("2026-06"), ["2026-06-30"]), "the bill is then due 30 Apr, 31 May, 30 Jun (was: the 28th every month)", [occE("2026-04"), occE("2026-05")]);
ok(validateBill({ ...bill({ id: "d1" }), dueDay: 31 })?.dueDay === 31 && validateBill({ ...bill({ id: "d1" }), dueDay: 32 }) === null && validateBill({ ...bill({ id: "d1" }), dueDay: 0 }) === null && validateBill({ ...bill({ id: "d1" }), dueDay: 1.5 }) === null && validateBill(bill({ id: "d1" })).dueDay === undefined,
  "a bill may carry a due day 1–31; anything else is refused; bills without one use their date's day");
reset();
finish("bills");
