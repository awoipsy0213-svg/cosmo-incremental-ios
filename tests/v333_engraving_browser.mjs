import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium} from "@playwright/test";
const port=process.env.KOTOWARI_V333_PORT||"8833";
const base=process.env.KOTOWARI_SMOKE_BASE_URL||"http://127.0.0.1:"+port+"/";
const server=process.env.KOTOWARI_SMOKE_BASE_URL?null:spawn("python3",["-m","http.server",port,"--bind","127.0.0.1"],{stdio:"ignore"});
const sleep=t=>new Promise(r=>setTimeout(r,t));
let browser;
try{
  let ready=false;
  for(let n=0;n<45;n++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await sleep(200);}
  assert.ok(ready,"v333 browser test server did not start");
  browser=await chromium.launch({headless:true});
  for(const [name,width,height] of [["mobile",375,812],["narrow",320,700],["desktop",1024,800]]){
    const ctx=await browser.newContext({viewport:{width,height}});
    const page=await ctx.newPage(),errors=[];
    page.on("pageerror",e=>errors.push(String(e)));
    assert.equal((await page.goto(base+"?dev=1",{waitUntil:"domcontentloaded"}))?.status(),200);
    await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
    const fixture=await page.evaluate(async()=>{
      const G=await import("./game.mjs"),S=await import("./save.mjs");
      const s=G.createState(Date.now(),"normal");s.intro.complete=true;s.surplusExistence="100";
      s.settings.confirmEngravingPurchase=false;s.settings.confirmEngravingUpgrade=false;
      s.engraving.owned=["ENG-01","ENG-22","ENG-24","ENG-28"];
      s.engraving.levels={"ENG-01":1,"ENG-22":1,"ENG-24":1,"ENG-28":1};
      return S.encode(s,"v333-web-test");
    });
    await page.addInitScript(raw=>{
      if(sessionStorage.getItem("v333-fixture")!=="yes"){
        localStorage.setItem("kotowari_v31_normal",raw);
        sessionStorage.setItem("v333-fixture","yes");
      }
    },fixture);
    await page.reload({waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
    assert.match(await page.locator("#buildLabel").textContent(),/^3\.57$/);
    await page.locator('[data-stage="existence"]').click();
    await page.locator('[data-child="engraving"]').click();
    assert.equal(await page.locator(".engraving-card").count(),30);
    assert.ok((await page.locator(".engraving-card").allTextContents()).some(t=>t.includes("干渉増幅")));
    assert.equal(await page.locator('#autoConvergeMinSteps').count(),1);
    assert.equal(await page.locator('.engraving-card [data-engraving-buy]').count(),26);
    const item=page.locator('.engraving-card').filter({has:page.locator('[data-engraving-trial-upgrade="ENG-01"]')});
    const before=await page.evaluate(async()=>{
      const G=await import("./game.mjs");
      const s=window.KOTOWARI_DEBUG.state();
      return {state:s,power:G.tapPower(s).toString()};
    });
    const rect1=await item.boundingBox();
    await item.locator('[data-engraving-trial-upgrade="ENG-01"]').click();
    const after=await page.evaluate(async()=>{
      const G=await import("./game.mjs");
      const s=window.KOTOWARI_DEBUG.state();
      return {state:s,power:G.tapPower(s).toString()};
    });
    assert.equal(after.state.engraving.levels["ENG-01"],2);
    assert.ok(after.state.engraving.trialLevels["ENG-01"]>=1);
    const comparer=await page.evaluate(async({a,b})=>{
      const {A}=await import("./numbers.mjs");return A(a).cmp(b);
    },{a:after.power,b:before.power});
    assert.ok(comparer>0,"engraving should improve effective tap power");
    const rect2=await item.boundingBox();
    assert.ok(Math.abs(rect1.height-rect2.height)<=1,name+" engraving card shifted height on upgrade");
    const select=page.locator('#autoConvergeMinSteps');
    await select.selectOption("5");
    assert.equal((await page.evaluate(()=>window.KOTOWARI_DEBUG.state())).engraving.autoConverge.minSteps,5);
    await page.reload({waitUntil:"domcontentloaded"});
    const persisted=await page.evaluate(()=>window.KOTOWARI_DEBUG.state());
    assert.equal(persisted.engraving.autoConverge.minSteps,5);
    assert.equal(persisted.engraving.levels["ENG-01"],2);
    assert.deepEqual(errors,[],name+" JS errors");
    await ctx.close();
    console.log("PASS v333 engraving browser "+name+" labels, upgrade, dimension, controls, save");
  }
}finally{await browser?.close();server?.kill();}
