import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium} from "@playwright/test";
const port=process.env.KOTOWARI_V335_PORT||"8835";
const base=process.env.KOTOWARI_SMOKE_BASE_URL||"http://127.0.0.1:"+port+"/";
const server=process.env.KOTOWARI_SMOKE_BASE_URL?null:spawn("python3",["-m","http.server",port,"--bind","127.0.0.1"],{stdio:"ignore"});
const sleep=t=>new Promise(r=>setTimeout(r,t));
let browser;
try{
 let ready=false;
 for(let i=0;i<45;i++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await sleep(200);}
 assert.ok(ready,"v335 local host unreachable");
 browser=await chromium.launch({headless:true});
 for(const [name,width,height] of [["phone",375,812],["small",320,700]]){
   const context=await browser.newContext({viewport:{width,height}});
   const page=await context.newPage(),errors=[];
   page.on("pageerror",e=>errors.push(String(e)));
   await page.goto(base+"?legacy=1&dev=1",{waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
   const encoded=await page.evaluate(async()=>{
     const G=await import("./game.mjs"),S=await import("./save.mjs");
     const s=G.createState(Date.now(),"normal");
     s.intro.complete=true;s.surplusExistence="100";
     s.settings.confirmEngravingPurchase=false;s.settings.confirmEngravingUpgrade=false;
     s.engraving.owned=["ENG-01","ENG-03"];
     s.engraving.levels={"ENG-01":1};
     s.events.push({at:Date.now(),text:"ENG-01 の追加強化＋3（暫定バランス）。"});
     return S.encode(s,"v335-copy");
   });
   await page.addInitScript(raw=>{
     if(sessionStorage.getItem("v335-loaded")!=="yes"){
       localStorage.setItem("kotowari_v31_normal",raw);
       sessionStorage.setItem("v335-loaded","yes");
     }
   },encoded);
   await page.reload({waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
   assert.equal(await page.locator("#buildLabel").isVisible(),false);
   await page.locator('[data-action="organizer"]').click();
   const menu=await page.locator("#organizerLinks").innerText();
   assert.doesNotMatch(menu,/開発|設計状況|研究|価格試算/);
   await page.locator('[data-action="close-drawer"]').click();
   await page.locator('[data-stage="existence"]').click();
   await page.locator('[data-child="engraving"]').click();
   assert.equal(await page.locator(".engraving-card").count(),30);
   const list=await page.locator("#sheetBody").innerText();
   assert.match(list,/干渉増幅/);
   assert.match(list,/Lv\.0/);
   assert.match(list,/Lv\.1/);
   assert.match(list,/Lv\.―/);
   assert.doesNotMatch(list,/ENG-\d+|未照合|暫定|実装|開発|検証|試験値/);
   const target=page.locator('.engraving-card[data-engraving-entry="ENG-01"]');
   const first=await target.boundingBox();
   await target.locator('[data-engraving-trial-upgrade="ENG-01"]').click();
   assert.match(await target.innerText(),/Lv\.2/);
   const after=await target.boundingBox();
   assert.equal(Math.round(first.height),Math.round(after.height),"card height changed");
   await page.locator('[data-action="organizer"]').click();
   await page.locator('[data-organizer="boost"]').click();
   assert.doesNotMatch(await page.locator("#sheetBody").innerText(),/試験値|補償判定待ち|実装|開発|VER(SION)?\.?\s*3\.\d/);
   assert.deepEqual(errors,[],name+" JS errors");
   await context.close();
   console.log("PASS v335 player copy "+name);
 }
}finally{await browser?.close();server?.kill();}
