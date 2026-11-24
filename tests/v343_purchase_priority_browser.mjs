import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium} from "@playwright/test";

const port=process.env.KOTOWARI_V343_PORT||"8843";
const base=process.env.KOTOWARI_SMOKE_BASE_URL||"http://127.0.0.1:"+port+"/";
const server=process.env.KOTOWARI_SMOKE_BASE_URL?null:
  spawn("python3",["-m","http.server",port,"--bind","127.0.0.1"],{stdio:"ignore"});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let browser;
try {
  let ready=false;
  for(let i=0;i<50;i++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await sleep(200);}
  assert.ok(ready,"v343 server unavailable");
  browser=await chromium.launch({headless:true});
  for(const [label,width,height] of [["small",320,700],["phone",375,812],["wide",1024,900]]){
    const ctx=await browser.newContext({viewport:{width,height}});
    const page=await ctx.newPage(),errors=[];
    page.on("pageerror",err=>errors.push(String(err)));
    assert.equal((await page.goto(base+"?dev=1",{waitUntil:"domcontentloaded"}))?.status(),200);
    await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
    const encoded=await page.evaluate(async()=>{
      const G=await import("./game.mjs"),Save=await import("./save.mjs");
      const s=G.createState(Date.now(),"normal");
      s.intro.complete=true;s.time.unlocked=true;s.orbs=G.purchaseQuote(s,"source","SOURCE_06","1").cost;s.runOrbsEarned=s.orbs;s.totalOrbs=s.orbs;
      s.engraving.owned=["ENG-05","ENG-17","ENG-23","ENG-26","ENG-27"];
      s.engraving.levels=Object.fromEntries(s.engraving.owned.map(id=>[id,1]));
      s.settings.automationEnabled=false;
      return Save.encode(s,"v343-browser");
    });
    await page.addInitScript(data=>{
      if(sessionStorage.getItem("v343-fixture")!=="ready"){
        localStorage.setItem("kotowari_v31_normal",data);
        sessionStorage.setItem("v343-fixture","ready");
      }
    },encoded);
    await page.reload({waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
    await page.locator('[data-stage="existence"]').click();
    await page.locator('[data-child="sources"]').click();
    const order=page.locator("#bulkOrderButton");
    assert.equal(await order.textContent(),"安い順");
    const rect0=await order.boundingBox();
    await order.click();
    assert.equal(await order.textContent(),"上位順");
    assert.equal(await page.evaluate(()=>window.KOTOWARI_DEBUG.state().settings.bulkOrder),"grade");
    const rect1=await order.boundingBox();
    for(const prop of ["width","height","x","y"])
      assert.ok(Math.abs(rect0[prop]-rect1[prop])<1,label+" order button shifted "+prop);
    assert.ok((await order.getAttribute("aria-label")).includes("最高グレード"));
    assert.equal(await page.locator("#bulkBuyButton").isEnabled(),true);
    await page.locator("#bulkBuyButton").click();
    const levels=await page.evaluate(()=>window.KOTOWARI_DEBUG.state().sources);
    assert.equal(levels.SOURCE_06.level,1,"grade-first buys source 6 for its exact current initial cost");
    assert.equal(levels.SOURCE_05.level,0,"source 5 must not absorb the budget first");
    await page.locator("#automationQuick").click();
    await page.locator('[data-action="toggle-auto-details"]').click();
    await page.locator('[data-auto-buy-kind="source"][data-auto-field="priority"]').selectOption("grade");
    await page.locator('[data-auto-engrave="priority"]').selectOption("grade");
    const choices=await page.evaluate(()=>window.KOTOWARI_DEBUG.state());
    assert.equal(choices.engraving.autoBuy.source.priority,"grade");
    assert.equal(choices.engraving.autoEngraving.priority,"grade");
    assert.equal(choices.settings.bulkOrder,"grade");
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    assert.ok(overflow<=1,label+" horizontal overflow "+overflow);
    await page.reload({waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
    const restored=await page.evaluate(()=>window.KOTOWARI_DEBUG.state());
    assert.equal(restored.settings.bulkOrder,"grade");
    assert.equal(restored.engraving.autoBuy.source.priority,"grade");
    assert.equal(restored.engraving.autoEngraving.priority,"grade");
    assert.deepEqual(errors,[],label+" browser errors");
    console.log("PASS v343",label,"bulk grade, one-tap, automation, fixed order geometry, save");
    await ctx.close();
  }
}finally{
  await browser?.close();server?.kill("SIGTERM");
}