// Run 41: one-tap budget rebalance (planRebalance / applyRebalance). Hand-computed. Synthetic data.
import { H, ok, section, reset, finish } from "./lib.mjs";
const { planRebalance, applyRebalance } = H;
reset();
const it = (catId, limit, spent) => ({ catId, limit, spent });

section("R41-B1. Plan");
let p = planRebalance([it("food", 200, 250), it("fun", 100, 40), it("shop", 100, 60)]);
ok(!!p && p.catId === "food" && p.need === 50, "food over by 50", p);
ok(p.moves.length === 2 && p.moves[0].catId === "fun" && p.moves[0].amount === 30 && p.moves[1].catId === "shop" && p.moves[1].amount === 20, "fun gives half of its 60 room (30), shop the last 20 of its 40 room", p);
p = planRebalance([it("food", 200, 200.01), it("fun", 100, 0)]);
ok(!!p && p.need === 1 && p.moves[0].amount === 1, "one cent over: shortfall rounds up to 1 whole unit", p);
ok(planRebalance([it("food", 200, 200), it("fun", 100, 0)]) === null, "exactly at the limit is not over: no plan");
ok(planRebalance([it("food", 200, 150), it("fun", 100, 0)]) === null, "nothing over: no plan");
ok(planRebalance([it("food", 200, 300), it("fun", 100, 80)]) === null, "donors cannot cover the shortfall: no plan");
ok(planRebalance([it("food", 200, 200.5), it("fun", 100, 99)]) === null, "a donor with under 2 units of room gives nothing");
p = planRebalance([it("food", 200, 200.5), it("fun", 100, 98)]);
ok(!!p && p.moves[0].amount === 1, "room of exactly 2 units gives 1", p);
p = planRebalance([it("a", 100, 160), it("b", 100, 110), it("c", 500, 0)]);
ok(!!p && p.catId === "a" && p.moves.length === 1 && p.moves[0].catId === "c", "an over category never donates; the biggest overage is chosen", p);
ok(planRebalance(null) === null && planRebalance([]) === null, "bad input gives no plan");
ok(planRebalance([it("x", 0, 50), it("y", 100, 0)]) === null, "a zero limit is not a budget");

section("R41-B2. Apply");
const b = { food: 200, fun: 100, shop: 100, other: 30 };
p = planRebalance([it("food", 200, 250), it("fun", 100, 40), it("shop", 100, 60)]);
const nb = applyRebalance(b, p);
ok(nb.food === 250 && nb.fun === 70 && nb.shop === 80 && nb.other === 30, "limits moved, other limits untouched", nb);
ok(Object.values(nb).reduce((s, v) => s + v, 0) === Object.values(b).reduce((s, v) => s + v, 0), "the total of all limits is unchanged");
ok(b.food === 200 && b.fun === 100, "the original budgets object is not modified");
ok(applyRebalance({ food: 10.1, fun: 20.2 }, { catId: "food", need: 1, moves: [{ catId: "fun", amount: 1 }] }).food === 11.1, "decimals stay exact in cents");
ok(JSON.stringify(applyRebalance(b, null)) === JSON.stringify(b), "no plan: unchanged copy");
finish();
