import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium} from "@playwright/test";

const port=process.env.KOTOWARI_V337_PORT||"8837";
const base=process.env.KOTOWARI_SMOKE_BASE_URL||"http://127.0.0.1:"+port+"/";
const server=process.env.KOTOWARI_SMOKE_BASE_URL?null:
  spawn("python3",["-m","http.server",port,"--bind","127.0.0.1"],{stdio:"ignore"});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let browser;
try{
  let ready=false;
  for(let i=0;i<60;i++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await sleep(200);}
  assert.ok(ready,"v337 Web host unreachable");
  browser=await chromium.launch({headless:true});
  for(const [label,width,height] of [["narrow",320,700],["phone",375,812],["wide",430,932]]){
    const ctx=await browser.newContext({viewport:{width,height}});
    const page=await ctx.newPage(),errors=[];
    page.on("pageerror",error=>errors.push(String(error)));
    await page.goto(base+"?lab=1&dev=1",{waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
    await page.evaluate(async()=>{
      const G=await import("./game.mjs");
      const s=G.createState(Date.now(),"lab");
      s.intro.complete=true;
      s.surplusExistence="100";
      s.engraving.owned=["ENG-23","ENG-24","ENG-26","ENG-27","ENG-28"];
      s.engraving.levels=Object.fromEntries(s.engraving.owned.map(id=>[id,1]));
      G.addOrbs(s,"1e60");
      window.KOTOWARI_DEBUG.setLabState(s);
    });
    await page.locator("#automationQuick").click();
    assert.equal(await page.locator(".automation-status").count(),3,label+" status summaries");
    assert.equal(await page.locator(".automation-row[data-automation-buy]").count(),0,label+" detail collapsed by default");
    assert.equal(await page.locator('[data-auto-master]').isChecked(),true);
    assert.equal(await page.locator('[data-action="toggle-auto-details"]').getAttribute("aria-expanded"),"false");
    const overviewBefore=await page.locator(".automation-overview").boundingBox();
    assert.equal(Math.round(overviewBefore.height),111,label+" fixed summary height");
    await page.locator('[data-action="toggle-auto-details"]').click();
    assert.equal(await page.locator(".automation-row[data-automation-buy]").count(),2);
    assert.equal(await page.locator(".automation-convergence").count(),1);
    assert.equal(await page.locator('[data-auto-mode]').count(),4,label+" four choice buttons");
    const before=await page.evaluate(()=>{
      const rect=element=>{const r=element.getBoundingClientRect();return [r.x,r.y,r.width,r.height];};
      const summary=document.querySelector(".automation-overview");
      const moment=document.querySelector('.automation-row[data-automation-buy="moment"]');
      return {summary:[...rect(summary)],moment:[...rect(moment)]};
    });
    await page.locator('[data-auto-master]').uncheck();
    assert.equal(await page.evaluate(()=>window.KOTOWARI_DEBUG.state().settings.automationEnabled),false);
    assert.match(await page.locator('[data-auto-master-state]').textContent(),/一時停止/);
    const after=await page.evaluate(()=>{
      const rect=element=>{const r=element.getBoundingClientRect();return [r.x,r.y,r.width,r.height];};
      const summary=document.querySelector(".automation-overview");
      const moment=document.querySelector('.automation-row[data-automation-buy="moment"]');
      return {summary:[...rect(summary)],moment:[...rect(moment)]};
    });
    for(const name of ["summary","moment"])before[name].forEach((v,i)=>{
      assert.ok(Math.abs(v-after[name][i])<.8,label+" geometry stable "+name+" "+i);
    });
    await page.locator('[data-auto-buy-kind="moment"][data-auto-field="priority"]').selectOption("expensive");
    await page.locator('[data-auto-buy-kind="moment"][data-auto-field="intervalSeconds"]').selectOption("10");
    await page.locator('[data-auto-buy-kind="source"][data-auto-field="enabled"]').uncheck();
    await page.locator('[data-auto-mode="minutes"]').click();
    await page.locator('[data-auto-converge="intervalMinutes"]').selectOption("3");
    assert.equal(await page.locator('[data-auto-mode="minutes"]').getAttribute("aria-pressed"),"true");
    assert.equal(await page.locator(".automation-convergence").evaluate(el=>Math.round(el.getBoundingClientRect().height)),185);
    const saved=await page.evaluate(()=>window.KOTOWARI_DEBUG.state());
    assert.equal(saved.settings.automationEnabled,false);
    assert.equal(saved.engraving.autoBuy.moment.priority,"expensive");
    assert.equal(saved.engraving.autoBuy.moment.intervalSeconds,10);
    assert.equal(saved.engraving.autoBuy.source.enabled,false);
    assert.equal(saved.engraving.autoConverge.mode,"minutes");
    assert.equal(saved.engraving.autoConverge.intervalMinutes,3);
    for(const id of ["auto-time","auto-universe","auto-life","auto-existence"]){
      await page.locator('[data-child="'+id+'"]').click();
      assert.equal(await page.locator('[data-child="'+id+'"]').getAttribute("aria-pressed"),"true");
      assert.equal(await page.locator(".automation-status").count(),3,label+" status remains visible");
    }
    assert.ok((await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth))<=1,
      label+" no horizontal overflow");
    await page.reload({waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
    const restored=await page.evaluate(()=>window.KOTOWARI_DEBUG.state());
    assert.equal(restored.settings.automationEnabled,false,label+" master pause persists");
    assert.equal(restored.engraving.autoBuy.moment.intervalSeconds,10);
    assert.equal(restored.engraving.autoBuy.source.enabled,false);
    assert.equal(restored.engraving.autoConverge.mode,"minutes");
    await page.locator("#automationQuick").click();
    await page.locator('[data-auto-master]').check();
    assert.equal(await page.evaluate(()=>window.KOTOWARI_DEBUG.state().settings.automationEnabled),true);
    const resumed=await page.evaluate(()=>window.KOTOWARI_DEBUG.state());
    assert.equal(resumed.engraving.autoBuy.moment.priority,"expensive",label+" preference restored after resume");
    assert.equal(resumed.engraving.autoBuy.source.enabled,false,label+" per-feature off remains off");
    assert.deepEqual(errors,[],label+" browser JS errors");
    console.log("PASS v337",label,"global pause / summary / fixed-size detail / four modes / reload");
    await ctx.close();
  }
}finally{if(browser)await browser.close();server?.kill("SIGTERM");}
