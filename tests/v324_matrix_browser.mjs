import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium} from "@playwright/test";
const port=process.env.KOTOWARI_V324_PORT||"8801";
const root=process.env.KOTOWARI_SMOKE_BASE_URL||"http://127.0.0.1:"+port+"/";
const server=process.env.KOTOWARI_SMOKE_BASE_URL?null:spawn("python3",["-m","http.server",port,"--bind","127.0.0.1"],{stdio:"ignore"});
let browser=null;
const sleep=t=>new Promise(resolve=>setTimeout(resolve,t));
try{
 let reachable=false;
 for(let n=0;n<35;n++){try{if((await fetch(root)).ok){reachable=true;break;}}catch{}await sleep(300);}
 assert.ok(reachable,"Web UI host not available");
 browser=await chromium.launch({headless:true});
 for(const [tag,width,height] of [["small",320,700],["phone",375,812],["wide-phone",430,932],["tablet",620,950]]){
  const context=await browser.newContext({viewport:{width,height}});
  const page=await context.newPage();
  const errors=[];page.on("pageerror",error=>errors.push(String(error)));
  assert.equal((await page.goto(root,{waitUntil:"domcontentloaded"}))?.status(),200);
  await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
  const fixture=await page.evaluate(async()=>{
   const G=await import("./game.mjs"),S=await import("./save.mjs");
   const s=G.createState(Date.now());
   s.intro.complete=true;s.time.unlocked=true;s.universe.unlocked=true;s.engraving.owned.push("ENG-05");s.engraving.levels["ENG-05"]=1;
   s.sources.SOURCE_01.level=8;
   s.orbs="250000";s.totalOrbs="250000";
   return S.encode(s,"v324-ui");
  });
  await page.addInitScript(raw=>localStorage.setItem("kotowari_v31_normal",raw),fixture);
  await page.reload({waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
  assert.match(await page.locator("#buildLabel").textContent(),/^3\.57$/);
  assert.equal(await page.locator("#commonInfoBar .common-info-item").count(),2);
  assert.equal(await page.locator(".app-top [data-action='organizer']").count(),1);
  assert.equal(await page.locator("#stageNav [data-action='organizer']").count(),0,"duplicate bottom menu");
  assert.equal(await page.locator(".matrix-hero-cube").isVisible(),true);
  assert.equal(await page.locator(".world-matrix").isVisible(),true);
  assert.ok((await page.locator("#worldObserve .scene-stat").count())>0);
  assert.equal(await page.locator("#worldStatus").count(),0,"redundant state sidebar removed");
  const sizing=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:document.documentElement.clientWidth}));
  assert.ok(sizing.scroll<=width+2,tag+" page overflow "+JSON.stringify(sizing));
  await page.locator('[data-stage="existence"]').click();
  await page.locator('[data-child="sources"]').click();
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem("kotowari_v31_normal")).data.counters.orbsSpent);
  await page.locator("#bulkBuyButton").click();
  await page.waitForFunction(old=>JSON.parse(localStorage.getItem("kotowari_v31_normal")).data.counters.orbsSpent!==old,before);
  const after=await page.evaluate(()=>JSON.parse(localStorage.getItem("kotowari_v31_normal")).data.counters.orbsSpent);
  assert.notEqual(after,before,"one tap must spend without re-quote false negative");
  assert.equal(await page.locator("#confirmDialog").evaluate(el=>el.open),false);
  // Only the top-right organizer opens the settings.
  await page.locator(".app-top [data-action='organizer']").click();
  assert.equal(await page.locator("#organizerDrawer").evaluate(el=>el.open),true);
  await page.locator('button[data-action="close-drawer"]').click();
  for(const [id,num] of [["time","2"],["universe","3"]]){
    await page.locator('[data-stage="'+id+'"]').click();
    assert.equal(await page.locator("body").getAttribute("data-cosmo-stage"),num);
  }
  assert.equal(errors.length,0,tag+" JavaScript errors "+errors.join("; "));
  console.log("PASS v324",tag,width+"x"+height,"matrix scene, sole organizer and reliable one-tap bulk");
  await context.close();
 }
}finally{if(browser)await browser.close();server?.kill("SIGTERM");}
