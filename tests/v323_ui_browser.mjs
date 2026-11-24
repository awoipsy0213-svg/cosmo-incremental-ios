import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium} from "@playwright/test";

const port=process.env.KOTOWARI_V323_PORT||"8799";
const publicRoot=process.env.KOTOWARI_SMOKE_BASE_URL||"";
const root=publicRoot||"http://127.0.0.1:"+port+"/";
const server=publicRoot?null:spawn("python3",["-m","http.server",port,"--bind","127.0.0.1"],{stdio:"ignore"});
let browser=null;
const sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
try{
 let reachable=false;
 for(let n=0;n<40;n++){
   try{if((await fetch(root)).ok){reachable=true;break;}}catch{}
   await sleep(250);
 }
 assert.ok(reachable,"v323 browser host unavailable");
 browser=await chromium.launch({headless:true});
 for(const [label,width,height] of [["narrow",320,700],["mobile",375,812],["large-mobile",430,932]]){
   const context=await browser.newContext({viewport:{width,height}});
   const page=await context.newPage(),errors=[];
   page.on("pageerror",e=>errors.push(String(e)));
   assert.equal((await page.goto(root,{waitUntil:"domcontentloaded"}))?.status(),200);
   await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
   const fixture=await page.evaluate(async()=>{
     const G=await import("./game.mjs"),S=await import("./save.mjs");
     const s=G.createState(Date.now());
     s.intro.complete=true;s.time.unlocked=true;s.universe.unlocked=true;s.time.revealedDirections=3;s.engraving.owned.push("ENG-05");s.engraving.levels["ENG-05"]=1;
     s.orbs="1e20";s.totalOrbs="1e20";
     return S.encode(s,"v323-browser");
   });
   await page.addInitScript(raw=>localStorage.setItem("kotowari_v31_normal",raw),fixture);
   await page.reload({waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
   assert.match(await page.locator("#buildLabel").textContent(),/^3\.54\.1$/);
   assert.equal(await page.locator(".common-info-item").count(),2);
   const layout=await page.evaluate(()=>({
     scroll:document.documentElement.scrollWidth,
     width:document.documentElement.clientWidth,
     rowCount:document.querySelectorAll("#stageResourceList .stage-stat").length
   }));
   assert.ok(layout.scroll<=width+2,label+" page width overflow "+JSON.stringify(layout));
   // DEC-20261124-019: independent Source gain HUD row is intentionally hidden.
   assert.equal(layout.rowCount,2);
   assert.doesNotMatch(await page.locator("#stageResourceList").innerText(),/源の生成|源の獲得/);
   assert.equal(await page.locator(".world-sideboards").isVisible(),false);
   await page.locator('[data-stage="existence"]').click();
   await page.locator('[data-child="moment"]').click();
   assert.equal(await page.locator(".moment-card .compact-stat").count(),60);
   const cuts=await page.locator(".moment-card .card-top strong, .moment-card .compact-stat strong").evaluateAll(
     elements=>elements.filter(el=>{
       const cs=getComputedStyle(el);
       return cs.overflowX==="hidden" && el.scrollWidth>el.clientWidth+1;
     }).length
   );
   assert.equal(cuts,0,label+" truncated important moment texts");
   await page.locator('[data-child="sources"]').click();
   assert.equal(await page.locator(".source-card [data-source-total]").count(),30);
   assert.equal(await page.locator(".source-card [data-source-next]").count(),30);
   const detail=page.locator('button[data-source-detail="SOURCE_01"]');
   await detail.click();
   assert.equal(await page.locator("#confirmDialog").evaluate(el=>el.open),true);
   assert.match(await page.locator("#confirmDialog").textContent(),/次Lv増加/);
   await page.locator("#confirmYes").click();
   // opt-in confirmation retains the old review/abort behavior
   await page.locator('button[data-action="organizer"]').first().click();
   await page.locator('button[data-organizer="settings"]').click();
   const confirm=page.locator('[data-pref="confirmBulkPurchase"]');
   assert.equal(await confirm.isChecked(),false);
   await confirm.check();
   assert.equal(await confirm.isChecked(),true);
   await page.locator('[data-stage="existence"]').click();
   await page.locator('[data-child="moment"]').click();
   await page.locator("#bulkBuyButton").click();
   assert.equal(await page.locator("#confirmDialog").evaluate(el=>el.open),true);
   assert.match(await page.locator("#confirmDialog").textContent(),/一括購入の金額確認/);
   await page.locator("#confirmNo").click();
   // Switch off for one-tap mode. It must write and preserve the setting.
   await page.locator('button[data-action="organizer"]').first().click();
   await page.locator('button[data-organizer="settings"]').click();
   await page.locator('[data-pref="confirmBulkPurchase"]').uncheck();
   await page.locator('[data-stage="existence"]').click();
   await page.locator('[data-child="moment"]').click();
   const before=await page.evaluate(()=>JSON.parse(localStorage.getItem("kotowari_v31_normal")).data.counters.orbsSpent);
   await page.locator("#bulkBuyButton").click();
   assert.equal(await page.locator("#confirmDialog").evaluate(el=>el.open),false);
   const after=await page.evaluate(()=>JSON.parse(localStorage.getItem("kotowari_v31_normal")).data.counters.orbsSpent);
   assert.notEqual(after,before,"one tap bulk must spend");
   await page.reload({waitUntil:"domcontentloaded"});
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem("kotowari_v31_normal")).data.settings.confirmBulkPurchase),false);
   for(const [id,num,name] of [["existence","1","オーブ"],["time","2","経過時間"],["universe","3","惑星数"]]){
     await page.locator('[data-stage="'+id+'"]').click();
     assert.equal(await page.locator("body").getAttribute("data-cosmo-stage"),num);
     assert.match(await page.locator("#stageResourceLabel").textContent(),new RegExp(name));
     if(id==="time"){
       assert.equal(await page.locator("#timeHexRoot").isVisible(),true,"Time uses the hex scene");
       assert.equal(await page.locator(".stage-backdrop").evaluate(el=>getComputedStyle(el).display),"none","Time no longer uses the old backdrop");
       const hexNodes=page.locator('button[data-time-direction]');
       assert.equal(await hexNodes.count(),6,"six stable Time nodes");
       assert.equal(await page.locator('[data-time-direction="3"]').isDisabled(),true,"unknown directions stay disabled");
       assert.equal(await page.locator('[data-time-direction="3"] [data-hex-name]').textContent(),"？");
       assert.equal(await page.locator('[data-time-direction="1"]').isEnabled(),true);
       await page.locator('[data-time-direction="1"]').click();
       assert.equal(await page.locator('[data-time-direction="1"]').getAttribute("aria-pressed"),"true");
       assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem("kotowari_v31_normal")).data.time.selected.includes(1)),true,"direction persists");
       await page.locator('[data-action="collapse-sheet"]').click();
       await page.locator('[data-time-open="miracles"]').click();
       assert.match(await page.locator("#sheetHeading").textContent(),/奇跡/);
       await page.locator('[data-child="flow"]').click();
       assert.equal(await page.locator('#sheetBody [data-weight]').count(),3,"large sliders remain accessible");
     }else if(id!=="existence")assert.equal(await page.locator(".stage-backdrop").evaluate(el=>getComputedStyle(el).display),"block");
   }
   assert.equal(errors.length,0,label+" JS errors: "+errors.join("; "));
   console.log("PASS v323",label,width+"x"+height,"2-metric HUD, unique scenes, flexible text, bulk setting + save");
   await context.close();
 }
} finally{if(browser)await browser.close();server?.kill("SIGTERM");}
