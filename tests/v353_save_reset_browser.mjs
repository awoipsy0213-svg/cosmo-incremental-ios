import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium} from "@playwright/test";
const port=process.env.KOTOWARI_V353_PORT||"8853";
const base=process.env.KOTOWARI_SMOKE_BASE_URL||"http://127.0.0.1:"+port+"/";
const server=process.env.KOTOWARI_SMOKE_BASE_URL?null:spawn("python3",["-m","http.server",port,"--bind","127.0.0.1"],{stdio:"ignore"});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try{
  let ready=false;for(let i=0;i<60;i++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await sleep(200);}
  assert.ok(ready,"game host unavailable");
  browser=await chromium.launch({headless:true});
  for(const [width,height] of [[320,700],[375,812],[1024,900]]){
    const ctx=await browser.newContext({viewport:{width,height}});
    const page=await ctx.newPage(),errors=[];
    page.on("pageerror",e=>errors.push(String(e)));
    const saved=()=>page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
    await page.goto(base+"?dev=1",{waitUntil:"domcontentloaded"});await saved();
    const data=await page.evaluate(async()=>{
      const G=await import("./game.mjs"),S=await import("./save.mjs");
      const s=G.createState(Date.now(),"normal");s.intro.complete=true;s.intro.touches=8;
      s.totalExistenceEarned="1234.567";s.surplusExistence="42.123";s.moment.tap=20;s.sources.SOURCE_01.level=10;
      s.convergenceCount=5;s.boost.seconds=123;s.settings.confirmSaveRestore=false;
      return S.encode(s,"v353-fixture");
    });
    await page.addInitScript(raw=>{
      if(!sessionStorage.getItem("v353-initialized")){
        localStorage.setItem("kotowari_v31_normal",raw);sessionStorage.setItem("v353-initialized","yes");
      }
    },data);
    await page.reload({waitUntil:"domcontentloaded"});await saved();
    const open=async name=>{await page.locator('[data-action="organizer"]').first().click();await page.locator('#organizerLinks [data-organizer="'+name+'"]').click();};
    await open("statistics");
    const cumulative=()=>page.locator("#sheetBody .kw-card").filter({has:page.getByText("累計獲得存在",{exact:true})}).locator("strong");
    assert.equal(await cumulative().textContent(),"1,234.567");
    await open("backup");
    await page.locator('[data-action="protect-save"]').click();
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem("kotowari_v31_normal.protected-backups")||"[]").length===1);
    await page.locator('[data-action="reset-game"]').click();await page.locator("#confirmNo").click();
    assert.equal(await page.evaluate(()=>window.KOTOWARI_DEBUG.state().intro.complete),true);
    await page.locator('[data-action="reset-game"]').click();await page.locator("#confirmYes").click();
    await page.getByText("最終確認",{exact:true}).waitFor();await page.locator("#confirmNo").click();
    assert.equal(await page.evaluate(()=>window.KOTOWARI_DEBUG.state().convergenceCount),5);
    await page.locator('[data-action="reset-game"]').click();await page.locator("#confirmYes").click();
    await page.getByText("最終確認",{exact:true}).waitFor();await page.locator("#confirmYes").click();
    await page.waitForFunction(()=>!window.KOTOWARI_DEBUG.state().intro.complete);
    const reset=await page.evaluate(()=>window.KOTOWARI_DEBUG.state());
    assert.equal(reset.totalExistenceEarned,"0");assert.equal(reset.moment.tap,0);
    assert.equal(reset.sources.SOURCE_01.level,0);assert.equal(reset.convergenceCount,0);
    await open("backup");
    assert.equal(await page.locator("[data-protected-restore]").count(),2);
    await page.locator('[data-protected-restore="1"]').click();await page.locator("#confirmYes").click();
    await page.waitForFunction(()=>window.KOTOWARI_DEBUG.state().convergenceCount===5);
    await open("statistics");assert.equal(await cumulative().textContent(),"1,234.567");
    await open("lab");
    await page.locator('[data-action="enter-test"]').click();
    await page.waitForURL(/lab=1/);await saved();
    assert.equal(await page.evaluate(()=>window.KOTOWARI_DEBUG.state().mode),"lab");
    const normalBefore=await page.evaluate(()=>localStorage.getItem("kotowari_v31_normal"));
    await open("lab");
    await page.locator("#testGrantAmount").fill("1e1000000");
    await page.locator('[data-action="test-grant-orbs"]').click();
    await page.waitForFunction(()=>window.KOTOWARI_DEBUG.state().orbs.includes("e1000000"));
    await page.locator("#testGrantAmount").fill("10");
    await page.locator('[data-action="test-grant-existence"]').click();
    await open("statistics");assert.equal(await cumulative().textContent(),"1,244.567");
    await open("backup");
    await page.locator('[data-action="reset-game"]').click();await page.locator("#confirmYes").click();
    await page.getByText("最終確認",{exact:true}).waitFor();await page.locator("#confirmYes").click();
    await page.waitForFunction(()=>!window.KOTOWARI_DEBUG.state().intro.complete);
    assert.equal(await page.evaluate(()=>localStorage.getItem("kotowari_v31_normal")),normalBefore,"lab reset/grants must not write normal");
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)<=1);
    await page.goto(base+"?dev=1",{waitUntil:"domcontentloaded"});await saved();
    assert.equal(await page.evaluate(()=>window.KOTOWARI_DEBUG.state().convergenceCount),5);
    await open("statistics");assert.equal(await cumulative().textContent(),"1,234.567");
    assert.deepEqual(errors,[],width+" browser errors");
    console.log("PASS v353",width,"manual archive, two cancellations, full reset, restore, lab grants and isolation, lifetime stat");
    await ctx.close();
  }
}finally{await browser?.close();server?.kill("SIGTERM");}
