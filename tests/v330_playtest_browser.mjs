import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium} from "@playwright/test";
const port=process.env.KOTOWARI_V330_PORT||"8830";
const base=process.env.KOTOWARI_SMOKE_BASE_URL||"http://127.0.0.1:"+port+"/";
const server=process.env.KOTOWARI_SMOKE_BASE_URL?null:spawn("python3",["-m","http.server",port,"--bind","127.0.0.1"],{stdio:"ignore"});
const delay=t=>new Promise(resolve=>setTimeout(resolve,t));
let browser=null;
try{
 let ready=false;
 for(let i=0;i<40;i++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await delay(250);}
 assert.ok(ready,"v330 host not available");
 browser=await chromium.launch({headless:true});
 for(const [tag,width,height] of [["phone",375,812],["desktop",1024,900]]){
  const context=await browser.newContext({viewport:{width,height}});
  const page=await context.newPage(),errors=[];
  page.on("pageerror",err=>errors.push(String(err)));
  assert.equal((await page.goto(base+"?dev=1",{waitUntil:"domcontentloaded"}))?.status(),200);
  await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
  const raw=await page.evaluate(async()=>{
   const G=await import("./game.mjs"),S=await import("./save.mjs");
   const s=G.createState(Date.now(),"normal");
   s.intro.complete=true;s.settings.confirmConvergence=false;s.surplusExistence="20";
   s.boost.seconds=3600;G.addOrbs(s,"1500");
   if(!G.buyEngraving(s,"ENG-01").ok)throw Error("engraving fixture failed");
   return S.encode(s,"v330-fixture");
  });
  await page.addInitScript(original=>{
   if(sessionStorage.getItem("v330-seeded")!=="yes"){
    localStorage.setItem("kotowari_v31_normal",original);
    sessionStorage.setItem("v330-seeded","yes");
   }
  },raw);
  await page.reload({waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
  assert.match(await page.locator("#buildLabel").textContent(),/3\.30/);
  assert.equal(await page.locator("#worldStatus").count(),0,"status panel should be removed");
  assert.equal(await page.locator("#worldObserve .scene-stat").count(),2);
  const obs=await page.locator("#worldObserve").textContent();
  assert.ok(obs.includes("源の生成")&&obs.includes("干渉"));
  assert.ok(!obs.includes("累計オーブ"));
  assert.equal(await page.locator("#worldHint").isVisible(),false);
  assert.equal(await page.locator("#convergeMain .converge-gauge i").count(),1);
  const start=await page.evaluate(async()=>{
   const G=await import("./game.mjs");
   const s=window.KOTOWARI_DEBUG.state();
   return {earned:s.runOrbsEarned,progress:G.convergenceProgress(s).percent};
  });
  assert.ok(start.progress>0&&start.progress<100);
  await page.locator('[data-stage="existence"]').click();
  await page.locator('[data-child="moment"]').click();
  assert.equal(await page.locator(".moment-card").count(),30);
  assert.equal(await page.locator(".moment-tools").count(),0);
  assert.equal(await page.locator("#sheetBody button[data-action='converge'] .converge-gauge i").count(),1);
  await page.locator('button[data-purchase="moment"][data-id="tap"]').click();
  const after=await page.evaluate(async()=>{
   const G=await import("./game.mjs");const s=window.KOTOWARI_DEBUG.state();
   return {earned:s.runOrbsEarned,progress:G.convergenceProgress(s).percent,spent:s.counters.orbsSpent};
  });
  assert.equal(after.earned,start.earned);
  assert.equal(after.progress,start.progress,"NEXT gauge cannot fall after purchases");
  assert.ok(Number(after.spent)>0,"test purchase actually spent orbs");
  await page.locator('[data-child="engraving"]').click();
  assert.equal(await page.locator(".engraving-card").count(),30);
  const upgrade=page.locator('button[data-engraving-trial-upgrade="ENG-01"]');
  assert.equal(await upgrade.isDisabled(),false);
  await upgrade.click();
  assert.equal(await page.locator("#confirmDialog").evaluate(el=>el.open),false,"engraving upgrades are one tap by default");
  await page.waitForFunction(()=>window.KOTOWARI_DEBUG.state().engraving.trialLevels["ENG-01"]===1);
  const eng=await page.evaluate(()=>window.KOTOWARI_DEBUG.state());
  assert.equal(eng.engraving.levels["ENG-01"],2);
  await page.locator('.app-top [data-action="organizer"]').click();
  await page.locator('[data-organizer="boost"]').click();
  assert.equal(await page.locator('#sheetBody button[data-boost-trial-buy]').count(),5);
  await page.locator('button[data-boost-trial-buy="0"]').click();
  assert.equal(await page.locator("#confirmDialog").evaluate(el=>el.open),false,"BOOST upgrades are one tap by default");
  await page.waitForFunction(()=>window.KOTOWARI_DEBUG.state().boost.trialLevels[0]===1);
  const earnedRate=await page.evaluate(async()=>{
   const G=await import("./game.mjs");return G.boostValues(window.KOTOWARI_DEBUG.state()).offlineRate*3600;
  });
  assert.ok(Math.abs(earnedRate-990)<1e-7);
  await page.reload({waitUntil:"domcontentloaded"});
  const saved=await page.evaluate(()=>window.KOTOWARI_DEBUG.state());
  assert.equal(saved.engraving.trialLevels["ENG-01"],1);
  assert.equal(saved.engraving.levels["ENG-01"],2);
  assert.equal(saved.boost.trialLevels[0],1);
  assert.equal(saved.runOrbsEarned,start.earned);
  assert.deepEqual(errors,[],tag+" unhandled UI errors");
  console.log("PASS v330",tag,"compact HUD, two stats, NEXT purchase invariance, BOOST/ENG purchases and persistence");
  await context.close();
 }
}finally{if(browser)await browser.close();server?.kill("SIGTERM");}
