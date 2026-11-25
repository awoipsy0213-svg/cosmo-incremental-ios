import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium} from "@playwright/test";
const port=process.env.KOTOWARI_V340_PORT||"8840";
const base=process.env.KOTOWARI_SMOKE_BASE_URL||"http://127.0.0.1:"+port+"/";
const server=process.env.KOTOWARI_SMOKE_BASE_URL?null:
  spawn("python3",["-m","http.server",port,"--bind","127.0.0.1"],{stdio:"ignore"});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let browser;
try{
  let ready=false;
  for(let n=0;n<60;n++){try{if((await fetch(base)).ok){ready=true;break}}catch{}await wait(200)}
  assert.ok(ready,"game host not available");
  browser=await chromium.launch({headless:true});
  for(const [label,width,height] of [["320",320,700],["375",375,812],["430",430,932]]){
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
    const page=await context.newPage(),errors=[];
    page.on("pageerror",error=>errors.push(String(error)));
    await page.goto(base+"?lab=1&dev=1",{waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
    await page.evaluate(async()=>{
      const G=await import("./game.mjs"),s=G.createState(Date.now(),"lab");
      s.intro.complete=true;s.settings.confirmMaxPurchase=false;s.sources.SOURCE_01.level=24;
      G.addOrbs(s,"1e55");window.KOTOWARI_DEBUG.setLabState(s);
    });
    await page.locator('[data-stage="existence"]').click();
    await page.locator('[data-child="sources"]').click();
    const source=page.locator('[data-source-entry="SOURCE_01"]'),button=source.locator('[data-purchase="source"]');
    assert.equal(await page.locator(".source-card").count(),30);
    const geometry=async()=>{
      const c=await source.boundingBox(),b=await button.boundingBox();
      return [c.x,c.y,c.width,c.height,b.x,b.y,b.width,b.height].map(n=>+n.toFixed(2));
    };
    const initial=await geometry();
    assert.equal(initial[3],66,label+" card height fixed");
    assert.equal(initial[7],56,label+" action height fixed");
    const before=await page.evaluate(async()=>{
      const G=await import("./game.mjs"),N=await import("./numbers.mjs");
      const s=window.KOTOWARI_DEBUG.state();
      return {left:"毎秒 "+N.formatOrbAmount(G.sourceProduction(s,"SOURCE_01"))+" オーブ",
        current:"現 "+N.formatOrbAmount(G.sourceProduction(s,"SOURCE_01"))+"/秒",
        gain:"+"+N.formatOrbAmount(G.sourceNextGain(s,"SOURCE_01"))+"/秒",
        cost:N.formatOrbAmount(G.purchaseQuote(s,"source","SOURCE_01").cost,"ceil")};
    });
    assert.equal(await source.locator('[data-source-next]').textContent(),before.left);
    assert.equal(await source.locator('[data-source-total]').textContent(),"次 Lv.25 · 生産×2");
    assert.equal(await button.locator('[data-quote-current]').textContent(),before.current);
    assert.equal(await button.locator('[data-quote-gain]').textContent(),before.gain);
    assert.equal(await button.locator('[data-quote-label]').textContent(),before.cost);
    assert.doesNotMatch((await source.textContent())+(await button.textContent()),/\d+\.\d+/u,
      label+" rendered orb values have no fractional decimals");
    await button.click();
    const afterState=await page.evaluate(()=>window.KOTOWARI_DEBUG.state());
    assert.equal(afterState.sources.SOURCE_01.level,25);
    assert.equal(afterState.sources.SOURCE_01.effects.length,0,label+" no new milestone special");
    assert.equal(await source.locator('[data-source-total]').textContent(),"次 Lv.50 · 生産×2");
    const expected=await page.evaluate(async()=>{
      const G=await import("./game.mjs"),N=await import("./numbers.mjs");
      const s=window.KOTOWARI_DEBUG.state();
      return "毎秒 "+N.formatOrbAmount(G.sourceProduction(s,"SOURCE_01"))+" オーブ";
    });
    assert.equal(await source.locator('[data-source-next]').textContent(),expected);
    const now=await geometry();
    initial.forEach((x,i)=>assert.ok(Math.abs(x-now[i])<.5,label+" stable geometry "+i));
    await source.locator('[data-source-detail]').click();
    const detail=await page.locator("#confirmText").textContent();
    assert.match(detail,/節目達成ごとに生産×2/);
    assert.doesNotMatch(detail,/次の効果節目|特別な効果：？？？/);
    await page.locator("#confirmYes").click();
    assert.ok((await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth))<=1);
    const cycle=source.locator("[data-breakthrough]");
    assert.equal(await cycle.isDisabled(),true,"individual cycle below cap disabled");
    await page.evaluate(()=>{
      const s=window.KOTOWARI_DEBUG.state();
      s.sources.SOURCE_01.level=1000000;
      s.settings.confirmSourceBreakthrough=true;
      window.KOTOWARI_DEBUG.setLabState(s);
    });
    assert.equal(await cycle.isEnabled(),true,"first source alone at cap can break through");
    assert.equal(await cycle.textContent(),"＋1");
    await cycle.click();
    assert.match(await page.locator("#confirmText").textContent(),/生産は大幅に低下/);
    await page.locator("#confirmNo").click();
    assert.equal(await page.evaluate(()=>window.KOTOWARI_DEBUG.state().sources.SOURCE_01.level),1000000);
    await cycle.click();
    await page.locator("#confirmYes").click();
    const afterCycle=await page.evaluate(()=>window.KOTOWARI_DEBUG.state());
    assert.equal(afterCycle.sources.SOURCE_01.level,1);
    assert.equal(afterCycle.sources.SOURCE_01.plus,1);
    assert.equal(afterCycle.sourceCycle.unlocked,false);
    assert.equal(await cycle.isDisabled(),true);
    assert.deepEqual(errors,[],label+" JS errors");
    console.log("PASS v340",label,"numeric Source rate, integer-only orbs, milestone x2 gain, fixed action, no placeholder specials");
    await context.close();
  }
}finally{if(browser)await browser.close();server?.kill("SIGTERM")}
