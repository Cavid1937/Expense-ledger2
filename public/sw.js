// Expense Ledger service worker. Purpose: the installed app opens and works with no connection.
// It caches only this site's own files. It never reads, stores or sends ledger data — that stays in the page's localStorage.
// Pages (navigation): network first, so a new version is used as soon as it is online; the cached copy when offline.
// Built files under /assets/ have content hashes in their names and never change: cache first.
//
// v2 (Run 10 hotfix, 2026-10-27): v1 saved only the page, not the app's code file (/assets/index-….js), because that file
// was downloaded before the worker started. Offline the page then opened without its code: a blank screen on the owner's
// installed app. Now the worker reads the page and saves every /assets/ file it names — when it installs, and again each
// time the page is loaded online — so the code is always saved together with the page that needs it.
const CACHE = "ledger-shell-v2";
const SHELL = ["/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

// The /assets/ files a page needs (its script, stylesheets, preloads), read from the page's HTML.
const assetsOf = (html) => [...new Set((html.match(/\/assets\/[^"'\s>)]+/g) || []))];

// Save the page as "/" and every asset it names. Throws if any of them can't be fetched, so a half-saved app is never used.
async function savePage(cache, res) {
  const html = await res.clone().text();
  const assets = assetsOf(html);
  await Promise.all(assets.map(async (a) => { if (!(await cache.match(a, { ignoreVary: true }))) { const r = await fetch(a, { cache: "reload" }); if (!r.ok) throw new Error(a); await cache.put(a, r); } }));
  await cache.put("/", res);
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
      if (res.ok) e.waitUntil(caches.open(CACHE).then((c) => savePage(c, res.clone())).catch(() => {}));
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
