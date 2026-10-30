// Windows-compatible replacement for the "browser" part of tests/original/run.sh.
// Usage: node tests/run-browser.mjs [candidate.jsx]   (default: ./App.jsx of this working copy)
// Bundles the candidate into ./page (disposable; the candidate is only copied, never written), then runs every
// tests/browser/e2e*.mjs against it in headless Chrome with a throw-away profile. Network requests are blocked by the tests.
import { spawnSync } from "child_process"; import fs from "fs"; import os from "os"; import path from "path"; import { fileURLToPath, pathToFileURL } from "url";
import { runCounted, checkNoneUnlisted } from "./count-guard.mjs"; import { identity } from "./identity.mjs";
const here = path.dirname(fileURLToPath(import.meta.url));
const cand = path.resolve(process.argv[2] || path.join(here, "..", "App.jsx"));
console.log(identity("browser", cand));
const work = fs.mkdtempSync(path.join(os.tmpdir(), "ledger-e2e-"));
// PAGE_OUT (optional) puts the bundled page elsewhere, so two runs at once do not rebuild each other's page.
const pageDir = process.env.PAGE_OUT ? path.resolve(process.env.PAGE_OUT) : path.join(here, "..", "page");
const env = { ...process.env, CANDIDATE: cand, PAGE_OUT: pageDir, PAGE_URL: pathToFileURL(path.join(pageDir, "index.html")).href,
  E2E_DL_DIR: path.join(work, "dl"), E2E_IMP_DIR: path.join(work, "imp") };
const b = spawnSync(process.execPath, [path.join(here, "browser", "build.mjs")], { stdio: "inherit", env });
if (b.status !== 0) { console.log("[run-browser] build failed"); process.exit(b.status ?? 1); }
const files = fs.readdirSync(path.join(here, "browser")).filter((f) => /^e2e.*\.mjs$/.test(f)).sort();
let bad = checkNoneUnlisted("browser", files), passed = 0, failed = 0, missing = 0;
for (const f of files) {
  const r = runCounted("browser", f, [path.join(here, "browser", f)], { env, timeout: 600000 });
  passed += r.passed; failed += r.failed; missing += r.missing; if (!r.ok) bad++;
}
console.log(`[run-browser] candidate=${cand}\n[run-browser] scratch=${work}\n[run-browser] ${files.length} files, ${bad} with problems; checks passed=${passed} failed=${failed} missing=${missing}`);
process.exit(bad ? 1 : 0);
