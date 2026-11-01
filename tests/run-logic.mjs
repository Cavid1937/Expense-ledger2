// Windows-compatible replacement for the "logic" part of tests/original/run.sh.
// Usage: node tests/run-logic.mjs [candidate.jsx]   (default: ./App.jsx of this working copy)
// Builds the harness module into tests/.out (disposable), then runs every tests/logic/*.test.mjs in its own process.
// The candidate is only read. The tests use an in-memory localStorage, never the browser's.
import { spawnSync } from "child_process"; import fs from "fs"; import path from "path"; import { fileURLToPath, pathToFileURL } from "url";
import { runCounted, checkNoneUnlisted } from "./count-guard.mjs"; import { identity } from "./identity.mjs";
const here = path.dirname(fileURLToPath(import.meta.url));
const cand = path.resolve(process.argv[2] || path.join(here, "..", "App.jsx"));
console.log(identity("logic", cand));
const out = path.join(here, ".out", "real.mjs");
const h = spawnSync(process.execPath, [path.join(here, "harness.mjs"), cand, out], { stdio: "inherit" });
if (h.status !== 0) process.exit(h.status ?? 1);
const env = { ...process.env, HARNESS: pathToFileURL(out).href, CANDIDATE: cand };
const files = fs.readdirSync(path.join(here, "logic")).filter((f) => f.endsWith(".test.mjs")).sort();
let bad = checkNoneUnlisted("logic", files), passed = 0, failed = 0, missing = 0;
for (const f of files) {
  const r = runCounted("logic", f, [path.join(here, "logic", f)], { env });
  passed += r.passed; failed += r.failed; missing += r.missing; if (!r.ok) bad++;
}
console.log(`[run-logic] candidate=${cand}\n[run-logic] ${files.length} files, ${bad} with problems; checks passed=${passed} failed=${failed} missing=${missing}`);
process.exit(bad ? 1 : 0);
