// Run 58 (owner-approved category audit, handoff/CATEGORY_AUDIT_20261112.md): Personal Care split from Gifts, duplicates retired, new
// subcategories, renamed "Phone & Subscriptions", the Gifts page fault and imported cash withdrawals. Expected values worked out by hand.
// Synthetic data only.
import { H, ok, section, finish, reset, eq } from "./lib.mjs";
import { statementEntries } from "../../statement.js";
const { CATEGORIES, catName, catTile, subName, catHint, setLang, partitionTransactions, planImport, buildCsv, giftLedger, statementPick, KNOWN_MERCHANTS } = H;
reset();
const E = (id, o = {}) => ({ id, type: "expense", amount: 10, category: "food", subcategory: "", merchant: "", note: "", date: "2026-10-05", recurring: false, recurFreq: null, isActive: true, ...o });
const C = (id) => CATEGORIES.find((c) => c.id === id);

section("R58-1. The category list");
// Every id and every subcategory offered before this run (Run 57 list, copied by hand).
const BEFORE = {
  food: ["Restaurants", "Fast Food", "Coffee", "Groceries", "Delivery", "Snacks", "Bakery", "Market / Bazaar", "Other"],
  transport: ["Metro", "Bus", "Taxi / Ride-hailing", "Fuel", "Parking", "Car Maintenance", "Intercity", "Public transport card", "Other"],
  shopping: ["Clothing", "Electronics", "Personal Items", "Home", "Accessories", "Online Shopping", "Furniture", "Appliances", "Other"],
  gifts: ["Gifts", "Donations", "Personal Care", "Barber / Hair", "Cosmetics", "Other"],
  entertain: ["Cinema", "Games", "Events", "Sports", "Hobbies", "Music", "Other"],
  digital: ["Mobile", "Internet", "Streaming", "Software", "Cloud Storage", "Other Subs", "Other"],
  health: ["Gym", "Sports Equipment", "Pharmacy", "Doctor / Dentist", "Supplements", "Eye care", "Tests / Lab", "Other"],
  edu: ["University", "Books", "Courses", "Exams", "Stationery", "Tutoring", "School / Kindergarten", "Other"],
  travel: ["Flights", "Hotels", "Visa", "Travel Food", "Travel Transport", "Activities", "Other"],
  housing: ["Rent", "Utilities", "Household", "Repairs", "Gas", "Electricity", "Water", "Building fees", "Other"],
  finance: ["Bank Fees", "Transfers", "Taxes", "Insurance", "Investments", "Loan payment", "Interest", "Other"],
  family: ["Childcare", "Children's needs", "Family support", "School items", "Toys & games", "Other"],
  car: ["Fuel", "Car insurance", "Car Maintenance", "Tyres & parts", "Parking", "Fines", "Car wash", "Car tax & inspection", "Other"],
  pets: ["Pet food", "Vet", "Pet supplies", "Pet grooming", "Other"], work: ["Tools & supplies", "Business travel", "Business services", "Professional fees", "Other"],
  other: ["Miscellaneous", "Pets", "Children"],
  salary: ["Wages", "Bonus", "Overtime", "Commission"], freelance: ["Consulting", "Gig work", "Temporary work"], business: ["Business revenue", "Business profit", "Other business"],
  stipend: ["Scholarship", "Student stipend", "Educational grant"], pension: ["Retirement benefit"], benefits: ["Social benefit", "Allowance", "Unemployment support", "Other assistance"],
  familyin: ["From family", "Regular contribution", "Remittance"], alimony: ["Child support", "Alimony"], rental: ["Rent received", "Other property income"],
  investin: ["Interest", "Dividends", "Investment return"], sales: ["Selling goods", "Occasional work"], giftin: ["Money gift"], income: ["One-time income", "Unexpected income"],
  refund: ["Refund", "Reimbursement", "Cashback"], savout: ["Savings withdrawal", "Investment withdrawal", "Asset sale"],
};
const lost = [];
for (const [id, subs] of Object.entries(BEFORE)) { const c = C(id); if (!c) { lost.push(id); continue; } for (const s of subs) if (!c.subs.includes(s) && !(c.retired || []).includes(s)) lost.push(id + "/" + s); }
ok(lost.length === 0, "all 31 earlier category ids still exist, and every earlier subcategory is still offered or kept as a retired name in the same category", lost);
ok(C("personal") && C("personal").income === false && ["Barber / Hair", "Cosmetics", "Hygiene"].every((s) => C("personal").subs.includes(s)), "new expense category Personal Care offers Barber / Hair, Cosmetics and Hygiene");
ok(eq(C("gifts").subs, ["Gifts", "Donations", "Weddings & parties", "Other"]) && eq(C("gifts").retired, ["Personal Care", "Barber / Hair", "Cosmetics"]), "Gifts now offers only gift things; its personal-care names are retired");
ok(!["Fuel", "Parking", "Car Maintenance"].some((s) => C("transport").subs.includes(s)) && !C("other").subs.includes("Pets") && !C("other").subs.includes("Children") && !C("digital").subs.includes("Other Subs"), "duplicates are no longer offered: car things under Transport, Pets and Children under Other, 'Other Subs'");
const dupInside = CATEGORIES.filter((c) => new Set(c.subs).size !== c.subs.length).map((c) => c.id);
const retiredAlsoOffered = CATEGORIES.filter((c) => (c.retired || []).some((s) => c.subs.includes(s))).map((c) => c.id);
ok(dupInside.length === 0 && retiredAlsoOffered.length === 0, "no category offers a name twice, and no retired name is still offered in the same category", { dupInside, retiredAlsoOffered });
ok(new Set(CATEGORIES.map((c) => c.id)).size === CATEGORIES.length, "category ids are unique");
ok(["Heating", "Mortgage"].every((s) => C("housing").subs.includes(s)) && ["TV", "Home phone"].every((s) => C("digital").subs.includes(s)) && ["Cash withdrawal", "Money sent to people", "State fees"].every((s) => C("finance").subs.includes(s)), "new places from the audit: Heating, Mortgage, TV, Home phone, Cash withdrawal, Money sent to people, State fees");

