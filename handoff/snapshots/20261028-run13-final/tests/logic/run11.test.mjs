// Run 11 (2026-10-27): telling which app version is running and whether the site now serves a newer one.
import { H, ok, section, finish } from "./lib.mjs";
const { appVersionOf, checkForUpdate } = H;
const page = (v) => `<!doctype html><head><script type="module" crossorigin src="/assets/index-${v}.js"></script><link rel="manifest" href="/manifest.webmanifest"></head>`;

section("1. Version of a page");
ok(appVersionOf(page("GHsaJrEd")) === "GHsaJrEd" && appVersionOf("https://x.app/assets/index-Ab_1-z.js") === "Ab_1-z", "the hash in /assets/index-<hash>.js is the version (from a page or a script address)");
ok(appVersionOf("<html>no script</html>") === null && appVersionOf("") === null && appVersionOf(undefined) === null, "no app script → unknown (null), never a guess");

section("2. Is there a newer version?");
ok(await checkForUpdate("AAA", async () => page("BBB")) === "update", "site serves another version → 'update'");
ok(await checkForUpdate("AAA", async () => page("AAA")) === "current", "same version → 'current' (no notice)");
ok(await checkForUpdate("AAA", async () => "<html>offline error page</html>") === "unknown", "an answer without the app (error page, captive portal) → 'unknown', no notice");
ok(await checkForUpdate("AAA", async () => { throw new Error("offline"); }) === "unknown", "no network → 'unknown', no notice, no crash");
ok(await checkForUpdate(null, async () => page("BBB")) === "unknown", "running version unknown (test or single-file build) → never asks to update");
finish("run11");
