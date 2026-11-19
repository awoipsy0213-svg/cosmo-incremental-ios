import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium} from "@playwright/test";

const port=process.env.KOTOWARI_SMOKE_PORT||"8765";
const root="http://127.0.0.1:"+port+"/";
const server=spawn("python3",["-m","http.server",port,"--bind","127.0.0.1"],{stdio:"ignore"});
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
    assert.match(await page.locator("#buildLabel").textContent(),/3\.18/);
    assert.ok((await page.locator("#appRoot").boundingBox())?.width>0);
    const width=await page.evaluate(()=>document.documentElement.scrollWidth);
    assert.ok(width<=viewport.width+2,label+" horizontal overflow: "+width);
    await page.locator('button[data-action="organizer"]').first().click();
    assert.equal(await page.locator("#organizerDrawer").evaluate(el=>el.open),true);
    await page.locator('button[data-action="close-drawer"]').click();
    await page.evaluate(async ()=>{
      const G=await import("./game.mjs"),S=await import("./save.mjs");
      const state=G.createState(Date.now());
      state.intro.complete=true;
      state.time.unlocked=true;
      state.universe.unlocked=true;
      state.universe.maxPlanets=3;
      G.createPlanet(state);G.createPlanet(state);
      state.universe.knowledge.collision=100;
      state.universe.knowledge.transfer=100;
      state.universe.knowledge.stability=100;
      state.universe.knowledge.collapse=100;
      state.universe.resources.UR1_01="1000";
      state.universe.resources.UR1_04="1000";
      window.localStorage.setItem(S.KEYS.normal,S.encode(state,"browser-fixture"));
    });
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
    await page.locator('[data-stage="universe"]').click();
    await page.locator('[data-child="observations"]').click();
    await page.locator('button[data-interference="collision"]').waitFor();
    assert.equal(await page.locator('button[data-interference="collision"]').isEnabled(),true);
    assert.equal(await page.locator('button[data-interference="transfer"]').isEnabled(),true);
    await page.locator('button[data-interference="collision"]').click();
    assert.equal(await page.locator("#confirmDialog").evaluate(el=>el.open),true);
    await page.locator("#confirmYes").click();
    await page.waitForFunction(()=>{
      try{const raw=JSON.parse(localStorage.getItem("kotowari_v31_normal"));return raw.data.universe.planets.length===1;}
      catch{return false;}
    });
    assert.equal(await page.locator('button[data-interference="collision"]').isEnabled(),false);
    assert.equal(pageErrors.length,0,label+" JS errors: "+pageErrors.join("; "));
    console.log("PASS browser",label,viewport.width+"x"+viewport.height,"load, organizer, intervention, persisted save");
    await context.close();
  }
} finally {
  if(browser)await browser.close();
  server.kill("SIGTERM");
}
