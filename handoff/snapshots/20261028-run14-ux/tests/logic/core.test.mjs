// Core behaviour carried over from earlier iterations (re-checked against the current candidate).
import { H, KEY, SRC, ok, section, eq, setNow, reset, keysLike, T, finish } from "./lib.mjs";
const { calcHelperCards, calcSafeToSpend, calcGoalProgress, buildMerchantMemory, merchantSuggest, memKey, migrateAndLoad, prevMon, nMon, surplusLabel, surplusColor, addMonths, buildSchedules, scheduleNextDue, localDateStr, getNotice, getSaveBlocked } = H;
const D = (d) => localDateStr(d);
const spend = (amt, date, cat = "food") => T({ id: Math.round(amt * 1000) + date.length * 7 + Math.floor(Math.random() * 1e6), amount: amt, category: cat, date });

section("1. Smart Helper pace warning uses the budget");
reset(); setNow(2026, 9, 13);
const txns = [spend(100, "2026-10-02"), spend(100, "2026-10-06"), spend(100, "2026-10-10")];
ok(calcHelperCards(txns, { food: 310 }, [], { enabled: false }, "₼").some(c => c.id === "pace"), "budget exists + spending far above pace → pace card appears");
ok(!calcHelperCards(txns, {}, [], { enabled: false }, "₼").some(c => c.id === "pace"), "no budget → no pace claim at all");
ok(!calcHelperCards([spend(40, "2026-10-05")], { food: 310 }, [], { enabled: false }, "₼").some(c => c.id === "pace"), "under budget pace → no warning");

section("2. Break-even label and colour");
ok(surplusLabel(1000, 800) === "Surplus" && surplusLabel(1000, 1000) === "Break-even" && surplusLabel(1000, 1200) === "Deficit", "label: surplus / break-even / deficit");
ok(surplusColor(1000, 1000) === "var(--ink)" && surplusColor(1000, 900) === "var(--pos)" && surplusColor(1000, 1100) === "var(--neg)", "colour: green / neutral / red");
ok(SRC.includes('curInc>curExp?"Net surplus":curInc<curExp?"Net deficit":"Break-even"') && !SRC.includes('"Net saved"'), "Monthly net label has all three states; 'Net saved' is gone");

section("3. Goal guard in Safe to Spend");
reset(); setNow(2026, 9, 13);
const inc = [T({ id: 5000, type: "income", category: "salary", amount: 2000, date: "2026-10-02" })];
const sts = (goals) => calcSafeToSpend(inc, { savingsTarget: 0 }, goals);
ok(sts([{ target: 10000, saved: 3200, monthlyTarget: 500 }]).effectiveSavingsTarget === 500, "active goal reserves its contribution");
ok(sts([{ target: 1000, saved: 1000, monthlyTarget: 200 }]).effectiveSavingsTarget === 0, "fully funded goal reserves nothing");
ok(sts([{ target: 0, saved: 0, monthlyTarget: 300 }]).effectiveSavingsTarget === 0 && sts([{ saved: 0, monthlyTarget: 300 }]).effectiveSavingsTarget === 0, "goal with target 0 / missing reserves nothing");
ok(sts([{ target: 10000, saved: 3200, monthlyTarget: 500 }, { target: 500, saved: 600, monthlyTarget: 100 }, { target: 0, monthlyTarget: 900 }]).effectiveSavingsTarget === 500, "mixed list: only the valid active goal counts");

section("4. Merchant memory is transaction-type-aware");
const mk = (type, merchant, category, sub, date) => T({ id: Math.random(), type, merchant, category, subcategory: sub, date });
const mem = buildMerchantMemory([mk("income", "Acme", "salary", "", "2026-08-01"), mk("expense", "Acme", "food", "Coffee", "2026-08-05"), mk("expense", "Acme", "food", "Snacks", "2026-09-05")]);
const sExp = merchantSuggest("Acme", mem, "expense"), sInc = merchantSuggest("Acme", mem, "income");
ok(sExp && sExp.category === "food" && sExp.subcategory === "Snacks", "expense suggestion → food / Snacks (latest expense choice)");
ok(sInc && sInc.category === "salary" && sExp.count === 2 && sInc.count === 1, "income suggestion → salary; counts kept separately per type");
ok(merchantSuggest("Acme", buildMerchantMemory([mk("income", "Acme", "salary", "", "2026-08-01")]), "expense") === null, "income-only merchant → nothing suggested for an expense");
ok(SRC.includes("m.type===wantType&&m.merchant.toLowerCase().startsWith(q)") && SRC.includes("merchantMemory[memKey(type,ml)]"), "add form dropdown and hint both read the type-matched entry");

