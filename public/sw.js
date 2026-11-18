// Expense Ledger service worker. Purpose: the installed app opens and works with no connection.
// It caches only this site's own files. It never reads, stores or sends ledger data — that stays in the page's localStorage.
// Pages (navigation): network first, so a new version is used as soon as it is online; the cached copy when offline.
// Built files under /assets/ have content hashes in their names and never change: cache first.
//
// v2 (Run 10 hotfix, 2026-10-27): v1 saved only the page, not the app's code file (/assets/index-….js), because that file
// was downloaded before the worker started. Offline the page then opened without its code: a blank screen on the owner's
// installed app. Now the worker reads the page and saves every /assets/ file it names — when it installs, and again each
// time the page is loaded online — so the code is always saved together with the page that needs it.
const CACHE = "ledger-shell-v3";   // v3 (Run 20): new app icons; the icons are cached first, so the old name would keep showing the old ones
const SHELL = ["/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/icon-maskable-512.png", "/apple-touch-icon.png", "/icon.svg", "/fonts/onest-latin.woff2", "/fonts/onest-latin-ext.woff2", "/fonts/onest-cyrillic.woff2"];   // Run 25: the app's font, saved with the shell so it also works offline

// The /assets/ files a page needs (its script, stylesheets, preloads), read from the page's HTML.
const assetsOf = (html) => [...new Set((html.match(/\/assets\/[^"'\s>)]+/g) || []))];

// Save the page as "/" and every asset it names. Throws if any of them can't be fetched, so a half-saved app is never used.
async function savePage(cache, res) {
  const html = await res.clone().text();
  const assets = assetsOf(html);
  await Promise.all(assets.map(async (a) => { if (!(await cache.match(a, { ignoreVary: true }))) { const r = await fetch(a, { cache: "reload" }); if (!r.ok) throw new Error(a); await cache.put(a, r); } }));
  await cache.put("/", res);
  await prune(cache, assets).catch(() => {});
}

// Run 108: once a new release is saved, files of older releases are removed (before, every release added ~3 MB that never went away).
// Kept: every /assets/ file the page names, plus every file those name in turn (the PDF reader is loaded later by name from the app's
// code), so nothing the current app can ask for is removed. Reads the app's code only when the store holds files the page does not name.
async function prune(cache, roots) {
  const all = new Map((await cache.keys()).map((r) => [new URL(r.url).pathname, r]).filter(([p]) => p.startsWith("/assets/")));
  if ([...all.keys()].every((p) => roots.includes(p))) return;
  const keep = new Set(), todo = [...roots];
  while (todo.length) {
    const p = todo.pop(); if (keep.has(p)) continue; keep.add(p);
    if (!/\.(js|css)$/.test(p)) continue;
    const hit = await cache.match(p, { ignoreVary: true }); if (!hit) continue;
    const text = await hit.text();
    for (const q of all.keys()) if (!keep.has(q) && text.includes(q.slice(q.lastIndexOf("/") + 1))) todo.push(q);
  }
  await Promise.all([...all].filter(([p]) => !keep.has(p)).map(([, r]) => cache.delete(r)));
}

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL);
    const page = await fetch("/", { cache: "reload" });
    if (!page.ok) throw new Error("page " + page.status);
    await savePage(cache, page);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;            // other sites are never cached
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((res) => {
      // Run 73: only the app's own start page is kept for offline use; other pages on the site (privacy.html, app-open.html) are never saved over it
      const p = new URL(req.url).pathname;
      // Run 108: the copy is made now, before the page reads the answer. Made later (as before), it always failed with "body already
      // used", so the saved start page was only ever the one from the worker's install and offline could open an older release.
      if (res.ok && (p === "/" || p === "/index.html")) { const copy = res.clone(); e.waitUntil(caches.open(CACHE).then((c) => savePage(c, copy)).catch(() => {})); }
      return res;
    }).catch(async () => (await caches.match("/", { ignoreVary: true })) || Response.error()));
    return;
  }
  // ignoreVary: a saved file must be found even if the server marked it "Vary: Origin" (the page asks for its module script
  // with an Origin header the worker's own download did not send). Every saved file has a fixed name and fixed content.
  e.respondWith(caches.match(req, { ignoreVary: true }).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok && (url.pathname.startsWith("/assets/") || SHELL.includes(url.pathname))) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  })));
});