section("R58-2. Names in three languages, including retired ones");
setLang("en"); ok(catName("digital") === "Phone & Subscriptions" && catTile("digital") === "Phone & subs" && catName("gifts") === "Gifts & Donations" && catName("personal") === "Personal Care", "English names", [catName("digital"), catTile("digital"), catName("gifts"), catName("personal")]);
setLang("az"); ok(catName("digital") === "Rabitə və abunəliklər" && catTile("digital") === "Rabitə" && subName("Other Subs") === "Digər abunəliklər" && subName("Barber / Hair") === "Bərbər", "Azerbaijani: the digital category no longer claims 'Kommunal' (utilities); a retired name still shows translated", [catName("digital"), subName("Other Subs")]);
setLang("ru"); ok(catName("digital") === "Связь и подписки" && catTile("personal") === "Уход" && subName("Pets") === "Питомцы", "Russian names, retired 'Pets' still translated");
setLang("en"); ok(/Home/.test(catHint("digital")) && /Car/.test(catHint("transport")) && catHint("food") === "", "a hint points to where things live; categories without one give nothing");

section("R58-3. Entries already saved do not change");
const saved = [E(1, { category: "gifts", subcategory: "Barber / Hair", amount: 15 }), E(2, { category: "transport", subcategory: "Fuel", amount: 40 }), E(3, { category: "other", subcategory: "Pets", amount: 7.5 }),
  E(4, { category: "digital", subcategory: "Other Subs", amount: 4.99 }), E(5, { category: "gifts", subcategory: "Gifts", amount: 50 })];
const { good } = partitionTransactions(saved, { keepCategoryId: true });
ok(good.length === 5 && eq(good.map((x) => [x.id, x.category, x.subcategory, x.amount]), saved.map((x) => [x.id, x.category, x.subcategory, x.amount])), "five saved entries with old places load with the same category, subcategory and amount", good.map((x) => [x.category, x.subcategory]));
const old = planImport("Date,Amount,Type,Category,Subcategory\n2026-10-01,5,expense,Gifts & Personal,Barber / Hair\n2026-10-02,6,expense,Bills & Subscriptions,Mobile\n2026-10-03,7,expense,Personal care,\n2026-10-04,8,expense,Gifts & Donations,\n2026-10-05,9,expense,Phone & Subscriptions,TV\n", "old.csv");
ok(old.ok && eq(old.transactions.map((x) => x.category), ["gifts", "digital", "personal", "gifts", "digital"]), "a CSV written by an earlier version ('Gifts & Personal', 'Bills & Subscriptions') imports into the same place; the new names import too", old.transactions && old.transactions.map((x) => x.category));
const round = planImport(buildCsv([E(9, { category: "personal", subcategory: "Cosmetics", amount: 12.3 })]), "r.csv");
ok(round.ok && round.transactions.length === 1 && round.transactions[0].category === "personal" && round.transactions[0].subcategory === "Cosmetics" && round.transactions[0].amount === 12.3, "a Personal Care entry survives a CSV export and import");
ok(KNOWN_MERCHANTS.some(([n, c, s]) => n === "Rossmann" && c === "personal" && s === "Cosmetics") && KNOWN_MERCHANTS.some(([n, c, s]) => n === "Azəristilik" && c === "housing" && s === "Heating"), "built-in places: Rossmann -> Personal Care, Azəristilik -> Home / Heating");

