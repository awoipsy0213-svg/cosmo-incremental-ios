import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium} from "@playwright/test";

const port=process.env.KOTOWARI_V331_PORT||"8831";
const base=process.env.KOTOWARI_SMOKE_BASE_URL||"http://127.0.0.1:"+port+"/";
const server=process.env.KOTOWARI_SMOKE_BASE_URL?null:spawn("python3",["-m","http.server",port,"--bind","127.0.0.1"],{stdio:"ignore"});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let browser;
try{
  let ready=false;
  for(let i=0;i<45;i++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await sleep(200);}
  assert.ok(ready,"v331 host not available");
  browser=await chromium.launch({headless:true});
  for(const [tag,width,height] of [["phone",375,812],["desktop",1024,900]]){
    const context=await browser.newContext({viewport:{width,height}});
    const page=await context.newPage(),errors=[];
    page.on("pageerror",error=>errors.push(String(error)));
    assert.equal((await page.goto(base+"?dev=1",{waitUntil:"domcontentloaded"}))?.status(),200);
    await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
    const fixture=await page.evaluate(async()=>{
      const G=await import("./game.mjs"),S=await import("./save.mjs");
      const s=G.createState(Date.now(),"normal");
      s.intro.complete=true;s.time.unlocked=true;s.surplusExistence="1";
      s.sources.SOURCE_01.level=1;
      G.addOrbs(s,"2500");
      return S.encode(s,"v331-fixture");
    });
    await page.addInitScript(original=>{
      if(sessionStorage.getItem("v331-fixture")!=="yes"){
        localStorage.setItem("kotowari_v31_normal",original);
        sessionStorage.setItem("v331-fixture","yes");
      }
    },fixture);
    await page.reload({waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
    await page.locator('[data-stage="existence"]').click();
    await page.locator('[data-child="sources"]').click();
    assert.equal(await page.locator('#childTabs [data-child="sources"]').getAttribute("aria-pressed"),"true");
    // Close, reopen: selected tab must remain the same.
    await page.locator('[data-stage="existence"]').click();
    await page.locator('[data-stage="existence"]').click();
    assert.equal(await page.locator('#childTabs [data-child="sources"]').getAttribute("aria-pressed"),"true");
    // All orb quantities, including sub-unit source gain and next required amount,
    // are integer-only displays. Internal values are preserved.
    const orbUI=await page.locator("#worldDetails, #stageResourceList, #convergeMain, .source-rates").allTextContents();
    assert.ok(orbUI.join(" ").includes("1未満"),"sub-unit orb gains must be explicit");
    assert.ok(!/\\d+\\.\\d+/.test(orbUI.join(" ")),"orb UI contains a decimal");
    const baseline=await page.evaluate(()=>window.KOTOWARI_DEBUG.state().runOrbsEarned);
    await page.locator('[data-child="engraving"]').click();
    assert.equal(await page.locator('#childTabs [data-child="engraving"]').getAttribute("aria-pressed"),"true");
    assert.equal(await page.locator('[data-engraving-buy="ENG-01"]').isDisabled(),false);
    await page.locator('[data-engraving-buy="ENG-01"]').click();
    assert.equal(await page.locator("#confirmDialog").evaluate(el=>el.open),false,"first engraving buy should be one tap");
    await page.waitForFunction(()=>window.KOTOWARI_DEBUG.state().engraving.levels["ENG-01"]===1);
    await page.locator('[data-engraving-trial-upgrade="ENG-01"]').click();
    assert.equal(await page.locator("#confirmDialog").evaluate(el=>el.open),false,"engraving upgrades should be one tap");
    await page.waitForFunction(()=>window.KOTOWARI_DEBUG.state().engraving.levels["ENG-01"]===2);
    assert.ok(!/Lv.*購入しました/.test(await page.locator("#toast").textContent()),"level-up purchase popup must be suppressed");
    // Passive source generation increases the earned total while the browser runs.
    // Spending for upgrades must never make the earned total move backwards.
    assert.ok(Number(await page.evaluate(()=>window.KOTOWARI_DEBUG.state().runOrbsEarned))>=Number(baseline));
    // Enabling the corresponding preference restores a decision dialog.
    await page.locator('.app-top [data-action="organizer"]').click();
    await page.locator('[data-organizer="settings"]').click();
    const pref=page.locator('[data-pref="confirmEngravingUpgrade"]');
    assert.equal(await pref.isChecked(),false);
    assert.equal(await page.locator('[data-pref="confirmSaveRestore"]').isChecked(),true);
    await pref.check();
    await page.locator('[data-stage="existence"]').click();
    assert.equal(await page.locator('#childTabs [data-child="engraving"]').getAttribute("aria-pressed"),"true","tab survived organizer navigation");
    await page.locator('[data-engraving-trial-upgrade="ENG-01"]').click();
    assert.equal(await page.locator("#confirmDialog").evaluate(el=>el.open),true,"opt-in confirmation must appear");
    await page.locator("#confirmNo").click();
    assert.equal((await page.evaluate(()=>window.KOTOWARI_DEBUG.state().engraving.levels["ENG-01"])),2,"cancel must keep resources unchanged");
    await page.reload({waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
    const after=await page.evaluate(()=>window.KOTOWARI_DEBUG.state());
    assert.equal(after.settings.existenceLastTab,"engraving");
    assert.equal(after.settings.confirmEngravingUpgrade,true);
    assert.equal(after.engraving.levels["ENG-01"],2);
    assert.deepEqual(errors,[],tag+" browser errors");
    console.log("PASS v331",tag,"tab persistence, settings confirmation, one-tap engraving, orb display");
    await context.close();
  }
}finally{
  if(browser)await browser.close();
  server?.kill("SIGTERM");
}
