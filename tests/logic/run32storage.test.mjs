// Run 32 (backlog item 17): storage safety. The usage estimate, and the app's behaviour with 20,000 entries / a 100,000-row CSV. Synthetic data only.
// Time limits are generous ceilings (they catch a slow-down of 10x or more, not small changes) so the test does not fail on a slow computer.
import { H, ok, section, reset, finish, T } from "./lib.mjs";
const { storageUsage, STORAGE_LIMIT_CHARS, buildBackup, buildCsv, planImport, forSpending, calcSafeToSpend } = H;
reset();
const fake = (entries) => { const m = new Map(Object.entries(entries)); return { get length() { return m.size; }, key: (i) => [...m.keys()][i] ?? null, getItem: (k) => (m.has(k) ? m.get(k) : null) }; };

section("R32-S1. Usage estimate: every key and value counted in characters");
ok(STORAGE_LIMIT_CHARS === 5000000, "the assumed limit is 5,000,000 characters");
const u0 = storageUsage(fake({}));
ok(u0 && u0.chars === 0 && u0.pct === 0 && u0.level === "ok", "empty storage: 0 characters, 0%, ok", u0);
const u1 = storageUsage(fake({ abc: "12345", k: "" }));
ok(u1.chars === 3 + 5 + 1 + 0, "'abc'+'12345' and 'k'+'' = 9 characters", u1);
const at = (chars) => storageUsage(fake({ k: "x".repeat(chars - 1) }));
ok(at(3900000).level === "ok" && at(3900000).pct === 78, "78% is ok", at(3900000));
ok(at(4000000).level === "warn" && at(4000000).pct === 80, "exactly 80% is a warning", at(4000000));
ok(at(4700000).level === "warn" && at(4700000).pct === 94, "94% is still only a warning", at(4700000));
ok(at(4750000).level === "full" && at(4750000).pct === 95, "95% is 'almost full'", at(4750000));
ok(at(9000000).pct === 100 && at(9000000).level === "full", "over the limit shows 100%, never more", at(9000000));
const bad = { get length() { throw new Error("blocked"); } };
ok(storageUsage(bad) === null && storageUsage(null) === null, "storage that cannot be read gives null (the page then shows nothing) instead of an error");

section("R32-S2. 20,000 entries: size and speed");
const N = 20000, cats = ["food", "transport", "housing", "digital"];
const txns = Array.from({ length: N }, (_, i) => T({ id: 1790000000000 + i, amount: Math.round(1 + (i * 37) % 9000) / 100, category: cats[i % 4], merchant: "Merchant " + (i % 200), note: i % 5 ? "" : "some note", date: new Date(Date.UTC(2021, 0, 1) + (i % 1800) * 86400000).toISOString().slice(0, 10) }));
const json = JSON.stringify(txns);
ok(json.length > 4000000 && json.length < 5200000, "20,000 typical entries take 4.0 to 5.2 million characters, so about 20,000 is where the 5 million limit is reached (this is why the warning exists)", json.length);
let t0 = performance.now(); const bk = JSON.stringify(buildBackup({ transactions: txns, budgets: {}, templates: [], currency: "₼", goals: [], safeToSpend: {}, bills: [] })); const tBuild = performance.now() - t0;
t0 = performance.now(); const plan = planImport(bk, "b.json"); const tPlan = performance.now() - t0;
ok(plan.ok && plan.transactions.length === N && plan.skippedCount === 0, "a 20,000-entry backup imports completely with nothing skipped", [plan.ok, plan.transactions && plan.transactions.length, plan.skippedCount]);
ok(tBuild < 3000 && tPlan < 5000, "building and checking that backup takes well under a few seconds", { tBuild: Math.round(tBuild), tPlan: Math.round(tPlan) });
const sum = (a) => Math.round(a.reduce((s, x) => s + x.amount * 100, 0));
ok(sum(plan.transactions) === sum(txns), "the total of all amounts is identical before and after (in cents)", [sum(plan.transactions), sum(txns)]);
t0 = performance.now(); const fs2 = forSpending(txns); const sts = calcSafeToSpend(fs2, { enabled: true, savingsTarget: 100 }, [], new Date(2026, 9, 13), []); const tCalc = performance.now() - t0;
ok(sts && tCalc < 2000, "the Safe to Spend calculation over 20,000 entries is well under 2 seconds", Math.round(tCalc));

section("R32-S3. 100,000-row CSV");
const big = Array.from({ length: 100000 }, (_, i) => T({ id: i + 1, amount: Math.round(1 + (i * 37) % 9000) / 100, category: cats[i % 4], merchant: "M" + (i % 500), date: new Date(Date.UTC(2020, 0, 1) + (i % 2500) * 86400000).toISOString().slice(0, 10) }));
t0 = performance.now(); const csv = buildCsv(big); const tCsv = performance.now() - t0;
t0 = performance.now(); const cplan = planImport(csv, "big.csv"); const tCp = performance.now() - t0;
ok(cplan.ok && cplan.transactions.length === 100000, "a 100,000-row CSV is read completely", [cplan.ok, cplan.error, cplan.transactions && cplan.transactions.length]);
ok(sum(cplan.transactions) === sum(big), "its amounts add up exactly as the entries that made it (in cents)", [sum(cplan.transactions), sum(big)]);
ok(tCsv < 8000 && tCp < 15000, "writing and reading it finishes in seconds, not minutes", { tCsv: Math.round(tCsv), tCp: Math.round(tCp) });
finish("run32storage");
