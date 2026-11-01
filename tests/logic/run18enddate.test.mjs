// Run 18e (2026-10-31): optional end date for a bill (e.g. the last instalment of a credit) with a countdown.
// Written BEFORE the feature. Synthetic data only. Clock: 13 Oct 2026.
import { H, ok, section, eq, reset, finish, T } from "./lib.mjs";
const { validateBill, buildSchedules, scheduleOccurrences, scheduleNextDue, billPaymentsLeft, calcSafeToSpend } = H;
reset();
const bill = (o = {}) => ({ id: "b1", name: "Phone credit", type: "expense", amount: 50, freq: "monthly", anchorDate: "2026-08-05", active: true, category: "other", subcategory: "", createdAt: "", ...o });
const sched = (b, tx = []) => buildSchedules(tx, [b])[0];

section("R18-E1. endDate is validated, optional, kept");
ok(validateBill(bill()).endDate === undefined, "no end date: nothing added (old bills keep their exact shape)");
ok(validateBill(bill({ endDate: "2027-01-05" })).endDate === "2027-01-05", "a valid end date is kept");
ok(validateBill(bill({ endDate: "2026-08-05" })).endDate === "2026-08-05", "end date equal to the first due date is allowed (a single payment)");
ok(validateBill(bill({ endDate: "2026-07-01" })) === null, "end date before the first due date: bill refused");
ok(validateBill(bill({ endDate: "2026-02-30" })) === null, "impossible date: bill refused");
ok(validateBill(bill({ endDate: 5 })) === null, "wrong type: bill refused");
ok(validateBill(bill({ endDate: "" })).endDate === undefined, "empty string means no end date");

section("R18-E2. Occurrences stop after the end date");
const s = sched(bill({ endDate: "2026-12-05" }));
ok(scheduleOccurrences(s, "2026-12").length === 1, "the last month still has its payment");
ok(scheduleOccurrences(s, "2027-01").length === 0 && scheduleOccurrences(s, "2027-06").length === 0, "months after the end have none");
ok(scheduleNextDue(sched(bill({ endDate: "2026-10-20" })), [], new Date(2026, 9, 21)) === null, "after the end date there is no next due date");
const w = sched(bill({ freq: "weekly", anchorDate: "2026-10-01", endDate: "2026-10-15" }));
ok(scheduleOccurrences(w, "2026-10").map((d) => d.getDate()).join() === "1,8,15", "weekly: the end date itself is included, later weeks are not");

section("R18-E3. Countdown: payments left");
ok(billPaymentsLeft(sched(bill({ endDate: "2026-12-05" })), [], new Date(2026, 9, 13)) === 2, "from 13 Oct: 5 Nov and 5 Dec are left (5 Oct is already past)");
ok(billPaymentsLeft(sched(bill({ endDate: "2026-12-05" })), [], new Date(2026, 9, 1)) === 3, "from 1 Oct: 5 Oct, 5 Nov, 5 Dec");
const paidOct = [T({ id: 9, merchant: "Phone credit", date: "2026-10-05", billId: "b1", recurring: true, recurFreq: "monthly" })];
ok(billPaymentsLeft(sched(bill({ endDate: "2026-12-05" }), paidOct), paidOct, new Date(2026, 9, 13)) === 2, "a payment already recorded for October is not left");
ok(billPaymentsLeft(sched(bill()), [], new Date(2026, 9, 13)) === null, "no end date: no countdown");
ok(billPaymentsLeft(sched(bill({ endDate: "2026-09-05" })), [], new Date(2026, 9, 13)) === 0, "ended: 0 left");
ok(billPaymentsLeft(sched(bill({ freq: "yearly", anchorDate: "2024-03-10", endDate: "2030-03-10" })), [], new Date(2026, 9, 13)) === 4, "yearly: 2027..2030 = 4");

section("R18-E4. Safe to Spend stops setting money aside after the end");
const ended = bill({ endDate: "2026-09-05" });
const stsEnded = calcSafeToSpend([T({ type: "income", amount: 1000, date: "2026-10-01" })], {}, [], new Date(2026, 9, 13), [ended]);
const stsOpen = calcSafeToSpend([T({ type: "income", amount: 1000, date: "2026-10-01" })], {}, [], new Date(2026, 9, 13), [bill()]);
ok(JSON.stringify(stsEnded).length > 0 && (stsEnded.upcomingCommitments || 0) === 0, "ended bill: nothing set aside", stsEnded.upcomingCommitments);
ok((stsOpen.upcomingCommitments || 0) + (stsOpen.unrecordedCommitments || 0) > 0, "open bill: still set aside (control)", stsOpen);
finish("run18enddate");
