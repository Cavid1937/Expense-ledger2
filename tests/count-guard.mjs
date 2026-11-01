// Shared by run-logic.mjs and run-browser.mjs: runs one test file, echoes its output, and checks that it executed exactly
// the number of checks recorded in expected-counts.json. A file passes only if it exits 0, prints its summary line, and the
// executed count matches — so skipped, missing or unrecorded checks fail loudly instead of looking green.
import { spawnSync } from "child_process"; import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const here = path.dirname(fileURLToPath(import.meta.url));
const EXPECTED = JSON.parse(fs.readFileSync(path.join(here, "expected-counts.json"), "utf8"));

export function runCounted(group, file, args, opts) {
  const r = spawnSync(process.execPath, args, { ...opts, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  process.stdout.write(r.stdout || ""); process.stderr.write(r.stderr || "");
  const m = /: (?:ALL (\d+) CHECKS PASSED|(\d+) FAILED, (\d+) passed)\s*$/.exec((r.stdout || "").trimEnd());
  const passed = m ? Number(m[1] ?? m[3]) : 0, failed = m ? Number(m[2] ?? 0) : 0;
  const expected = EXPECTED[group][file];
  const missing = expected === undefined ? 0 : Math.max(0, expected - passed - failed);
  const problems = [];
  if (r.status !== 0) problems.push(`exit=${r.status}${r.error ? " error=" + r.error.message : ""}`);
  if (!m) problems.push("no summary line (the file stopped before finishing)");
  if (expected === undefined) problems.push("not listed in expected-counts.json");
  else if (passed + failed !== expected) problems.push(`executed ${passed + failed} checks, expected ${expected}`);
  console.log(`[run-${group}] ${file} exit=${r.status} passed=${passed} failed=${failed} missing=${missing} expected=${expected ?? "?"}${problems.length ? " PROBLEM: " + problems.join("; ") : ""}`);
  // Run 13: say plainly when a file stopped on a browser-process fault (not on a failed assertion), so such stops are never
  // mistaken for app defects nor hidden. The file still counts as a problem; nothing is retried or excused.
  if (problems.length && failed === 0 && /frame was detached|ProtocolError|Target closed|Session closed|Protocol error|Connection closed/i.test((r.stderr || "") + (r.stdout || "")))
    console.log(`[run-${group}] NOTE: ${file} stopped on a browser-process fault, not on a failed check: ${String(((r.stderr || "") + (r.stdout || "")).split("\n").find((l) => /frame was detached|ProtocolError|Target closed|Session closed|Protocol error|Connection closed/i.test(l)) || "").trim().slice(0, 200)}`);
  return { ok: problems.length === 0, passed, failed, missing };
}

export function checkNoneUnlisted(group, files) {
  const extra = Object.keys(EXPECTED[group]).filter((f) => !files.includes(f));
  if (extra.length) console.log(`[run-${group}] PROBLEM: expected-counts.json lists files that were not found: ${extra.join(", ")}`);
  return extra.length;
}