section("R58-4. The Gifts page counts only gifts (fault found in the audit)");
const g = [E(1, { category: "gifts", subcategory: "Gifts", amount: 50 }), E(2, { category: "gifts", subcategory: "Barber / Hair", amount: 15 }), E(3, { category: "gifts", subcategory: "cosmetics", amount: 20 }),
  E(4, { category: "gifts", subcategory: "", amount: 30 }), E(5, { category: "gifts", subcategory: "Personal Care", amount: 10 }), E(6, { category: "personal", subcategory: "Barber / Hair", amount: 12 }),
  E(7, { type: "income", category: "giftin", subcategory: "Money gift", amount: 100 })];
const L = giftLedger(g);
ok(L.given === 80 && L.received === 100 && eq(L.rows.map((r) => r.txn.id).sort(), [1, 4, 7]), "given = 50 + 30 = 80 (a haircut, cosmetics and personal care are not gifts, in any letter case); received = 100", { given: L.given, received: L.received, ids: L.rows.map((r) => r.txn.id) });
ok(g[1].category === "gifts" && g[1].subcategory === "Barber / Hair", "the haircut entry itself is not changed");

section("R58-5. Bank statements: a cash withdrawal is not spending (fault found in the audit)");
// Six rows: ATM 100 (cash), 30 to a person (transfer), a pair out/in of 20 within minutes (own accounts), barber 15 (code 7230), cable TV 9 (code 4899).
const rows = [
  { date: "2026-10-01", time: "10:00", type: "expense", cents: 10000, merchant: "ATM BAKU", kind: "cash" },
  { date: "2026-10-02", time: "11:00", type: "expense", cents: 3000, merchant: "To A. Person", kind: "transfer" },
  { date: "2026-10-03", time: "12:00", type: "expense", cents: 2000, merchant: "Card to card", kind: "transfer", pair: true },
  { date: "2026-10-03", time: "12:02", type: "income", cents: 2000, merchant: "Card to card", kind: "transfer", pair: true },
  { date: "2026-10-04", time: "13:00", type: "expense", cents: 1500, merchant: "SALON X", kind: "payment", mcc: "7230" },
  { date: "2026-10-05", time: "14:00", type: "expense", cents: 900, merchant: "CABLE TV", kind: "payment", mcc: "4899" }];
// The same steps the app's statement sheet takes (statementPlan): entries with their kind, then the default choice (transfers on, cash off).
const raw = statementEntries("abb", rows, { known: KNOWN_MERCHANTS }), stMeta = {}; raw.forEach((e) => { stMeta[String(e.id)] = e._st; });
const plan = { stAll: raw.map(({ _st, ...e }) => e), stMeta, stOpts: { transfers: true, cash: false, pending: false } };
plan.transactions = statementPick(plan, plan.stOpts);
const cents = (list) => list.filter((x) => x.type === "expense").reduce((s, x) => s + Math.round(x.amount * 100), 0);
ok(eq(raw.map((e) => e._st.kind), ["cash", "transfer", "own", "own", "payment", "payment"]), "kinds: the withdrawal is cash, the pair is own accounts, 'To A. Person' is a transfer", raw.map((e) => e._st.kind));
ok(plan.transactions.length === 3 && cents(plan.transactions) === 5400, "by default 3 entries are added: 30 sent to a person + 15 barber + 9 TV = 54.00 of spending (the 100 withdrawal and the 20 own move are left out)", plan.transactions.map((x) => [x.merchant, x.amount]));
const all = statementPick(plan, { ...plan.stOpts, cash: true });
ok(all.length === 6 && cents(all) === 17400, "ticking the option adds them: 54 + 100 + 20 = 174.00 out", cents(all));
const by = (m) => plan.stAll.find((x) => x.merchant === m);
ok(by("ATM BAKU").subcategory === "Cash withdrawal" && by("To A. Person").subcategory === "Money sent to people" && by("SALON X").category === "personal" && by("CABLE TV").subcategory === "TV", "places: Cash withdrawal, Money sent to people, Personal Care / Barber, TV",
  ["ATM BAKU", "To A. Person", "SALON X", "CABLE TV"].map((m) => [by(m).category, by(m).subcategory]));
