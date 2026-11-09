// Run 50: bills suggested from repeated payments, and category learning (already there; checked here). Today = 20 Oct 2026; synthetic data.
import { H, ok, section, reset, setNow, finish, T } from "./lib.mjs";
const { recurringSuggestions, readRecSuggestDismissed, writeRecSuggestDismissed, buildMerchantMemory } = H;
reset(); setNow(2026, 9, 20);
const now = new Date(2026, 9, 20);
let id = 100;
const e = (merchant, date, amount, o = {}) => T({ id: ++id, merchant, date, amount, category: "digital", subcategory: "Streaming", ...o });
const netflix = [e("Netflix", "2026-07-05", 9.99), e("Netflix", "2026-08-05", 9.99), e("Netflix", "2026-09-05", 9.99)];
const insurance = [e("Insurance", "2024-03-15", 600, { category: "finance" }), e("Insurance", "2025-03-15", 610, { category: "finance" }), e("Insurance", "2026-03-15", 620, { category: "finance" })];

section("R50-R1. What is suggested");
let s = recurringSuggestions([...netflix, ...insurance], [], [], now);
ok(s.length === 2 && s[0].name === "Insurance" && s[1].name === "Netflix", "monthly Netflix and yearly Insurance are suggested", s.map((x) => x.name));
const nf = s.find((x) => x.name === "Netflix"), ins = s.find((x) => x.name === "Insurance");
ok(nf.freq === "monthly" && nf.amount === 9.99 && nf.count === 3 && nf.category === "digital", "Netflix: monthly, 9.99, from 3 payments", nf);
ok(nf.anchorDate === "2026-11-05", "first due date offered is the next one after today (5 Oct has passed, so 5 Nov)", nf.anchorDate);
ok(ins.freq === "yearly" && ins.amount === 620 && ins.anchorDate === "2027-03-15", "Insurance: yearly, latest amount 620, next 15 Mar 2027", ins);

section("R50-R2. What is not suggested");
ok(recurringSuggestions(netflix.slice(0, 2), [], [], now).length === 0, "two payments are not enough");
ok(recurringSuggestions([e("Gym", "2026-07-05", 30), e("Gym", "2026-08-05", 30), e("Gym", "2026-09-05", 50)], [], [], now).length === 0, "amounts that differ by more than 25% (30, 30, 50) are not a fixed bill");
ok(recurringSuggestions([e("Cafe", "2026-07-01", 5), e("Cafe", "2026-07-03", 5), e("Cafe", "2026-09-28", 5), e("Cafe", "2026-10-19", 5)], [], [], now).length === 0, "irregular visits are not a schedule");
ok(recurringSuggestions([e("Old", "2026-01-05", 9), e("Old", "2026-02-05", 9), e("Old", "2026-03-05", 9)], [], [], now).length === 0, "a monthly payment that stopped months ago is not offered");
ok(recurringSuggestions(netflix, [{ id: "b1", name: " netflix ", type: "expense" }], [], now).length === 0, "a bill with the same name already exists (case and spaces ignored)");
ok(recurringSuggestions(netflix.map((x) => ({ ...x, billId: "b1" })), [], [], now).length === 0, "payments already tied to a bill are left out");
ok(recurringSuggestions(netflix.map((x) => ({ ...x, recurring: true, recurFreq: "monthly" })), [], [], now).length === 0, "payments already marked recurring are left out");
ok(recurringSuggestions(netflix.map((x) => ({ ...x, type: "income" })), [], [], now).length === 0, "income is never suggested as a bill");
ok(recurringSuggestions(netflix, [], ["NETFLIX"], now).length === 0, "a dismissed place stays dismissed (any letter case)");
ok(recurringSuggestions(null, null, null, now).length === 0, "missing input does not crash");
const snap = JSON.stringify(netflix); recurringSuggestions(netflix, [], [], now);
ok(JSON.stringify(netflix) === snap, "the entries are not modified");

section("R50-R3. Remembering a dismissal");
ok(readRecSuggestDismissed().length === 0, "nothing dismissed at first");
writeRecSuggestDismissed(["Netflix", "Netflix", "Gym"]);
ok(readRecSuggestDismissed().join() === "Netflix,Gym", "stored once each", readRecSuggestDismissed());
ok(!globalThis.__store.has("expense_ledger_v5"), "the main data key is untouched");

section("R50-R4. Category learning (already built; recorded so it cannot be lost)");
const hist = [T({ id: 1, merchant: "Kontakt", category: "shopping", subcategory: "Electronics", date: "2026-08-01" }), T({ id: 2, merchant: "Kontakt", category: "shopping", subcategory: "Electronics", date: "2026-09-01" })];
ok(Object.values(buildMerchantMemory(hist)).length === 1 && Object.values(buildMerchantMemory(hist))[0].category === "shopping", "the place's category is what was recorded before");
const corrected = [hist[0], { ...hist[1], category: "housing", subcategory: "Furniture" }];
const m2 = Object.values(buildMerchantMemory(corrected))[0];
ok(m2.category === "housing" && m2.subcategory === "Furniture" && m2.count === 2, "after the latest entry is corrected to Housing / Furniture, the next suggestion for that place follows the correction", m2);
finish("run50recur");
