/* Versioned, scope-specific cache. Does not delete saves or another app's cache. */
const VERSION = "3.50.0-time-residue";
const UI_REVISION = "-engraving-v342-grade-v343-existence-v344-balance-v351-balance-v352-save-v353-unlock-v354-pwa-v3541";
const APP_RELEASE = "3.54.1";
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
  "time-growth-v350.mjs",
  "time-growth-v350.css",
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
  "time-growth-v350.mjs",
  "time-growth-v350.css",
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
// Build-time git blob IDs for the exact text assets. SHA-1 is used only
// for coherence with the checked-out Git tree, not as a trust signature.
// Regenerate with scripts/pwa-integrity.mjs --write after changing core files.
const CORE_BLOBS = {
  "index.html":"d3d5f3a4548e7a86c3ecaa6dbe4e3e530279e727",
  "organic-original.css":"fa06847001eeeb5e8d0a272eef073fb4a3516454",
  "mobile.css":"ca7a7a642f7385b502be1608d03c1d56c048890c",
  "neon-theme.css":"ab5d561ffe0c982877ef7f8840564bd7d7e73a2a",
  "live-ui.css":"6fd386350e94a23fa31a12b3aad3559595331330",
  "astral-observatory.css":"4869eb5881db019079fa95e2c804a599e0cf9cd2",
  "stage-worlds.css":"2129a4ed013be11e09c6ebbd153ad45ad0ae9502",
  "matrix-v324.css":"f653b00c1240e985707a76adafbc392eb8df7977",
  "luminous-glass-v332.css":"60d34b61eb6ebc47c6bc34d5cde4ecf87b25b85f",
  "fixed-layout-v333.css":"229580d48577e6e7a7d1876ee4888fb354d7ae2d",
  "automation-center-v336.css":"25ec89c9ca96b8fc58881c40d65cabbef3d6fa9f",
  "purchase-row-v338.css":"e98badb9478fce2c336f5662913181c0ea2c1b70",
  "purchase-preview-v338.mjs":"35d34cf0133c6b6b78aee4920bc16bdb44bcaf27",
  "purchase-clarity-v339.mjs":"89b909259865409b2f287545941964885279c99f",
  "purchase-clarity-v339.css":"86c06043050725c90ecb8f29c7dd129cb311fa5f",
  "time-hex-v341.css":"af175eb6056023a81101196dbac0bccac65f1f47",
  "time-hex-v341.mjs":"4b257296b4f4110f3e414116d4a6113ad34dd065",
  "time-growth-v350.mjs":"c22066cbe976fe9d6333dc9e0f7e788d9a4f7f3a",
  "time-growth-v350.css":"8cc8a30456d59ccd18b1cc0810e92dbf2979aedb",
  "engraving-v342.css":"8158a7a10b57ab2e5b4f8df9718baa2b88c96e6d",
  "engraving-v342.mjs":"13fc01c6f1cace5462f314f4d019425fdc636d55",
  "engraving-v342-ui.mjs":"06850fdd290db8f3170c36d5cc45b649b4782756",
  "time-confirmed-v4.mjs":"d923f8545b5be8051acc228b66458dbc94daabc4",
  "universe-confirmed-v4.mjs":"68dbc362661c4ec0cd44cb33d0a1ec8dffc76d61",
  "universe-progression-v316.mjs":"2324eeffbb5540af32599cac7aade5226bb4360d",
  "universe-interference-v318.mjs":"0e7b0d417f264104cb88971bd1443f0d0f27b156",
  "telemetry-v319.mjs":"9e18a8e1a44391c091b22ec66d4186848b28f155",
  "source-effects-v315.mjs":"ac3e4ed25852786599f0ddfe8f2a96fa1caef146",
  "engraving-rules-v317.mjs":"fac0eefec1087505577fdd416900d46c35a96fa8",
  "engraving-effects-v333.mjs":"6c55454e01d4cc503d4d7c6e3d919b9a543e9eb9",
  "purchase-insights.mjs":"0d0a98c52ac553aab6910a53b2fcc3a753afa487",
  "moment-filter.mjs":"1fcdb390a048ec5388b11d3f7c04f23218665816",
  "price-lab.mjs":"fa17fe351f1c58ba6a83a1f92aaaf1c74293bf4e",
  "design-proposals.mjs":"70996fb814a4bfc7e23665de69794b430ad78d3b",
  "RESEARCH_V35.md":"79aef34e8082662cc8863ad2f59f26eaa6ea107c",
  "content.mjs":"31e35f97f907f7e8104100fb99d64053b2b4eea3",
  "balance-config.mjs":"de52a563c08e24c894845c1ba73820ba2c8e1d57",
  "numbers.mjs":"048d352eb031c420d289dff6bfdd66400c16dff0",
  "setsuna-engine.mjs":"b0f57c72a1138370fc3b816ab7ca2b3b05069ca4",
  "setsuna-rules-v39.mjs":"d9941f8ef3570618aa72b25f018f7970a67b1141",
  "game.mjs":"f03ff19145c488e7f65fe695513461e4c60e09fe",
  "save.mjs":"cdded330240c0e3753a2065af8a9a7bee3ac7c72",
  "app.mjs":"df0c008edd03791ff00f3e009425fd5718c678a4",
  "manifest.webmanifest":"30f6626cc056810975070bea1a77569affca700c"
};
async function matchesCore(path,response){
  if(!response||!response.ok)return false;
  const bytes=new Uint8Array(await response.clone().arrayBuffer());
  const header=new TextEncoder().encode("blob "+bytes.byteLength+"\0");
  const input=new Uint8Array(header.length+bytes.length);input.set(header);input.set(bytes,header.length);
  const hash=new Uint8Array(await crypto.subtle.digest("SHA-1",input));
  return Array.from(hash,x=>x.toString(16).padStart(2,"0")).join("")===CORE_BLOBS[path];
}
const CORE_URLS = CORE_FILES.map(path => new URL(path, self.registration.scope).href);
const OPTIONAL_URLS = URLS.filter(url => !CORE_URLS.includes(url));
self.addEventListener("install",event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    try{
      // Bypass stale browser HTTP cache. A CDN serving any old core asset
      // must fail installation; never activate a mixed release.
      await cache.addAll(CORE_URLS.map(url=>new Request(url,{cache:"reload"})));
      for(const path of CORE_FILES){
        const url=new URL(path,self.registration.scope).href;
        if(!await matchesCore(path,await cache.match(url)))throw Error("Mixed release: "+path);
      }
      await Promise.all(OPTIONAL_URLS.map(url=>cache.addAll([url]).catch(()=>{})));
    }catch(error){
      await caches.delete(CACHE);throw error;
    }
  })());
});
self.addEventListener("message",event=>{
  const type=event.data?.type,port=event.ports?.[0];
  if(type==="GET_RELEASE"){port?.postMessage({release:APP_RELEASE});return;}
  if(type==="SKIP_WAITING"){event.waitUntil(self.skipWaiting());return;}
  if(type==="ACTIVATE_RELEASE"){
    event.waitUntil((async()=>{
      const scope=new URL(self.registration.scope),source=event.source;
      const updateURL=new URL("update.html",scope);
      if(!source?.url||new URL(source.url).pathname!==updateURL.pathname){
        port?.postMessage({ok:false,reason:"更新確認ページから操作してください。"});return;
      }
      const clients=await self.clients.matchAll({type:"window",includeUncontrolled:true});
      const gameOpen=clients.some(client=>{
        const u=new URL(client.url);
        return client.id!==source.id&&u.origin===scope.origin&&u.pathname.startsWith(scope.pathname)&&u.pathname!==updateURL.pathname;
      });
      if(gameOpen){port?.postMessage({ok:false,reason:"別のゲーム画面が開いています。保存して閉じてから再試行してください。"});return;}
      port?.postMessage({ok:true});
      await self.skipWaiting();
    })());
  }
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
        (await c.match(new URL(target,scope).href))||(target==="index.html"?new Response("Release cache unavailable. Open update.html while online.",{status:503}):fetch(request))));
      return;
    }
  }
  if(!URLS.includes(url.href))return;
  const path=url.pathname.slice(scope.pathname.length);
  event.respondWith(caches.open(CACHE).then(async c=>{
    const cached=await c.match(url.href);
    if(cached)return cached;
    if(!CORE_FILES.includes(path))return fetch(request);
    const response=await fetch(new Request(url.href,{cache:"reload"}));
    if(!await matchesCore(path,response))return new Response("Release verification failed",{status:503});
    await c.put(url.href,response.clone());return response;
  }));
});
