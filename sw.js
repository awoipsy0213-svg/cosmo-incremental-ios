/* Versioned, scope-specific cache. Does not delete saves or another app's cache. */
const VERSION = "3.1.0-handoff";
const PREFIX = "kotowari-handoff:" + new URL(self.registration.scope).pathname + ":";
const CACHE = PREFIX + VERSION;
const RELATIVE = [
  "index.html",
  "organic-original.css",
  "mobile.css",
  "content.mjs",
  "balance-config.mjs",
  "numbers.mjs",
  "game.mjs",
  "save.mjs",
  "app.mjs",
  "manifest.webmanifest",
  "privacy.html",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "docs/implementation.html",
  "legacy/game-config.js",
  "legacy/game-engine.js",
  "legacy/game-ops.js",
  "legacy/icons/icon-192.png",
  "legacy/icons/icon-512.png",
  "legacy/index.html",
  "legacy/kotowari-data.js",
  "legacy/kotowari-spec.json",
  "legacy/kotowari-static.js",
  "legacy/manifest.webmanifest",
  "legacy/privacy.html",
  "legacy/script.js",
  "legacy/style.css"
];
const URLS = RELATIVE.map(path => new URL(path, self.registration.scope).href);
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(URLS)));
  // For updates, activation is explicitly approved after saving in the app.
});
self.addEventListener("message", event => {
  if(event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", event => {
  const request=event.request;
  if(request.method!=="GET")return;
  const url=new URL(request.url),scope=new URL(self.registration.scope);
  if(url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
  url.search="";url.hash="";
  if(request.mode==="navigate"){
    const relative=url.pathname.slice(scope.pathname.length);
    const target=relative===""||relative==="index.html"?"index.html":
      relative==="legacy/"||relative==="legacy"?"legacy/index.html":null;
    if(target){
      event.respondWith(caches.open(CACHE).then(async c=>
        (await c.match(new URL(target,scope).href))||fetch(request)));
      return;
    }
  }
  if(!URLS.includes(url.href))return;
  event.respondWith(caches.open(CACHE).then(async c=>(await c.match(url.href))||fetch(request)));
});
