// Run 42: the backup file carries every current feature and an old file naming a removed theme still imports sensibly.
// Round trip: build a backup from a state that uses the newest features, read it back through the import planner, and compare. Synthetic data only.
import { H, ok, section, eq, reset, T, finish } from "./lib.mjs";
const { cleanPrefs, fileParts, buildBackup, planImportWithCats, applyImport, readWorkHours, writeWorkHours, cleanWorkHours } = H;
reset();
const base = { transactions: [], budgets: {}, templates: [], currency: "₼", goals: [], safeToSpend: { enabled: false, savingsTarget: 0 }, bills: [] };

section("R42-IO1. A removed theme named in a backup maps to its closest remaining theme");
ok(cleanPrefs({ theme: "sapphire" }).theme === "dusk" && cleanPrefs({ theme: "cocoa" }).theme === "nordic", "Sapphire -> Dusk, Cocoa -> Nordic");
ok(cleanPrefs({ theme: "graphite" }).theme === "graphite" && cleanPrefs({ theme: "sand" }).theme === "sand", "the two new themes are kept as they are");
ok(!("theme" in cleanPrefs({ theme: "sea" })) && !("theme" in cleanPrefs({ theme: "nope" })) && !("theme" in cleanPrefs({ theme: "__proto__" })), "the default and unknown names are not written");

section("R42-IO2. Round trip of the newest features");
const e1 = T({ id: 1, type: "expense", category: "shopping", amount: 600, date: "2026-10-05", spread: 6 });
const e2 = T({ id: 2, type: "expense", category: "food", amount: 12.5, date: "2026-10-06", account: "a_cred01" });
const e3 = T({ id: 3, type: "income", category: "refund", amount: 20, date: "2026-10-07", refundFor: "shopping" });
const state = { ...base, transactions: [e1, e2, e3],
  accountData: { accounts: [{ id: "a_cred01", name: "Credit card", kind: "credit", opening: { amount: 0, date: "" } }, { id: "a_cash01", name: "Cash", kind: "cash", opening: { amount: 50, date: "2026-10-01" } }], transfers: [{ id: "t_x0001", from: "a_cash01", to: "a_cred01", amount: 5, date: "2026-10-08" }] },
  preferences: { workHours: 160, theme: "graphite", reduceEffects: true, profileName: "Javid" } };
const text = JSON.stringify(buildBackup(state));
const plan = planImportWithCats(text, "b.json");
ok(plan.ok, "the file reads back without errors", plan.error);
const tx = Object.fromEntries((plan.transactions || []).map((x) => [String(x.id), x]));
ok(tx["1"] && tx["1"].spread === 6, "an entry spread over 6 months keeps its spread", tx["1"]);
ok(tx["2"] && tx["2"].account === "a_cred01" && tx["3"] && tx["3"].refundFor === "shopping", "account link and refund-of-Shopping survive", [tx["2"], tx["3"]]);
ok(plan.accountData.accounts.some((a) => a.kind === "credit") && plan.accountData.transfers.length === 1, "credit-card account and its transfer survive");
ok(plan.prefs && plan.prefs.workHours === 160 && plan.prefs.theme === "graphite" && plan.prefs.reduceEffects === true, "work hours, theme and reduce-effects travel in the preferences", plan.prefs);
ok(eq(Object.fromEntries(fileParts(plan)), { entries: 3, accounts: 2, transfers: 1, prefs: null }), "the import sheet lists entries 3, accounts 2, transfers 1, preferences", fileParts(plan));

section("R42-IO3. Importing applies the file to an empty phone and keeps what a used phone already has");
const empty = { ...base, currency: "$", profileName: "", setupHidden: false };
const next = applyImport(empty, plan, "merge");
ok(next.transactions.length === 3 && next.transactions.find((x) => String(x.id) === "1").spread === 6, "merge into an empty phone: all 3 entries, spread intact");
ok(readWorkHours() === null, "applyImport itself leaves the side stores alone (the app writes them after checking each one)");
ok(writeWorkHours(plan.prefs.workHours) && readWorkHours() === 160 && cleanWorkHours(readWorkHours()) === 160, "work hours are stored and read back as 160");
const again = applyImport(next, planImportWithCats(text, "b.json"), "merge", { skipDuplicates: true });
ok(again.transactions.length === 3, "importing the same file again with 'skip duplicates' adds nothing", again.transactions.length);
finish("run42io");
