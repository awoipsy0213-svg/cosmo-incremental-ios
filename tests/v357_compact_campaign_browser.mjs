import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium} from "@playwright/test";
const port=process.env.KOTOWARI_V357_PORT||"8857";
const base="http://127.0.0.1:"+port+"/";
const server=spawn("python3",["-m","http.server",port,"--bind","127.0.0.1"],{stdio:"ignore"});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try {
 let ready=false;for(let i=0;i<50;i++){try{if((await fetch(base)).ok){ready=true;break}}catch{}await pause(200)}
 assert.ok(ready);
 browser=await chromium.launch({headless:true});
 for(const width of [320,375,430]){
  const ctx=await browser.newContext({viewport:{width,height:812},serviceWorkers:"block"}),page=await ctx.newPage(),errors=[];
  page.on("pageerror",e=>errors.push(String(e)));
  await page.goto(base+"numbers.mjs");
  await page.evaluate(async()=>{
    const G=await import("./game.mjs"),S=await import("./save.mjs");
    const now=Date.now(),s=G.createState(now,"normal",true);
    s.intro.complete=true;s.intro.touches=8;G.addOrbs(s,"1e200");G.converge(s);
    for(let i=0;i<12;i++)if(!G.buyCompact(s,"engraving","engraving:"+i,"1").ok)throw Error("fixture engraving "+i);
    G.addOrbs(s,"1e100");s.settings.confirmMaxPurchase=false;s.settings.confirmBulkPurchase=false;
    localStorage.setItem(S.KEYS.compact,S.encode(s,"fixture"));
    localStorage.setItem(S.KEYS.normal,S.encode(G.createState(now,"normal"),"old"));
  });
  const old=await page.evaluate(async()=>localStorage.getItem((await import("./save.mjs")).KEYS.normal));
  await page.goto(base+"?compact=1&dev=1");
  await page.waitForFunction(()=>window.KOTOWARI_DEBUG?.state()?.compactEconomy);
  await page.evaluate(()=>window.KOTOWARI_DEBUG.open("existence","moment"));
  assert.equal(await page.locator("[data-compact-card]").count(),1);
  assert.ok(await page.locator("#bulkScopeButton").isHidden());
  await page.locator("[data-compact-buy]").first().click();
  assert.ok(await page.evaluate(()=>window.KOTOWARI_DEBUG.state().compactEconomy.moment[0]>3000));
  await page.evaluate(()=>window.KOTOWARI_DEBUG.open("existence","engraving"));
  assert.equal(await page.locator("[data-compact-card]").count(),12);
  await page.evaluate(()=>window.KOTOWARI_DEBUG.open("automation","auto-existence"));
  assert.equal(await page.locator("[data-compact-auto]").count(),4);
  await page.locator("[data-auto-master]").uncheck();
  assert.equal(await page.evaluate(()=>window.KOTOWARI_DEBUG.state().compactEconomy.settings.master),false);
  await page.evaluate(()=>window.KOTOWARI_DEBUG.open("time","flow"));
  assert.equal(await page.evaluate(()=>window.KOTOWARI_DEBUG.state().time.unlocked),true);
  await page.evaluate(()=>window.KOTOWARI_DEBUG.open("existence","sources"));
  assert.equal(await page.locator("[data-compact-card]").count(),1);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.evaluate(()=>window.KOTOWARI_DEBUG.save());
  await page.reload();await page.waitForFunction(()=>window.KOTOWARI_DEBUG?.state()?.compactEconomy);
  assert.ok(await page.evaluate(()=>window.KOTOWARI_DEBUG.state().compactEconomy.moment[0]>3000));
  assert.equal(await page.evaluate(async()=>localStorage.getItem((await import("./save.mjs")).KEYS.normal)),old);
  assert.deepEqual(errors,[]);
  await ctx.close();
 }
 console.log("PASS compact campaign browser: mobile cards, purchase, automation, stages, persistence and isolation");
}finally{await browser?.close();server.kill();}
