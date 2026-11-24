import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium} from "@playwright/test";
const port=process.env.KOTOWARI_V354_PORT||"8854";
const base=process.env.KOTOWARI_SMOKE_BASE_URL||"http://127.0.0.1:"+port+"/";
const server=process.env.KOTOWARI_SMOKE_BASE_URL?null:spawn("python3",["-m","http.server",port,"--bind","127.0.0.1"],{stdio:"ignore"});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try{
  let ready=false;for(let i=0;i<60;i++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await sleep(200);}
  assert.ok(ready);
  browser=await chromium.launch({headless:true});
  for(const [width,height] of [[320,568],[375,812],[1024,900],[812,375]]){
    const ctx=await browser.newContext({viewport:{width,height}});
    const page=await ctx.newPage(),errors=[];
    page.on("pageerror",e=>errors.push(String(e)));
    await page.goto(base+"?dev=1",{waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>window.KOTOWARI_DEBUG);
    const raw=await page.evaluate(async()=>{
      const G=await import("./game.mjs"),S=await import("./save.mjs");
      const s=G.createState(Date.now());s.intro.complete=true;s.intro.touches=8;
      s.settings.confirmConvergence=false;s.settings.reducedMotion=true;
      G.addOrbs(s,"999999");return S.encode(s,"v354-fixture");
    });
    await page.addInitScript(raw=>{
      if(!sessionStorage.getItem("v354-seeded")){
        localStorage.setItem("kotowari_v31_normal",raw);sessionStorage.setItem("v354-seeded","yes");
      }
    },raw);
    await page.reload({waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>window.KOTOWARI_DEBUG?.state().intro.complete);
    assert.equal(await page.locator('[data-stage="time"]').count(),0);
    assert.match(await page.locator("[data-time-locked]").innerText(),/？？？/);
    assert.match(await page.locator("[data-time-locked]").innerText(),/解放まで 1/);
    assert.equal(await page.locator(".world-sideboards").isVisible(),false);
    await page.locator('.app-top [data-action="organizer"]').click();
    assert.match(await page.locator("[data-time-unlock-menu]").innerText(),/999,999 \/ 1,000,000/);
    await page.keyboard.press("Escape");
    await page.locator('[data-stage="existence"]').click();
    assert.equal(await page.locator('[data-child="sources"]').count(),0);
    assert.equal(await page.locator('[data-child="engraving"]').innerText(),"？？？");
    await page.locator('[data-child="engraving"]').click();
    assert.match(await page.locator("[data-engraving-locked]").innerText(),/初回収束で解放/);
    assert.equal(await page.locator("[data-engraving-buy]").count(),0);
    await page.locator('[data-child="moment"]').click();
    const checkControls=async()=>{
      for(const selector of ["#expandButton",'#sheetHandle [data-action="collapse-sheet"]']){
        const el=page.locator(selector),box=await el.boundingBox();
        assert.ok(await el.isVisible()&&box&&box.x>=0&&box.y>=0&&box.x+box.width<=width+1&&box.y+box.height<=height+1,selector+" outside "+width+"x"+height);
        assert.equal(await el.evaluate(n=>{const r=n.getBoundingClientRect();return n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),true,selector+" covered");
      }
    };
    await checkControls();
    await page.locator("#expandButton").click();
    await page.waitForFunction(()=>document.querySelector("#sheet").dataset.state==="full");
    await page.locator("#sheetBody").evaluate(n=>n.scrollTop=n.scrollHeight);
    await checkControls();
    await page.locator("#expandButton").click();
    await page.waitForFunction(()=>document.querySelector("#sheet").dataset.state==="half");
    await checkControls();
    await page.locator('#sheetHandle [data-action="collapse-sheet"]').click();
    await page.locator("#touchField").click();
    await page.waitForFunction(()=>window.KOTOWARI_DEBUG.state().time.unlocked);
    assert.equal(await page.locator('[data-stage="time"]').count(),1);
    assert.equal(await page.locator("[data-time-locked]").count(),0);
    await page.locator('[data-stage="existence"]').click();
    assert.equal(await page.locator('[data-child="sources"]').count(),1);
    assert.equal(await page.locator('[data-child="engraving"]').innerText(),"？？？");
    await page.locator('#sheetHandle [data-action="collapse-sheet"]').click();
    await page.locator("#convergeMain").click();
    await page.waitForFunction(()=>window.KOTOWARI_DEBUG.state().convergenceCount===1);
    await page.locator('[data-stage="existence"]').click();
    assert.equal(await page.locator('[data-child="engraving"]').innerText(),"刻印");
    await page.locator('[data-child="engraving"]').click();
    assert.match(await page.locator('[data-engraving-buy="ENG-05"]').innerText(),/0\.05/);
    assert.equal(await page.locator('[data-engraving-buy="ENG-05"]').isDisabled(),true);
    assert.equal(await page.locator('[data-engraving-buy="ENG-01"]').isEnabled(),true);
    await page.reload({waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>window.KOTOWARI_DEBUG);
    assert.equal(await page.locator('[data-stage="time"]').count(),1);
    assert.deepEqual(errors,[]);
    await ctx.close();console.log("PASS v354",width,height,"staged unlock, menu, engraving, price, full and half controls");
  }
}finally{await browser?.close();server?.kill("SIGTERM");}
