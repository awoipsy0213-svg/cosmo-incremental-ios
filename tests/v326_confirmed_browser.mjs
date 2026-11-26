import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium} from "@playwright/test";
const port=process.env.KOTOWARI_V326_PORT||"8816";
const base=process.env.KOTOWARI_SMOKE_BASE_URL||"http://127.0.0.1:"+port+"/";
const server=process.env.KOTOWARI_SMOKE_BASE_URL?null:
  spawn("python3",["-m","http.server",port,"--bind","127.0.0.1"],{stdio:"ignore"});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try{
 let ready=false;
 for(let i=0;i<40;i++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await sleep(250);}
 assert.ok(ready,"Ver3.27 test server not available");
 browser=await chromium.launch({headless:true});
 for(const [name,width,height] of [["phone",375,812],["desktop",1024,900]]){
  const context=await browser.newContext({viewport:{width,height}});
  const page=await context.newPage(),errors=[];
  page.on("pageerror",err=>errors.push(String(err)));
  assert.equal((await page.goto(base,{waitUntil:"domcontentloaded"}))?.status(),200);
  await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
  const fixture=await page.evaluate(async()=>{
    const G=await import("./game.mjs"),S=await import("./save.mjs");
    const at=Date.now(),s=G.createState(at,"normal");
    s.intro.complete=true;s.time.unlocked=true;
    s.sources.SOURCE_01.level=25;s.sources.SOURCE_02.level=50;
    s.moment.setsuna23=5;
    s.momentRuntime.combo=9;
    s.momentRuntime.comboUntil=at+60000;s.momentRuntime.comboExpire=at+60000;
    s.boost.seconds=125;
    s.boost.accounting.earned=125;
    s.boost.accounting.entries=[{at,kind:"earned",seconds:125,note:"現実オフライン"}];
    s.settings.hapticTap=true;
    return S.encode(s,"v326-ui-fixture");
  });
  await page.addInitScript(raw=>localStorage.setItem("kotowari_v31_normal",raw),fixture);
  await page.reload({waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
  assert.match(await page.locator("#buildLabel").textContent(),/^3\.57$/);
  assert.match(await page.locator("#worldDetails").textContent(),/次10まで1回/);
  await page.locator('[data-stage="existence"]').click();
  await page.locator('[data-child="sources"]').click();
  const sourceText=await page.locator("#sheetBody").textContent();
  assert.ok(sourceText.includes("源の共振 3/630"),"source progress missing");
  // Full source milestones are now available through the fixed-row detail modal.
  await page.locator('[data-source-summary]').click();
  assert.ok((await page.locator("#confirmText").textContent()).includes("SOURCE_01 Lv.50"),"next milestone missing from detail");
  await page.locator("#confirmYes").click();
  await page.locator('.app-top [data-action="organizer"]').click();
  await page.locator('[data-organizer="boost"]').click();
  const boostText=await page.locator("#sheetBody").textContent();
  assert.ok(boostText.includes("BOOST取引記録"),"BOOST audit missing");
  await page.locator(".boost-audit summary").click();
  assert.ok((await page.locator(".boost-audit").textContent()).includes("125.000秒"),"BOOST audit entry missing");
  await page.locator('.app-top [data-action="organizer"]').click();
  await page.locator('[data-organizer="settings"]').click();
  const input=page.locator('[data-pref="hapticTap"]');
  assert.equal(await input.isChecked(),true,"saved haptic preference missing");
  await input.uncheck();
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem("kotowari_v31_normal")).data);
  assert.equal(stored.settings.hapticTap,false,"haptic preference not saved");
  // Boot resumes a few milliseconds of real offline time after the fixture.
  assert.ok(stored.boost.accounting.earned>=125&&stored.boost.accounting.earned<126,
    "unexpected extra BOOST accounting after startup: "+stored.boost.accounting.earned);
  assert.ok(stored.boost.accounting.entries.some(x=>x.note==="現実オフライン"));
  assert.deepEqual(errors,[]);
  console.log("PASS v326",name,"combo milestones, source resonance, BOOST audit and haptic persistence");
  await context.close();
 }
}finally{if(browser)await browser.close();server?.kill("SIGTERM");}