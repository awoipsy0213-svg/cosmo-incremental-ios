import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium} from "@playwright/test";
const port=process.env.KOTOWARI_V338_PORT||"8838";
const base=process.env.KOTOWARI_SMOKE_BASE_URL||"http://127.0.0.1:"+port+"/";
const server=process.env.KOTOWARI_SMOKE_BASE_URL?null:
  spawn("python3",["-m","http.server",port,"--bind","127.0.0.1"],{stdio:"ignore"});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const geometry=()=> {
  const card=document.querySelector("#sheetBody .purchase-card, #sheetBody .engraving-card");
  const button=card?.querySelector(".dense-purchase-button");
  const rect=el=>{const r=el.getBoundingClientRect();return [r.x,r.y,r.width,r.height].map(x=>+x.toFixed(2));};
  return {card:rect(card),button:rect(button),overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
};
let browser;
try{
  let ready=false;
  for(let i=0;i<60;i++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await pause(200);}
  assert.ok(ready,"game host unreachable");
  browser=await chromium.launch({headless:true});
  for(const [label,width,height] of [["320",320,700],["375",375,812],["430",430,932]]){
    const ctx=await browser.newContext({viewport:{width,height}});
    const page=await ctx.newPage(),errors=[];
    page.on("pageerror",e=>errors.push(String(e)));
    await page.goto(base+"?lab=1&dev=1",{waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
    await page.evaluate(async()=>{
      const G=await import("./game.mjs"),s=G.createState(Date.now(),"lab");
      s.intro.complete=true;s.surplusExistence="5";
      s.settings.confirmMaxPurchase=false;
      window.KOTOWARI_DEBUG.setLabState(s);
    });
    await page.locator('[data-stage="existence"]').click();
    await page.locator('[data-child="moment"]').click();
    const initial=await page.evaluate(geometry);
    assert.equal(initial.card[3],66,label+" card height");
    assert.equal(initial.button[3],56,label+" button height");
    const tap=page.locator('[data-purchase="moment"][data-id="tap"]');
    assert.equal(await tap.isDisabled(),true);
    assert.equal(await tap.locator("[data-quote-count]").textContent(),"0");
    await page.evaluate(async()=>{
      const G=await import("./game.mjs"),s=window.KOTOWARI_DEBUG.state();
      G.addOrbs(s,"1e55");window.KOTOWARI_DEBUG.setLabState(s);
    });
    assert.equal(await tap.isEnabled(),true);
    assert.equal(await tap.locator("[data-quote-count]").textContent(),"1");
    assert.match(await tap.locator("[data-quote-gain]").textContent(),/^→/);
    const stable=async(phase)=>{
      const b=await page.evaluate(geometry);
      for(const field of ["card","button"])initial[field].forEach((value,i)=>
        assert.ok(Math.abs(value-b[field][i])<.4,label+" geometry "+phase+" "+field+"["+i+"]"));
      assert.ok(b.overflow<=1,label+" horizontal overflow "+phase);
    };
    await stable("affordable");
    await page.locator("#purchaseCycle").click(); // x10
    assert.equal(await tap.locator("[data-quote-count]").textContent(),"10");
    await stable("x10");
    await page.locator("#purchaseCycle").click(); // NEXT
    await stable("NEXT");
    await page.locator("#purchaseCycle").click(); // MAX
    assert.ok(Number((await tap.locator("[data-quote-count]").textContent()).replaceAll(",",""))>10);
    await stable("MAX");
    await page.locator('[data-child="sources"]').click();
    const src=page.locator('[data-purchase="source"][data-id="SOURCE_01"]');
    assert.match(await src.locator("[data-quote-gain]").textContent(),/^\+/);
    const sourceBefore=await page.evaluate(geometry);
    const q=await page.evaluate(async()=>{
      const G=await import("./game.mjs");return G.purchaseQuote(window.KOTOWARI_DEBUG.state(),"source","SOURCE_01");
    });
    assert.equal(Number((await src.locator("[data-quote-count]").textContent()).replaceAll(",","")),q.count);
    await src.click();
    assert.equal(await page.evaluate(()=>window.KOTOWARI_DEBUG.state().sources.SOURCE_01.level),q.count);
    const sourceAfter=await page.evaluate(geometry);
    for(const field of ["card","button"])sourceBefore[field].forEach((value,i)=>
      assert.ok(Math.abs(value-sourceAfter[field][i])<.4,label+" Source geometry "+i));
    await page.locator('[data-child="engraving"]').click();
    const engravingBefore=await page.locator(".engraving-card").first().boundingBox();
    assert.equal(engravingBefore.height,66);
    const engr=page.locator('[data-engraving-buy="ENG-01"]');
    assert.match(await engr.locator(".purchase-cost").textContent(),/存在/);
    await engr.click();
    assert.ok(await page.locator('[data-engraving-trial-upgrade="ENG-01"]').count());
    const engravingAfter=await page.locator(".engraving-card").first().boundingBox();
    assert.equal(engravingAfter.height,engravingBefore.height);
    assert.ok((await page.evaluate(geometry)).overflow<=1);
    assert.deepEqual(errors,[],label+" browser errors");
    console.log("PASS v338",label,"cost / quantity / gain / stable Source & Engraving cards");
    await ctx.close();
  }
}finally{if(browser)await browser.close();server?.kill("SIGTERM");}
