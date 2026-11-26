import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium} from "@playwright/test";
const port=process.env.KOTOWARI_V328_PORT||"8828";
const root=process.env.KOTOWARI_SMOKE_BASE_URL||"http://127.0.0.1:"+port+"/";
const server=process.env.KOTOWARI_SMOKE_BASE_URL?null:spawn("python3",["-m","http.server",port,"--bind","127.0.0.1"],{stdio:"ignore"});
const sleep=t=>new Promise(resolve=>setTimeout(resolve,t));
let browser=null;
try{
  let connected=false;for(let n=0;n<40;n++){try{if((await fetch(root)).ok){connected=true;break;}}catch{}await sleep(300);}
  assert.ok(connected,"v328 browser host unavailable");
  browser=await chromium.launch({headless:true});
  for(const [label,width,height] of [["mobile",375,812],["desktop",1024,900]]){
    const context=await browser.newContext({viewport:{width,height}});
    const page=await context.newPage(),errors=[];
    page.on("pageerror",error=>errors.push(String(error)));
    assert.equal((await page.goto(root+"?legacy=1&dev=1",{waitUntil:"domcontentloaded"}))?.status(),200);
    await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
    const fixture=await page.evaluate(async()=>{
      const G=await import("./game.mjs"),S=await import("./save.mjs");
      const s=G.createState(Date.now()-3600000);s.intro.complete=true;
      s.orbs="123.456";s.totalOrbs="123.456";s.boost.seconds=200;
      return S.encode(s,"v328-fixture");
    });
    await page.addInitScript(raw=>localStorage.setItem("kotowari_v31_normal",raw),fixture);
    await page.reload({waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
    assert.equal(await page.locator("#commonInfoBar .common-info-item").count(),2);
    assert.equal(await page.locator("#commonInfoBar [data-common-value='timeSpeed']").textContent(),"×1");
    assert.equal(await page.locator("#primaryValue").textContent(),"123");
    assert.equal(await page.locator("#boostQuick").count(),1);
    assert.equal(await page.locator("#noticeBar").isVisible(),true,"offline reward notice");
    await page.waitForTimeout(3200);
    assert.equal(await page.locator("#noticeBar").isVisible(),false,"3-second notice fade");
    await page.locator("#boostQuick").click();
    await page.waitForFunction(()=>document.querySelector('[data-common-value="timeSpeed"]')?.textContent==="×2");
    await page.locator("#boostQuick").click();
    await page.waitForFunction(()=>document.querySelector('[data-common-value="timeSpeed"]')?.textContent==="×1");
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("kotowari_v31_normal")).data);
    assert.equal(saved.schemaVersion,31);
    assert.ok(saved.boost.seconds>=200,"offline gain retained without spending");
    assert.ok(saved.boost.timeOnlyMigration,"time-only migration record preserved");
    assert.equal(errors.length,0,label+" JS errors: "+errors.join("; "));
    console.log("PASS v328",label,"shared HUD, BOOST control, orb integer, offline notice fade, save");
    await context.close();
  }
}finally{if(browser)await browser.close();server?.kill("SIGTERM");}