section("5. Storage recovery");
reset();
let st = migrateAndLoad();
ok(st.transactions.length === 0 && getNotice() === null && keysLike(KEY + "__").length === 0, "fresh install: empty state, no notice, nothing preserved");
reset();
const good = (id, date) => T({ id, date, amount: 5 });
localStorage.setItem(KEY, JSON.stringify({ transactions: [good(0, "2026-09-01"), good(1790769435003.98, "2026-09-30"), null, "junk", good(9, "garbage-date"), { ...good(8, "2026-09-02"), amount: "abc" }], budgets: { food: 100 }, templates: [], currency: "₼", goals: [], safeToSpend: { savingsTarget: 0, enabled: false } }));
st = migrateAndLoad();
ok(st.transactions.length === 2 && st.transactions.some(t => t.id === 0) && st.transactions.some(t => t.id === 1790769435003.98), "2 valid records loaded (ids 0 and a fractional id preserved exactly)");
const rej = keysLike(KEY + "__rejected_");
ok(rej.length === 1 && JSON.parse(localStorage.getItem(rej[0])).length === 4, "the 4 malformed records are preserved in a recovery key");
ok(/4 unreadable records set aside/.test(getNotice() || "") && st.budgets.food === 100 && st.templates.length === 0, "notice produced; other settings untouched (empty templates stay empty)");
reset(); localStorage.setItem(KEY, "{{{ not json"); st = migrateAndLoad();
const cor = keysLike(KEY + "__corrupt_");
ok(st.transactions.length === 0 && cor.length === 1 && localStorage.getItem(cor[0]) === "{{{ not json" && !!getNotice(), "unparseable value → starts empty, original preserved byte-for-byte, user told");
reset(); localStorage.setItem(KEY, JSON.stringify({ foo: 1 })); migrateAndLoad(); ok(keysLike(KEY + "__corrupt_").length === 1, "wrong-shaped object is preserved too");
reset(); localStorage.setItem("finance_os_v3", JSON.stringify({ transactions: [null, { id: "a", amount: 3, date: "2026-02-02", category: "food" }, { id: "a", amount: 3, date: "2026-02-02", category: "food" }], currency: "₼" }));
st = migrateAndLoad(); ok(st.transactions.length === 1 && keysLike(KEY + "__legacy_").length === 1, "legacy migration survives a null record and de-duplicates by original id");

section("6. Month arithmetic (real functions)");
setNow(2026, 2, 31); ok(prevMon() === "2026-02", "Mar 31 → previous month is 2026-02");
setNow(2026, 9, 31); ok(prevMon() === "2026-09", "Oct 31 → 2026-09");
setNow(2026, 0, 31); ok(prevMon() === "2025-12", "Jan 31 → 2025-12");
setNow(2026, 7, 31); ok(eq([5, 4, 3, 2, 1, 0].map(nMon), ["2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08"]), "6-month list from Aug 31 is correct");

section("7. Smart Helper daily limit from the REMAINING budget");
reset(); setNow(2026, 8, 15);
const sep = (amt, day) => T({ id: day * 100 + amt, amount: amt, date: `2026-09-${String(day).padStart(2, "0")}` });
let pc = calcHelperCards([sep(100, 3), sep(100, 9)], { food: 300 }, [], { enabled: false }, "₼").find(c => c.id === "pace");
ok(pc && pc.impact.includes("100.00") && pc.impact.includes("6.25") && pc.impact.includes("16 days") && !pc.impact.includes("10.00"), "₼300 budget, ₼200 spent on day 15 of 30 → ₼100 left over the 16 days from today on → ₼6.25/day (not ₼10)", pc && pc.impact);
pc = calcHelperCards([sep(150, 3), sep(200, 9)], { food: 300 }, [], { enabled: false }, "₼").find(c => c.id === "pace");
ok(pc && /fully used/.test(pc.impact) && /50\.00 ₼ over/.test(pc.impact), "overspent → 'fully used … 50.00 ₼ over'", pc && pc.impact);
pc = calcHelperCards([sep(150, 3), sep(150, 9)], { food: 300 }, [], { enabled: false }, "₼").find(c => c.id === "pace");
ok(pc && /fully used/.test(pc.impact) && !/over\)/.test(pc.impact), "exactly at budget → 'fully used', no 'over'", pc && pc.impact);

