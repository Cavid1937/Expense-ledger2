import { launch } from "../browser/lib.mjs";
const URL0 = process.env.LIVE_URL || "https://expense-ledger2.vercel.app/";
const browser = await launch();
const ctx = await (browser.createBrowserContext ? browser.createBrowserContext() : browser.createIncognitoBrowserContext());
const p = await ctx.newPage(); await p.setViewport({ width: 390, height: 844 });
await p.goto(URL0, { waitUntil: "load" });
const info = await p.evaluate(async () => {
  const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), 8000))]);
  await new Promise((r) => setTimeout(r, 1500));
  const keys = await caches.keys(); const out = {};
  for (const k of keys) out[k] = (await (await caches.open(k)).keys()).map((r) => new URL(r.url).pathname);
  return { controlled: !!navigator.serviceWorker.controller, active: !!(reg && reg.active), caches: out, scripts: [...document.scripts].map((s) => s.src) };
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
