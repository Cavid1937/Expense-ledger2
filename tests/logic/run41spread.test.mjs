// Run 41: spreading a big one-off cost over months (spreadMonths, expandSpreads, collapseSpreads, forSpending, Safe to Spend, backups, CSV). Hand-computed.
import { H, ok, section, reset, T, finish, setNow } from "./lib.mjs";
const { spreadMonths, expandSpreads, collapseSpreads, forSpending, calcSafeToSpend, calcCategorySpend, normaliseTxn, planImport, buildBackup, buildCsv } = H;
reset();
const ex = (id, amount, date, o = {}) => T({ id, type: "expense", category: "shopping", amount, date, ...o });
const cents = (list) => list.reduce((s, x) => s + Math.round(x.amount * 100), 0);

section("R41-S1. The field");
ok(spreadMonths(2) === 2 && spreadMonths(24) === 24 && spreadMonths("6") === 6 && spreadMonths(" 12 ") === 12 && spreadMonths("1.5") === 0, "2 to 24 whole numbers (text only as digits)");
ok(spreadMonths(1) === 0 && spreadMonths(25) === 0 && spreadMonths(0) === 0 && spreadMonths(-3) === 0 && spreadMonths(2.5) === 0 && spreadMonths("abc") === 0 && spreadMonths(null) === 0, "1, 25, 0, negative, fractions, text, null give 0");
ok(normaliseTxn({ ...ex(1, 100, "2026-10-05"), spread: 6 }).spread === 6, "kept on an expense");
ok(!("spread" in normaliseTxn({ ...T({ id: 2, type: "income", category: "salary", amount: 100, date: "2026-10-05" }), spread: 6 })), "dropped on income");
ok(!("spread" in normaliseTxn({ ...ex(3, 100, "2026-10-05"), spread: 99 })) && !("spread" in normaliseTxn(ex(4, 100, "2026-10-05"))), "invalid or missing: no field is written");

section("R41-S2. Slices");
let s = expandSpreads([ex(1, 100, "2026-10-05", { spread: 3 })]);
ok(s.length === 3 && s[0].amount === 33.34 && s[1].amount === 33.33 && s[2].amount === 33.33 && cents(s) === 10000, "100 over 3 = 33.34 + 33.33 + 33.33, exactly 100.00", s.map((x) => x.amount));
ok(s[0].date === "2026-10-05" && s[1].date === "2026-11-05" && s[2].date === "2026-12-05", "same day each month, the first on its real date");
s = expandSpreads([ex(1, 90, "2026-01-31", { spread: 3 })]);
ok(s[1].date === "2026-02-28" && s[2].date === "2026-03-31", "31 Jan: February uses the 28th, March the 31st");
s = expandSpreads([ex(1, 90, "2024-01-31", { spread: 2 })]);
ok(s[1].date === "2024-02-29", "leap year: 29 Feb");
s = expandSpreads([ex(1, 100, "2026-11-15", { spread: 3 })]);
ok(s[2].date === "2027-01-15", "slices cross the year end");
s = expandSpreads([ex(7, 0.05, "2026-10-05", { spread: 3 })]);
ok(cents(s) === 5 && s[0].amount === 0.03 && s[1].amount === 0.01, "5 qapik over 3 = 3 + 1 + 1");
s = expandSpreads([ex(1, 100, "2026-10-05", { spread: 3 })]);
ok(new Set(s.map((x) => x.id)).size === 3 && s[0].id === 1, "ids are unique and the first keeps the real id");
ok(s.every((x) => x.spreadSlice && x.spreadSlice.n === 3 && x.spreadSlice.total === 100 && x.spreadSlice.id === 1), "each slice remembers its entry");
const plain = [ex(1, 100, "2026-10-05"), T({ id: 2, type: "income", category: "salary", amount: 50, date: "2026-10-05", spread: 6 }), ex(3, 100, "bad-date", { spread: 3 })];
ok(expandSpreads(plain).length === 3 && expandSpreads(plain)[0] === plain[0], "no spread, income, or a bad date: passed through unchanged");

