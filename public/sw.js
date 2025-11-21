// Basic PWA shell cache (v1)
const CACHE_NAME = "indigo-shell-v1";
const SHELL = ["/", "/index.html", "/manifest.webmanifest"];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Bypass Supabase auth endpoints and non-GET
  if (event.request.method !== "GET" || /supabase\.(co|in)/.test(url.host)) return;
  // Cache-first for same-origin static, network-first for others
  if (url.origin === self.location.origin) {
    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
  } else {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
  }
});
