// Run 76: the package the home-screen widgets show (widgetSnapshot). It must use the app's own figures, the person's theme and language,
// and hide amounts when asked. Expected values worked out by hand. Synthetic data only.
import { H, ok, section, finish, reset } from "./lib.mjs";
const { widgetSnapshot, writeTheme, THEMES, setLang, calcSafeToSpend } = H;
reset();
setLang("en");
const now = new Date(2026, 10, 14, 12, 0, 0);
const E = (o) => ({ id: Math.random(), type: "expense", amount: 10, category: "food", subcategory: "", merchant: "", note: "", date: "2026-11-05", recurring: false, isActive: true, ...o });
const tx = [E({ type: "income", category: "salary", amount: 2000, date: "2026-11-01" }), E({ amount: 150, date: "2026-11-03" }), E({ category: "transport", amount: 50, date: "2026-11-04" })];
const state = { transactions: tx, budgets: { food: 300, transport: 40 }, goals: [], bills: [], currency: "₼", language: "en", safeToSpend: { enabled: true, savingsTarget: 200 } };
localStorage.setItem("expense_ledger_v5__accounts", JSON.stringify({ accounts: [{ id: "a_cash1", name: "Cash", kind: "cash", opening: { amount: 100, date: "2026-11-01" } }, { id: "a_card1", name: "ABB Card", kind: "card", opening: { amount: 900, date: "2026-11-01" } }], transfers: [] }));
writeTheme("ivory");

section("R76-W1. The figures are the app's own");
const s = widgetSnapshot(state, tx, {}, now);
const info = calcSafeToSpend(tx, state.safeToSpend, [], now, []);
ok(info.remaining === 1600 && s.safe.amount === "1,600.00 ₼" && /Safe to spend/.test(s.safe.title), "Safe to Spend: 2,000 − 200 savings − 200 spent = 1,600.00, the same figure as the app", s.safe);
ok(s.safe.daysLabel === "17 days left", "17 days left in November on the 14th (today included)", s.safe.daysLabel);
ok(s.month.inc === "2,000.00 ₼" && s.month.exp === "200.00 ₼" && s.month.bal === "1,800.00 ₼" && s.month.balL === "Not spent" && !s.month.balNeg, "this month: 2,000 in, 200 out, 1,800 not spent");
ok(s.budget.has && s.budget.pct === 59 && s.budget.spent === "200.00 ₼" && s.budget.total === "340.00 ₼" && /1 budget exceeded/.test(s.budget.line), "budgets: 200 of 340 = 59%; transport (50 of 40) is over", s.budget);
ok(s.accounts.list.length === 2 && s.accounts.list[0].name === "Cash" && s.accounts.list[0].amount === "100.00 ₼" && s.accounts.list[1].amount === "900.00 ₼", "accounts with their balances", s.accounts.list);

section("R76-W2. Theme and language");
ok(s.theme.bg === THEMES.ivory.vars["--bg"] && s.theme.card === THEMES.ivory.vars["--bg-card"] && s.theme.dark === false, "the colours are Ivory's (the person's theme)", s.theme);
setLang("ru");
const r = widgetSnapshot({ ...state, language: "ru" }, tx, {}, now);
ok(/Можно потратить/.test(r.safe.title) && /17 дней/.test(r.safe.daysLabel) && r.quick.transfer === "Перевод", "labels are in Russian, with the right plural form", [r.safe.title, r.safe.daysLabel]);
setLang("en");

section("R76-W3. Amounts are hidden when asked");
const h = widgetSnapshot(state, tx, { hide: true }, now), l = widgetSnapshot(state, tx, { locked: true }, now);
const amounts = (x) => [x.safe.amount, x.month.inc, x.month.exp, x.month.bal, x.budget.spent, x.budget.total, ...x.accounts.list.map((a) => a.amount)];
ok(h.hide && amounts(h).every((a) => a === "••••"), "'Hide amounts on widgets': every amount is ••••");
ok(l.hide && amounts(l).every((a) => a === "••••") && !JSON.stringify(l).includes("1,600"), "while an app lock is set, no amount reaches the home screen");
ok(widgetSnapshot({ ...state, safeToSpend: { enabled: false } }, tx, {}, now).safe.title === "Spent this month", "without Safe to Spend, the big widget shows what was spent this month");

section("R79-W4. The two new tiles on the Safe to Spend widget: per day and the next bill");
ok(s.safe.dayLabel === "Per day" && s.safe.day === "94.12 ₼", "per day = 1,600 ÷ 17 days left (today included) = 94.117… → 94.12 ₼", [s.safe.dayLabel, s.safe.day]);
ok(s.safe.nextLabel === "Next bill" && s.safe.nextAmt === "" && s.safe.nextWhat === "Nothing due", "no bills: the tile says nothing is due", s.safe);
const rent = { id: "b_rent", type: "expense", amount: 300, name: "Rent", category: "housing", subcategory: "", freq: "monthly", anchorDate: "2026-11-20", active: true };
const sb = widgetSnapshot({ ...state, bills: [rent] }, tx, {}, now);
ok(sb.safe.nextAmt === "300.00 ₼" && /^Rent · /.test(sb.safe.nextWhat) && /20/.test(sb.safe.nextWhat), "a monthly bill on the 20th: 300.00 ₼, 'Rent · 20 …'", [sb.safe.nextAmt, sb.safe.nextWhat]);
const off = widgetSnapshot({ ...state, safeToSpend: { enabled: false } }, tx, {}, now);
ok(off.safe.dayLabel === "A day so far" && off.safe.day === "14.29 ₼", "without Safe to Spend: 200 spent in the first 14 days = 14.285… → 14.29 ₼ a day", [off.safe.dayLabel, off.safe.day]);
const used = widgetSnapshot({ ...state, safeToSpend: { enabled: true, savingsTarget: 1900 } }, tx, {}, now);
ok(used.safe.neg && used.safe.day === "0.00 ₼", "money already used up (2,000 − 1,900 − 200 < 0): per day is 0, never a negative daily amount", [used.safe.amount, used.safe.day]);
ok(h.safe.day === "••••" && widgetSnapshot({ ...state, bills: [rent] }, tx, { hide: true }, now).safe.nextAmt === "••••", "hidden amounts stay hidden in the tiles too");
finish("run76widgets");
