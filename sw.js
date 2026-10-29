const CACHE = "srm-site";
const FILES = ["./", "index.html", "manifest.webmanifest", "icon-180.png", "icon-512.png"];
const fresh = f => fetch(new Request(f, { cache: "reload" })).then(r => { if (!r.ok) throw new Error(f + ": " + r.status); return r; });
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(async c => {
    for (const f of FILES) if (!(await c.match(f))) await c.put(f, await fresh(f));
  }).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("message", e => {
  if (!e.data || e.data.type !== "update") return;
  const reply = r => { if (e.ports && e.ports[0]) e.ports[0].postMessage(r); };
  e.waitUntil(Promise.all(FILES.map(fresh)).then(async rs => {
    const c = await caches.open(CACHE);
    await Promise.all(rs.map((r, i) => c.put(FILES[i], r)));
    reply({ ok: true });
  }).catch(err => reply({ ok: false, error: String(err) })));
});
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (u.origin !== self.location.origin || e.request.method !== "GET") return;
  if (u.pathname.endsWith("/version.json")) return;                  // always from the website
  e.respondWith(caches.open(CACHE).then(async c => {
    const kept = await c.match(e.request, { ignoreSearch: true });
    if (kept) return kept;
    const r = await fetch(e.request).catch(() => null);
    return r || (await c.match("index.html")) || Response.error();
  }));
});
