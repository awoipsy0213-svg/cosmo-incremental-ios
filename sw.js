/* Versioned, scope-specific cache. Does not delete saves or another app's cache. */
const VERSION = "3.50.0-time-residue";
const UI_REVISION = "-engraving-v342-grade-v343-existence-v344-balance-v351-balance-v352-save-v353-unlock-v354-pwa-v3541-ux-v355-guide-hud-v3551-worlds-v356-comfort-v356-time-integrity-v3561-automation-compact-v3562-campaign-v357-obsidian-v358-density-pacing-shards-theme-v359";
const APP_RELEASE = "3.59";
const PREFIX = "kotowari-handoff:" + new URL(self.registration.scope).pathname + ":";
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
  "ux-polish-v355.css",
  "ux-polish-v355.mjs",
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
  "legacy/style.css",
  "compact-economy-v357.mjs",
  "compact-campaign-v357.mjs",
  "compact-campaign-ui-v357.mjs"
];
const URLS = RELATIVE.map(path => new URL(path, self.registration.scope).href);
// The core game must always be cached as one coherent version. Older archived
// content and icons are helpful offline, but their absence must not prevent a
// GitHub Pages update when an iPhone upload missed a subfolder.
const CORE_FILES = [
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
  "ux-polish-v355.css",
  "ux-polish-v355.mjs",
  "engraving-v342.css",
  "engraving-v342.mjs",
  "engraving-v342-ui.mjs",
  "time-confirmed-v4.mjs",
  "universe-confirmed-v4.mjs",
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
  "RESEARCH_V35.md",
  "content.mjs",
  "balance-config.mjs",
  "numbers.mjs",
  "setsuna-engine.mjs",
  "setsuna-rules-v39.mjs",
  "game.mjs",
  "save.mjs",
  "app.mjs",
  "manifest.webmanifest",
  "compact-economy-v357.mjs",
  "compact-campaign-v357.mjs",
  "compact-campaign-ui-v357.mjs"
];
// Build-time git blob IDs for the exact text assets. SHA-1 is used only
// for coherence with the checked-out Git tree, not as a trust signature.
// Regenerate with scripts/pwa-integrity.mjs --write after changing core files.
const CORE_HASHES = [
  "dd471e3fb813750388442cd935de812e6aba8ea0",
  "fa06847001eeeb5e8d0a272eef073fb4a3516454",
  "ca7a7a642f7385b502be1608d03c1d56c048890c",
  "ab5d561ffe0c982877ef7f8840564bd7d7e73a2a",
  "6fd386350e94a23fa31a12b3aad3559595331330",
  "4869eb5881db019079fa95e2c804a599e0cf9cd2",
  "2129a4ed013be11e09c6ebbd153ad45ad0ae9502",
  "f653b00c1240e985707a76adafbc392eb8df7977",
  "60d34b61eb6ebc47c6bc34d5cde4ecf87b25b85f",
  "229580d48577e6e7a7d1876ee4888fb354d7ae2d",
  "d2b483407b04b1a58cbe1d52050c68a45f128505",
  "e98badb9478fce2c336f5662913181c0ea2c1b70",
  "35d34cf0133c6b6b78aee4920bc16bdb44bcaf27",
  "89b909259865409b2f287545941964885279c99f",
  "86c06043050725c90ecb8f29c7dd129cb311fa5f",
  "af175eb6056023a81101196dbac0bccac65f1f47",
  "3a7a820cfb21166490310f9d61bc33641d67584f",
  "b1a16b1526a83cde8be719a9d9095825a2aea00f",
  "8cc8a30456d59ccd18b1cc0810e92dbf2979aedb",
  "8412985f3d8a7f1992df6d43f0ef983eea10e6fa",
  "ed0c5c3a0a5607332d5ea7a208052a419e149213",
  "8158a7a10b57ab2e5b4f8df9718baa2b88c96e6d",
  "13fc01c6f1cace5462f314f4d019425fdc636d55",
  "a1dc2f7feabecf2048b6595d65f437d1531ca426",
  "d923f8545b5be8051acc228b66458dbc94daabc4",
  "68dbc362661c4ec0cd44cb33d0a1ec8dffc76d61",
  "2324eeffbb5540af32599cac7aade5226bb4360d",
  "0e7b0d417f264104cb88971bd1443f0d0f27b156",
  "9e18a8e1a44391c091b22ec66d4186848b28f155",
  "ac3e4ed25852786599f0ddfe8f2a96fa1caef146",
  "fac0eefec1087505577fdd416900d46c35a96fa8",
  "6c55454e01d4cc503d4d7c6e3d919b9a543e9eb9",
  "0d0a98c52ac553aab6910a53b2fcc3a753afa487",
  "1fcdb390a048ec5388b11d3f7c04f23218665816",
  "fa17fe351f1c58ba6a83a1f92aaaf1c74293bf4e",
  "70996fb814a4bfc7e23665de69794b430ad78d3b",
  "79aef34e8082662cc8863ad2f59f26eaa6ea107c",
  "31e35f97f907f7e8104100fb99d64053b2b4eea3",
  "56ac3593a8f97d14ff0a0d6c411759be88462642",
  "8a425c89656582c1558169bb3ca1825878f6d715",
  "b0f57c72a1138370fc3b816ab7ca2b3b05069ca4",
  "d9941f8ef3570618aa72b25f018f7970a67b1141",
  "efde0525da1a3c30b4dc15037beb7b4d78de6589",
  "a31fabd7b98170cbee8e9eaab007c7112454d2c5",
  "d74e3b2c762bc9818ae617a52f799fd677c834f4",
  "30f6626cc056810975070bea1a77569affca700c",
  "dd875322173ecb2366b1dfea2d87ae2d10999e36",
  "8aa6fa10585eeef679312fd5f8486b9deb52f43a",
  "fd89d92659ebf1a578a5cb97430bca4576767d07"
];
const CORE_BLOBS=Object.fromEntries(CORE_FILES.map((path,i)=>[path,CORE_HASHES[i]]));
// Separate cache namespaces even when a future maintainer regenerates the
// core hashes without changing the human-facing release number.
const coreFingerprint=Object.values(CORE_BLOBS).join("").split("").reduce(
  (h,x)=>BigInt.asUintN(64,(h^BigInt(x.charCodeAt(0)))*1099511628211n),14695981039346656037n
).toString(16);
const CACHE=PREFIX+VERSION+UI_REVISION+":"+coreFingerprint;
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
      event.respondWith(caches.open(CACHE).then(async c=>{
        const targetURL=new URL(target,scope).href;
        const cached=await c.match(targetURL);
        if(cached)return cached;
        if(target!=="index.html")return fetch(request);
        const response=await fetch(new Request(targetURL,{cache:"reload"}));
        if(!await matchesCore(target,response))return new Response("Release verification failed. Open update.html while online.",{status:503});
        await c.put(targetURL,response.clone());return response;
      }));
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
