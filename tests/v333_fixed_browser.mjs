import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {mkdirSync,writeFileSync} from "node:fs";
import {chromium} from "@playwright/test";
const port=process.env.KOTOWARI_V333_PORT||"8833";
const base=process.env.KOTOWARI_SMOKE_BASE_URL||"http://127.0.0.1:"+port+"/";
const server=process.env.KOTOWARI_SMOKE_BASE_URL?null:spawn("python3",["-m","http.server",port,"--bind","127.0.0.1"],{stdio:"ignore"});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const dir="artifacts/ui-v333";mkdirSync(dir,{recursive:true});
const getGeometry=()=> {
  const body=document.querySelector("#sheetBody");
  const cardSelector=body.dataset.sub==="moment"?".moment-card":body.dataset.sub==="sources"?".source-card":".engraving-card";
  const cards=[...body.querySelectorAll(cardSelector)];
  const clip=r=>{const b=r.getBoundingClientRect();return [b.x,b.y,b.width,b.height].map(v=>+v.toFixed(2));};
  const actions=cards.map(c=>c.querySelector(".buy-button, .engraving-purchase-button"));
  const tabs=[...document.querySelectorAll("#childTabs [data-child]")];
  const controls=[...document.querySelectorAll("#purchaseToolbar>button")];
  const viewport=body.getBoundingClientRect();
  return {
    kind:body.dataset.sub,
    cardRect:cards.map(clip),
    buttonRect:actions.map(clip),
    prices:cards.map(c=>c.querySelector(".purchase-cost-value, .engraving-cost")?.textContent?.trim()||""),
    full:cards.filter(c=>{const r=c.getBoundingClientRect();return r.top>=viewport.top-1&&r.bottom<=viewport.bottom+1}).length,
    tabs:tabs.map(clip),controls:controls.map(clip),
    strip:clip(document.querySelector("#childTabStrip")),
    overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
    btnText:actions.map(b=>b?.textContent?.trim())
  };
};
function sameGeometry(a,b,label){
  assert.equal(a.kind,b.kind,label+" kind");
  assert.equal(a.cardRect.length,b.cardRect.length,label+" count");
  for(const k of ["cardRect","buttonRect","tabs","strip"]){
    const xa=a[k],xb=b[k];assert.equal(xa.length,xb.length,label+" "+k+" count");
    if(k==="strip"){
      xa.forEach((v,i)=>assert.ok(Math.abs(v-xb[i])<=.3,label+" strip "+i+" "+v+" vs "+xb[i]));
    } else {
      xa.forEach((r,i)=>r.forEach((v,j)=>assert.ok(Math.abs(v-xb[i][j])<=.3,
        label+" "+k+"["+i+"]["+j+"] "+v+" vs "+xb[i][j])));
    }
  }
  assert.ok(a.btnText.every(x=>x?.includes("購入"))&&b.btnText.every(x=>x?.includes("購入")),label+" purchase action label present");
  assert.ok(a.overflow<=1&&b.overflow<=1,label+" no horizontal overflow");
}
let browser;
try{
 let ready=false;
 for(let i=0;i<50;i++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await pause(200);}
 assert.ok(ready,"test server unavailable");
 browser=await chromium.launch({headless:true});
 const results=[];
 for(const [label,width,height] of [["320",320,700],["375",375,812],["430",430,932]]){
   const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
   const page=await ctx.newPage(),errors=[];
   page.on("pageerror",e=>errors.push(String(e)));
   await page.goto(base+"?lab=1&dev=1",{waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
   await page.evaluate(async()=>{
     const G=await import("./game.mjs");
     const s=G.createState(Date.now(),"lab");
     s.intro.complete=true;s.time.unlocked=true;s.convergenceCount=1;s.surplusExistence="5";s.engraving.owned.push("ENG-05");s.engraving.levels["ENG-05"]=1;
     s.settings.showPurchaseHints=true;
     s.settings.compact=true;
     window.KOTOWARI_DEBUG.setLabState(s);
   });
   await page.locator('[data-stage="existence"]').click();
   await page.locator('[data-child="moment"]').click();
   assert.match(await page.locator("#buildLabel").textContent(),/^3\.55$/);
   assert.equal(await page.locator("#toast").evaluate(el=>getComputedStyle(el).pointerEvents),"none",label+" toast must never block taps");
   assert.equal(await page.locator(".moment-card").count(),30);
   assert.equal(await page.locator("[data-moment-favorite]").count(),0,"no favorite stars");
   assert.equal(await page.locator(".live-buy-hint").count(),0,"no purchase hints at any price state");
   assert.equal(await page.locator('[data-moment-detail]').count(),30,"ellipses replace stars");
   assert.equal(await page.locator("#purchaseToolbar").isVisible(),true);
   const strip=await page.evaluate(()=>{
     const nav=document.querySelector("#childTabs").getBoundingClientRect();
     const tools=document.querySelector("#purchaseToolbar").getBoundingClientRect();
     return {navRight:nav.right,toolsLeft:tools.left,navY:nav.y,toolsY:tools.y};
   });
   assert.ok(strip.navRight<=strip.toolsLeft+.5,label+" toolbar overlaps sub-tabs");
   assert.ok(Math.abs(strip.navY-strip.toolsY)<5,label+" controls should share tab row");
   const initial=await page.evaluate(getGeometry);
   assert.equal(await page.locator('[data-purchase="moment"][data-id="tap"]').isDisabled(),true);
   assert.match(initial.btnText[0],/購入.*×0/,label+" zero affordable levels");
   assert.equal(initial.cardRect[0][3],66,label+" fixed card height");
   assert.equal(initial.buttonRect[0][3],56,label+" fixed button height");
   assert.ok(!/不足.*オーブ|あと.*タップ|自動で約/.test(await page.locator("#sheetBody").textContent()));
   await page.screenshot({path:dir+"/"+label+"-moment-before.png",animations:"disabled"});
   await page.evaluate(async()=>{
     const G=await import("./game.mjs");
     const s=window.KOTOWARI_DEBUG.state();
     G.addOrbs(s,"100000000000000");
     window.KOTOWARI_DEBUG.setLabState(s);
   });
   assert.equal(await page.locator('[data-purchase="moment"][data-id="tap"]').isDisabled(),false);
   const eligible=await page.evaluate(getGeometry);
   sameGeometry(initial,eligible,label+" orb 0 -> affordable");
   const prev=await page.evaluate(()=>window.KOTOWARI_DEBUG.state().moment.tap);
   await page.locator('[data-purchase="moment"][data-id="tap"]').click();
   const after=await page.evaluate(getGeometry);
   assert.ok((await page.evaluate(()=>window.KOTOWARI_DEBUG.state().moment.tap))>prev,label+" normal purchase works");
   sameGeometry(initial,after,label+" purchase before/after");
   assert.match(await page.locator('[data-purchase="moment"][data-id="tap"]').textContent(),/購入.*×/);
   for(let i=0;i<3;i++){
     await page.locator("#purchaseCycle").click();
     const cycle=await page.evaluate(getGeometry);
     sameGeometry(initial,cycle,label+" buy mode "+i);
   }
   await page.evaluate(async()=>{
     const G=await import("./game.mjs"),{CONFIG}=await import("./balance-config.mjs");
     const s=window.KOTOWARI_DEBUG.state();
     s.moment.tap=Math.min(9999,CONFIG.provisional.moment.tap.maxLevel-1);
     s.settings.showPurchaseHints=false;
     G.addOrbs(s,"1e100");
     window.KOTOWARI_DEBUG.setLabState(s);
   });
   const digits=await page.evaluate(getGeometry);
   sameGeometry(initial,digits,label+" long level and scientific cost");
   const nameCount=await page.locator('[data-moment-card="tap"] .card-top strong').getAttribute("title");
   assert.ok(nameCount&&nameCount.length>0,"truncated name accessible");
   await page.locator('[data-moment-detail="tap"]').click();
   assert.equal(await page.locator("#confirmDialog").evaluate(e=>e.open),true,"detail modal opens");
   assert.ok((await page.locator("#confirmText").textContent()).includes("次Lv"),"full effect details retained");
   await page.locator("#confirmYes").click();
   sameGeometry(initial,await page.evaluate(getGeometry),label+" detail open/close");
   await page.screenshot({path:dir+"/"+label+"-moment-after.png",animations:"disabled"});

   await page.locator('[data-child="sources"]').click();
   const source0=await page.evaluate(getGeometry);
   assert.equal(source0.cardRect.length,30);
   assert.equal(source0.cardRect[0][3],66);
   assert.equal(source0.buttonRect[0][3],56);
   assert.equal(await page.locator('.source-card [data-breakthrough]').count(),30,"source cycle slot always present");
   await page.evaluate(async()=>{
     const G=await import("./game.mjs");
     const s=window.KOTOWARI_DEBUG.state();
     s.sources.SOURCE_01.level=999999;
     G.addOrbs(s,"1e150");
     window.KOTOWARI_DEBUG.setLabState(s);
   });
   sameGeometry(source0,await page.evaluate(getGeometry),label+" source million-level and scientific cost");
   const bulkState=await page.evaluate(()=>({owned:window.KOTOWARI_DEBUG.state().engraving.owned.includes("ENG-05"),level:window.KOTOWARI_DEBUG.state().engraving.levels?.["ENG-05"],bulkDisabled:document.querySelector("#bulkBuyButton").disabled,orderDisabled:document.querySelector("#bulkOrderButton").disabled}));
   assert.equal(await page.locator("#bulkOrderButton").isEnabled(),true,label+" bulk order current "+JSON.stringify(bulkState));
   await page.locator('#bulkOrderButton').click();
   const srcSorted=await page.evaluate(getGeometry);
   sameGeometry(source0,srcSorted,label+" bulk order text");
   await page.locator('#bulkScopeButton').click();
   sameGeometry(source0,await page.evaluate(getGeometry),label+" visible scope text");
   await page.screenshot({path:dir+"/"+label+"-source.png",animations:"disabled"});

   const tabsBefore=await page.evaluate(()=>[...document.querySelectorAll("#childTabs button")].map(e=>{
     const r=e.getBoundingClientRect();return [r.x,r.width,r.height].map(v=>+v.toFixed(2));
   }));
   await page.locator('[data-child="engraving"]').click();
   assert.equal(await page.locator("#purchaseToolbar").isVisible(),false,"engraving hides bulk controls");
   assert.deepEqual(await page.evaluate(()=>[...document.querySelectorAll("#childTabs button")].map(e=>{
     const r=e.getBoundingClientRect();return [r.x,r.width,r.height].map(v=>+v.toFixed(2));
   })),tabsBefore,label+" tabs don't shift when bulk toolbar hides");
   const engr0=await page.evaluate(getGeometry);
   assert.equal(engr0.cardRect.length,30);
   assert.equal(engr0.cardRect[0][3],66);
   assert.equal(engr0.buttonRect[0][3],56);
   const color=await page.locator('.engraving-card .card-top strong').first().evaluate(e=>getComputedStyle(e).color);
   const rgb=color.match(/\d+/g).map(Number);
   assert.ok(rgb[0]<140&&rgb[1]<140&&rgb[2]<140,label+" engraving label needs dark contrast: "+color);
   await page.locator('[data-engraving-buy="ENG-01"]').click();
   const engr1=await page.evaluate(getGeometry);
   sameGeometry(engr0,engr1,label+" first engraving purchase");
   assert.match(await page.locator('[data-engraving-trial-upgrade="ENG-01"]').textContent(),/購入.*×/);
   await page.locator('[data-engraving-trial-upgrade="ENG-01"]').click();
   sameGeometry(engr0,await page.evaluate(getGeometry),label+" engraving added level");
   await page.locator('[data-engraving-detail="ENG-01"]').click();
   assert.equal(await page.locator("#confirmDialog").evaluate(e=>e.open),true);
   await page.locator("#confirmYes").click();
   sameGeometry(engr0,await page.evaluate(getGeometry),label+" engraving detail");
   await page.screenshot({path:dir+"/"+label+"-engraving.png",animations:"disabled"});
   await page.locator('[data-action="collapse-sheet"]').click();
   assert.equal(await page.locator("#convergeMain").isVisible(),true,label+" main NEXT visible");
   const convergeBefore=await page.evaluate(()=>{
     const e=document.getElementById("convergeMain"),r=e.getBoundingClientRect();
     window.__convergeRewardNode=e.querySelector("[data-main-convergence-reward]");
     return {geometry:[r.x,r.y,r.width,r.height],
       observation:[...document.querySelectorAll("#worldObserve .scene-stat strong")].map(n=>n.textContent),
       observedFull:document.querySelector("#worldObserve .scene-stat")?.title};
   });
   assert.equal(Math.round(convergeBefore.geometry[3]),54,label+" convergence control fixed 54px");
   assert.ok(convergeBefore.observation.length===2&&convergeBefore.observation.every(s=>!s.includes("オーブ")),label+" numeric observation omits repeated units");
   assert.ok(convergeBefore.observedFull?.includes("オーブ/秒"),label+" full observation available on title");
   await page.evaluate(async()=>{
     const G=await import("./game.mjs"),s=G.createState(Date.now(),"lab");
     s.intro.complete=true;s.time.unlocked=true;s.convergenceCount=1;s.surplusExistence="5";
     s.orbs="1e120";s.totalOrbs="1e120";s.runOrbsEarned="1e120";
     window.KOTOWARI_DEBUG.setLabState(s);
   });
   const convergeAfter=await page.evaluate(()=>{
     const e=document.getElementById("convergeMain"),r=e.getBoundingClientRect();
     return {geometry:[r.x,r.y,r.width,r.height],
       sameNode:e.querySelector("[data-main-convergence-reward]")===window.__convergeRewardNode,
       next:e.querySelector("[data-main-convergence-next]")?.textContent,
       overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
   });
   assert.equal(convergeAfter.sameNode,true,label+" convergence HTML stays mounted during earnings");
   assert.match(convergeAfter.next,/オーブ/,label+" NEXT value shown");
   convergeBefore.geometry.forEach((v,i)=>assert.ok(Math.abs(v-convergeAfter.geometry[i])<=.3,label+" convergence geometry["+i+"] stable"));
   assert.ok(convergeAfter.overflow<=1,label+" huge NEXT no horizontal overflow");
   await page.evaluate(()=>{
     const s=window.KOTOWARI_DEBUG.state();
     s.runOrbsEvidence="legacy-unverified";
     window.KOTOWARI_DEBUG.setLabState(s);
   });
   assert.match(await page.locator("#convergeMain").getAttribute("title"),/旧周回/,label+" prior progress warning retained");
   const legacyRect=await page.locator("#convergeMain").boundingBox();
   assert.ok(Math.abs(legacyRect.height-convergeBefore.geometry[3])<=.3,label+" legacy text does not resize NEXT");
   assert.deepEqual(errors,[],label+" JS errors");
   results.push({width,height,fullMomentCards:initial.full,momentCardHeight:initial.cardRect[0][3],
     momentBuyHeight:initial.buttonRect[0][3],sourceCardHeight:source0.cardRect[0][3],
     engravingCardHeight:engr0.cardRect[0][3],engravingNameColor:color,noShift:true});
   console.log("PASS v333 "+label+" fixed geometry across orb/level/mode/affordability/engraving purchases, "+initial.full+" visible moment cards");
   await ctx.close();
 }
 writeFileSync(dir+"/metrics.json",JSON.stringify({result:"passed",results},null,2));
}finally{
 if(browser)await browser.close();
 server?.kill("SIGTERM");
}
