// Run 36 (2026-11-07): category ids are permanent. Every id an older version of the app shipped must still exist in this version, keep
// its type (expense / income), and load from saved data unchanged; no entry is ever moved to another category by an upgrade.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { H, ok, section, eq, reset, T, finish } from "./lib.mjs";
const { CATEGORIES, migrateAndLoad } = H;
reset();
const here = path.dirname(fileURLToPath(import.meta.url));
const old = [path.join(here, "..", "fixtures", "app-v9", "App.jsx"), path.join(here, "..", "..", "handoff", "run-8-snapshot", "App.jsx")].filter((f) => fs.existsSync(f));
const idsIn = (src) => { const blk = src.slice(src.indexOf("CATEGORIES"), src.indexOf("];", src.indexOf("CATEGORIES"))); return [...blk.matchAll(/\{\s*id:\s*"([a-z0-9_]+)"[^}]*?income:\s*(true|false)/g)].map((m) => [m[1], m[2] === "true"]); };

section("R36-I1. Every older version's category is still here, with the same type");
ok(old.length >= 1, "at least one older version's source is in the repository to compare with", old);
for (const f of old) {
  const was = idsIn(fs.readFileSync(f, "utf8"));
  const now = new Map(CATEGORIES.map((c) => [c.id, !!c.income]));
  const missing = was.filter(([id]) => !now.has(id)), flipped = was.filter(([id, inc]) => now.has(id) && now.get(id) !== inc);
  ok(was.length >= 10 && missing.length === 0, `${path.basename(path.dirname(f))}: all ${was.length} ids still exist`, missing);
  ok(flipped.length === 0, `${path.basename(path.dirname(f))}: none changed between expense and income`, flipped);
}

section("R36-I2. Saved entries in every built-in category load exactly as saved");
const builtIns = CATEGORIES.filter((c) => !c.custom);
globalThis.__store.set("expense_ledger_v5", JSON.stringify({ transactions: builtIns.map((c, i) => T({ id: i + 1, type: c.income ? "income" : "expense", category: c.id, amount: 1 })), language: "en" }));
const st = migrateAndLoad();
ok(st.transactions.length === builtIns.length && eq(st.transactions.map((t) => t.category), builtIns.map((c) => c.id)), `all ${builtIns.length} categories round-trip; nothing set aside or renamed`, st.transactions.map((t) => t.category).filter((c, i) => c !== builtIns[i].id));
finish("run36ids");
