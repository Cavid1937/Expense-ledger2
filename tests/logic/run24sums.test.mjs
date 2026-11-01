// Run 24: plain sums stay exact to the cent (the old raw decimal additions gave 0.30000000000000004). Expected values by hand.
import { H, ok, section, finish, reset } from "./lib.mjs";
const { calcTxnStats, calcWeekdayWeekend } = H;
reset();
const now = new Date(2026, 9, 31);
const e = (date, amount) => ({ id: date + amount, date, amount, category: "food", type: "expense" });

section("R24-SUM1. Weekend and weekday totals");
// 3 Oct 2026 is a Saturday, 4 Oct a Sunday, 5 Oct a Monday
const s = calcTxnStats([e("2026-10-03", 0.1), e("2026-10-04", 0.2)], "2026-10", now);
ok(s.weekendExp === 0.3, "0.10 on Saturday + 0.20 on Sunday = exactly 0.30", s.weekendExp);
const ten = Array.from({ length: 10 }, () => e("2026-10-05", 0.1));
ok(calcTxnStats(ten, "2026-10", now).weekdayExp === 1, "ten entries of 0.10 on a Monday = exactly 1.00", calcTxnStats(ten, "2026-10", now).weekdayExp);
const w = calcWeekdayWeekend([e("2026-10-03", 0.1), e("2026-10-04", 0.2), e("2026-10-05", 0.7)], "2026-10", now);
ok(w && JSON.stringify(w).includes("0.3") && !JSON.stringify(w).includes("0.30000000000000004"), "weekend/weekday comparison carries 0.3, not 0.30000000000000004", w);
finish("run24sums");
