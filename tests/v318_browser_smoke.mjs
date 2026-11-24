import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium} from "@playwright/test";

const port=process.env.KOTOWARI_SMOKE_PORT||"8765";
const publicRoot=process.env.KOTOWARI_SMOKE_BASE_URL||"";
const root=publicRoot||"http://127.0.0.1:"+port+"/";
const server=publicRoot?null:spawn("python3",["-m","http.server",port,"--bind","127.0.0.1"],{stdio:"ignore"});
let browser=null;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try {
  let reachable=false;
  for(let n=0;n<30;n++){
    try{if((await fetch(root)).ok){reachable=true;break;}}catch{}
    await sleep(300);
  }
  assert.ok(reachable,"local web server did not start");
  browser=await chromium.launch({headless:true});
  for(const [label,viewport] of [["desktop",{width:1440,height:900}],["mobile",{width:375,height:812}]]){
    const context=await browser.newContext({viewport});
    const page=await context.newPage();
    const pageErrors=[];
    page.on("pageerror",error=>pageErrors.push(String(error)));
    const res=await page.goto(root,{waitUntil:"domcontentloaded"});
    assert.equal(res?.status(),200);
    await page.locator("#buildLabel").waitFor({state:"attached"});
    await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
    assert.match(await page.locator("#buildLabel").textContent(),/^3\.54\.1$/);
    assert.ok((await page.locator("#appRoot").boundingBox())?.width>0);
    const width=await page.evaluate(()=>document.documentElement.scrollWidth);
    assert.ok(width<=viewport.width+2,label+" horizontal overflow: "+width);
    await page.locator('button[data-action="organizer"]').first().click();
    assert.equal(await page.locator("#organizerDrawer").evaluate(el=>el.open),true);
    await page.locator('button[data-action="close-drawer"]').click();
    const fixture=await page.evaluate(async ()=>{
      const G=await import("./game.mjs"),S=await import("./save.mjs");
      const state=G.createState(Date.now());
      state.intro.complete=true;state.engraving.owned.push("ENG-05");state.engraving.levels["ENG-05"]=1;
      state.time.unlocked=true;
      state.universe.unlocked=true;
      state.universe.maxPlanets=3;
      G.createPlanet(state);G.createPlanet(state);
      state.universe.knowledge.collision=100;
      state.universe.knowledge.transfer=100;
      state.universe.knowledge.stability=100;
      state.universe.knowledge.collapse=100;
      state.orbs="1500";state.totalOrbs="1500";
      state.universe.resources.UR1_01="1000";
      state.universe.resources.UR1_04="1000";
      G.invest(state,"UR1_01",2);
      return S.encode(state,"browser-fixture");
    });
    await page.addInitScript(raw=>localStorage.setItem("kotowari_v31_normal",raw),fixture);
    await page.reload({waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
    const diagnostics=await page.evaluate(()=>{
      const raw=localStorage.getItem("kotowari_v31_normal"), parsed=raw?JSON.parse(raw):null;
      return {indicator:document.querySelector("#saveIndicator")?.textContent,
        notice:document.querySelector("#noticeText")?.textContent,
        stageNav:document.querySelector("#stageNav")?.textContent,
        intro:parsed?.data?.intro,unlocked:parsed?.data?.universe?.unlocked,
        localStorageKeys:Object.keys(localStorage)};
    });
    assert.ok(await page.locator('[data-stage="universe"]').count(),label+" fixture stage absent: "+JSON.stringify(diagnostics));
    await page.locator("#commonInfoBar").waitFor({state:"visible"});
    assert.equal(await page.locator("#commonInfoBar button").count(),2);
    // DEC-20261124-019 removes the independent Source acquisition row.
    assert.equal(await page.locator("#stageResourceList .stage-stat").count(),2);
    assert.doesNotMatch(await page.locator("#stageResourceList").innerText(),/源の生成|源の獲得/);
    assert.equal(await page.locator(".world-sideboards").isVisible(),false);
    assert.equal(await page.locator('[data-common-value="existence"]').textContent(),"1","initial protected Existence uses ordinary numeric display");
    await page.locator("#commonInfoBar button").first().click();
    assert.equal(await page.locator("#sheetHeading").textContent(),"共通情報");
    assert.match(await page.locator("#sheetBody").textContent(),/時間の経過速度/);
    await page.locator('[data-action="return-stage-panel"]').click();
    await page.locator('[data-stage="universe"]').click();
    assert.equal(await page.locator("#commonInfoBar").isVisible(),true);
    await page.locator('[data-child="planets"]').click();
    await page.locator(".investment-ledger").waitFor();
    assert.match(await page.locator(".investment-ledger").textContent(),/UR1_01/);
    await page.locator('[data-child="observations"]').click();
    await page.locator('button[data-interference="collision"]').waitFor();
    assert.equal(await page.locator('button[data-interference="collision"]').isEnabled(),true);
    assert.equal(await page.locator('button[data-interference="transfer"]').isEnabled(),true);
    await page.locator('button[data-interference="collision"]').click();
    if(!(await page.locator("#confirmDialog").evaluate(el=>el.open))){
      console.log("DIAG v350 collision confirmation",JSON.stringify(await page.evaluate(()=>{
        let parsed;try{parsed=JSON.parse(localStorage.getItem("kotowari_v31_normal")).data}catch{}
        return {toast:document.querySelector("#toast")?.textContent,
          notice:document.querySelector("#noticeText")?.textContent,
          indicator:document.querySelector("#saveIndicator")?.textContent,
          enabled:document.querySelector('button[data-interference="collision"]')?.disabled===false,
          planets:parsed?.universe?.planets?.length,
          confirm:parsed?.settings?.confirmInterference};
      })),JSON.stringify(pageErrors));
    }
    assert.equal(await page.locator("#confirmDialog").evaluate(el=>el.open),true);
    await page.locator("#confirmYes").click();
    await page.waitForFunction(()=>{
      try{const raw=JSON.parse(localStorage.getItem("kotowari_v31_normal"));return raw.data.universe.planets.length===1;}
      catch{return false;}
    });
    assert.equal(await page.locator('button[data-interference="collision"]').isEnabled(),false);
    await page.locator('button[data-action="organizer"]').first().click();
    await page.locator('button[data-organizer="statistics"]').click();
    await page.getByText("直近10分の獲得量", {exact:false}).waitFor();
    await page.getByText("オフライン精算履歴", {exact:false}).waitFor();
    assert.ok(await page.locator(".telemetry-card").count()>0);
    // U-10: visible subset, preflight quote and explicit confirmation.
    await page.locator('[data-stage="existence"]').click();
    await page.locator('[data-child="moment"]').click();

    // U-43: purchase mode survives tab changes; pending holds are canceled
    // synchronously before timers can purchase against a detached card.
    await page.locator("#purchaseCycle").click();
    assert.equal(await page.locator("#purchaseCycle").textContent(),"×10");
    await page.locator('[data-child="sources"]').click();
    await page.locator('[data-child="moment"]').click();
    assert.equal(await page.locator("#purchaseCycle").textContent(),"×10");
    const beforePending=await page.evaluate(()=>JSON.parse(localStorage.getItem("kotowari_v31_normal")).data.moment.tap);
    await page.locator('button[data-purchase="moment"][data-id="tap"]').evaluate(el=>
      el.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,pointerId:713,pointerType:"touch",clientX:10,clientY:10})));
    await page.locator('[data-child="sources"]').evaluate(el=>el.click());
    await page.waitForTimeout(700);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem("kotowari_v31_normal")).data.moment.tap),
      beforePending,label+" pending hold must not buy after changing tabs");
    await page.locator('[data-child="moment"]').click();
    assert.equal(await page.locator("#purchaseCycle").textContent(),"×10");
    // Return to x1 and start an active hold. Navigation must stop later repeats.
    for(let k=0;k<3;k++)await page.locator("#purchaseCycle").click();
    assert.equal(await page.locator("#purchaseCycle").textContent(),"×1");
    const beforeActive=await page.locator('[data-moment-level="tap"]').textContent();
    await page.locator('button[data-purchase="moment"][data-id="tap"]').evaluate(el=>
      el.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,pointerId:714,pointerType:"touch",clientX:10,clientY:10})));
    await page.waitForTimeout(600);
    assert.notEqual(await page.locator('[data-moment-level="tap"]').textContent(),beforeActive,
      label+" active hold did not purchase");
    await page.locator('[data-child="sources"]').evaluate(el=>el.click());
    const afterStopped=await page.evaluate(()=>JSON.parse(localStorage.getItem("kotowari_v31_normal")).data.moment.tap);
    await page.waitForTimeout(480);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem("kotowari_v31_normal")).data.moment.tap),
      afterStopped,label+" active hold must stop on tab change");
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem("kotowari_v31_normal")).data.purchaseMode),"1");
    await page.locator('[data-child="moment"]').click();
    assert.equal(await page.locator(".moment-tools").count(),0,"legacy filter UI must be absent");
    await page.locator("#bulkScopeButton").click();
    assert.match(await page.locator("#bulkScopeButton").textContent(),/表示/);
    const beforeBulk=await page.evaluate(()=>JSON.parse(localStorage.getItem("kotowari_v31_normal")).data.counters.orbsSpent);
    await page.locator("#bulkBuyButton").click();
    assert.equal(await page.locator("#confirmDialog").evaluate(el=>el.open),false, "default bulk purchase is one tap");
    assert.notEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem("kotowari_v31_normal")).data.counters.orbsSpent),beforeBulk,"bulk purchase must spend immediately");
    await page.waitForFunction(()=>{
      try{
        const raw=JSON.parse(localStorage.getItem("kotowari_v31_normal"));
        return raw.data.moment.tap>0;
      }catch{return false;}
    });
    // The 2026-11-22 fixed layout replaces each card's favorite with an overlay detail action.
    assert.equal(await page.locator('button[data-moment-favorite]').count(),0);
    assert.equal(await page.locator('button[data-moment-detail]').count(),30);
    assert.equal(await page.locator('.moment-fav-pins').count(),0);
    await page.locator('button[data-moment-detail="tap"]').click();
    assert.equal(await page.locator("#confirmDialog").evaluate(el=>el.open),true);
    await page.locator("#confirmYes").click();
    assert.equal(await page.locator("#confirmDialog").evaluate(el=>el.open),false);
    assert.equal(pageErrors.length,0,label+" JS errors: "+pageErrors.join("; "));
    console.log("PASS browser",label,viewport.width+"x"+viewport.height,"load, organizer, intervention, persisted save");
    await context.close();
  }
} finally {
  if(browser)await browser.close();
  server?.kill("SIGTERM");
}
