// Run 88 (owner: the notification center must remember the first-launch choices and use them to remind people to explore the app).
// exploreTip picks at most one "try this" note from those answers and what is (not) set up yet. Expected results worked out by hand.
import { H, ok, section, finish } from "./lib.mjs";
const { exploreTip, EXPLORE_GAP_FIRST, EXPLORE_GAP_NEXT } = H;
const T0 = Date.UTC(2026, 10, 15, 9, 0);
const day = 24 * 3600 * 1000;
const id = (c, x, now) => (exploreTip(c, x, now) || {}).id || null;
const none = { entries: 0, bills: 0, incomeBills: 0, goals: 0 };

section("R88-E1. Timing: not on the first day, then one every few days");
ok(EXPLORE_GAP_FIRST === 20 * 3600 * 1000 && EXPLORE_GAP_NEXT === 3 * day, "gaps are 20 hours, then 3 days");
ok(id({ at: T0, income: "fixed" }, none, T0 + 19 * 3600 * 1000) === null, "19 hours after setting up: nothing yet");
ok(id({ at: T0, income: "fixed" }, none, T0 + 21 * 3600 * 1000) === "pay", "21 hours after: the regular-pay note");
ok(id({ at: T0, income: "fixed", exploreAt: T0 + day, exploreDone: ["pay"] }, { ...none, entries: 6 }, T0 + 3 * day) === null, "2 days after answering one: nothing");
ok(id({ at: T0, income: "fixed", exploreAt: T0 + day, exploreDone: ["pay"] }, { ...none, entries: 6 }, T0 + 4 * day + 1) === "bills", "3 days after: the next one (bills)");

section("R88-E2. The first-launch answers decide which note comes");
const later = T0 + 2 * day;
ok(id({ at: T0, income: "fixed" }, { ...none, incomeBills: 1 }, later) === null, "regular pay already added as repeating income: no pay note");
ok(id({ at: T0, income: "variable" }, { ...none, entries: 5 }, later) === "irregular", "income that changes, 5 entries: the 'usual month' note");
ok(id({ at: T0, income: "variable" }, { ...none, entries: 4, bills: 1, goals: 1 }, later) === null, "changing income with only 4 entries: too early to show a usual month");
ok(id({ at: T0, income: "none" }, { ...none, entries: 3, bills: 2 }, later) === "goal", "no income answer, 3 entries, bills set: the goal note");
ok(id({ at: T0, income: "" }, { entries: 12, bills: 2, incomeBills: 0, goals: 1 }, later) === "where", "everything set up and 12 entries: the 'where your money goes' note");
ok(id({ at: T0, income: "" }, { entries: 2, bills: 1, incomeBills: 0, goals: 1 }, later) === null, "little data and things set up: no note");

section("R88-E3. Each note only once; the Home card speaks first; bad data is safe");
ok(id({ at: T0, income: "fixed", exploreAt: T0, exploreDone: ["pay", "bills", "goal", "where"] }, { entries: 20, bills: 0, incomeBills: 0, goals: 0 }, T0 + 5 * day) === null, "all fitting notes already answered: nothing more");
ok(id({ at: T0, income: "fixed", stmt: true, stmtState: "later" }, none, later) === null, "while the statement card on Home is still waiting: no note");
ok(id({ at: T0, income: "fixed", stmt: true, stmtState: "done" }, none, later) === "pay", "once that card is answered the notes may come");
ok(id(null, { entries: 10 }, later) === "bills" && id("x", null, later) === null && id({ exploreDone: "pay", income: "fixed" }, none, later) === "pay", "no saved answers, wrong types or a broken list never crash");
finish("run88explore");