section("9. Month-end-safe dates");
ok(D(addMonths(new Date(2026, 0, 31), 1)) === "2026-02-28" && D(addMonths(new Date(2024, 0, 31), 1)) === "2024-02-29" && D(addMonths(new Date(2026, 7, 31), 6)) === "2027-02-28" && D(addMonths(new Date(2024, 1, 29), 12)) === "2025-02-28", "Jan 31+1m = Feb 28; leap Feb 29; Aug 31+6m = Feb 28; Feb 29+12m = Feb 28");
const sched = (dates, freq, extra = {}) => buildSchedules(dates.map((d, i) => T({ id: 900 + i, date: d, recurring: true, recurFreq: freq, merchant: "X", amount: 10, ...extra })))[0];
const nd = (dates, freq) => { const s = sched(dates, freq); const r = scheduleNextDue(s, dates.map((d, i) => T({ id: 900 + i, date: d, recurring: true, recurFreq: freq, merchant: "X", amount: 10 })), new Date(globalThis.__NOW)); return r && D(r); };
setNow(2026, 1, 10); ok(nd(["2026-01-31"], "monthly") === "2026-02-28", "monthly from the 31st, Feb 10 → Feb 28");
setNow(2026, 2, 5); ok(nd(["2026-01-31"], "monthly") === "2026-03-31", "…Mar 5 → Mar 31 (no drift to the 3rd)");
setNow(2026, 3, 5); ok(nd(["2026-01-31"], "monthly") === "2026-04-30", "…Apr 5 → Apr 30");
setNow(2025, 2, 1); ok(nd(["2024-02-29"], "yearly") === "2026-02-28", "yearly from Feb 29 2024 → Feb 28 2026 (via the Mar 1 2025 view)");
setNow(2026, 0, 20); ok(nd(["2026-01-01"], "weekly") === "2026-01-22" && nd(["2026-01-01"], "biweekly") === "2026-01-29", "weekly / biweekly still correct");

section("11. Recovery safeguard when a copy cannot be saved");
reset(); globalThis.__failKeys = ["__rejected_"];
localStorage.setItem(KEY, JSON.stringify({ transactions: [good(1, "2026-09-01"), null], budgets: {}, templates: [], currency: "₼", goals: [], safeToSpend: {} }));
migrateAndLoad();
ok(getSaveBlocked() === true && /could not be made/.test(getNotice() || "") && /nothing is overwritten/.test(getNotice() || "") && !/set aside — the rest/.test(getNotice() || ""), "quota failure while preserving → saving blocked; notice honest (does NOT claim records were set aside)", getNotice());
reset(); globalThis.__failKeys = ["__corrupt_"]; localStorage.setItem(KEY, "{{{ bad"); migrateAndLoad(); ok(getSaveBlocked() === true, "unparseable data + failed copy → blocked too");
reset(); localStorage.setItem(KEY, JSON.stringify({ transactions: [good(1, "2026-09-01"), null] })); migrateAndLoad(); ok(getSaveBlocked() === false && /set aside/.test(getNotice() || ""), "normal case: copy saved, not blocked");
reset(); globalThis.__throwAll = true; let boot; try { boot = migrateAndLoad(); } catch (e) { boot = "THREW " + e.message; } globalThis.__throwAll = false;
ok(typeof boot === "object" && boot.transactions.length === 0, "localStorage unavailable → app still starts with an empty state", boot);
ok(SRC.includes("if (SAVE_BLOCKED) { setStorageFailed(true); return; }") && SRC.indexOf("if (SAVE_BLOCKED) { setStorageFailed(true); return; }") < SRC.indexOf("const ok=writeRaw(KEY,state);"), "App never calls writeRaw(KEY) while blocked");

finish("core");
