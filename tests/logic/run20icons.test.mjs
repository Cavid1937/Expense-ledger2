// Run 20: the app icons. Checks the files themselves, not how they look (that was inspected by eye): the manifest only names files that exist,
// each PNG really has the size the manifest claims, a maskable icon exists, the page links the favicon and apple icon, and the offline cache lists them.
import fs from "fs"; import path from "path";
import { ok, section, finish } from "./lib.mjs";
const root = path.dirname(process.env.CANDIDATE), pub = (f) => path.join(root, "public", f);
const png = (f) => { const b = fs.readFileSync(pub(f)); return b.subarray(0, 8).toString("hex") === "89504e470d0a1a0a" ? { w: b.readUInt32BE(16), h: b.readUInt32BE(20) } : null; };
const mf = JSON.parse(fs.readFileSync(pub("manifest.webmanifest"), "utf8"));
section("R20-I1. Manifest and files");
ok(mf.icons.every((i) => fs.existsSync(pub(i.src.replace(/^\//, "")))), "every icon the manifest names exists");
ok(mf.icons.every((i) => { const p = png(i.src.replace(/^\//, "")); return p && i.sizes === `${p.w}x${p.h}`; }), "each PNG really has the size the manifest states");
ok(mf.icons.some((i) => i.purpose === "maskable" && i.sizes === "512x512") && mf.icons.some((i) => i.purpose === "any" && i.sizes === "192x192") && mf.icons.some((i) => i.purpose === "any" && i.sizes === "512x512"), "any 192, any 512 and a maskable 512 are offered");
const at = png("apple-touch-icon.png"); ok(at && at.w === 180 && at.h === 180, "the iPhone home-screen icon is 180x180");
section("R20-I2. Page and offline cache");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8"), sw = fs.readFileSync(pub("sw.js"), "utf8");
ok(/rel="icon"[^>]*icon\.svg/.test(html) && /rel="apple-touch-icon"[^>]*apple-touch-icon\.png/.test(html), "the page links the favicon and the apple icon");
ok(["icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png", "icon.svg"].every((f) => sw.includes("/" + f)), "the offline cache lists every icon");
ok(!/ledger-shell-v2"/.test(sw) && /ledger-shell-v3/.test(sw), "the cache name was changed so phones that already installed the app fetch the new icons");
finish("run20icons");
