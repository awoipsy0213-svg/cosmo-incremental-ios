import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium} from "@playwright/test";

const port=process.env.KOTOWARI_V325_PORT||"8814";
const base=process.env.KOTOWARI_SMOKE_BASE_URL||"http://127.0.0.1:"+port+"/";
const server=process.env.KOTOWARI_SMOKE_BASE_URL?null:
  spawn("python3",["-m","http.server",port,"--bind","127.0.0.1"],{stdio:"ignore"});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try{
 let ready=false;
 for(let i=0;i<40;i++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await sleep(250);}
 assert.ok(ready,"Ver3.27 test host unavailable");
 browser=await chromium.launch({headless:true});
 for(const [label,width,height] of [["phone-narrow",320,700],["phone",375,812],["desktop",1000,900]]){
  const ctx=await browser.newContext({viewport:{width,height}});
  const page=await ctx.newPage();const errors=[];
  page.on("pageerror",e=>errors.push(String(e)));
  assert.equal((await page.goto(base,{waitUntil:"domcontentloaded"}))?.status(),200);
  await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
  const fixture=await page.evaluate(async()=>{
    const G=await import("./game.mjs"),S=await import("./save.mjs");
    const start=Date.now()-3600000,s=G.createState(start,"normal");
    s.intro.complete=true;s.time.unlocked=true;s.universe.unlocked=true;
    s.sources.SOURCE_01.level=10;
    G.createPlanet(s,start);
    s.boost.seconds=100;s.boost.active=true;
    return S.encode(s,"v325-boost-fixture");
  });
  await page.addInitScript(raw=>localStorage.setItem("kotowari_v31_normal",raw),fixture);
  const reloadStartedAt=Date.now();
  await page.reload({waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
  const resumed=await page.evaluate(()=>{
    const saved=JSON.parse(localStorage.getItem("kotowari_v31_normal"));
    return saved.data;
  });
  assert.equal(resumed.schemaVersion,31);
  assert.ok(resumed.boost.seconds>=999&&resumed.boost.seconds<1005,
    "expected 900s offline BOOST gained at startup: "+JSON.stringify(resumed.boost));
  assert.equal(resumed.boost.active,false);
  // The real page can tick online for a few milliseconds between resume and
  // its save. Bound stage progress by that short foreground interval, not
  // by the one-hour hidden period. The offline report itself must be exact 0.
  const maxForegroundSeconds=(Date.now()-reloadStartedAt)/1000+0.5;
  assert.ok(Number(resumed.orbs)>=0&&Number(resumed.orbs)<100*maxForegroundSeconds,
    "stage currency grew during one-hour offline span: "+resumed.orbs);
  assert.ok(Number(resumed.totalOrbs)>=0&&Number(resumed.totalOrbs)<100*maxForegroundSeconds,
    "total currency grew during offline: "+resumed.totalOrbs);
  assert.ok(resumed.time.elapsed<=maxForegroundSeconds,
    "time stage grew beyond foreground-only duration");
  assert.ok(resumed.time.worldSeconds<=maxForegroundSeconds/(24*3600)+1e-8,
    "world clock advanced during offline");
  const mass=Number(resumed.universe.planets[0].stats.mass);
  assert.ok(mass>=10&&mass<10+maxForegroundSeconds/30,
    "planet mass changed during offline: "+mass);
  assert.equal(resumed.telemetry.offlineReports.length,1);
  assert.equal(resumed.telemetry.offlineReports[0].orbs,"0");
  assert.equal(resumed.telemetry.offlineReports[0].effectiveSeconds,0);
  assert.ok(resumed.telemetry.offlineReports[0].boostEarned>=899);
  assert.match(await page.locator("#buildLabel").textContent(),/^3\.55$/);
  await page.locator('.app-top [data-action="organizer"]').click();
  await page.locator('[data-organizer="boost"]').click();
  const panel=await page.locator("#sheetBody").textContent();
  for(const phrase of ["オンライン獲得なし","BOOST強化","ゲーム内時間倍率","時間加速の消費効率","Lv.0 /"]){
    assert.ok(panel.includes(phrase),label+" BOOST panel missing "+phrase);
  }
  assert.equal(await page.locator('#sheetBody button[data-boost-upgrade]').count(),0,
    "normal gameplay must not expose provisional five-path purchases");
  assert.equal(await page.locator('#sheetBody button[data-boost-trial-buy]').count(),5,"new provisional 5-path purchases");
  assert.deepEqual(errors,[]);
  console.log("PASS v325",label,"offline BOOST accrual, frozen stage state, six-path UI and schema31");
  await ctx.close();
 }
}finally{if(browser)await browser.close();server?.kill("SIGTERM");}
