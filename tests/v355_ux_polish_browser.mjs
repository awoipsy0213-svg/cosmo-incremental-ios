import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium} from "@playwright/test";
const port=process.env.KOTOWARI_V355_PORT||"8855";
const base=process.env.KOTOWARI_SMOKE_BASE_URL||"http://127.0.0.1:"+port+"/";
const server=process.env.KOTOWARI_SMOKE_BASE_URL?null:spawn("python3",["-m","http.server",port,"--bind","127.0.0.1"],{stdio:"ignore"});
let browser;
try{
  for(let i=0;i<60;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,200));}
  browser=await chromium.launch({headless:true});
  for(const [width,height] of [[320,568],[375,812],[1024,900],[812,375]]){
    const ctx=await browser.newContext({viewport:{width,height},reducedMotion:"reduce"});
    const p=await ctx.newPage(),errors=[];p.on("pageerror",e=>errors.push(String(e)));
    await p.goto(base+"?dev=1");await p.waitForFunction(()=>window.KOTOWARI_DEBUG);
    const raw=await p.evaluate(async()=>{const G=await import("./game.mjs"),S=await import("./save.mjs");const s=G.createState(Date.now());s.intro.complete=true;s.settings.confirmConvergence=false;G.addOrbs(s,"999999");return S.encode(s,"ux-test");});
    await p.addInitScript(raw=>{if(!sessionStorage.getItem("ux-fixture")){localStorage.setItem("kotowari_v31_normal",raw);sessionStorage.setItem("ux-fixture","yes");}},raw);
    await p.reload();await p.waitForFunction(()=>window.KOTOWARI_DEBUG?.state().intro.complete);
    assert.equal(await p.locator("#uxNotice").isVisible(),false);
    assert.equal(await p.locator("[data-time-locked]").evaluate(el=>el.classList.contains("ux-near")),true);
    await p.locator("#touchField").click();await p.locator("#uxNotice").waitFor({state:"visible"});
    assert.match(await p.locator("#uxNoticeTitle").innerText(),/時.*源/);
    assert.equal(await p.locator("#uxNoticeSource").isVisible(),true);
    assert.equal(await p.locator("#uxGain").isVisible(),true,"reduced motion retains numeric gain");
    assert.ok((await p.locator("#uxGainValue").textContent()).startsWith("+"));
    assert.equal(await p.locator("#waves").locator(".wave").count(),0);
    const tapCount=await p.evaluate(()=>window.KOTOWARI_DEBUG.state().counters.taps);
    await p.locator("#uxNoticeTitle").click();
    assert.equal(await p.evaluate(()=>window.KOTOWARI_DEBUG.state().counters.taps),tapCount,"notice text must not tap through");
    assert.equal(await p.locator("#uxNotice").evaluate(e=>getComputedStyle(e).animationName),"none");
    await p.locator("#uxNoticeLater").click();assert.equal(await p.locator("#uxNotice").isVisible(),false);
    await p.locator("#convergeMain").click();await p.locator("#uxNotice").waitFor({state:"visible"});
    assert.match(await p.locator("#uxNoticeTitle").innerText(),/刻印/);
    await p.locator("#uxNoticeOpen").click();assert.equal(await p.locator('[data-child="engraving"]').getAttribute("aria-pressed"),"true");
    await p.reload();await p.waitForFunction(()=>window.KOTOWARI_DEBUG);
    assert.equal(await p.locator("#uxNotice").isVisible(),false);
    assert.equal(await p.locator('[data-stage="time"]').count(),1);
    assert.deepEqual(errors,[]);await ctx.close();
    console.log("PASS v355",width,height,"unlock, skip, open, reduced motion and old save");
  }

  // Separate test-mode scenario: a real state transition while the sheet is full.
  const ctx=await browser.newContext({viewport:{width:375,height:812},reducedMotion:"reduce"});
  const p=await ctx.newPage(),errors=[];p.on("pageerror",e=>errors.push(String(e)));
  await p.goto(base+"?lab=1");await p.waitForFunction(()=>window.KOTOWARI_DEBUG);
  await p.evaluate(async()=>{const G=await import("./game.mjs");const s=G.createState(Date.now(),"lab");s.intro.complete=true;s.settings.confirmConvergence=false;G.addOrbs(s,999999);window.KOTOWARI_DEBUG.setLabState(s);});
  await p.locator('[data-stage="existence"]').click();
  await p.locator("#expandButton").click();
  await p.waitForFunction(()=>document.querySelector("#sheet").dataset.state==="full");
  await p.evaluate(()=>window.KOTOWARI_DEBUG.lab("orbs"));
  assert.equal(await p.locator("#uxNotice").isVisible(),false,"full panel retains controls during unlock");
  await p.locator("#expandButton").click();
  await p.locator("#uxNotice").waitFor({state:"visible"});
  await p.locator("#expandButton").click();
  assert.equal(await p.locator("#uxNotice").isVisible(),false,"active notice is deferred on full panel");
  await p.locator("#expandButton").click();
  await p.locator("#uxNoticeSource").click();
  assert.equal(await p.locator('[data-child="sources"]').getAttribute("aria-pressed"),"true");
  assert.equal(await p.locator("#uxNotice").isVisible(),false);
  await p.locator('.app-top [data-action="organizer"]').click();
  await p.locator('#organizerLinks [data-organizer="guide"]').click();
  assert.ok(await p.locator("[data-ux-target]").count()<=3);
  const converged=await p.evaluate(()=>window.KOTOWARI_DEBUG.state().convergenceCount);
  await p.locator('[data-ux-target="convergence"]').click();
  assert.equal(await p.locator("#sheet").isVisible(),false);
  assert.equal(await p.evaluate(()=>window.KOTOWARI_DEBUG.state().convergenceCount),converged,"guide navigation must not execute convergence");
  // Synchronous events avoid depending on test-runner input latency.
  await p.evaluate(()=>{const field=document.getElementById("touchField"),r=field.getBoundingClientRect();for(let i=0;i<3;i++){field.dispatchEvent(new PointerEvent("pointerdown",{pointerId:100+i,pointerType:"touch",clientX:r.left+r.width/2,clientY:r.top+r.height/2,bubbles:true}));window.dispatchEvent(new PointerEvent("pointerup",{pointerId:100+i,pointerType:"touch"}));}});
  assert.match(await p.locator("#uxGainValue").textContent(),/3回/);
  assert.equal(await p.locator("#waves .wave").count(),0);
  await p.locator("#convergeMain").click();
  await p.waitForFunction(n=>window.KOTOWARI_DEBUG.state().convergenceCount===n+1,converged);
  assert.equal(await p.locator("#uxGain").isVisible(),false);
  assert.deepEqual(errors,[]);await ctx.close();
  console.log("PASS v355 follow-up: deferred notice, source navigation, next action without purchase/convergence, grouped static gain and cleanup");

  // Live engine acquisitions from a different stage, without using a fake UI notification.
  const comfort=await browser.newContext({viewport:{width:375,height:812},reducedMotion:"reduce"});
  const q=await comfort.newPage(),comfortErrors=[];q.on("pageerror",e=>comfortErrors.push(String(e)));
  await q.goto(base+"?lab=1&dev=1");await q.waitForFunction(()=>window.KOTOWARI_DEBUG);
  await q.evaluate(async()=>{
    const G=await import("./game.mjs"),{CONTENT}=await import("./content.mjs"),{addTimeResidue}=await import("./time-growth-v350.mjs");
    const s=G.createState(Date.now(),"lab");s.intro.complete=true;s.time.unlocked=true;s.settings.reducedMotion=true;
    addTimeResidue(s.time,CONTENT.concepts[0],7n,CONTENT.concepts);
    window.KOTOWARI_DEBUG.setLabState(s);
  });
  assert.equal(await q.locator("#residueFeedback").isVisible(),false,"loaded history must not replay");
  await q.evaluate(()=>window.KOTOWARI_DEBUG.open("time","concepts"));
  const unrecognized=q.locator('[data-concept-id="TC001"]');
  assert.match(await unrecognized.textContent(),/7 \/ 10/);
  assert.match(await unrecognized.locator(".slim-progress").getAttribute("aria-label"),/70\.0%/);
  await q.evaluate(()=>window.KOTOWARI_DEBUG.open("organizer","settings"));
  assert.equal(await q.locator('[data-pref="confirmMaxPurchase"]').isChecked(),false);
  assert.equal(await q.locator('[data-pref="showResidueFeedback"]').isChecked(),true);
  assert.equal(await q.locator(".comfort-settings-heading").count(),3);
  await q.locator('[data-pref="showResidueFeedback"]').uncheck();
  await q.evaluate(()=>window.KOTOWARI_DEBUG.open("existence","moment"));
  await q.evaluate(async()=>{
    const G=await import("./game.mjs");
    const s=window.KOTOWARI_DEBUG.state();s.totalExistenceEarned="1e20";s.surplusExistence="1";
    s.time.growth.intervalProgress=27.5;s.lastWall=Date.now();
    window.KOTOWARI_DEBUG.setLabState(s);
  });
  await q.waitForFunction(()=>BigInt(window.KOTOWARI_DEBUG.state().time.growth.totals.TC001||0)>7n,{},{timeout:10000});
  assert.equal(await q.locator("#residueFeedback").isVisible(),false,"OFF keeps real progression but hides feedback");
  await q.evaluate(()=>window.KOTOWARI_DEBUG.open("organizer","settings"));
  await q.locator('[data-pref="showResidueFeedback"]').check();
  await q.evaluate(()=>window.KOTOWARI_DEBUG.open("existence","moment"));
  await q.evaluate(()=>{
    const s=window.KOTOWARI_DEBUG.state();
    // Clear existing interval-growth residue for a controlled, separate fixture.
    s.time.growth.totals={};s.time.growth.recognized={};s.time.concepts={};s.time.residues={};
    s.time.growth.intervalProgress=27.5;s.lastWall=Date.now();
    window.KOTOWARI_DEBUG.setLabState(s);
  });
  await q.locator("#residueFeedback").waitFor({state:"visible",timeout:10000});
  assert.ok(await q.locator(".residue-feedback-row").count()<=4);
  assert.equal(await q.locator("#residueFeedback").evaluate(e=>getComputedStyle(e).pointerEvents),"none");
  assert.equal(await q.locator(".residue-feedback-row").first().evaluate(e=>getComputedStyle(e).animationName),"none");
  assert.match(await q.locator("#residueFeedback").textContent(),/\+/);
  await q.evaluate(()=>window.KOTOWARI_DEBUG.open("time","flow"));
  assert.equal(await q.locator("[data-time-cycle-fill]").count(),1);
  assert.deepEqual(comfortErrors,[]);
  await comfort.close();
  console.log("PASS v356 comfort live cross-stage residue feedback, OFF, settings groups, recognition progress and reduced motion");
}finally{await browser?.close();server?.kill("SIGTERM");}
