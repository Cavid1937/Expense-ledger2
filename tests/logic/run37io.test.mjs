// Run 37 (2026-11-07), owner: "I want to see all my data when I import data again". The backup carries preferences too; the import sheet lists
// every part; a phone with nothing recorded takes the file's currency and Safe to Spend on Merge. Expected values by hand. Synthetic data only.
import { H, ok, section, eq, reset, T, finish } from "./lib.mjs";
const { cleanPrefs, fileParts, buildBackup, planImportWithCats, applyImport, readMuteList, writeMuteList, COACH_MUTE_KEY } = H;
reset();
const base = { transactions: [], budgets: {}, templates: [], currency: "₼", goals: [], safeToSpend: { enabled: false, savingsTarget: 0 }, bills: [] };

section("R37-1. Preferences are cleaned and only what was chosen is written");
ok(eq(cleanPrefs(null), {}) && eq(cleanPrefs({ theme: "nope", profileName: "  ", reduceEffects: false, coachMute: [] }), {}) && eq(cleanPrefs({ theme: "sea" }), { theme: "sea" }), "defaults and unknown values give nothing (a file without choices is unchanged); from Run 70 Sea glass is a real choice and is kept");
ok(eq(cleanPrefs({ profileName: " Javid ", theme: "dusk", setupHidden: true, reduceEffects: true, coachMute: ["loanDue", "loanDue", "<script>"], patternMute: ["weekend"] }), { profileName: "Javid", setupHidden: true, theme: "dusk", reduceEffects: true, coachMute: ["loanDue"], patternMute: ["weekend"] }), "name tidied, a real theme kept, duplicates and junk ids dropped");
ok(!("theme" in cleanPrefs({ theme: "hacker" })) && !("profileName" in cleanPrefs({ profileName: 5 })), "an unknown theme or a non-text name is ignored");
ok(!("preferences" in buildBackup(base)), "no choices: the backup file has no preferences part");
const bk = buildBackup({ ...base, preferences: { profileName: "Javid", theme: "dusk" } });
ok(eq(bk.preferences, { profileName: "Javid", theme: "dusk" }), "chosen ones are in the file", bk.preferences);
ok(!JSON.stringify(bk).includes("__lock") && !("lock" in bk), "the app-lock PIN record is never in a backup");

section("R37-2. Hidden-tip lists are stored safely");
writeMuteList(COACH_MUTE_KEY, ["a", "a", "b"]);
ok(eq(readMuteList(COACH_MUTE_KEY), ["a", "b"]), "duplicates removed on save");
writeMuteList(COACH_MUTE_KEY, []);
ok(!globalThis.__store.has(COACH_MUTE_KEY), "an empty list removes the key");

section("R37-3. The import sheet lists every part of the file");
const full = { ...base, transactions: [T({ id: 1 })], budgets: { food: 100 }, goals: [{ id: "g1", name: "Car", target: 1000, saved: 0, monthlyTarget: 0, targetDate: null }], bills: [{ id: "b1", name: "Rent", type: "expense", category: "housing", subcategory: "", amount: 500, freq: "monthly", anchorDate: "2026-10-05", dueDay: 5, endDate: "", active: true, createdAt: "2026-10-01T00:00:00.000Z" }],
  safeToSpend: { enabled: true, savingsTarget: 50 }, accountData: { accounts: [{ id: "a_cash01", name: "Cash", kind: "cash", opening: { amount: 0, date: "" } }, { id: "a_card01", name: "Card", kind: "card", opening: { amount: 0, date: "" } }], transfers: [{ id: "t_x0001", from: "a_card01", to: "a_cash01", amount: 10, date: "2026-10-02" }] },
  debtData: { debts: [{ id: "d1", direction: "owed", name: "Rauf", principal: 30000, dueDate: "", note: "", payments: [] }], loans: [] }, customCats: [{ id: "u_abc123", name: "Padel", income: false, color: "#68D391" }], subcategories: { food: ["Plov", "Tea"] }, catPrefs: { hidden: ["pets"] }, preferences: { profileName: "Javid" } };
const plan = planImportWithCats(JSON.stringify(buildBackup(full)), "b.json");
const parts = Object.fromEntries(fileParts(plan));
ok(plan.ok && eq(parts, { entries: 1, accounts: 2, transfers: 1, bills: 1, budgets: 1, goals: 1, debts: 1, cats: 1, subcats: 2, catprefs: null, safe: null, prefs: null }), "entries 1, accounts 2, transfers 1, bills 1, budgets 1, goals 1, debts 1, own categories 1, own subcategories 2, order, Safe to Spend, preferences", parts);

section("R37-4. Merge into a phone with nothing recorded takes the file's settings; a used phone keeps its own");
const empty = { ...base, currency: "$", profileName: "", setupHidden: false };
let next = applyImport(empty, plan, "merge");
ok(next.currency === "₼" && next.safeToSpend.enabled === true && next.safeToSpend.savingsTarget === 50, "empty phone: currency ₼ and Safe to Spend (on, 50) come from the file", [next.currency, next.safeToSpend]);
ok(next.profileName === "Javid", "and the name, since this phone had none");
const used = { ...base, currency: "$", transactions: [T({ id: 99 })], profileName: "Ali" };
next = applyImport(used, plan, "merge");
ok(next.currency === "$" && next.safeToSpend.enabled === false && next.profileName === "Ali", "a phone with its own entries keeps its currency, Safe to Spend and name", [next.currency, next.safeToSpend, next.profileName]);
ok(next.transactions.length === 2 && next.bills.length === 1 && next.goals.length === 1, "entries, bills and goals are still added");
finish("run37io");
