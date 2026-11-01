// Run 24: bill calendar export (.ics). Expected dates worked out by hand. Synthetic data only.
import { H, ok, section, finish, reset } from "./lib.mjs";
const { billsToIcs, icsEscape, buildSchedules } = H;
reset();
const now = new Date(2026, 9, 31);   // 31 Oct 2026
const rent = (date, id) => ({ id, type: "expense", category: "bills", amount: 500, merchant: "Rent, flat; main", note: "", date, recurring: true, recurFreq: "monthly", isActive: true, createdAt: date });
const txns = [rent("2026-09-05", 1), rent("2026-10-05", 2)];
const sch = buildSchedules(txns, []).filter((s) => s.isActive && s.type === "expense");

section("R24-I1. Upcoming dates only, valid calendar file");
const r = billsToIcs(sch, txns, now, { label: (x) => x.merchant, amountText: (x) => x.amount.toFixed(2) });
const dates = [...r.text.matchAll(/DTSTART;VALUE=DATE:(\d{8})/g)].map((m) => m[1]);
ok(r.count === 11 && dates.length === 11, "monthly rent paid through Oct 5: 11 upcoming dates (Nov 2026 .. Sep 2027)", { count: r.count, dates });
ok(dates[0] === "20261105" && dates[10] === "20270905", "first is 5 Nov 2026, last is 5 Sep 2027", dates);
ok(r.text.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0") && r.text.endsWith("END:VCALENDAR\r\n"), "calendar header and footer, CRLF line ends");
ok(r.text.includes("DTSTART;VALUE=DATE:20261105\r\nDTEND;VALUE=DATE:20261106"), "all-day event ends the next day");
ok(r.text.includes("SUMMARY:Rent\\, flat\\; main · 500.00"), "commas and semicolons are escaped in the title");
ok(new Set([...r.text.matchAll(/^UID:(.*)$/gm)].map((m) => m[1])).size === 11, "every event has its own id");

section("R24-I2. Nothing to export, paused, income, long lines, junk");
ok(billsToIcs(sch.map((s) => ({ ...s, isActive: false })), txns, now).count === 0, "a paused bill gives no events");
ok(billsToIcs(sch.map((s) => ({ ...s, type: "income" })), txns, now).count === 0, "income is not a bill");
ok(billsToIcs(null, txns, now).count === 0 && billsToIcs([], txns, now).text.includes("END:VCALENDAR"), "junk or empty input still gives a valid, empty calendar");
const long = billsToIcs(sch, txns, now, { label: () => "x".repeat(200), amountText: () => "1" });
ok(long.text.split("\r\n").every((l) => l.length <= 75), "no line is longer than 75 characters (folded)");
ok(icsEscape("a\\b\nc") === "a\\\\b\\nc", "backslash and newline are escaped");
finish("run24ics");
