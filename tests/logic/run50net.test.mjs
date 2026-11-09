// Run 50 (owner list #15): "your data never leaves the phone" is kept true by a test, not just by the privacy text.
// The source may talk to the network in exactly the ways the Privacy page lists. If someone adds another way, this test fails
// and the Privacy text has to be revisited first. (Behaviour at run time is checked in tests/browser/e2e_run50net.mjs.)
import fs from "fs";
import { ok, section, finish, SRC } from "./lib.mjs";

section("R50-N1. Every web address in the app's own source belongs to the site or the exchange-rate service");
const urls = [...SRC.matchAll(/https?:\/\/[A-Za-z0-9._-]+/g)].map((m) => m[0]);
const hosts = [...new Set(urls.map((u) => u.replace(/^https?:\/\//, "")))];
const allowed = ["expense-ledger2.vercel.app", "api.frankfurter.dev", "localhost", "www.w3.org", "schema.org", "claude.com", "github.com"];
const strange = hosts.filter((h) => !allowed.some((a) => h === a || h.endsWith("." + a)));
ok(strange.length === 0, "no unexpected host appears in App.jsx or screens/*.jsx", strange);

section("R50-N2. The only network calls are the update check and the exchange rate for a foreign-currency entry");
const calls = [...SRC.matchAll(/\bfetch\s*\(/g)].length;
ok(calls <= 3, `at most the known fetch calls (update check, exchange rate, passed-in helper): found ${calls}`);
ok(!/XMLHttpRequest|sendBeacon|new WebSocket|EventSource\s*\(/.test(SRC), "no XMLHttpRequest, beacon, WebSocket or event stream");
const rate = SRC.match(/api\.frankfurter\.dev\/v2\/rates\?[^`"']*/);
ok(rate && /^api\.frankfurter\.dev\/v2\/rates\?base=\$\{cur\}&providers=cbar&quotes=AZN&date=\$\{day\}$/.test(rate[0]), "the exchange-rate address carries only a currency code and a date (no amount, merchant or note)", rate && rate[0]);
ok(/fetch\(`\/\?v=\$\{Date\.now\(\)\}`,\{cache:"no-store"\}\)/.test(SRC), "the update check asks the site's own front page and sends nothing from the ledger");
ok(/countAppOpen/.test(SRC) && /nothing from the ledger in the address/.test(SRC), "the app-open count is documented as carrying nothing from the ledger");

section("R50-N3. The privacy page text exists in all three languages");
const i18n = fs.readFileSync(new URL("../../i18n.js", import.meta.url), "utf8");
for (const k of ["info.privacy.1.b", "info.privacy.2.b", "info.privacy.3.b"]) ok(new RegExp('"' + k.replace(/\./g, "\\.") + '":\\s*\\{[^}]*en:[^}]*az:[^}]*ru:').test(i18n), k + " has en, az and ru");
finish("run50net");
