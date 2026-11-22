import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium} from "@playwright/test";
const port=process.env.KOTOWARI_V329_PORT||"8829";
const base=process.env.KOTOWARI_SMOKE_BASE_URL||"http://127.0.0.1:"+port+"/";
const server=process.env.KOTOWARI_SMOKE_BASE_URL?null:spawn("python3",["-m","http.server",port,"--bind","127.0.0.1"],{stdio:"ignore"});
const sleep=t=>new Promise(ok=>setTimeout(ok,t));
let browser=null;
try{
 let ready=false;for(let i=0;i<40;i++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await sleep(250);}
 assert.ok(ready,"v329 browser host not available");
 browser=await chromium.launch({headless:true});
 for(const [tag,width,height] of [["phone",375,812],["desktop",1024,900]]){
  const context=await browser.newContext({viewport:{width,height}});
  const page=await context.newPage(),errors=[];
  page.on("pageerror",e=>errors.push(String(e)));
  assert.equal((await page.goto(base+"?dev=1",{waitUntil:"domcontentloaded"}))?.status(),200);
  await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
  const fixture=await page.evaluate(async()=>{
   const G=await import("./game.mjs"),S=await import("./save.mjs");
   const s=G.createState(Date.now(),"normal");
   s.intro.complete=true;s.settings.confirmConvergence=false;
   s.surplusExistence="10";
   G.addOrbs(s,"1e8");
   // Historical owned engraving was acquired, but has no proven new Lv.
   s.engraving.owned=["ENG-01","ENG-24"];s.engraving.equipped=[];
   s.engraving.levels={};
   return S.encode(s,"v329-fixture");
  });
  // Install once: addInitScript would overwrite the saved progress on every reload.
  await page.evaluate(raw=>localStorage.setItem("kotowari_v31_normal",raw),fixture);
  await page.reload({waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
  assert.match(await page.locator("#buildLabel").textContent(),/3\.29/);
  await page.locator('[data-stage="existence"]').click();
  await page.locator('[data-child="moment"]').click();
  assert.equal(await page.locator(".moment-card").count(),30);
  assert.equal(await page.locator(".moment-tools").count(),0,"group/filter/search UI removed");
  const before=await page.evaluate(async()=>{
   const G=await import("./game.mjs");
   const s=window.KOTOWARI_DEBUG.state();return {state:s,quote:G.convergenceQuote(s)};
  });
  assert.equal(before.quote.basis,"run-earned");
  assert.ok(before.quote.steps>0);
  await page.locator('.moment-card [data-purchase="moment"]').first().click();
  const after=await page.evaluate(async()=>{
   const G=await import("./game.mjs");
   const s=window.KOTOWARI_DEBUG.state();return {state:s,quote:G.convergenceQuote(s)};
  });
  assert.equal(after.state.runOrbsEarned,before.state.runOrbsEarned,"buy does not debit earned total");
  assert.equal(after.quote.steps,before.quote.steps,"buy does not reduce convergence reward steps");
  assert.ok(Number(after.state.counters.orbsSpent)>0,"purchase must actually spend orbs");
  await page.locator('[data-child="engraving"]').click();
  assert.equal(await page.locator(".engraving-card").count(),30);
  assert.equal(await page.locator('button[data-action="edit-engraving"]').count(),0);
  assert.match(await page.locator("#sheetBody").textContent(),/旧取得済・Lv換算保留/);
  await page.locator('button[data-action="toggle-auto-converge"]').click();
  assert.equal((await page.evaluate(()=>window.KOTOWARI_DEBUG.state())).engraving.autoConverge.enabled,true);
  await page.locator('[data-child="moment"]').click();
  await page.locator('#sheetBody button[data-action="converge"]').click();
  await page.waitForFunction(()=>window.KOTOWARI_DEBUG.state().convergenceCount>0);
  const finished=await page.evaluate(()=>window.KOTOWARI_DEBUG.state());
  assert.equal(finished.runOrbsEarned,"0");
  assert.equal(finished.runOrbsEvidence,"verified");
  assert.deepEqual(finished.engraving.owned,["ENG-01","ENG-24"]);
  assert.equal(finished.engraving.autoConverge.enabled,true);
  assert.deepEqual(finished.engraving.equipped,[]);
  await page.reload({waitUntil:"domcontentloaded"});
  const persisted=await page.evaluate(()=>window.KOTOWARI_DEBUG.state());
  assert.equal(persisted.runOrbsEarned,"0");
  assert.deepEqual(persisted.engraving.owned,["ENG-01","ENG-24"]);
  assert.deepEqual(errors,[],tag+" JS errors");
  console.log("PASS v329",tag,"Setsuna uncluttered, run-earned spending immunity, permanent engraving and reload");
  await context.close();
 }
}finally{if(browser)await browser.close();server?.kill("SIGTERM");}
