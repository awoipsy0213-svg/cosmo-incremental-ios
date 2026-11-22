import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {mkdirSync,writeFileSync} from "node:fs";
import {chromium} from "@playwright/test";
const port=process.env.KOTOWARI_V332_PORT||"8832";
const base=process.env.KOTOWARI_SMOKE_BASE_URL||"http://127.0.0.1:"+port+"/";
const live="https://awoipsy0213-svg.github.io/cosmo-incremental-ios/";
const server=process.env.KOTOWARI_SMOKE_BASE_URL?null:spawn("python3",["-m","http.server",port,"--bind","127.0.0.1"],{stdio:"ignore"});
const sleep=t=>new Promise(resolve=>setTimeout(resolve,t));
const dir="artifacts/ui-v332";
mkdirSync(dir,{recursive:true});
const evaluateLayout=()=> {
  const body=document.querySelector("#sheetBody"),sheet=document.querySelector("#sheet"),
    touch=document.querySelector("#touchField"),cards=[...body.querySelectorAll(".moment-card")],
    first=cards[0],region=body.getBoundingClientRect();
  const rectangles=cards.map(x=>x.getBoundingClientRect());
  const fullyVisible=rectangles.filter(r=>r.top>=region.top-1&&r.bottom<=region.bottom+1).length;
  const style=getComputedStyle(body.querySelector(".compact-upgrades"));
  const firstButton=first.querySelector(".buy-button"),hit=firstButton.getBoundingClientRect();
  return {fullyVisible,cards:cards.length,
    firstCardHeight:+rectangles[0].height.toFixed(1),purchaseHeight:+hit.height.toFixed(1),
    purchaseWidth:+hit.width.toFixed(1),
    sheetHeight:+sheet.getBoundingClientRect().height.toFixed(1),
    touchHeight:+touch.getBoundingClientRect().height.toFixed(1),
    columns:style.gridTemplateColumns,background:getComputedStyle(first).backgroundImage,
    colorScheme:getComputedStyle(document.body).colorScheme,
    horizontalOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth
  };
};
let browser;
try{
 let ready=false;
 for(let i=0;i<45;i++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await sleep(200);}
 assert.ok(ready,"v332 test host not available");
 browser=await chromium.launch({headless:true});
 const outcomes=[];
 for(const [name,width,height,minComplete] of [
   ["narrow",320,700,2],["phone",375,812,3],["wide-phone",430,932,3],["tablet",620,950,3]]){
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
   const page=await context.newPage(),errors=[];
   page.on("pageerror",error=>errors.push(String(error)));
   await page.goto(base+"?dev=1",{waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
   const fixture=await page.evaluate(async()=>{
     const G=await import("./game.mjs"),S=await import("./save.mjs");
     const s=G.createState(Date.now(),"normal");
     s.intro.complete=true;
     s.settings.compact=true;s.settings.confirmEngravingPurchase=false;
     s.surplusExistence="2";
     G.addOrbs(s,"5000");
     return S.encode(s,"v332-ui-fixture");
   });
   await page.addInitScript(raw=>{
     if(sessionStorage.getItem("v332-fixture-set")!=="yes"){
       localStorage.setItem("kotowari_v31_normal",raw);
       sessionStorage.setItem("v332-fixture-set","yes");
     }
   },fixture);
   await page.reload({waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
   assert.match(await page.locator("#buildLabel").textContent(),/3\.32/);
   await page.locator('[data-stage="existence"]').click();
   await page.locator('[data-child="moment"]').click();
   assert.equal(await page.locator(".moment-card").count(),30);
   assert.equal(await page.locator(".moment-card .compact-stat").count(),60);
   assert.equal(await page.locator("#worldStatus").count(),0);
   assert.equal(await page.locator("#worldObserve .scene-stat").count(),2);
   const moment=await page.evaluate(evaluateLayout);
   assert.equal(moment.cards,30);
   assert.equal(moment.colorScheme,"light");
   assert.ok(moment.background.includes("255"),name+" card must be light glass "+moment.background);
   assert.ok(moment.horizontalOverflow<=1,name+" document overflow "+moment.horizontalOverflow);
   assert.ok(moment.purchaseHeight>=44,name+" purchase target too short "+moment.purchaseHeight);
   assert.ok(moment.purchaseWidth>=92,name+" purchase target too narrow "+moment.purchaseWidth);
   assert.ok(moment.touchHeight>=130,name+" tap area collapsed "+moment.touchHeight);
   assert.ok(moment.fullyVisible>=minComplete,name+" need "+minComplete+" full cards: "+JSON.stringify(moment));
   assert.ok(moment.firstCardHeight<=95,name+" moment card not sufficiently compact "+moment.firstCardHeight);
   await page.screenshot({path:dir+"/"+name+"-moment.png",animations:"disabled"});
   const tapsBefore=await page.evaluate(()=>window.KOTOWARI_DEBUG.state().counters.taps);
   await page.locator("#touchField").click({position:{x:Math.min(120,Math.round(width*.25)),y:Math.round(moment.touchHeight*.68)}});
   const tapsAfter=await page.evaluate(()=>window.KOTOWARI_DEBUG.state().counters.taps);
   assert.ok(tapsAfter>tapsBefore,name+" interactive crystal must remain tappable with sheet open");
   await page.locator(".moment-card button[data-purchase]").first().click();
   assert.ok((await page.evaluate(()=>window.KOTOWARI_DEBUG.state().moment.tap))>=1,"normal purchase worked");
   await page.locator('[data-child="sources"]').click();
   const source=await page.evaluate(()=>{
      const cards=[...document.querySelectorAll(".source-card")];
      const r=cards[0].getBoundingClientRect();
      return {count:cards.length,height:r.height,buttonHeight:cards[0].querySelector(".buy-button").getBoundingClientRect().height};
   });
   assert.equal(source.count,30);
   assert.ok(source.height<=95,name+" source row too tall "+source.height);
   assert.ok(source.buttonHeight>=44);
   await page.screenshot({path:dir+"/"+name+"-source.png",animations:"disabled"});
   await page.locator('[data-child="engraving"]').click();
   const engraving=await page.evaluate(()=>{
     const cards=[...document.querySelectorAll(".engraving-card")];
     return {count:cards.length,height:cards[0].getBoundingClientRect().height,
       buttonHeight:cards[0].querySelector(".wide-button").getBoundingClientRect().height};
   });
   assert.equal(engraving.count,30);
   assert.ok(engraving.height<=105,name+" engraving row too tall "+engraving.height);
   assert.ok(engraving.buttonHeight>=44);
   await page.screenshot({path:dir+"/"+name+"-engraving.png",animations:"disabled"});
   await page.locator('[data-stage="existence"]').click();
   await page.locator('[data-stage="existence"]').click();
   assert.equal(await page.locator('#childTabs [data-child="engraving"]').getAttribute("aria-pressed"),"true");
   await page.locator('.app-top [data-action="organizer"]').click();
   await page.locator('[data-organizer="settings"]').click();
   assert.ok(await page.locator('#sheetBody [data-pref="reducedMotion"]').count(),"reduced-motion setting accessible");
   assert.deepEqual(errors,[],name+" JS errors");
   outcomes.push({name,width,height,moment,source,engraving});
   console.log("PASS v332",name,JSON.stringify({fullyVisible:moment.fullyVisible,cardHeight:moment.firstCardHeight,
     sourceHeight:source.height,engravingHeight:engraving.height,touchHeight:moment.touchHeight,purchaseHeight:moment.purchaseHeight}));
   if(name==="phone"&&!process.env.KOTOWARI_SMOKE_BASE_URL){
     // Optional real before screenshot: previous published v3.30.1 remains live during PR review.
     let ctx;
     try{
       ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
       const oldPage=await ctx.newPage();
       await oldPage.addInitScript(raw=>localStorage.setItem("kotowari_v31_normal",raw),fixture);
       await oldPage.goto(live,{waitUntil:"domcontentloaded",timeout:14000});
       await oldPage.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中",{timeout:8000});
       const oldBuild=await oldPage.locator("#buildLabel").textContent();
       if(!oldBuild.includes("3.32")){
         await oldPage.locator('[data-stage="existence"]').click();
         await oldPage.locator('[data-child="moment"]').click();
         const before=await oldPage.evaluate(evaluateLayout);
         await oldPage.screenshot({path:dir+"/before-375x812.png",animations:"disabled"});
         console.log("COMPARE v332 before (published) -> after (branch)",JSON.stringify({
           buildBefore:oldBuild,beforeFull:before.fullyVisible,afterFull:moment.fullyVisible,
           beforeFirstCardPx:before.firstCardHeight,afterFirstCardPx:moment.firstCardHeight,
           beforeTouchPx:before.touchHeight,afterTouchPx:moment.touchHeight
         }));
       }
     }catch(err){console.log("NOTE v332 previous published screenshot unavailable: "+String(err).slice(0,150));}
     finally{await ctx?.close();}
   }
   await context.close();
 }
 writeFileSync(dir+"/metrics.json",JSON.stringify({result:"passed",measurements:outcomes},null,2));
}finally{
 if(browser)await browser.close();
 server?.kill("SIGTERM");
}
