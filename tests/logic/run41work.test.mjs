// Run 41: hours-of-work figure (cleanWorkHours, incomePerHour, hoursOfWork) and the setting in backups (cleanPrefs). Hand-computed.
import { H, ok, section, reset, T, finish } from "./lib.mjs";
const { cleanWorkHours, incomePerHour, hoursOfWork, cleanPrefs } = H;
reset();
const NOW = new Date(2026, 9, 20, 12); // completed months considered: Jul, Aug, Sep 2026
const inc = (id, amount, date, category = "salary") => T({ id, type: "income", category, amount, date });

section("R41-W1. The hours setting");
ok(cleanWorkHours(160) === 160 && cleanWorkHours("160") === 160 && cleanWorkHours("37,5") === 37.5, "numbers and text with a comma are accepted");
ok(cleanWorkHours(1) === 1 && cleanWorkHours(744) === 744, "1 and 744 are the limits");
ok(cleanWorkHours(0) === null && cleanWorkHours(745) === null && cleanWorkHours(-5) === null, "0, 745 and negative are refused");
ok(cleanWorkHours("abc") === null && cleanWorkHours(null) === null && cleanWorkHours(NaN) === null && cleanWorkHours(Infinity) === null, "text, null, NaN, Infinity are refused");
ok(cleanWorkHours(160.3) === 160.5 && cleanWorkHours(160.2) === 160, "rounded to steps of 0.5");

section("R41-W2. Income per hour");
const three = [inc("a", 1600, "2026-09-01"), inc("b", 1600, "2026-08-01"), inc("c", 1600, "2026-07-01")];
ok(incomePerHour(three, 160, NOW) === 1000, "1600 over 160 hours = 10.00 an hour (1000 qapik)");
ok(incomePerHour([inc("a", 1000, "2026-09-01"), inc("b", 2000, "2026-08-01")], 100, NOW) === 1500, "average of two months (1500) over 100 hours = 15.00 an hour");
ok(incomePerHour([inc("a", 1600, "2026-09-01"), inc("a2", 400, "2026-09-15")], 200, NOW) === 1000, "two payments in one month are added first: 2000 over 200");
ok(incomePerHour([inc("a", 1600, "2026-10-01")], 160, NOW) === null, "this month's income does not count: month is not finished");
ok(incomePerHour([inc("a", 1600, "2026-05-01")], 160, NOW) === null, "income older than three months does not count");
ok(incomePerHour([inc("a", 1600, "2026-09-01", "refund")], 160, NOW) === null, "a refund is not earned income");
ok(incomePerHour(three, null, NOW) === null && incomePerHour(three, 0, NOW) === null, "no hours set: no figure");
ok(incomePerHour([], 160, NOW) === null && incomePerHour(null, 160, NOW) === null, "no income or bad input: no figure");
ok(incomePerHour([T({ id: "x", type: "expense", category: "food", amount: 500, date: "2026-09-02" })], 160, NOW) === null, "expenses are not income");

section("R41-W3. Hours of work");
ok(hoursOfWork(95, 1000) === 9.5, "95 at 10.00 an hour = 9.5 hours");
ok(hoursOfWork(150, 1000) === 15, "150 = 15 hours");
ok(hoursOfWork(0.01, 1000) === 0, "one qapik rounds to 0 hours (shown as 0)");
ok(hoursOfWork(0, 1000) === null && hoursOfWork(-5, 1000) === null && hoursOfWork(50, null) === null && hoursOfWork(50, 0) === null, "no amount or no hourly figure: nothing");
ok(hoursOfWork(10.1, 1000) === 1 && hoursOfWork(10.5, 1000) === 1.1, "to one decimal (10.1 -> 1.0, 10.5 -> 1.1 after rounding 1.05)");

section("R41-W4. In backups");
ok(cleanPrefs({ workHours: 160 }).workHours === 160, "kept in a backup's preferences");
ok(!("workHours" in cleanPrefs({ workHours: 5000 })) && !("workHours" in cleanPrefs({})), "refused or missing: not written");

section("R94-W5. What the Add screen says (workTime)");
const { workTime } = H;
ok(workTime(0.3, 1000)?.minutes === 2, "0.30 at 10.00 an hour = 1.8 min, shown as 2 minutes (was 'about 0 hours')");
ok(workTime(0.01, 1000)?.minutes === 1, "the smallest cost still shows at least 1 minute");
ok(workTime(5, 1000)?.minutes === 30, "5.00 at 10.00 an hour = 30 minutes");
ok(workTime(9.9, 1000)?.minutes === 59, "9.90 = 59.4 min stays in minutes");
ok(workTime(9.92, 1000)?.hours === 1, "9.92 = 59.52 min becomes 1 hour, never '60 minutes'");
ok(workTime(95, 1000)?.hours === 9.5 && workTime(10.5, 1000)?.hours === 1.1, "hours to one decimal, same as before");
ok(workTime(0, 1000) === null && workTime(-5, 1000) === null && workTime(5, 0) === null && workTime(5, null) === null, "no figure for zero, negative, or no hourly rate");
finish();
