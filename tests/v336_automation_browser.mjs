import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium} from "@playwright/test";

const port=process.env.KOTOWARI_V336_PORT||"8836";
const base=process.env.KOTOWARI_SMOKE_BASE_URL||"http://127.0.0.1:"+port+"/";
const server=process.env.KOTOWARI_SMOKE_BASE_URL?null:
  spawn("python3",["-m","http.server",port,"--bind","127.0.0.1"],{stdio:"ignore"});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let browser;
try{
  let ready=false;
  for(let i=0;i<50;i++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await sleep(200);}
  assert.ok(ready,"v336 HTTP host unavailable");
  browser=await chromium.launch({headless:true});
  for(const [label,width,height] of [["small",320,700],["phone",375,812],["desktop",1024,900]]){
    const ctx=await browser.newContext({viewport:{width,height}});
    const page=await ctx.newPage(),errors=[];
    page.on("pageerror",error=>errors.push(String(error)));
    assert.equal((await page.goto(base+"?dev=1",{waitUntil:"domcontentloaded"}))?.status(),200);
    await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
    const raw=await page.evaluate(async()=>{
      const G=await import("./game.mjs"),S=await import("./save.mjs");
      const s=G.createState(Date.now(),"normal");s.intro.complete=true;
      s.orbs="1e30";s.runOrbsEarned="1e30";s.totalOrbs="1e30";s.surplusExistence="200";
      s.engraving.owned=["ENG-23","ENG-24","ENG-26","ENG-27","ENG-28"];
      s.engraving.levels=Object.fromEntries(s.engraving.owned.map(id=>[id,1]));
      s.engraving.autoBuy.moment.enabled=false;s.engraving.autoBuy.source.enabled=false;
      return S.encode(s,"v336-browser");
    });
    await page.addInitScript(data=>{
      if(sessionStorage.getItem("automation-fixture")!=="yes"){
        localStorage.setItem("kotowari_v31_normal",data);
        sessionStorage.setItem("automation-fixture","yes");
      }
    },raw);
    await page.reload({waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
    const nav=page.locator("#stageNav>button");
    assert.equal(await nav.last().getAttribute("id"),"automationQuick","automation is rightmost");
    assert.equal(await page.locator("#automationQuick").getAttribute("aria-label"),"全ステージのオートメーションを開く");
    const navRect=await page.locator("#automationQuick").boundingBox();
    assert.ok(navRect.width<=47&&navRect.width>=39,"compact automation icon width");
    await page.locator("#automationQuick").click();
    assert.equal(await page.locator("#childTabs [data-child^='auto-']").count(),4);
    assert.match(await page.locator("#sheetHeading").textContent(),/自動化/);
    assert.equal(await page.locator("#childTabs [data-child='auto-existence']").getAttribute("aria-pressed"),"true");
    assert.equal(await page.locator(".automation-row[data-automation-buy]").count(),2);
    assert.equal(await page.locator(".automation-convergence").count(),1);
    const geometry=()=>page.locator(".automation-row[data-automation-buy='moment']").boundingBox();
    const before=await geometry();
    await page.locator('[data-auto-buy-kind="moment"][data-auto-field="enabled"]').check();
    assert.equal(await page.evaluate(()=>window.KOTOWARI_DEBUG.state().engraving.autoBuy.moment.enabled),true);
    const after=await geometry();
    assert.ok(Math.abs(before.height-after.height)<1,"fixed row height when enabled");
    await page.locator('[data-auto-buy-kind="moment"][data-auto-field="priority"]').selectOption("expensive");
    await page.locator('[data-auto-buy-kind="moment"][data-auto-field="intervalSeconds"]').selectOption("5");
    assert.equal(await page.evaluate(()=>window.KOTOWARI_DEBUG.state().engraving.autoBuy.moment.priority),"expensive");
    assert.equal(await page.evaluate(()=>window.KOTOWARI_DEBUG.state().engraving.autoBuy.moment.intervalSeconds),5);
    await page.locator('[data-auto-converge="mode"]').selectOption("seconds");
    const input=page.locator('[data-auto-converge="intervalSeconds"]');
    await input.fill("180");await input.press("Tab");
    await page.locator('[data-auto-converge="enabled"]').check();
    await page.locator('[data-auto-converge="minSteps"]').selectOption("3");
    const saved=await page.evaluate(()=>window.KOTOWARI_DEBUG.state());
    assert.equal(saved.engraving.autoConverge.mode,"seconds");
    assert.equal(saved.engraving.autoConverge.intervalSeconds,180);
    assert.equal(saved.engraving.autoConverge.enabled,true);
    assert.equal(saved.engraving.autoConverge.minSteps,3);
    for(const [tab,labelText] of [["auto-time","時"],["auto-universe","宇宙"],["auto-life","生命"],["auto-existence","存在"]]){
      await page.locator('#childTabs [data-child="'+tab+'"]').click();
      assert.equal(await page.locator('#childTabs [data-child="'+tab+'"]').getAttribute("aria-pressed"),"true");
      assert.match(await page.locator("#sheetHeading").textContent(),new RegExp(labelText));
    }
    await page.locator('#childTabs [data-child="auto-universe"]').click();
    assert.equal(await page.locator('[data-auto-planet-enabled]').isDisabled(),true,"unavailable automation stays locked");
    const over=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    assert.ok(over<=1,"no horizontal overflow: "+over);
    await page.locator("#automationQuick").click();
    assert.equal(await page.locator("#sheet").isVisible(),false,"automation icon toggles sheet");
    await page.locator("#automationQuick").click();
    assert.equal(await page.locator('#childTabs [data-child="auto-universe"]').getAttribute("aria-pressed"),"true");
    await page.reload({waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
    const restored=await page.evaluate(()=>window.KOTOWARI_DEBUG.state());
    assert.equal(restored.settings.automationStage,"universe");
    assert.equal(restored.engraving.autoBuy.moment.priority,"expensive");
    assert.equal(restored.engraving.autoBuy.moment.intervalSeconds,5);
    assert.equal(restored.engraving.autoConverge.mode,"seconds");
    assert.equal(restored.engraving.autoConverge.intervalSeconds,180);
    assert.deepEqual(errors,[],label+" browser pageerrors");
    console.log("PASS v336",label,"nav / auto config / persistence / fixed geometry");
    await ctx.close();
  }
}finally{if(browser)await browser.close();server?.kill("SIGTERM");}