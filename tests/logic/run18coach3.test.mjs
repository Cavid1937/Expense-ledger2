// Run 18g: coach rule R3 (regular bills as a share of recorded income). Hand-computed. Synthetic data.
import { H, ok, section, reset, T, finish } from "./lib.mjs";
const { calcCoach } = H;
reset();
const NOW = new Date(2026, 9, 13, 12);
const inc = (m, amount) => T({ id: "i" + m, type: "income", category: "salary", amount, date: m + "-01" });
const bill = (o = {}) => ({ id: "b1", name: "Rent", type: "expense", amount: 690, freq: "monthly", anchorDate: "2026-01-05", active: true, category: "housing", subcategory: "", createdAt: "", ...o });
const ids = (r) => r.map((c) => c.id);

section("R18-BS1. Bills share of income (R3)");
const two = [inc("2026-08", 1500), inc("2026-09", 1500)];
let r = calcCoach(two, null, NOW, [bill()]);
const c = r.find((x) => x.id === "billsShare");
ok(!!c && c.pct === 46, "bills 690 over average income 1500 = 46%", c);
ok(!ids(calcCoach(two, null, NOW, [])).includes("billsShare"), "no bills: no card");
ok(!ids(calcCoach(two, null, NOW, [bill({ active: false })])).includes("billsShare"), "a paused bill is not counted");
ok(!ids(calcCoach(two, null, NOW, [bill({ type: "income" })])).includes("billsShare"), "an income schedule is not a bill");
ok(!ids(calcCoach([inc("2026-09", 1500)], null, NOW, [bill()])).includes("billsShare"), "only one month of income: no card");
r = calcCoach([...two, inc("2026-07", 600)], null, NOW, [bill({ freq: "weekly", amount: 100 })]);
ok(r.find((x) => x.id === "billsShare")?.pct === 36, "weekly bill 100 is about 433 a month (x4.33) over average income 1200 = 36%", r.find((x) => x.id === "billsShare"));
finish("run18coach3");
