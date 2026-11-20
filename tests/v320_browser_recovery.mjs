import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {readFileSync} from "node:fs";
import {chromium} from "@playwright/test";

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
  await recoveredContext.addInitScript(content=>{
    localStorage.setItem("kotowari_v31_normal",content);
  },raw);
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
    const cache=await caches.open("kotowari-handoff:"+new URL(registration.scope).pathname+":3.20.0-astral-recovery");
    return !!(await cache.match(new URL("./source-effects-v315.mjs",registration.scope).href));
  });
  assert.equal(cached,true,"a required transitive module missing from offline app cache");
  await context.setOffline(true);
  await online.reload({waitUntil:"domcontentloaded",timeout:30000});
  await online.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中",{timeout:30000});
  assert.match(await online.locator("#buildLabel").textContent(),/3\.20/);
  await online.locator('button[data-action="organizer"]').first().click();
  assert.equal(await online.locator("#organizerDrawer").evaluate(el=>el.open),true);
  assert.deepEqual(offlineErrors,[]);
  console.log("PASS browser offline: complete cached module graph boots and organizer works without network");
  await context.close();
}finally{
  if(browser)await browser.close();
  server?.kill("SIGTERM");
}
