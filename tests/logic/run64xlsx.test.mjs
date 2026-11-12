// Run 64 (owner batch E11): the Excel workbook. Written with xlsxWrite.js and read back with the app's own reader (statement.js), so the
// test checks real cells, not strings in a template. Expected values worked out by hand. Synthetic data only.
import { H, ok, section, finish, reset, eq } from "./lib.mjs";
import { buildXlsx, sheetName } from "../../xlsxWrite.js";
import { zipEntries, sheetGrid } from "../../statement.js";
const { buildWorkbookSheets, setLang } = H;
reset();
const E = (id, o = {}) => ({ id, type: "expense", amount: 10, category: "food", subcategory: "", merchant: "", note: "", date: "2026-11-05", recurring: false, recurFreq: null, isActive: true, ...o });
const state = { transactions: [E(1, { amount: 12.5, merchant: "Bravo", account: "a_card01" }), E(2, { type: "income", category: "salary", amount: 1000, date: "2026-11-01", merchant: "Employer" }), E(3, { amount: 4.99, merchant: "=cmd", category: "digital", subcategory: "Streaming", date: "2026-10-20" })],
  budgets: { food: 300 }, goals: [{ id: "g1", name: "Laptop", target: 1000, saved: 450, monthlyTarget: 0, targetDate: null, contribs: [{ id: "c1", date: "2026-11-02", amount: 150, src: "add", note: "gift" }] }],
  bills: [{ id: "b1", name: "Internet", type: "expense", category: "digital", subcategory: "", amount: 30, freq: "monthly", anchorDate: "2026-10-05", active: true }], currency: "₼" };
const extra = { accountData: { accounts: [{ id: "a_card01", name: "ABB Card", kind: "card", opening: { amount: 100, date: "" }, hidden: false }], transfers: [] },
  debtData: { debts: [{ id: "d1", direction: "owe", name: "Elvin", principal: 50000, dueDate: "", note: "", payments: [{ id: "p1", date: "2026-10-01", amount: 10000 }] }], loans: [] }, budgetCarry: { food: "2026-10" }, now: new Date(2026, 10, 13) };

section("R64-1. What goes into each sheet");
setLang("en");
const sheets = buildWorkbookSheets(state, extra);
ok(eq(sheets.map((s) => s.name), ["Read me", "Entries", "Accounts", "Transfers", "Budgets", "Goals", "Goal history", "Debts and loans", "Repeating bills"]), "nine sheets, the first one explains the others", sheets.map((s) => s.name));
const ent = sheets[1].rows;
ok(eq(ent[0], ["Date", "Type", "Category", "Subcategory", "Where you paid", "Amount", "Note", "Account", "Repeats", "Trip or label", "Id"]) && ent.length === 4, "Entries: the app's own words as headings, one row per entry", ent[0]);
ok(eq(ent[1].slice(0, 8), ["2026-11-05", "Expense", "Food & Dining", "", "Bravo", 12.5, "", "ABB Card"]) && ent[3][3] === "Streaming", "newest first; the account by its name; amounts are numbers", ent[1]);
ok(eq(sheets[2].rows[1], ["ABB Card", "Card", 100, "", 87.5, "No", "a_card01"]), "Accounts: starting 100, balance today 100 - 12.50 = 87.50", sheets[2].rows[1]);
ok(eq(sheets[4].rows[1], ["Food & Dining", 300, 12.5, "Yes"]), "Budgets: limit 300, spent this month 12.50, carries over: yes", sheets[4].rows[1]);
ok(eq(sheets[6].rows.slice(1), [["Laptop", "", 300, "Before the history began"], ["Laptop", "2026-11-02", 150, "Added: gift"]]), "Goal history adds up to the 450 saved", sheets[6].rows);
ok(eq(sheets[7].rows[2], ["Debt", "Elvin", "You owe", "Payment", "2026-10-01", 100, 400]), "Debts: the payment with what was left after it", sheets[7].rows[2]);
ok(/Every entry, newest first \(3\)/.test(sheets[0].rows[1][1]) && /backup file/.test(sheets[0].rows.find((r) => r[0] === "Moving your data")[1]), "Read me counts the rows and says the backup is for moving data");

section("R64-2. The file itself");
const file = buildXlsx(sheets);
const z = await zipEntries(file.buffer, () => true);
ok(z["xl/workbook.xml"].includes('name="Goal history"') && Object.keys(z).filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k)).length === 9, "a real workbook: nine worksheets named in the workbook");
const back = sheetGrid(z["xl/worksheets/sheet2.xml"], "");
ok(back[1][5] === "12.5" && back[3][4] === "=cmd" && !z["xl/worksheets/sheet2.xml"].includes("<f>"), "read back: 12.5 is a number cell; '=cmd' is plain text, never a formula", back[3]);
ok(eq(back.map((r) => r.length ? r[10] : "").slice(1), ["1", "2", "3"]), "every entry keeps its id");
const used = new Set();
ok(sheetName("A/B:C?*[x]", used) === "A B C   x" && sheetName("a b c   x", used) === "a b c   x 2" && sheetName("x".repeat(40), used).length === 31, "sheet names Excel would refuse are cleaned, kept unique and at most 31 characters");
setLang("az");
ok(buildWorkbookSheets(state, extra)[1].rows[0][4] === "Harada ödəmisiniz" && buildWorkbookSheets(state, extra)[0].name === "Oxu", "in Azerbaijani the headings and sheet names are Azerbaijani");
setLang("en");
finish("run64xlsx");
