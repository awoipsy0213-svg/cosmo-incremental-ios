import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium} from "@playwright/test";
const port=process.env.KOTOWARI_V339_PORT||"8839";
const base=process.env.KOTOWARI_SMOKE_BASE_URL||"http://127.0.0.1:"+port+"/";
const server=process.env.KOTOWARI_SMOKE_BASE_URL?null:
  spawn("python3",["-m","http.server",port,"--bind","127.0.0.1"],{stdio:"ignore"});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let browser;
try{
  let started=false;
  for(let i=0;i<60;i++){try{if((await fetch(base)).ok){started=true;break;}}catch{}await wait(200)}
  assert.ok(started,"game host not accessible");
  browser=await chromium.launch({headless:true});
  for(const [label,width,height] of [["320",320,700],["375",375,812],["430",430,932]]){
    const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
    const page=await ctx.newPage(),errors=[];
    page.on("pageerror",error=>errors.push(String(error)));
    await page.goto(base+"?lab=1&dev=1",{waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
    await page.evaluate(async()=>{
      const G=await import("./game.mjs");
      const s=G.createState(Date.now(),"lab");s.intro.complete=true;s.surplusExistence="5";
      s.settings.confirmMaxPurchase=false;window.KOTOWARI_DEBUG.setLabState(s);
    });
    await page.locator('[data-stage="existence"]').click();
    await page.locator('[data-child="moment"]').click();
    assert.equal(await page.locator('.moment-card').count(),30);
    assert.equal(await page.locator('.moment-live-effect').first().textContent(),"タップの獲得量を増加");
    assert.equal(await page.locator('.moment-next-effect').first().textContent(),"1回あたりの基礎オーブ");
    const tap=page.locator('[data-purchase="moment"][data-id="tap"]');
    assert.match(await tap.locator('[data-quote-current]').textContent(),/^現 /);
    const read=()=>page.evaluate(()=>{
      const card=document.querySelector(".moment-card,.source-card");
      const buy=card.querySelector(".dense-purchase-button");
      const rect=e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height].map(x=>+x.toFixed(2));};
      return {card:rect(card),buy:rect(buy),overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
    });
    const before=await read();
    assert.equal(before.card[3],66,label+" fixed card height");
    assert.equal(before.buy[3],56,label+" fixed purchase height");
    const color=await page.locator(".moment-card").first().evaluate(el=>{
      const button=el.querySelector(".dense-purchase-button");
      return {card:getComputedStyle(el).backgroundColor,
        heading:getComputedStyle(el.querySelector(".card-top strong")).color,
        disabled:getComputedStyle(button).backgroundColor};
    });
    assert.equal(color.card,"rgb(255, 255, 255)",label+" white card");
    assert.equal(color.heading,"rgb(24, 25, 33)",label+" black heading");
    assert.notEqual(color.disabled,"rgb(85, 43, 158)",label+" locked item isn't purple");
    await page.evaluate(async()=>{
      const G=await import("./game.mjs");
      const s=window.KOTOWARI_DEBUG.state();G.addOrbs(s,"1e65");window.KOTOWARI_DEBUG.setLabState(s);
    });
    assert.equal(await tap.isEnabled(),true);
    assert.match(await tap.locator('[data-quote-current]').textContent(),/^現 /);
    assert.match(await tap.locator('[data-quote-gain]').textContent(),/^→/);
    const buyColors=await tap.evaluate(el=>({
      background:getComputedStyle(el).backgroundColor,
      foreground:getComputedStyle(el.querySelector(".purchase-action")).color
    }));
    assert.equal(buyColors.background,"rgb(85, 43, 158)",label+" purple active action");
    assert.equal(buyColors.foreground,"rgb(255, 255, 255)",label+" white purchase text");
    const stable=async(s)=>{
      const after=await read();
      for(const field of ["card","buy"])before[field].forEach((n,i)=>
        assert.ok(Math.abs(after[field][i]-n)<.5,label+" stable "+s+" "+field+" "+i));
      assert.ok(after.overflow<=1,label+" horizontal overflow "+s);
    };
    await stable("orbs");
    const currentBefore=await tap.locator('[data-quote-current]').textContent();
    await tap.click();
    assert.notEqual(await tap.locator('[data-quote-current]').textContent(),currentBefore,label+" current numeric changes after purchase");
    await stable("purchase");
    await page.locator('#purchaseCycle').click();
    assert.equal(await tap.locator('[data-quote-count]').textContent(),"10");
    await stable("bulk mode");
    await page.locator('[data-child="sources"]').click();
    const source=page.locator('[data-purchase="source"][data-id="SOURCE_01"]');
    assert.match(await page.locator('[data-source-next="SOURCE_01"]').textContent(),/^毎秒 [^.]*(?: オーブ)$/);
    assert.match(await page.locator('[data-source-total="SOURCE_01"]').textContent(),/次 Lv\..*生産×2/);
    const sourceCurrent=await source.locator('[data-quote-current]').textContent();
    const sourceGain=await source.locator('[data-quote-gain]').textContent();
    assert.match(sourceCurrent,/^現 /);
    assert.match(sourceGain,/^\+/);
    const sourceBefore=await page.locator(".source-card").first().boundingBox();
    await source.click();
    assert.notEqual(await source.locator('[data-quote-current]').textContent(),sourceCurrent);
    const sourceAfter=await page.locator(".source-card").first().boundingBox();
    assert.equal(sourceAfter.height,sourceBefore.height);
    await page.locator('[data-source-detail="SOURCE_01"]').click();
    assert.equal(await page.locator("#confirmDialog").evaluate(el=>el.open),true);
    await page.locator("#confirmYes").click();
    assert.deepEqual(errors,[],label+" JS errors");
    console.log("PASS v339",label,"concise effects, source milestones, purple/white contrast, current/gain and fixed geometry");
    await ctx.close();
  }
}finally{if(browser)await browser.close();server?.kill("SIGTERM")}
