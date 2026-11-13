// Run 75: subscriptions listed apart from other repeating payments. Synthetic data only.
import { H, ok, section, finish, reset } from "./lib.mjs";
const { isSubscription, validateBill } = H;
reset();
const B = (o) => ({ id: "b1", name: "Netflix", type: "expense", amount: 12.99, freq: "monthly", anchorDate: "2026-11-01", category: "digital", ...o });

section("R75-S1. Which repeating payments are subscriptions");
ok(isSubscription({ type: "expense", category: "digital", merchant: "Azercell" }), "Phone & Subscriptions counts as a subscription");
ok(isSubscription({ type: "expense", category: "entertain", merchant: "Spotify" }) && isSubscription({ type: "expense", category: "other", subcategory: "Streaming" }), "a known service name or a 'streaming' subcategory counts, in any category");
ok(isSubscription({ type: "expense", category: "other", merchant: "Подписка Okko" }) && isSubscription({ type: "expense", category: "other", merchant: "Musiqi abunəliyi" }), "Russian and Azerbaijani words for subscription count too");
ok(!isSubscription({ type: "expense", category: "housing", merchant: "Rent" }) && !isSubscription({ type: "expense", category: "finance", merchant: "Bank loan" }), "rent and a loan are other repeating payments");
ok(!isSubscription({ type: "income", category: "digital", merchant: "Netflix refund" }), "money coming in is never a subscription");
ok(!isSubscription({ type: "expense", category: "digital", bill: { kind: "bill" } }) && isSubscription({ type: "expense", category: "housing", bill: { kind: "sub" } }), "the person's own choice on the bill wins over the guess, both ways");

section("R75-S2. The choice is stored safely and older files stay valid");
ok(validateBill(B({ kind: "sub" })).kind === "sub" && validateBill(B({ kind: "bill" })).kind === "bill", "'subscription' and 'other' are kept");
ok(!("kind" in validateBill(B({}))) && !("kind" in validateBill(B({ kind: "junk" }))) && !("kind" in validateBill(B({ kind: { x: 1 } }))), "no choice, or a damaged one, stores nothing (decided automatically)");
ok(validateBill(B({ kind: "junk" })) !== null, "a damaged choice never makes the whole bill invalid");
finish("run75subs");
