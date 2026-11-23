import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {readFileSync} from "node:fs";
import {chromium} from "@playwright/test";
import {createState} from "../game.mjs";
import {encode} from "../save.mjs";

const port=process.env.KOTOWARI_RECOVERY_PORT||"8766";
const publicRoot=process.env.KOTOWARI_SMOKE_BASE_URL||"";
const root=publicRoot||"http://127.0.0.1:"+port+"/";
const server=publicRoot?null:spawn("python3",["-m","http.server",port,"--bind","127.0.0.1"],{stdio:"ignore"});
const raw='{"kind":"kotowari-save","version":31,"checksum":"00000000","data":{}}';
let browser=null;
try{
  let alive=false;
  for(let tries=0;tries<40;tries++){
    try{if((await fetch(root)).ok){alive=true;break;}}catch(e){}
    await new Promise(r=>setTimeout(r,250));
  }
  assert.ok(alive,"test server unavailable");
  browser=await chromium.launch({headless:true});
  const recoveredContext=await browser.newContext({viewport:{width:375,height:812},acceptDownloads:true});
  const recoveredFixture=createState(1763600000000);recoveredFixture.intro.complete=true;
  recoveredFixture.orbs="123";recoveredFixture.convergenceCount=5;
  const good=encode(recoveredFixture,"recovery-browser-fixture");
  await recoveredContext.addInitScript(payload=>{
    localStorage.setItem("kotowari_v31_normal",payload.raw);
    localStorage.setItem("kotowari_v31_normal.backups",
      JSON.stringify([{at:1763600000000,raw:payload.good}]));
  },{raw,good});
  const page=await recoveredContext.newPage(),errors=[];
  page.on("pageerror",e=>errors.push(String(e)));
  assert.equal((await page.goto(root,{waitUntil:"domcontentloaded"}))?.status(),200);
  await page.waitForFunction(()=>document.querySelector("#noticeText")?.textContent.includes("主セーブを読み込めません"));
  assert.equal(await page.evaluate(()=>localStorage.getItem("kotowari_v31_normal")),raw);
  await page.locator('button[data-action="organizer"]').first().click();
  await page.locator('button[data-organizer="backup"]').click();
  await page.locator('button[data-action="export-save"]').click();
  await page.waitForFunction(()=>document.querySelector("#toast")?.textContent.includes("主セーブ保護中"));
  const ready=page.waitForEvent("download");
  await page.locator('button[data-action="export-corrupt"]').click();
  const dl=await ready;
  assert.equal(readFileSync(await dl.path(),"utf8"),raw);
  assert.equal(await page.evaluate(()=>localStorage.getItem("kotowari_v31_normal")),raw);
  // I-34: compare history contents, choose explicitly, keep the corrupt raw.
  assert.match(await page.locator(".backup-comparison").allTextContents().then(x=>x.join(" ")),/収束 5回/);
  assert.equal(await page.locator('button[data-restore="0"]').isEnabled(),true);
  await page.locator('button[data-restore="0"]').click();
  assert.equal(await page.locator("#confirmDialog").evaluate(el=>el.open),true);
  await page.locator("#confirmYes").click();
  await page.waitForFunction(()=>{
    try{return JSON.parse(localStorage.getItem("kotowari_v31_normal"))?.data?.convergenceCount===5;}
    catch{return false;}
  });
  assert.equal(await page.evaluate(()=>localStorage.getItem("kotowari_v31_normal.before-import")),raw);
  assert.deepEqual(errors,[]);
  console.log("PASS browser broken-save: quarantined, raw export works, no blank backup, main untouched");
  await recoveredContext.close();

  const context=await browser.newContext({viewport:{width:375,height:812},serviceWorkers:"allow"});
  const online=await context.newPage(),offlineErrors=[];
  online.on("pageerror",e=>offlineErrors.push(String(e)));
  assert.equal((await online.goto(root,{waitUntil:"domcontentloaded"}))?.status(),200);
  await online.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
  await online.evaluate(async()=>{await navigator.serviceWorker.ready;});
  await online.waitForFunction(()=>!!navigator.serviceWorker.controller,{timeout:30000});
  const cached=await online.evaluate(async()=>{
    const registration=await navigator.serviceWorker.ready;
    const cache=await caches.open("kotowari-handoff:"+new URL(registration.scope).pathname+":3.40.0-source-milestones-engraving-v342-grade-v343");
    return !!(await cache.match(new URL("./source-effects-v315.mjs",registration.scope).href));
  });
  assert.equal(cached,true,"a required transitive module missing from offline app cache");
  await context.setOffline(true);
  await online.reload({waitUntil:"domcontentloaded",timeout:30000});
  await online.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中",{timeout:30000});
  assert.match(await online.locator("#buildLabel").textContent(),/3\.34/);
  await online.locator('button[data-action="organizer"]').first().click();
  assert.equal(await online.locator("#organizerDrawer").evaluate(el=>el.open),true);
  assert.deepEqual(offlineErrors,[]);
  console.log("PASS browser offline: complete cached module graph boots and organizer works without network");
  await context.close();
}finally{
  if(browser)await browser.close();
  server?.kill("SIGTERM");
}
