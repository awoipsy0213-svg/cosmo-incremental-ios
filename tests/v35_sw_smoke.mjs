import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const code=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const base='https://example.test/cosmo-incremental-ios/';
const all=new Map(),registrations=new Map();
let checks=0,stale=false;
const responseFor=u=>{
  const path=new URL(u).pathname.slice(new URL(base).pathname.length);
  if(stale&&path==='balance-config.mjs')return new Response('old config');
  try{return new Response(fs.readFileSync(new URL('../'+path,import.meta.url)))}
  catch{return new Response('',{status:404})}
};
const cacheFactory=()=>({
  stored:new Map(),
  async addAll(urls){
    const entries=urls.map(input=>{
      const u=typeof input==='string'?input:input.url;
      assert.ok(u.startsWith(base));const response=responseFor(u);
      if(!response.ok)throw Error('missing '+u);
      return [u,response];
    });
    for(const [u,response] of entries)this.stored.set(u,response);
  },
  async match(u){return this.stored.get(typeof u==='string'?u:u.url)?.clone()},
  async put(u,response){this.stored.set(u,response.clone())}
});
const caches={
  async open(k){if(!all.has(k))all.set(k,cacheFactory());return all.get(k)},
  async keys(){return [...all.keys()]},
  async delete(k){return all.delete(k)}
};
const self={registration:{scope:base},addEventListener:(name,fn)=>{registrations.set(name,fn)},skipWaiting(){},clients:{claim:async()=>{}}};
vm.runInNewContext(code,{self,URL,caches,Request,Response,TextEncoder,Uint8Array,crypto:webcrypto,fetch:async u=>responseFor(typeof u==='string'?u:u.url),console});
for(const k of ['install','activate','fetch','message']){assert.ok(registrations.has(k));checks++}
const prefix='kotowari-handoff:/cosmo-incremental-ios/:';
all.set(prefix+'old',cacheFactory());all.set('other-app-cache',cacheFactory());
const run=(type,attrs={})=>{let p;registrations.get(type)({...attrs,waitUntil:v=>{p=v},respondWith:v=>{p=v}});return p};
stale=true;await assert.rejects(run('install'),/Mixed release: balance-config.mjs/);checks++;
assert.deepEqual([...all.keys()],[prefix+'old','other-app-cache']);checks++;
stale=false;await run('install');
const match=code.match(/const VERSION = "([^"]+)";/);
assert.ok(match,'SW version exists');
const revision=code.match(/const UI_REVISION = "([^"]+)";/);
const key=[...all.keys()].find(k=>k.startsWith(prefix+match[1]+revision[1]+':'));
assert.ok(key,'fingerprinted cache');
const cache=await caches.open(key);
for(const path of ['index.html','game.mjs','app.mjs','design-proposals.mjs','RESEARCH_V35.md']){
 assert.ok(await cache.match(new URL(path,base).href),'Missing '+path);checks++
}
await run('activate');checks++;assert.ok(!all.has(prefix+'old'));checks++;assert.ok(all.has('other-app-cache'));checks++;
const response=await run('fetch',{request:{method:'GET',url:base,mode:'navigate'}});
assert.equal(await response.text(),fs.readFileSync(new URL('../index.html',import.meta.url),'utf8'));checks++;
const config=new URL('balance-config.mjs',base).href;
cache.stored.delete(config);stale=true;
const refused=await run('fetch',{request:{method:'GET',url:config,mode:'cors'}});
assert.equal(refused.status,503);assert.equal(await cache.match(config),undefined);checks++;
stale=false;const recovered=await run('fetch',{request:{method:'GET',url:config,mode:'cors'}});
assert.equal(await recovered.text(),fs.readFileSync(new URL('../balance-config.mjs',import.meta.url),'utf8'));checks++;
console.log('PASS '+checks+' SW cache installation, mixed release rejection, isolation and offline navigation checks');
