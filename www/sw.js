/* Versioned, scope-specific cache. Does not delete saves or another app's cache. */
const VERSION = "3.40.0-source-milestones";
const UI_REVISION = "-engraving-v342-grade-v343";
const PREFIX = "kotowari-handoff:" + new URL(self.registration.scope).pathname + ":";
const CACHE = PREFIX + VERSION + UI_REVISION;
const RELATIVE = [
  "index.html",
  "organic-original.css",
  "mobile.css",
  "neon-theme.css",
  "live-ui.css",
  "astral-observatory.css",
  "stage-worlds.css",
  "matrix-v324.css",
  "luminous-glass-v332.css",
  "fixed-layout-v333.css",
  "automation-center-v336.css",
  "purchase-row-v338.css",
  "purchase-preview-v338.mjs",
  "purchase-clarity-v339.mjs",
  "purchase-clarity-v339.css",
  "time-hex-v341.css",
  "time-hex-v341.mjs",
  "engraving-v342.css",
  "engraving-v342.mjs",
  "engraving-v342-ui.mjs",
  "time-confirmed-v4.mjs",
  "universe-confirmed-v4.mjs",
  "universe-progression-v316.mjs",
  "universe-interference-v318.mjs",
  "telemetry-v319.mjs",
  "engraving-rules-v317.mjs",
  "engraving-effects-v333.mjs",
  "purchase-insights.mjs",
  "moment-filter.mjs",
  "price-lab.mjs",
  "design-proposals.mjs",
  "RESEARCH_V35.md",
  "BALANCE_V36.md",
  "content.mjs",
  "balance-config.mjs",
  "numbers.mjs",
  "setsuna-engine.mjs",
  "setsuna-rules-v39.mjs",
  "source-effects-v315.mjs",
  "game.mjs",
  "save.mjs",
  "app.mjs",
  "manifest.webmanifest",
  "privacy.html",
  "neon-icon-192.png",
  "neon-icon-512.png",
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
// The core game must always be cached as one coherent version. Older archived
// content and icons are helpful offline, but their absence must not prevent a
// GitHub Pages update when an iPhone upload missed a subfolder.
const CORE_FILES = [
  "index.html", "organic-original.css", "mobile.css", "neon-theme.css", "live-ui.css", "astral-observatory.css", "stage-worlds.css", "matrix-v324.css",
  "luminous-glass-v332.css",
  "fixed-layout-v333.css",
  "automation-center-v336.css",
  "purchase-row-v338.css",
  "purchase-preview-v338.mjs",
  "purchase-clarity-v339.mjs",
  "purchase-clarity-v339.css",
  "time-hex-v341.css",
  "time-hex-v341.mjs",
  "engraving-v342.css",
  "engraving-v342.mjs",
  "engraving-v342-ui.mjs",
  "time-confirmed-v4.mjs", "universe-confirmed-v4.mjs",
  "universe-progression-v316.mjs",
  "universe-interference-v318.mjs",
  "telemetry-v319.mjs",
  "source-effects-v315.mjs",
  "engraving-rules-v317.mjs",
  "engraving-effects-v333.mjs",
  "purchase-insights.mjs",
  "moment-filter.mjs",
  "price-lab.mjs",
  "design-proposals.mjs",
  "RESEARCH_V35.md", "content.mjs", "balance-config.mjs", "numbers.mjs", "setsuna-engine.mjs", "setsuna-rules-v39.mjs", "game.mjs",
  "save.mjs", "app.mjs", "manifest.webmanifest"
];
const CORE_URLS = CORE_FILES.map(path => new URL(path, self.registration.scope).href);
const OPTIONAL_URLS = URLS.filter(url => !CORE_URLS.includes(url));
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(async cache => {
    await cache.addAll(CORE_URLS);
    await Promise.all(OPTIONAL_URLS.map(url => cache.addAll([url]).catch(() => {})));
  }));
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
