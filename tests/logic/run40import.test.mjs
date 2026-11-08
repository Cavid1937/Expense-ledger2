// Run 40 (2026-11-08): a file that is not a backup is named for what it is, and nothing is imported from it.
// Owner: a backup picked from Google Drive on the website was refused with only "not valid JSON or CSV".
import { H, ok, section, reset, T, finish } from "./lib.mjs";
const { badFileReason, planImport } = H;
reset();

section("R40-1. What kind of wrong file it is");
ok(badFileReason("") === "import.bad.empty" && badFileReason("  \n ") === "import.bad.empty" && badFileReason("﻿") === "import.bad.empty", "empty (or only spaces / a byte-order mark): the upload or download did not finish");
ok(badFileReason("%PDF-1.7\n...") === "import.bad.pdf", "a PDF");
ok(badFileReason("PK\u0003\u0004\u0014\u0000") === "import.bad.zip", "Excel / Word / zip (they all start with PK)");
ok(badFileReason("<!DOCTYPE html><html><head><title>Google Drive</title>") === "import.bad.web" && badFileReason("\n  <html lang=en>") === "import.bad.web", "a web page (for example a Drive sign-in or preview page saved instead of the file)");
ok(badFileReason("\u0089PNG\r\n\u001a\n\u0000\u0000\u0000\rIHDR\u0000\u0000\u0001\u0000\u0000\u0000\u0001\u0000\u0008\u0006\u0000\u0000\u0000") === "import.bad.binary", "a picture");
const full = JSON.stringify({ version: 10, transactions: [T({ id: 1 })] });
ok(badFileReason(full.slice(0, Math.floor(full.length / 2))) === "import.bad.cut" && badFileReason("[{\"date\":\"2026-10-01\"") === "import.bad.cut", "a backup that breaks off half-way: incomplete or damaged");
ok(badFileReason("hello, this is a note") === "import.notJsonCsv", "anything else keeps the general message");

section("R40-2. The plan refuses the file and says why; nothing is imported");
const cut = planImport(full.slice(0, full.length - 5), "ledger-backup-2026-11-08.json");
ok(cut.ok === false && /incomplete or damaged/.test(cut.error) && !cut.transactions, "a cut-off backup: refused, 'incomplete or damaged', no transactions in the plan", cut.error);
const web = planImport("<!doctype html><html><body>Sign in</body></html>", "ledger-backup.json");
ok(web.ok === false && /web page/.test(web.error) && /Download/.test(web.error), "a web page named .json: refused, tells the person to use Drive's Download", web.error);
const whole = planImport(full, "ledger-backup-2026-11-08.json");
ok(whole.ok === true && whole.transactions.length === 1, "the complete file still imports (1 transaction)");
finish("run40import");