section("R58-6. Tidy up: only what is ticked moves, recurring and linked entries never, Undo restores exactly");
const { tidyPlan, applyTidy, undoTidy, TIDY_MOVES } = H;
const tl = [E(1, { category: "gifts", subcategory: "Barber / Hair", amount: 15, date: "2026-11-02", merchant: "Salon" }), E(2, { category: "gifts", subcategory: "barber / hair", amount: 10, date: "2026-10-02" }),
  E(3, { category: "gifts", subcategory: "Barber / Hair", amount: 20, recurring: true, recurFreq: "monthly" }), E(4, { category: "transport", subcategory: "Fuel", amount: 40, date: "2026-11-03" }),
  E(5, { category: "transport", subcategory: "Fuel", amount: 30, billId: "b1" }), E(6, { category: "transport", subcategory: "Fuel", amount: 25, loan: { id: "l1", n: 1 } }),
  E(7, { category: "gifts", subcategory: "Gifts", amount: 50 }), E(8, { type: "income", category: "gifts", subcategory: "Barber / Hair", amount: 5 }), E(9, { category: "other", subcategory: "Pets", amount: 7 })];
const tp = tidyPlan(tl, "2026-11");
const grp = (k) => tp.find((x) => x.key === k);
ok(eq(tp.map((x) => x.key), ["gifts-barber", "transport-fuel", "other-pets"]), "three moves are offered (barber, fuel, pets); nothing for Gifts / Gifts", tp.map((x) => x.key));
ok(eq(grp("gifts-barber").ids, [1, 2]) && grp("gifts-barber").total === 25 && grp("gifts-barber").monthTotal === 15 && grp("gifts-barber").example.merchant === "Salon", "barber: entries 1 and 2 (any letter case) = 25.00, of which 15.00 this month; the repeating one (3) and the income (8) are not offered");
ok(eq(grp("transport-fuel").ids, [4]), "fuel: only entry 4; the bill payment (5) and the loan instalment (6) are never offered");
const before = JSON.parse(JSON.stringify(tl));
const r = applyTidy(tl, tp, ["gifts-barber"]);
ok(r.moved === 2 && eq(r.transactions.filter((x) => x.category === "personal").map((x) => x.id), [1, 2]) && r.transactions.find((x) => x.id === 4).category === "transport", "ticking only the barber move moves exactly entries 1 and 2 to Personal Care; fuel stays");
ok(r.transactions.every((x, i) => x.id === before[i].id && x.amount === before[i].amount && x.date === before[i].date && x.merchant === before[i].merchant), "ids, amounts, dates and places are unchanged");
ok(JSON.stringify(undoTidy(r.transactions, r.before)) === JSON.stringify(before), "Undo gives back exactly the list before");
const edited = r.transactions.map((x) => (x.id === 1 ? { ...x, category: "health", subcategory: "" } : x));
const u2 = undoTidy(edited, r.before);
ok(u2.find((x) => x.id === 1).category === "health" && u2.find((x) => x.id === 2).category === "gifts", "Undo after the person edited entry 1 again keeps that later edit; entry 2 goes back");
ok(applyTidy(tl, tp, []).moved === 0 && JSON.stringify(applyTidy(tl, tp, []).transactions) === JSON.stringify(tl), "nothing ticked: nothing changes");
ok(TIDY_MOVES.every((m) => C(m.to[0]) && (m.to[1] === "" || C(m.to[0]).subs.includes(m.to[1])) && (C(m.from[0]).retired || []).includes(m.from[1])), "every move goes from a retired name to a place that is offered today");
finish("run58cats");
