// Run 13 (2026-10-28): protection against an older app version wiping the bills. Written BEFORE the implementation.
// Fact (tests/browser/e2e_downgrade.mjs): the version-9 app rewrites the whole ledger every time it starts and does not know
// `bills` or a payment's `billId`, so opening it once after a rollback erases both. The ledger key cannot change, and version 9
// cannot be patched, so the current app keeps a small mirror of the bills and the payment links under a SEPARATE key that
// version 9 never touches, and OFFERS (never silently applies) a restore when the ledger has lost bills the mirror still has.
// Same fixture as bills.test.mjs: today = 13 Oct 2026, income 2,000 on 1 Oct, electricity 90 and water 18 from "Kommunal".
import { H, ok, section, eq, reset, finish } from "./lib.mjs";
const { buildBillsMirror, planBillRestore, applyBillRestore, BILLS_MIRROR_KEY, calcSafeToSpend, validateBill } = H;
reset();
const cfg = { enabled: true, savingsTarget: 0 };
const safe = (txns, bills) => calcSafeToSpend(txns, cfg, [], new Date(2026, 9, 13, 12), bills).remaining;
const bill = (o) => ({ id: o.id, name: "Kommunal", type: "expense", category: "housing", subcategory: "Utilities", amount: 18, freq: "monthly", anchorDate: "2026-09-05", active: true, createdAt: "2026-09-01T00:00:00Z", ...o });
const T = (o) => ({ id: o.id, type: "expense", category: "housing", subcategory: "Utilities", merchant: "Kommunal", note: "", recurring: true, recurFreq: "monthly", isActive: true, createdAt: "2026-09-01T00:00:00Z", ...o });
const income = { id: "inc1", type: "income", amount: 2000, category: "salary", subcategory: "", merchant: "Employer", note: "", date: "2026-10-01", recurring: false, recurFreq: null, isActive: true, createdAt: "x" };
const bE = bill({ id: "bE", amount: 90 }), bW = bill({ id: "bW", amount: 18 });
const withBills = [T({ id: "e1", amount: 90, note: "Electricity", date: "2026-09-05", billId: "bE" }), T({ id: "w1", amount: 18, note: "Water", date: "2026-09-05", billId: "bW" }),
  T({ id: "w2", amount: 18, note: "Water", date: "2026-10-05", billId: "bW" }), income];
const wiped = withBills.map(({ billId, ...rest }) => rest);   // what the version-9 app writes back: same entries, no bills, no links

section("RM-1. The mirror");
const m = buildBillsMirror([bE, bW], withBills);
ok(BILLS_MIRROR_KEY === "expense_ledger_v5__bills_mirror", "the mirror lives under its own key next to the ledger (the ledger key itself is unchanged)", BILLS_MIRROR_KEY);
ok(m.v === 1 && eq(m.bills, [bE, bW]) && eq(m.links, { e1: "bE", w1: "bW", w2: "bW" }) && typeof m.savedAt === "string", "it holds the bills and a payment-id → bill-id map, nothing else of the ledger", m);
const empty = buildBillsMirror(undefined, undefined);
ok(eq(buildBillsMirror([], [income]).bills, []) && empty.v === 1 && eq(empty.bills, []) && eq(empty.links, {}), "no bills (or no list at all) gives an empty mirror, which offers nothing");

section("RM-2. Nothing is offered unless bills were really lost");
ok(planBillRestore([bE, bW], withBills, m) === null, "ledger still has every bill → no offer");
ok(planBillRestore([], wiped, null) === null && planBillRestore([], wiped, undefined) === null && planBillRestore([], wiped, "x") === null && planBillRestore([], wiped, 7) === null && planBillRestore([], wiped, []) === null, "no mirror, or one that is not an object → no offer");
ok(planBillRestore([], wiped, { ...m, v: 2 }) === null && planBillRestore([], wiped, { ...m, v: undefined }) === null && planBillRestore([], wiped, { ...m, bills: "x" }) === null && planBillRestore([], wiped, { ...m, bills: {} }) === null, "an unknown mirror version or a mirror whose bills are not a list is ignored (never guessed at)");
ok(planBillRestore([], wiped, buildBillsMirror([], withBills)) === null, "a mirror that holds no bills (the user deleted them all on purpose) → no offer");

