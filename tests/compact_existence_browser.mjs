import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {readFileSync} from "node:fs";
import {chromium} from "@playwright/test";
const port=process.env.KOTOWARI_COMPACT_PORT||"8871";
const base=process.env.KOTOWARI_SMOKE_BASE_URL||"http://127.0.0.1:"+port+"/";
const url=new URL("playtest/compact-existence-v1/",base).href;
const key="kotowari_compact_existence_trial_v1";
const server=process.env.KOTOWARI_SMOKE_BASE_URL?null:spawn("python3",["-m","http.server",port,"--bind","127.0.0.1"],{stdio:"ignore"});
let browser;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
try{
 let ok=false;for(let i=0;i<60;i++){try{if((await fetch(url)).ok){ok=true;break}}catch{}await pause(1000)}assert.ok(ok,"trial URL");
 if(process.env.KOTOWARI_SMOKE_BASE_URL)for(const file of ["index.html","engine.mjs","style.css","ui.mjs"]){
  let matched=false;for(let attempt=0;attempt<12;attempt++){try{const r=await fetch(new URL(file+"?verify="+(process.env.GITHUB_SHA||"manual")+"-"+attempt,url),{cache:"no-store"});if(r.ok&&Buffer.from(await r.arrayBuffer()).equals(readFileSync(new URL("../playtest/compact-existence-v1/"+file,import.meta.url)))){matched=true;break;}}catch{}await pause(5000)}assert.ok(matched,"live file differs: "+file);
 }
 browser=await chromium.launch({headless:true});
 for(const [width,height] of [[320,568],[375,812],[1024,900],[812,375]]){
  const ctx=await browser.newContext({viewport:{width,height},reducedMotion:"reduce"});
  const p=await ctx.newPage(),errors=[];p.on("pageerror",e=>errors.push(String(e)));
  await p.addInitScript(()=>{if(!sessionStorage.getItem("compact-sentinel")){localStorage.setItem("kotowari_v31_normal","normal-sentinel");localStorage.setItem("kotowari_v31_lab","lab-sentinel");sessionStorage.setItem("compact-sentinel","yes");}});
  await p.goto(url);await p.locator("[data-card]").waitFor();
  assert.equal(await p.locator("[data-tab=source]").isDisabled(),true);
  assert.equal(await p.locator("#panel .card").count(),1);
  assert.equal(await p.locator("#panel .name").innerText(),"？？？");
  await p.locator("#orb").click();assert.ok((await p.locator("#gain").textContent()).includes("+"));
  await p.locator("#testTools summary").click();await p.locator("#grantValue").fill("1000000");await p.locator("#grantButton").click();
  assert.equal(await p.locator("[data-tab=source]").isEnabled(),true);
  await p.locator("[data-tab=source]").click();assert.equal(await p.locator("#panel .card").count(),1);
  await p.locator("[data-buy='source:0']").click();assert.equal(await p.locator("[data-card='source:0']").count(),1);assert.equal(await p.locator("#panel .card").count(),2);
  await p.locator("#converge").click();assert.equal(await p.locator("[data-tab=engraving]").isEnabled(),true);
  await p.locator("[data-tab=engraving]").click();await p.locator("#grantKind").selectOption("existence");await p.locator("#grantValue").fill("1000");await p.locator("#grantButton").click();
  await p.locator("#mode").click();assert.equal(await p.locator("#mode").innerText(),"1");
  for(let i=0;i<12;i++)await p.locator("[data-buy='engraving:"+i+"']").click();
  assert.equal(await p.locator("#panel .card").count(),12);
  await p.locator("[data-tab=source]").click();await p.locator("#grantKind").selectOption("orbs");await p.locator("#grantValue").fill("1e300");await p.locator("#grantButton").click();
  await p.locator("#bulk").click();assert.equal(await p.locator("#panel .card").count(),31);
  assert.match(await p.locator("#panel .card").first().locator(".name").innerText(),/源01.*1/);
  await p.locator("[data-buy='source:30']").click();
  assert.equal(await p.locator("[data-card='source:0']").count(),0);
  assert.equal(await p.locator("[data-card='source:30']").count(),1);
  assert.equal(await p.locator("#panel .card").nth(1).getAttribute("data-card"),"source:30");
  assert.equal(await p.locator("#panel .card").nth(2).getAttribute("data-card"),"source:29");
  const level=await p.locator("[data-card='source:30'] .level").innerText();assert.match(level,/Lv\.1\/10,000/);
  await p.locator("[data-tab=auto]").click();
  assert.equal(await p.locator("[data-order=source] option").count(),2);
  await p.locator("[data-order=source]").selectOption("cheap");
  await p.locator("[data-toggle=master]").uncheck();
  await p.locator("[data-threshold]").fill("0.1");await p.locator("[data-threshold]").press("Tab");
  await p.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).settings.seconds===.1,key);
  await p.locator("[data-condition]").selectOption("earned");await p.locator("[data-threshold]").fill("1e50");await p.locator("[data-threshold]").press("Tab");
  await p.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).settings.target===50,key);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  const raw=await p.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  assert.equal(raw.front,30);assert.equal(raw.engraving.length,12);assert.equal(raw.moment.length,8);assert.equal(raw.settings.master,false);
  assert.equal(await p.evaluate(()=>localStorage.getItem("kotowari_v31_normal")),"normal-sentinel");
  assert.equal(await p.evaluate(()=>localStorage.getItem("kotowari_v31_lab")),"lab-sentinel");
  await p.reload();await p.locator("[data-tab=source]").click();assert.equal(await p.locator("[data-card='source:30']").count(),1);
  await p.locator("[data-tab=auto]").click();assert.equal(await p.locator("[data-toggle=master]").isChecked(),false);assert.equal(await p.locator("[data-order=source]").inputValue(),"cheap");
  assert.equal(await p.locator("[data-condition]").inputValue(),"earned");
  assert.deepEqual(errors,[]);
  await p.locator("#testTools summary").click();p.once("dialog",d=>d.accept());await p.locator("#reset").click();
  assert.equal(await p.locator("[data-tab=source]").isDisabled(),true);assert.equal(await p.evaluate(()=>localStorage.getItem("kotowari_v31_normal")),"normal-sentinel");
  console.log("PASS compact Web",width,height,"unlock, MAX, rotation, automation controls, isolated reload/reset");
  await ctx.close();
 }
}finally{if(browser)await browser.close();if(server)server.kill();}
