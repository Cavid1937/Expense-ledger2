// Run 33 (APK level): the home-screen widget's one optional line. It must be OFF by default, must show exactly the number Home shows, and must disappear when
// Safe to Spend is off or cannot be worked out. Synthetic data only.
import { H, ok, section, reset, finish, T, KEY } from "./lib.mjs";
const { widgetLine, readWidgetPrefs, writeWidgetPrefs, widgetNative, calcSafeToSpend, forSpending, fmt } = H;
reset();
const now = new Date(2026, 9, 13, 12, 0, 0);
const txns = [T({ id: 1, type: "income", category: "salary", amount: 2000, date: "2026-10-02" }), T({ id: 2, amount: 300, date: "2026-10-05" })];
const state = (over = {}) => ({ transactions: txns, bills: [], goals: [], currency: "₼", safeToSpend: { enabled: true, savingsTarget: 100 }, ...over });
const on = { showSafe: true };

section("R33-W1. Preferences");
ok(readWidgetPrefs().showSafe === false, "default: the amount is NOT shown on the home screen");
globalThis.__store.set(KEY + "__widget", "{ broken"); ok(readWidgetPrefs().showSafe === false, "damaged saved value: off");
globalThis.__store.set(KEY + "__widget", JSON.stringify({ showSafe: "yes" })); ok(readWidgetPrefs().showSafe === false, "anything other than exactly true: off");
ok(writeWidgetPrefs({ showSafe: true }) === true && readWidgetPrefs().showSafe === true, "switching on is saved and read back");
ok(writeWidgetPrefs({ showSafe: false }) === true && readWidgetPrefs().showSafe === false, "switching off is saved and read back");
globalThis.__throwAll = true; ok(writeWidgetPrefs({ showSafe: true }) === false, "if storage refuses, the write reports failure"); globalThis.__throwAll = false;

section("R33-W2. The line");
const info = calcSafeToSpend(forSpending(txns), state().safeToSpend, [], now, []);
ok(info.feasible, "premise: Safe to Spend can be worked out for this data", info);
const line = widgetLine(state(), forSpending(txns), on, now);
const expected = (info.remaining < 0 ? "−" : "") + fmt(Math.abs(info.remaining), "₼");
ok(line.amount === expected && line.amount.length > 0 && line.label === "Safe to Spend", "switched on: the widget shows exactly the number Home shows, labelled 'Safe to Spend'", [line, expected]);
ok(widgetLine(state(), forSpending(txns), { showSafe: false }, now).amount === "", "switched off: no amount (empty line is hidden by the widget)");
ok(widgetLine(state({ safeToSpend: { enabled: false } }), forSpending(txns), on, now).amount === "", "Safe to Spend itself off: no amount");
ok(typeof widgetLine(state({ transactions: [] }), [], on, now).amount === "string", "no entries at all: still a text (empty or a number), never an error");
ok(widgetLine(null, [], on, now).amount === "" && widgetLine(undefined, undefined, undefined, now).amount === "", "missing state or prefs: no amount, no error");
const over = widgetLine(state({ transactions: [txns[0], T({ id: 3, amount: 5000, date: "2026-10-06" })] }), forSpending([txns[0], T({ id: 3, amount: 5000, date: "2026-10-06" })]), on, now);
ok(over.amount.startsWith("−"), "when spending is over the limit the amount starts with a minus sign, never a bare number", over);

section("R33-W3. The control is only found inside the Android app");
delete globalThis.window; ok(widgetNative() === null, "no shell: no widget control");
globalThis.window = { LedgerNative: { widget: { set() {} } } }; ok(widgetNative() !== null, "set present: found");
globalThis.window = { LedgerNative: { widget: {} } }; ok(widgetNative() === null, "no set: not used");
delete globalThis.window;
finish("run33widget");
