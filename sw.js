// skeb-finder service worker (v9)
const VER = "v9";
const SHELL = "skeb-shell-" + VER;
self.addEventListener("install", (e) => { self.skipWaiting(); });
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith("skeb-shell-") && k !== SHELL).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;  // 外部(GAS等)はSWを通さない＝共有お気に入りは常に最新
  // data.json は常に network-first（鮮度優先）。シェルは stale-while-revalidate。
  if (url.pathname.endsWith("/data.json")) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  if (e.request.method !== "GET") return;
  e.respondWith((async () => {
    const cache = await caches.open(SHELL);
    const cached = await cache.match(e.request);
    const net = fetch(e.request).then(r => { if (r && r.ok) cache.put(e.request, r.clone()); return r; }).catch(() => null);
    return cached || (await net) || new Response("offline", { status: 503 });
  })());
});
