import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium} from "@playwright/test";

const port=process.env.KOTOWARI_V344_PORT||"8844";
const base=process.env.KOTOWARI_SMOKE_BASE_URL||"http://127.0.0.1:"+port+"/";
const server=process.env.KOTOWARI_SMOKE_BASE_URL?null:
  spawn("python3",["-m","http.server",port,"--bind","127.0.0.1"],{stdio:"ignore"});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let browser;
try{
  let ready=false;
  for(let i=0;i<60;i++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await sleep(200);}
  assert.ok(ready,"v344 Web host unavailable");
  browser=await chromium.launch({headless:true});
  for(const [label,width,height] of [["small",320,700],["phone",375,812],["large",430,932]]){
    const ctx=await browser.newContext({viewport:{width,height}});
    const page=await ctx.newPage(),errors=[];
    page.on("pageerror",e=>errors.push(String(e)));
    assert.equal((await page.goto(base+"?lab=1&dev=1",{waitUntil:"domcontentloaded"}))?.status(),200);
    await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
    await page.evaluate(async()=>{
      const G=await import("./game.mjs");
      const s=G.createState(Date.now(),"lab");
      s.intro.complete=true;
      s.surplusExistence="1234.56789";
      s.totalExistenceEarned="1234.56789";
      s.settings.notation="scientific";
      s.engraving.owned=["ENG-01"];s.engraving.levels={"ENG-01":1};
      window.KOTOWARI_DEBUG.setLabState(s);
    });
    const top=page.locator('[data-common-value="existence"]');
    await top.waitFor({state:"visible"});
    assert.equal(await top.textContent(),"1,235",label+" HUD integer");
    const rect=await top.locator("..").boundingBox();
    const checkRect=async(step)=>{
      const now=await top.locator("..").boundingBox();
      for(const k of ["width","height","x","y"])
        assert.ok(Math.abs(now[k]-rect[k])<1,label+" stable HUD "+step+" "+k);
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
      assert.ok(overflow<=1,label+" no horizontal overflow "+step);
    };
    await top.locator("..").locator("..").click();
    assert.equal(await page.locator("#sheetBody .common-info-detail strong").first().textContent(),"1,235");
    await page.locator('[data-action="return-stage-panel"]').click();
    await checkRect("detail");
    await page.evaluate(()=>{
      const s=window.KOTOWARI_DEBUG.state();
      s.surplusExistence="999999";
      window.KOTOWARI_DEBUG.setLabState(s);
    });
    assert.equal(await top.textContent(),"1,000,000");
    await checkRect("million");
    await page.evaluate(()=>{
      const s=window.KOTOWARI_DEBUG.state();
      s.surplusExistence="999999.001";
      window.KOTOWARI_DEBUG.setLabState(s);
    });
    assert.equal(await top.textContent(),"1.00e+6");
    await checkRect("scientific");
    await page.locator('[data-child="engraving"]').click();
    const cost=page.locator('[data-engraving-entry="ENG-01"] .engraving-cost strong');
    assert.equal(await cost.textContent(),"0.002",label+" trial cost shown to 3 decimals");
    const card=page.locator('[data-engraving-entry="ENG-01"]');
    assert.match(await card.locator(".engraving-purchase-button").getAttribute("title"),/費用 0\.002 存在/);
    await card.locator('[data-engraving-detail="ENG-01"]').click();
    assert.match(await page.locator("#confirmText").textContent(),/必要存在：0\.002/);
    await page.locator("#confirmNo").click();
    assert.deepEqual(errors,[],label+" page errors");
    console.log("PASS v344",label,"HUD decimal/million/scientific, 3-decimal engraving, fixed geometry");
    await ctx.close();
  }
}finally{
  await browser?.close();server?.kill("SIGTERM");
}