// Run 42: the category a new expense starts on is learned from the person's own entries at this time of day. Hand-computed. Synthetic data only.
import { H, ok, section, finish, reset, T } from "./lib.mjs";
const { slotCategory } = H;
reset();
const NOW = new Date(2026, 10, 8, 8, 20);   // Sunday 8 Nov 2026, 08:20 = morning
// an expense entered on the day it happened, at the given local time
const e = (id, cat, day, hh, mm = 0, o = {}) => T({ id, type: "expense", category: cat, amount: 5, date: `2026-10-${String(day).padStart(2, "0")}`, createdAt: `2026-10-${String(day).padStart(2, "0")}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`, ...o });
const coffee5 = [1, 2, 3, 4, 5].map((d) => e("c" + d, "coffee", d, 8, 10));

section("R42-S1. A habit at this time of day is learned");
ok(slotCategory(coffee5, NOW) === "coffee", "5 coffee entries at about 08:10 on 5 different days: coffee at 08:20");
ok(slotCategory(coffee5, new Date(2026, 10, 8, 13, 0)) === null, "the same history at 13:00 (midday): nothing to suggest");
ok(slotCategory([...coffee5, ...[6, 7].map((d) => e("f" + d, "food", d, 9, 5))], NOW) === "coffee", "coffee 5 of 7 (71%) beats food 2 of 7");
ok(slotCategory([...coffee5, ...[6, 7, 8, 9, 10].map((d) => e("f" + d, "food", d, 9, 5))], NOW) === null, "coffee 5 of 10 is exactly half, not a majority: no suggestion");

section("R42-S2. Not enough evidence gives null");
ok(slotCategory(coffee5.slice(0, 4), NOW) === null, "only 4 entries: not enough");
ok(slotCategory([1, 1, 1, 2, 2].map((d, i) => e("d" + i, "coffee", d, 8, 10 + i)), NOW) === null, "5 entries but on only 2 different days: not a habit");
ok(slotCategory([...coffee5.slice(0, 3), e("a", "food", 6, 9), e("b", "shopping", 7, 9), e("c", "fun", 8, 9)], NOW) === null, "coffee 3 of 6 is half, not a majority: no suggestion");
ok(slotCategory([e("a", "coffee", 1, 8), e("b", "coffee", 2, 8), e("c", "coffee", 3, 8), e("d", "food", 4, 8), e("e", "shopping", 5, 8), e("f", "fun", 6, 8), e("g", "bills", 7, 8)], NOW) === null, "coffee 3 of 7 is below half: no suggestion");

section("R42-S3. Only entries that show when the money was spent count");
ok(slotCategory(coffee5.map((x) => ({ ...x, createdAt: "2026-11-01T08:10:00" })), NOW) === null, "entered a day (or more) after it happened: the entry time says nothing about when it was spent");
ok(slotCategory(coffee5.map((x) => ({ ...x, recurring: true })), NOW) === null, "recurring entries are ignored");
ok(slotCategory(coffee5.map((x) => ({ ...x, billId: "b1" })), NOW) === null, "bill payments are ignored");
ok(slotCategory(coffee5.map((x) => ({ ...x, type: "income" })), NOW) === null, "income is ignored");
ok(slotCategory(coffee5.map((x) => ({ ...x, createdAt: "garbage" })), NOW) === null && slotCategory(null, NOW) === null && slotCategory([null, 5, "x"], NOW) === null, "damaged data gives null, never an error");
ok(slotCategory([1, 2, 3, 4, 5].map((d) => e("o" + d, "coffee", d, 8, 10, { date: `2026-06-0${d}`, createdAt: `2026-06-0${d}T08:10:00` })), NOW) === null, "entries older than 90 days are ignored");

section("R42-S4. The parts of the day");
const part = (hh, mm, cat) => [1, 2, 3, 4, 5].map((d) => e(cat + d, cat, d, hh, mm));
ok(slotCategory(part(12, 30, "lunch"), new Date(2026, 10, 8, 11, 0)) === "lunch" && slotCategory(part(12, 30, "lunch"), new Date(2026, 10, 8, 15, 59)) === "lunch", "11:00 and 15:59 are midday");
ok(slotCategory(part(19, 0, "dinner"), new Date(2026, 10, 8, 16, 0)) === "dinner" && slotCategory(part(19, 0, "dinner"), new Date(2026, 10, 8, 21, 59)) === "dinner", "16:00 and 21:59 are evening");
ok(slotCategory(part(23, 0, "late"), new Date(2026, 10, 8, 22, 0)) === "late" && slotCategory(part(2, 0, "late"), new Date(2026, 10, 8, 4, 59)) === "late", "22:00 and 04:59 are night");
finish("run42slot");
