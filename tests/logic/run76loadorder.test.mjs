// Run 76 (13 Nov, live site stopped opening for ~10 minutes): screens/*.jsx and App.jsx import each other. A screen file may USE what it
// imports from App.jsx inside functions, but must not read it while the file itself is loading (a top-level const / call), because in the
// real website build App.jsx may not be ready yet ("Cannot access … before initialization"). The browser tests bundle differently and did
// not see it; this check reads the files themselves.
import fs from "fs"; import path from "path";
import { ok, section, finish } from "./lib.mjs";
const dir = new URL("../../screens/", import.meta.url);
const bad = [];
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".jsx") || x.endsWith(".js"))) {
  const src = fs.readFileSync(new URL(f, dir), "utf8");
  const names = new Set(); for (const m of src.matchAll(/import\s*\{([^}]+)\}\s*from\s*["']\.\.\/App\.jsx["']/g)) m[1].split(",").map((x) => x.trim().split(/\s+as\s+/).pop()).filter(Boolean).forEach((n) => names.add(n));
  if (!names.size) continue;
  // top-level lines only (no indentation), that are not function / component definitions or arrow functions
  src.split(/\r?\n/).forEach((line, i) => {
    if (!/^(const|let|var|export const|export let)\s/.test(line) || /=>|function\b/.test(line)) return;
    for (const n of names) if (new RegExp("\\b" + n + "\\b").test(line.split("=").slice(1).join("="))) bad.push(`${f}:${i + 1} uses ${n}`);
  });
}
section("R76-L1. No screen reads App.jsx values while loading");
ok(bad.length === 0, "screens use what they import from App.jsx only inside functions", bad);
finish("run76loadorder");
