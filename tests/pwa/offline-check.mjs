// Run 10: the BUILT app (vite build, served over http://localhost like a real host) must open and show the saved data with
// the network switched off — that is what the service worker is for. Also checks the manifest the page links to.
// Usage: node tests/pwa/offline-check.mjs   (builds into a temp folder; never touches dist/ or user folders)
//        LIVE_URL=https://… node tests/pwa/offline-check.mjs   (checks a deployed site instead, in a throw-away browser profile with synthetic data)
import { spawn, spawnSync } from "child_process"; import fs from "fs"; import os from "os"; import path from "path";
import { fileURLToPath } from "url"; import { launch, wait, ok, section, finish, KEY } from "../browser/lib.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const LIVE = process.env.LIVE_URL || ""; const out = fs.mkdtempSync(path.join(os.tmpdir(), "ledger-pwa-")); const PORT = 4175, URL0 = LIVE || `http://localhost:${PORT}/`;
const vite = path.join(root, "node_modules", "vite", "bin", "vite.js");
const b = LIVE ? { status: 0 } : spawnSync(process.execPath, [vite, "build", "--outDir", out, "--emptyOutDir"], { cwd: root, encoding: "utf8" });
console.log(`build exit=${b.status} -> ${out}`); if (b.status !== 0) { console.log(b.stdout, b.stderr); process.exit(1); }
const server = LIVE ? null : spawn(process.execPath, [vite, "preview", "--outDir", out, "--port", String(PORT), "--strictPort"], { cwd: root });
const stop = () => { try { server && server.kill(); } catch {} };
for (let i = 0; i < 50; i++) { try { const r = await fetch(URL0); if (r.ok) break; } catch {} await wait(200); }
const browser = await launch();
try {
  // Run 10 hotfix: the owner's path on the installed app — open it ONCE online (no reload), close it, airplane mode, open
  // it again. The earlier check reloaded online first, which hid that the app's code file was never saved for offline use.
  section("PWA-0. Opened once online, then reopened with no network (the owner's real path)");
  {
    const ctx = await (browser.createBrowserContext ? browser.createBrowserContext() : browser.createIncognitoBrowserContext());
    const p1 = await ctx.newPage(); await p1.setViewport({ width: 390, height: 844 });
    await p1.evaluateOnNewDocument(() => { if (!localStorage.getItem("expense_ledger_v5")) localStorage.setItem("expense_ledger_v5", JSON.stringify({ language: "en", transactions: [{ id: 1, type: "expense", amount: 7.5, category: "food", merchant: "Firstvisit", date: new Date().toISOString().slice(0, 10), recurring: false, recurFreq: null, isActive: true }], budgets: {}, templates: [], currency: "₼", goals: [], safeToSpend: { enabled: false, savingsTarget: 0 } })); });
    await p1.goto(URL0, { waitUntil: "load" }); await p1.waitForSelector(".tabbar");
    const ready = await p1.evaluate(async () => { const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), 8000))]); return !!(reg && reg.active); });
    await new Promise((r) => setTimeout(r, 1500));   // a moment for the worker to finish saving files, as on a phone
    // The worker's own store must hold every file the page needs. (Desktop Chrome's HTTP cache can hide a gap here; a phone may not.)
    const missing = await p1.evaluate(async () => { const need = [...document.querySelectorAll('script[src], link[rel=stylesheet]')].map((e) => new URL(e.src || e.href).pathname); const have = []; for (const k of await caches.keys()) for (const r of await (await caches.open(k)).keys()) have.push(new URL(r.url).pathname); return need.filter((n) => !have.includes(n)); });
    ok(missing.length === 0, "after one visit the worker has saved every file the page needs (the app's code included)", missing);
    await p1.close();
    const p2 = await ctx.newPage(); await p2.setViewport({ width: 390, height: 844 }); await p2.setCacheEnabled(false); await p2.setOfflineMode(true);   // no HTTP cache, like the phone
    p2.errors = []; p2.on("pageerror", (e) => p2.errors.push(String(e)));
    await p2.goto(URL0, { waitUntil: "load" }).catch(() => {});
    const opened = await p2.waitForSelector(".tabbar", { timeout: 8000 }).then(() => true).catch(() => false);
    const blank = await p2.evaluate(() => (document.getElementById("root")?.innerHTML || "").length === 0).catch(() => true);
    ok(ready && opened && !blank && /Firstvisit/.test(await p2.evaluate(() => document.body.innerText).catch(() => "")), "opened once online (no reload), reopened offline → the app and its data appear (was: blank screen)", { ready, opened, blank });
    await ctx.close();
  }

  // Run 10 hotfix: a phone that already has the released v1 worker (it saved no app code) must be repaired by opening the
  // app once online after the fix is published. Local only: the same address first serves v1, then the fixed build.
  if (!LIVE) {
    section("PWA-0b. Update from the released v1 worker");
    const v1dir = fs.mkdtempSync(path.join(os.tmpdir(), "ledger-pwa-v1-"));
    fs.cpSync(out, v1dir, { recursive: true }); fs.copyFileSync(path.join(root, "tests", "pwa", "sw-v1-fixture.js"), path.join(v1dir, "sw.js"));
    const PORT2 = PORT + 1, URL2 = `http://localhost:${PORT2}/`;
    const serve = (dir) => spawn(process.execPath, [vite, "preview", "--outDir", dir, "--port", String(PORT2), "--strictPort"], { cwd: root });
    const up = async () => { for (let i = 0; i < 50; i++) { try { if ((await fetch(URL2)).ok) return; } catch {} await wait(200); } };
    const ctx = await (browser.createBrowserContext ? browser.createBrowserContext() : browser.createIncognitoBrowserContext());
    let srv = serve(v1dir); await up();
    let p = await ctx.newPage(); await p.goto(URL2, { waitUntil: "load" }); await p.waitForSelector(".tabbar, .lang-screen");
    const v1 = await p.evaluate(async () => { await navigator.serviceWorker.ready; await new Promise((r) => setTimeout(r, 1000)); return caches.keys(); });
    await p.close(); srv.kill(); await wait(500);
    srv = serve(out); await up();
    p = await ctx.newPage(); await p.goto(URL2, { waitUntil: "load" }); await p.waitForSelector(".tabbar, .lang-screen");
    const after = await p.evaluate(async () => { for (let i = 0; i < 40; i++) { const k = await caches.keys(); if (k.includes("ledger-shell-v2") && !k.includes("ledger-shell-v1")) break; await new Promise((r) => setTimeout(r, 250)); }
      await new Promise((r) => setTimeout(r, 1000)); const out = {}; for (const k of await caches.keys()) out[k] = (await (await caches.open(k)).keys()).map((r) => new URL(r.url).pathname);
      return { caches: out, needs: [...document.querySelectorAll("script[src]")].map((s) => new URL(s.src).pathname) }; });
    await p.close(); srv.kill(); await wait(300);
    const v2files = after.caches["ledger-shell-v2"] || [];
    ok(v1.includes("ledger-shell-v1") && !after.caches["ledger-shell-v1"] && after.needs.every((n) => v2files.includes(n)), "a phone with the old v1 worker: opening the app once online replaces it, and the app's code is now saved", after);
    srv = null;
    const p3 = await ctx.newPage(); const p3log = []; p3.on("requestfailed", (r) => p3log.push("failed " + new URL(r.url()).pathname + " " + (r.failure() || {}).errorText)); p3.on("pageerror", (e) => p3log.push("error " + String(e).slice(0, 120))); p3.on("console", (m) => p3log.push("console " + m.text().slice(0, 120)));
    await p3.setCacheEnabled(false); await p3.setOfflineMode(true);
    await p3.goto(URL2, { waitUntil: "load" }).catch(() => {});
    const p3ok = await p3.waitForSelector(".tabbar, .lang-screen", { timeout: 8000 }).then(() => true).catch(() => false);
    const p3info = await p3.evaluate(() => ({ url: location.href, html: document.documentElement.outerHTML.slice(0, 300), ctrl: !!navigator.serviceWorker.controller })).catch((e) => String(e)); p3info.log = p3log;
    ok(p3ok, "…and then it opens with no network and no server at all", p3info);
    await ctx.close();
  }

  // Run 11: the owner saw the live site keep showing the previous version after a release. A page kept in memory must
  // notice a newer release when it comes back to the screen and offer "Update"; tapping it must load the new version.
  // Local only: the same address serves version A, then a copy renamed to a new version B.
  if (!LIVE) {
    section("PWA-0c. A page left open notices a newer release");
    const vB = fs.mkdtempSync(path.join(os.tmpdir(), "ledger-pwa-B-"));
    fs.cpSync(out, vB, { recursive: true });
    const html = fs.readFileSync(path.join(vB, "index.html"), "utf8"); const oldName = html.match(/\/assets\/(index-[\w-]+\.js)/)[1];
    fs.renameSync(path.join(vB, "assets", oldName), path.join(vB, "assets", "index-NEWRELEASE.js"));
    fs.writeFileSync(path.join(vB, "index.html"), html.replace(oldName, "index-NEWRELEASE.js"));
    const PORT3 = PORT + 2, URL3 = `http://localhost:${PORT3}/`;
    const serve = (dir) => spawn(process.execPath, [vite, "preview", "--outDir", dir, "--port", String(PORT3), "--strictPort"], { cwd: root });
    const up = async () => { for (let i = 0; i < 50; i++) { try { if ((await fetch(URL3)).ok) return; } catch {} await wait(200); } };
    const ctx = await (browser.createBrowserContext ? browser.createBrowserContext() : browser.createIncognitoBrowserContext());
    let srv = serve(out); await up();
    const p = await ctx.newPage(); await p.setViewport({ width: 390, height: 844 });
    await p.evaluateOnNewDocument(() => { if (!localStorage.getItem("expense_ledger_v5")) localStorage.setItem("expense_ledger_v5", JSON.stringify({ language: "en", transactions: [], budgets: {}, templates: [], currency: "₼", goals: [], safeToSpend: { enabled: false, savingsTarget: 0 } })); });
    await p.goto(URL3, { waitUntil: "load" }); await p.waitForSelector(".tabbar"); await wait(4000);   // the first check (3 s) finds nothing new
    const before = await p.evaluate(() => ({ banner: !!document.querySelector(".update-banner"), v: [...document.scripts].map((s) => s.src).find((s) => /index-/.test(s)) }));
    await p.evaluate(() => document.querySelectorAll(".tab-btn")[4].click()); await wait(200);
    const label = await p.evaluate(() => document.querySelector(".app-version")?.innerText || "");
    ok(!before.banner && /^Version [\w-]+$/.test(label) && before.v.includes(label.replace("Version ", "")), "no notice while the site serves the same version; More shows the running version", { before, label });
    srv.kill(); await wait(500); srv = serve(vB); await up(); await wait(22000);   // release B; the check runs at most every 20 s (clear margin)
    const vis = await p.evaluate(async () => { const r = await fetch(`/?v=${Date.now()}`, { cache: "no-store" }); const t = await r.text(); return { state: document.visibilityState, got: (t.match(/index-[\w-]+\.js/) || [""])[0], status: r.status, ctrl: !!navigator.serviceWorker.controller }; }); await p.bringToFront();
    await p.evaluate(() => document.dispatchEvent(new Event("visibilitychange"))); await wait(1500);
    ok(await p.evaluate(() => /new version of the app is ready/.test(document.querySelector(".update-banner")?.innerText || "")), "after a new release, coming back to the app shows 'A new version of the app is ready — Update'", { vis });
    await Promise.all([p.waitForNavigation({ waitUntil: "load" }), p.evaluate(() => document.querySelector(".update-now").click())]); await p.waitForSelector(".tabbar");
    const now = await p.evaluate(() => ({ v: [...document.scripts].map((s) => s.src).find((s) => /index-/.test(s)), banner: !!document.querySelector(".update-banner") }));
    ok(/index-NEWRELEASE\.js$/.test(now.v) && !now.banner, "tapping Update loads the new version (and the notice is gone)", now);
    srv.kill(); await ctx.close();
  }

  section("PWA-1. Manifest and service worker of the built app");
  const page = await browser.newPage(); await page.setViewport({ width: 390, height: 844 });
  page.errors = []; page.on("pageerror", (e) => page.errors.push(String(e)));
  // a returning user's saved data (synthetic), English chosen
  await page.evaluateOnNewDocument((k) => { if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify({ language: "en", transactions: [{ id: 1, type: "expense", amount: 12.34, category: "food", merchant: "Offlinecafe", date: new Date().toISOString().slice(0, 10), recurring: false, recurFreq: null, isActive: true }], budgets: {}, templates: [], currency: "₼", goals: [], safeToSpend: { enabled: false, savingsTarget: 0 } })); }, KEY);
  await page.goto(URL0, { waitUntil: "load" }); await page.waitForSelector(".tabbar");
  const man = await page.evaluate(async () => { const l = document.querySelector('link[rel="manifest"]'); const r = await fetch(l.href); const j = await r.json(); return { href: l.getAttribute("href"), ok: r.ok, name: j.name, bg: j.background_color, display: j.display, icons: j.icons.length }; });
  ok(man.ok && man.href === "/manifest.webmanifest" && man.name === "Expense Ledger" && man.bg === "#07151A" && man.display === "standalone" && man.icons === 2, "the page links a working manifest with the dark colours, standalone display and two icons", man);
  const sw = await page.evaluate(async () => { const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), 8000))]); return { active: !!(reg && reg.active), scope: reg && reg.scope }; });
  ok(sw.active, "the service worker is installed and active", sw);
  await page.reload({ waitUntil: "load" }); await page.waitForSelector(".tabbar");
  ok(await page.evaluate(() => !!navigator.serviceWorker.controller), "after one reload the page is served through it");
  section("PWA-2. With no network");
  await page.setOfflineMode(true);
  await page.reload({ waitUntil: "load" }).catch(() => {});
  const off = await page.waitForSelector(".tabbar", { timeout: 8000 }).then(() => true).catch(() => false);
  ok(off, "the app opens with the network switched off");
  ok(off && /Offlinecafe/.test(await page.evaluate(() => document.body.innerText)), "…and shows the saved data (Offlinecafe 12.34)");
  const stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).transactions.length, KEY);
  ok(stored === 1, "the saved data is untouched (the worker never reads or writes it)");
  const caches0 = await page.evaluate(async () => { const keys = await caches.keys(); const c = await caches.open(keys[0]); return { keys, n: (await c.keys()).map((r) => new URL(r.url).pathname) }; });
  ok(caches0.keys.length === 1 && caches0.n.every((p) => p === "/" || p.startsWith("/assets/") || /^\/(manifest\.webmanifest|icon-\d+\.png)$/.test(p)), "only the app's own files are cached (no data, no other sites)", caches0);
  await page.setOfflineMode(false);
  ok(page.errors.length === 0, "no JavaScript errors", page.errors[0]);
} finally { stop(); }
await finish("pwa-offline", browser);
