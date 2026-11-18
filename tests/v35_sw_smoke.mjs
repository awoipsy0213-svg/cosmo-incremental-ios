import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const code=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const base='https://example.test/cosmo-incremental-ios/';
const all=new Map();
const registrations=new Map();
let checks=0;
const cacheFactory=()=>({
  stored:new Map(),
  async addAll(urls){for(const u of urls){assert.ok(u.startsWith(base));this.stored.set(u,{response:u})}},
  async match(u){return this.stored.get(u)}
});
const caches={
  async open(k){if(!all.has(k))all.set(k,cacheFactory());return all.get(k)},
  async keys(){return [...all.keys()]},
  async delete(k){return all.delete(k)}
};
const self={registration:{scope:base},addEventListener:(name,fn)=>{registrations.set(name,fn)},skipWaiting(){},clients:{claim:async()=>{}}};
vm.runInNewContext(code,{self,URL,caches,fetch:async u=>({fetched:u}),console});
for(const k of ['install','activate','fetch','message']){assert.ok(registrations.has(k));checks++}
const prefix='kotowari-handoff:/cosmo-incremental-ios/:';
all.set(prefix+'old',cacheFactory());all.set('other-app-cache',cacheFactory());
const run=(type,attrs={})=>{let p;registrations.get(type)({...attrs,waitUntil:v=>{p=v},respondWith:v=>{p=v}});return p};
await run('install');
const cache=await caches.open(prefix+'3.5.0-research-proposals');
for(const path of ['index.html','game.mjs','app.mjs','design-proposals.mjs','RESEARCH_V35.md','sw.js']){
 if(path==='sw.js')continue;
 assert.ok(await cache.match(new URL(path,base).href),'Missing '+path);checks++
}
await run('activate');checks++;assert.ok(!all.has(prefix+'old'));checks++;assert.ok(all.has('other-app-cache'));checks++;
const response=await run('fetch',{request:{method:'GET',url:base,mode:'navigate'}});
assert.ok(response?.response?.endsWith('index.html'));checks++;
console.log(`PASS ${checks} SW cache installation/isolation/offline navigation mock checks`);