section("RM-3. The offer after a rollback wiped the bills");
const plan = planBillRestore([], wiped, m);
ok(plan && eq(plan.bills, [bE, bW]) && eq(plan.links, [{ id: "e1", billId: "bE" }, { id: "w1", billId: "bW" }, { id: "w2", billId: "bW" }]), "both bills and all three payment links are offered, exactly as saved", plan);
ok(safe(wiped, []) === 1982, "after the wipe the old collision is back: Safe to Spend 1,982 (electricity not set aside)", safe(wiped, []));
const back = applyBillRestore({ bills: [], transactions: wiped }, plan);
ok(eq(back.bills, [bE, bW]) && back.transactions.filter((t) => t.billId).length === 3 && safe(back.transactions, back.bills) === 1892, "restoring brings back the same bills and links: Safe to Spend 1,892 again", safe(back.transactions, back.bills));
ok(eq(back.transactions.map((t) => { const { billId, ...r } = t; return r; }), wiped), "restoring changes no entry except adding the link (ids, amounts, dates, names, notes identical)");
ok(eq(applyBillRestore({ bills: back.bills, transactions: back.transactions }, plan), back), "applying it twice changes nothing (idempotent)");

section("RM-4. Partial and unusual situations never merge or overwrite anything");
const onlyW = planBillRestore([bE], wiped.map((t) => (t.id === "e1" ? { ...t, billId: "bE" } : t)), m);
ok(onlyW && eq(onlyW.bills, [bW]) && eq(onlyW.links, [{ id: "w1", billId: "bW" }, { id: "w2", billId: "bW" }]), "only the missing bill is offered; a bill the ledger still has is left alone, and its linked payment is not touched", onlyW);
const newOne = bill({ id: "bX", name: "Kommunal", amount: 18 });   // the user made a new "Kommunal 18" bill after the wipe: same name and amount, different id
const dupName = planBillRestore([newOne], wiped, m);
ok(dupName && dupName.bills.some((b) => b.id === "bW") && applyBillRestore({ bills: [newOne], transactions: wiped }, dupName).bills.length === 3, "a bill with the same name and amount but another id is NOT treated as the same bill: the old one is offered, nothing is merged", dupName);
const diffLink = planBillRestore([], wiped.map((t) => (t.id === "w1" ? { ...t, billId: "bOther" } : t)), m);
ok(diffLink && !diffLink.links.some((l) => l.id === "w1"), "a payment that already points to some bill is never re-linked", diffLink);
const gone = planBillRestore([], wiped.filter((t) => t.id !== "w2"), m);
ok(gone && !gone.links.some((l) => l.id === "w2") && gone.links.length === 2, "a payment that no longer exists gets no link");
const badMirror = { ...m, bills: [bE, { ...bW, amount: -5 }, null, 7, { id: "" }], links: { e1: "bE", w1: "bW", w2: "zzz" } };
const partial = planBillRestore([], wiped, badMirror);
ok(partial && eq(partial.bills, [bE]) && eq(partial.links, [{ id: "e1", billId: "bE" }]), "invalid bills in the mirror are dropped, and a link to a dropped or unknown bill is dropped too", partial);
const numeric = planBillRestore([], [{ ...wiped[0], id: 1790000000001 }], { ...m, links: { "1790000000001": "bE" } });
ok(numeric && eq(numeric.links, [{ id: 1790000000001, billId: "bE" }]), "numeric entry ids (the app's own) match their text form in the mirror", numeric);
ok(planBillRestore([], wiped, { ...m, bills: [bE, { ...bE }] }).bills.length === 1, "a bill listed twice in the mirror is offered once");
ok(validateBill(plan.bills[0]) !== null && validateBill(plan.bills[1]) !== null, "every offered bill passes the same validation as a stored bill");

finish("billsmirror");