section("R41-S3. Every spending view");
const list = [ex(1, 120, "2026-10-05", { spread: 3 })];
const sp = forSpending(list);
ok(sp.length === 3, "forSpending cuts the slices");
const LATE = new Date(2027, 0, 5);   // after the last slice, so every slice has "happened"
ok(calcCategorySpend(sp, "2026-10", LATE).shopping === 40 && calcCategorySpend(sp, "2026-11", LATE).shopping === 40 && calcCategorySpend(sp, "2026-12", LATE).shopping === 40, "40 a month in October, November and December", [10, 11, 12].map((m) => calcCategorySpend(sp, "2026-" + m, LATE).shopping));
ok(calcCategorySpend(sp, "2026-12", new Date(2026, 9, 20)).shopping === undefined, "a slice that has not come yet is not counted as spent yet (as with any later-dated entry)");
setNow(2026, 9, 31);   // today = 31 Oct 2026, so the 20 Oct refund has happened
const ref = [ex(1, 120, "2026-10-05", { spread: 3 }), T({ id: 2, type: "income", category: "refund", refundFor: "shopping", amount: 30, date: "2026-10-20" })];
const spr = forSpending(ref).filter((x) => x.type === "expense");
ok(cents(spr) === 9000 && spr.every((x) => x.amount === 30), "a 30 refund nets against the whole entry first: 90 left, 30 a month", forSpending(ref).map((x) => [x.type, x.amount, x.date]));

section("R41-S4. Safe to Spend uses the cash");
const NOW = new Date(2026, 9, 20, 12);
const base = [T({ id: 10, type: "income", category: "salary", amount: 2000, date: "2026-10-01" }), ex(11, 600, "2026-10-05")];
const spreadList = [base[0], ex(11, 600, "2026-10-05", { spread: 6 })];
const a = calcSafeToSpend(forSpending(base), { enabled: true, savingsTarget: 0 }, [], NOW, []);
const b = calcSafeToSpend(forSpending(spreadList), { enabled: true, savingsTarget: 0 }, [], NOW, []);
ok(a.remaining === b.remaining && a.remaining === 1400, "a spread 600 costs Safe to Spend exactly what an unspread 600 does (1400 left)", { a: a.remaining, b: b.remaining });
const later = [base[0], ex(12, 600, "2026-07-05", { spread: 6 })];
ok(calcSafeToSpend(forSpending(later), { enabled: true, savingsTarget: 0 }, [], NOW, []).remaining === 2000, "bought in July: this month's Safe to Spend is not reduced by it");

section("R41-S5. Backups and CSV");
const S0 = { transactions: [ex(1, 600, "2026-10-05", { spread: 6 }), ex(2, 10, "2026-10-06")], budgets: {}, templates: [], currency: "₼", goals: [], safeToSpend: { savingsTarget: 0, enabled: false }, lastBackup: null };
const pl = planImport(JSON.stringify(buildBackup(S0)), "b.json");
ok(pl.ok && pl.transactions.find((x) => x.id === 1).spread === 6 && !("spread" in pl.transactions.find((x) => x.id === 2)), "a JSON backup brings the spread back; entries without one gain none");
const csv = buildCsv(S0.transactions);
ok(csv.split("\r\n")[0].endsWith('"SpreadMonths","OthersPayBack","OthersName"') && csv.split("\r\n")[1].endsWith('"6","",""') && csv.split("\r\n")[2].endsWith('"","",""'), "the CSV has a last column SpreadMonths");
const pc = planImport(csv, "x.csv");
ok(pc.ok && pc.transactions.filter((x) => x.spread === 6).length === 1, "the CSV brings it back", pc.error);
const bad = csv.replace('"6"', '"99"');
ok(planImport(bad, "x.csv").transactions.every((x) => !("spread" in x)), "an invalid value in the CSV is ignored, the entry still imports");
finish();
