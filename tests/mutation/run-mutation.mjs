// Run 32 (backlog item 4): mutation check for the core money code. For each deliberate bug below, a COPY of the app (never the real files)
// gets that one change, the logic suite runs against the copy, and we report whether the tests noticed (KILLED) or not (SURVIVED).
// A SURVIVED mutant means a hand-checked expectation is missing for that behaviour: add a test, do not delete the mutant.
// Usage: node tests/mutation/run-mutation.mjs [report.md]     (about 1 minute per mutant; the real App.jsx is only read)
import fs from "fs"; import os from "os"; import path from "path"; import { spawnSync } from "child_process"; import { fileURLToPath } from "url";
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "..", ".."), runner = path.join(root, "tests", "run-logic.mjs");
const M = [
  ["account balance: income counted as spending", 'x.type==="income" ? c : x.type==="expense" ? -c : 0', 'x.type==="income" ? -c : x.type==="expense" ? -c : 0'],
  ["account balance: transfer adds to the wrong side", "out[x.to]+=centsOf(x.amount);", "out[x.to]-=centsOf(x.amount);"],
  ["account balance: an entry dated exactly today is ignored", "|| date<=cut;", "|| date<cut;"],
  ["account cents: rounds down instead of to nearest", "Number.isFinite(n) ? Math.round(n*100) : 0; };", "Number.isFinite(n) ? Math.floor(n*100) : 0; };"],
  ["goal monthly amount: no longer rounded UP", "Math.floor((remainingC+periods-1)/periods)/100", "Math.floor(remainingC/periods)/100"],
  ["goal percent: not capped at 100", "Math.min((saved/target)*100,100)", "(saved/target)*100"],
  ["goal complete: needs MORE than the target", "target>0 && saved>=target;", "target>0 && saved>target;"],
  ["goal months needed: not rounded up", "Math.floor((goalCents(target)-goalCents(saved)+mc-1)/mc)", "Math.floor((goalCents(target)-goalCents(saved))/mc)"],
  ["Safe to Spend: savings floor not subtracted", "const disposable=cents2(curInc-effectiveSavingsTarget);", "const disposable=cents2(curInc);"],
  ["Safe to Spend: upcoming bills not subtracted", "cents2(disposable-curExp-futureCommitments)", "cents2(disposable-curExp)"],
  ["Safe to Spend: smaller of floor and goals used", "Math.max(savingsTarget,goalContributions)", "Math.min(savingsTarget,goalContributions)"],
  ["Safe to Spend: a bill entered for today also counts as settled ahead", "t.date>todayStr && !(t.billId", "t.date>=todayStr && !(t.billId"],
  ["Safe to Spend: any amount settles an upcoming bill", "cents(t.amount)===cents(s.amount)", "true"],
  ["loan annuity: interest rounded down", "const interest=Math.round(bal*r);", "const interest=Math.floor(bal*r);"],
  ["loan annuity: last payment no longer absorbs leftover cents", "if (i===n || A-interest>=bal)", "if (A-interest>=bal)"],
  ["loan equal-principal: instalment rounded up", "const pr=Math.round(P/n);", "const pr=Math.ceil(P/n);"],
];
const files = [...fs.readdirSync(root).filter((f) => /\.(js|jsx|mjs|json)$/.test(f))];
const results = [];
// Baseline: the same copy with NO change. A mutant only counts as killed when it does WORSE than this (a copy outside the repo can fail some checks by itself).
const runCopy = (mutate) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ledger-mut-"));
  for (const f of files) fs.copyFileSync(path.join(root, f), path.join(dir, f));
  fs.cpSync(path.join(root, "screens"), path.join(dir, "screens"), { recursive: true });
  let applied = 1;
  if (mutate) { const src = fs.readFileSync(path.join(dir, "App.jsx"), "utf8"); applied = src.split(mutate[0]).length - 1; if (applied === 1) fs.writeFileSync(path.join(dir, "App.jsx"), src.replace(mutate[0], () => mutate[1])); }
  let res = { applied };
  if (applied === 1) { const r = spawnSync(process.execPath, [runner, path.join(dir, "App.jsx")], { encoding: "utf8", maxBuffer: 1 << 28, cwd: root }); const m = /checks passed=(\d+) failed=(\d+) missing=(\d+)/.exec(r.stdout || ""); res = { applied, status: r.status, passed: m ? +m[1] : 0, failed: m ? +m[2] : -1, missing: m ? +m[3] : -1, problems: (/(\d+) with problems/.exec(r.stdout || "") || [0, -1])[1] }; }
  fs.rmSync(dir, { recursive: true, force: true }); return res;
};
const base = runCopy(null); console.log("baseline (no change):", JSON.stringify(base));
const only = process.argv[3] ? new RegExp(process.argv[3], "i") : null;   // optional 2nd argument: only mutants whose name matches
for (const [name, find, rep] of M) {
  if (only && !only.test(name)) continue;
  const r = runCopy([find, rep]);
  if (r.applied !== 1) { results.push([name, `NOT APPLIED (pattern found ${r.applied} times)`]); console.log(`${name}: NOT APPLIED`); continue; }
  const killed = r.failed > base.failed || r.missing > base.missing || r.passed < base.passed;
  results.push([name, killed ? `KILLED (${r.failed - base.failed} more failed, ${r.passed - base.passed} passed vs baseline)` : "SURVIVED"]);
  console.log(`${name}: ${results[results.length - 1][1]}`);
}
for (const [name, find, rep] of []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ledger-mut-"));
  for (const f of files) fs.copyFileSync(path.join(root, f), path.join(dir, f));
  fs.cpSync(path.join(root, "screens"), path.join(dir, "screens"), { recursive: true });
  const src = fs.readFileSync(path.join(dir, "App.jsx"), "utf8"), n = src.split(find).length - 1;
  if (n !== 1) { results.push([name, `NOT APPLIED (pattern found ${n} times)`]); console.log(`${name}: NOT APPLIED (found ${n})`); fs.rmSync(dir, { recursive: true, force: true }); continue; }
  fs.writeFileSync(path.join(dir, "App.jsx"), src.replace(find, () => rep));
  const r = spawnSync(process.execPath, [runner, path.join(dir, "App.jsx")], { encoding: "utf8", maxBuffer: 1 << 28, cwd: root });
  const m = /checks passed=(\d+) failed=(\d+) missing=(\d+)/.exec(r.stdout || "");
  const killed = r.status !== 0;
  results.push([name, killed ? `KILLED (${m ? m[2] + " failed, " + m[3] + " missing" : "run stopped"})` : "SURVIVED"]);
  console.log(`${name}: ${results[results.length - 1][1]}`);
  fs.rmSync(dir, { recursive: true, force: true });
}
const survived = results.filter((r) => r[1] === "SURVIVED" || r[1].startsWith("NOT APPLIED"));
const md = `# Mutation check (${new Date().toISOString().slice(0, 10)})\n\n| Deliberate bug | Result |\n|---|---|\n${results.map((r) => `| ${r[0]} | ${r[1]} |`).join("\n")}\n\n${survived.length ? `**${survived.length} mutant(s) not killed: add a hand-checked test for each.**` : "All mutants were killed."}\n`;
const out = process.argv[2]; if (out) fs.writeFileSync(out, md);
console.log("\n" + md);
