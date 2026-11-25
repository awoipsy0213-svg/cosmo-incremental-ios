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
    assert.equal(await page.locator(".automation-status,.stage-auto-tile,[data-action='toggle-auto-details'],[data-auto-master-state]").count(),0,label+" no redundant summaries");
    assert.equal(await page.locator("#sheetHeading").textContent(),"自動化");
    assert.equal(await page.locator("#childTabs [data-child^='auto-']").count(),4);
    assert.equal(await page.locator('[data-child="auto-universe"]').textContent(),"？？？");
    assert.equal(await page.locator('[data-child="auto-life"]').textContent(),"？？？");
    assert.equal(await page.locator(".automation-row[data-automation-buy]").count(),2,label+" direct controls");
    assert.equal(await page.locator('[data-auto-master]').isChecked(),true);
    assert.equal(await page.locator(".automation-overview").textContent(),"全体自動化");
    const switchVisual=await page.locator('[data-auto-master]').evaluate(el=>({
      appearance:getComputedStyle(el).appearance,width:el.getBoundingClientRect().width,
      radius:getComputedStyle(el).borderRadius
    }));
    assert.equal(switchVisual.appearance,"none",label+" toggle renders as a switch");
    assert.ok(switchVisual.width>=34,label+" switch touch track is visible");

    const overviewBefore=await page.locator(".automation-overview").boundingBox();
    assert.equal(Math.round(overviewBefore.height),44,label+" compact master-only height");
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
    assert.equal(await page.locator('[data-auto-master]').isChecked(),false);
    const after=await page.evaluate(()=>{
      const rect=element=>{const r=element.getBoundingClientRect();return [r.x,r.y,r.width,r.height];};
      const summary=document.querySelector(".automation-overview");
      const moment=document.querySelector('.automation-row[data-automation-buy="moment"]');
      return {summary:[...rect(summary)],moment:[...rect(moment)]};
    });
    for(const name of ["summary","moment"])before[name].forEach((v,i)=>{
      assert.ok(Math.abs(v-after[name][i])<.8,label+" geometry stable "+name+" "+i);
    });
    await page.locator('[data-auto-buy-kind="moment"][data-auto-field="priority"]').selectOption("grade");
    await page.locator('[data-auto-buy-kind="moment"][data-auto-field="intervalSeconds"]').selectOption("10");
    await page.locator('[data-auto-buy-kind="source"][data-auto-field="enabled"]').uncheck();
    await page.locator('[data-auto-mode="minutes"]').click();
    await page.locator('[data-auto-converge="intervalMinutes"]').selectOption("3");
    assert.equal(await page.locator('[data-auto-mode="minutes"]').getAttribute("aria-pressed"),"true");
    assert.equal(await page.locator(".automation-convergence").evaluate(el=>Math.round(el.getBoundingClientRect().height)),164);
    const saved=await page.evaluate(()=>window.KOTOWARI_DEBUG.state());
    assert.equal(saved.settings.automationEnabled,false);
    assert.equal(saved.engraving.autoBuy.moment.priority,"grade");
    assert.equal(saved.engraving.autoBuy.moment.intervalSeconds,10);
    assert.equal(saved.engraving.autoBuy.source.enabled,false);
    assert.equal(saved.engraving.autoConverge.mode,"minutes");
    assert.equal(saved.engraving.autoConverge.intervalMinutes,3);
    for(const id of ["auto-time","auto-universe","auto-life","auto-existence"]){
      await page.locator('[data-child="'+id+'"]').click();
      assert.equal(await page.locator('[data-child="'+id+'"]').getAttribute("aria-pressed"),"true");
      assert.equal(await page.locator(".automation-status,.stage-auto-tile,[data-action='toggle-auto-details']").count(),0,label+" no duplication on any tab");
      assert.equal(await page.locator('[data-auto-master]').count(),1);
      assert.equal(await page.locator("#sheetHeading").textContent(),"自動化");
      if(id==="auto-time"){
        assert.match(await page.locator(".automation-empty").textContent(),/自然進行/);
        assert.equal(await page.locator(".automation-row,.automation-convergence").count(),0);
        assert.ok(await page.locator("#sheetBody").evaluate(e=>e.scrollHeight-e.clientHeight<=1));
      }
      if(["auto-universe","auto-life"].includes(id)){
        assert.equal(await page.locator(".automation-empty").textContent(),"未解放");
        assert.equal(await page.locator("[data-auto-planet-enabled]").count(),0);
      }
    }
    await page.locator("#expandButton").click();
    assert.equal(await page.locator("#sheet").getAttribute("data-state"),"full");
    assert.equal(await page.locator("#expandButton").isVisible(),true);
    const expandBox=await page.locator("#expandButton").boundingBox();
    assert.ok(expandBox.x>=0&&expandBox.y>=0&&expandBox.x+expandBox.width<=width+1&&expandBox.y+expandBox.height<=height+1,label+" expand arrow in viewport");
    await page.locator("#expandButton").click();
    assert.equal(await page.locator("#sheet").getAttribute("data-state"),"half");
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
    assert.equal(resumed.engraving.autoBuy.moment.priority,"grade",label+" preference restored after resume");
    assert.equal(resumed.engraving.autoBuy.source.enabled,false,label+" per-feature off remains off");
    assert.deepEqual(errors,[],label+" browser JS errors");
    console.log("PASS v337",label,"global pause / summary / fixed-size detail / four modes / reload");
    await ctx.close();
  }
}finally{if(browser)await browser.close();server?.kill("SIGTERM");}
