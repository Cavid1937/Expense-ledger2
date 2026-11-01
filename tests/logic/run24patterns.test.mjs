// Run 24: Patterns — one merchant written in different cases is one merchant. Expected values by hand. Synthetic data only.
import { H, ok, section, finish, reset } from "./lib.mjs";
const { calcPatterns } = H;
reset();
const now = new Date(2026, 9, 31);
const e = (date, amount, merchant, category = "food") => ({ id: date + merchant + amount, date, amount, merchant, category, type: "expense", note: "" });

section("R24-PA1. Merchant concentration merges spellings");
const list = [e("2026-10-02", 30, "Bravo"), e("2026-10-04", 30, "bravo "), e("2026-10-06", 20, "BRAVO"), e("2026-10-08", 10, "Cafe"), e("2026-10-10", 10, "Shop")];
const r = calcPatterns(list, "₼", now);
const m = r.insights.find((x) => x.id === "merchant");
ok(!!m, "the three spellings of Bravo count as one merchant: 80 of 100 is above the 60% line", r.insights.map((x) => x.id));
ok(!!m && /Bravo, Cafe, Shop/.test(m.text) && !/BRAVO|bravo/.test(m.text) && /100%/.test(m.text), "named once, as first written, with 100% for the top three", m && m.text);
const three = [e("2026-10-02", 10, "A"), e("2026-10-03", 10, "B"), e("2026-10-04", 10, "C"), e("2026-10-05", 10, "D"), e("2026-10-06", 10, "E")];
const at60 = calcPatterns(three, "₼", now).insights.find((x) => x.id === "merchant");
ok(!!at60 && /60%/.test(at60.text), "five equal merchants: the top three are exactly 30 of 50 = 60%, which is on the line and is reported", at60 && at60.text);
const six = [...three, e("2026-10-07", 10, "F")];
ok(!calcPatterns(six, "₼", now).insights.some((x) => x.id === "merchant"), "six equal merchants: the top three are 30 of 60 = 50%, below the line, nothing is said");
finish("run24patterns");
