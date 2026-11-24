import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium} from "@playwright/test";
const port=process.env.KOTOWARI_V342_PORT||"8842";
const root=process.env.KOTOWARI_SMOKE_BASE_URL||"http://127.0.0.1:"+port+"/";
const server=process.env.KOTOWARI_SMOKE_BASE_URL?null:spawn("python3",["-m","http.server",port,"--bind","127.0.0.1"],{stdio:"ignore"});
let browser;
try{
  let available=false;
  for(let i=0;i<50;i++){try{if((await fetch(root)).ok){available=true;break;}}catch{}await new Promise(r=>setTimeout(r,200));}
  assert.ok(available,"v342 Web host is unavailable");
  browser=await chromium.launch({headless:true});
  for(const [label,width,height] of [["small",320,700],["phone",375,812]]){
    const context=await browser.newContext({viewport:{width,height}});
    const page=await context.newPage(),errors=[];
    page.on("pageerror",error=>errors.push(String(error)));
    assert.equal((await page.goto(root+"?dev=1",{waitUntil:"domcontentloaded"}))?.status(),200);
    await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
    const basic=await page.evaluate(async()=>{
      const G=await import("./game.mjs"),S=await import("./save.mjs");
      const state=G.createState(Date.now());state.intro.complete=true;state.time.unlocked=true;state.convergenceCount=1;state.surplusExistence="10";
      return S.encode(state,"v342-browser");
    });
    await page.addInitScript(raw=>{
      if(sessionStorage.getItem("engraving-v342-fixture")!=="initial"){
        localStorage.setItem("kotowari_v31_normal",raw);
        sessionStorage.setItem("engraving-v342-fixture","initial");
      }
    },basic);
    await page.reload({waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
    await page.locator('[data-stage="existence"]').click();
    await page.locator('[data-child="moment"]').click();
    assert.equal(await page.locator("#bulkBuyButton").isDisabled(),true,"bulk locked before engraving");
    await page.locator('[data-child="engraving"]').click();
    assert.equal(await page.locator('[data-engraving-buy="ENG-05"]').isEnabled(),true);
    await page.locator('[data-engraving-buy="ENG-05"]').click();
    await page.locator('[data-child="moment"]').click();
    assert.equal(await page.locator("#bulkBuyButton").isEnabled(),true,"bulk unlock via real purchase");
    assert.equal(await page.evaluate(()=>window.KOTOWARI_DEBUG.state().engraving.levels["ENG-05"]),1);
    // Switch to a separate isolated lab save. The app intentionally writes its
    // old normal save during beforeunload, so raw localStorage replacement alone
    // could be overwritten on reload.
    await page.goto(root+"?lab=1&dev=1",{waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
    await page.evaluate(async()=>{
      const G=await import("./game.mjs");
      const state=G.createState(Date.now(),"lab");state.intro.complete=true;state.time.unlocked=true;
      state.surplusExistence="100";state.orbs="1e20";
      state.engraving.owned=["ENG-05","ENG-17","ENG-30","ENG-27"];
      state.engraving.levels=Object.fromEntries(state.engraving.owned.map(id=>[id,1]));
      window.KOTOWARI_DEBUG.setLabState(state);
    });
    await page.locator("#automationQuick").click();
    await page.locator('[data-action="toggle-auto-details"]').click();
    const toggler=page.locator('[data-auto-engrave="enabled"]');
    const debugEngrave=await page.evaluate(()=>({
      owned:window.KOTOWARI_DEBUG?.state()?.engraving?.owned,
      levels:window.KOTOWARI_DEBUG?.state()?.engraving?.levels,
      disabled:document.querySelector('[data-auto-engrave="enabled"]')?.disabled,
      backupWarnings:document.querySelector("#saveIndicator")?.textContent,
      tab:document.querySelector("#sheetHeading")?.textContent
    }));
    assert.equal(await toggler.isEnabled(),true,"ENG17 enables the auto-buy switch: "+JSON.stringify(debugEngrave));
    assert.equal(await toggler.isChecked(),false,"engravings automation must start OFF");
    await page.locator('[data-auto-engrave="mode"]').selectOption("new");
    await page.locator('[data-auto-engrave="priority"]').selectOption("cheap");
    await page.locator('[data-auto-engrave="minReserve"]').selectOption("0.025");
    await toggler.check();
    assert.equal(await page.locator('[data-preset-save]').count(),3);
    await page.locator('details[data-preserve="engraving-plan-moment"] summary').click();
    const goal=page.locator('[data-plan-kind="moment"][data-plan-id="tap"][data-plan-field="targetLevel"]');
    await goal.fill("25");await goal.press("Tab");
    await page.locator('[data-preset-save="0"]').click();
    await page.locator('[data-preset-apply="0"]').click();
    const saved=await page.evaluate(()=>window.KOTOWARI_DEBUG.state().engraving);
    assert.equal(saved.autoEngraving.enabled,true);
    assert.equal(saved.autoEngraving.priority,"cheap");
    assert.equal(saved.autoEngraving.mode,"new");
    assert.ok(Math.abs(Number(saved.autoEngraving.minReserve)-0.025)<1e-8);
    assert.equal(saved.presetSystem.presets[0].plan.moment.targets.tap,25);
    assert.equal(saved.presetSystem.activePreset,0);
    await page.reload({waitUntil:"domcontentloaded"});
    await page.locator("#automationQuick").click();
    await page.locator('[data-action="toggle-auto-details"]').click();
    const restored=await page.evaluate(()=>window.KOTOWARI_DEBUG.state().engraving);
    assert.equal(restored.autoEngraving.enabled,true);
    assert.equal(restored.presetSystem.plan.moment.targets.tap,25);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    assert.ok(overflow<=2,label+" must not have horizontal overflow");
    assert.deepEqual(errors,[],label+" must have no runtime pageerrors");
    console.log("PASS v342",label,"bulk unlock, engraving auto-buy, reserve, 3 presets, Lv goal, save and restore");
    await context.close();
  }
}finally{if(browser)await browser.close();server?.kill("SIGTERM")}
