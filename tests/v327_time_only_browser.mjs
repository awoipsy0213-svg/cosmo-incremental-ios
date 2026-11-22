import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium} from "@playwright/test";
const port=process.env.KOTOWARI_V327_PORT||"8817";
const base=process.env.KOTOWARI_SMOKE_BASE_URL||"http://127.0.0.1:"+port+"/";
const server=process.env.KOTOWARI_SMOKE_BASE_URL?null:
  spawn("python3",["-m","http.server",port,"--bind","127.0.0.1"],{stdio:"ignore"});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try{
 let ready=false;
 for(let n=0;n<40;n++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await sleep(250);}
 assert.ok(ready,"test web host unavailable");
 browser=await chromium.launch({headless:true});
 for(const [device,width,height] of [["phone",375,812],["desktop",1024,900]]){
  const context=await browser.newContext({viewport:{width,height}});
  const page=await context.newPage(),errors=[];
  page.on("pageerror",err=>errors.push(String(err)));
  assert.equal((await page.goto(base+"?dev=1",{waitUntil:"domcontentloaded"}))?.status(),200);
  await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
  const raw=await page.evaluate(async()=>{
    const G=await import("./game.mjs"),S=await import("./save.mjs");
    const t=Date.now()-2000,s=G.createState(t,"normal");
    s.intro.complete=true;s.sources.SOURCE_01.level=12;
    s.time.unlocked=true;
    s.boost.seconds=4800;s.boost.active=true;
    s.boost.upgrades=[3,2,1,0,0];
    delete s.boost.timeOnlyMigration;
    const body=JSON.stringify(s);
    return JSON.stringify({kind:"kotowari-save",version:31,
      writer:"v326-original",checksum:S.checksum(body),data:s});
  });
  await page.addInitScript(saved=>localStorage.setItem("kotowari_v31_normal",saved),raw);
  await page.reload({waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
  const first=await page.evaluate(()=>{
    return {state:window.KOTOWARI_DEBUG.state(),
      archive:localStorage.getItem("kotowari_v31_normal.before-v327-time-only")};
  });
  assert.equal(first.state.boost.seconds,4800,"old over-cap balance preserved");
  assert.equal(first.state.boost.active,false,"old active bit must not resume time booster");
  assert.equal(first.state.boost.timeOnlyMigration.previousActive,true);
  assert.equal(first.state.boost.timeOnlyMigration.source,"pre-v327");
  assert.deepEqual(first.state.boost.upgrades,[0,0,0,0,0]);
  assert.deepEqual(first.state.boost.timeOnlyMigration.legacyUpgradeLevels,[3,2,1,0,0]);
  assert.equal(first.archive,raw,"original encoded bytes remain recoverable");
  assert.match(await page.locator("#buildLabel").textContent(),/3\.29/);
  await page.locator('.app-top [data-action="organizer"]').click();
  await page.locator('[data-organizer="boost"]').click();
  const content=await page.locator("#sheetBody").textContent();
  for(const x of ["正式5強化系統","BOOST基礎獲得速度","オフラインBOOST獲得倍率",
     "BOOST容量","ゲーム内時間倍率","時間加速の消費効率","補償判定待ち",
     "旧BOOST残高を容量外で保護中","現実1秒","旧版の加速設定","旧強化Lv：3 / 2 / 1 / 0 / 0"]){
    assert.ok(content.includes(x),device+" missing "+x);
  }
  assert.ok(!content.includes("最終資源獲得倍率"),"obsolete resource final multiplier visible");
  assert.equal(await page.locator('#sheetBody button[data-boost-upgrade]').count(),0);
  assert.equal(await page.locator('#sheetBody button[disabled]').count()>=5,true);
  await page.locator("#boostQuick").click();
  await page.waitForTimeout(450);
  const begun=await page.evaluate(()=>window.KOTOWARI_DEBUG.state());
  assert.equal(begun.boost.active,true);
  assert.ok(begun.boost.seconds<4800);
  assert.ok(begun.boost.accounting.spent>0);
  await page.locator('[data-stage="existence"]').click();
  await page.locator('[data-child="sources"]').click();
  await page.locator('button[data-source-detail]').first().click();
  await page.locator("#confirmDialog").waitFor({state:"visible"});
  const atPause=await page.evaluate(()=>window.KOTOWARI_DEBUG.state());
  await page.waitForTimeout(600);
  const during=await page.evaluate(()=>window.KOTOWARI_DEBUG.state());
  assert.equal(during.boost.seconds,atPause.boost.seconds,"dialog must pause BOOST debit");
  assert.equal(during.boost.accounting.spent,atPause.boost.accounting.spent);
  assert.equal(during.time.elapsed,atPause.time.elapsed,"dialog must pause all stage time");
  await page.locator("#confirmYes").click();
  await page.waitForTimeout(350);
  const resumed=await page.evaluate(()=>window.KOTOWARI_DEBUG.state());
  assert.ok(resumed.boost.seconds<during.boost.seconds,"time-only BOOST must resume after dialog");
  assert.ok(resumed.time.elapsed>during.time.elapsed,"stage time resumes after dialog");
  assert.deepEqual(errors,[]);
  console.log("PASS v327",device,"legacy over-cap, OFF migration, 5 paths and dialog time pause");
  await context.close();
 }
}finally{if(browser)await browser.close();server?.kill("SIGTERM");}