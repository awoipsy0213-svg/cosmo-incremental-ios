import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium} from "@playwright/test";
const port=process.env.KOTOWARI_DIALOG_PORT||"8813";
const root=process.env.KOTOWARI_SMOKE_BASE_URL||"http://127.0.0.1:"+port+"/";
const server=process.env.KOTOWARI_SMOKE_BASE_URL?null:spawn("python3",["-m","http.server",port,"--bind","127.0.0.1"],{stdio:"ignore"});
const sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
let browser;
try {
  let ready=false;
  for(let i=0;i<40;i++){
    try {if((await fetch(root)).ok){ready=true;break;}}catch{}
    await sleep(250);
  }
  assert.ok(ready,"Browser test server did not start");
  browser=await chromium.launch({headless:true});
  for(const [width,height] of [[320,360],[320,440],[375,667],[390,844],[430,932]]) {
    const context=await browser.newContext({viewport:{width,height},isMobile:true,deviceScaleFactor:2});
    const page=await context.newPage();
    const errors=[];page.on("pageerror",error=>errors.push(String(error)));
    assert.equal((await page.goto(root,{waitUntil:"domcontentloaded"}))?.status(),200);
    await page.waitForFunction(()=>document.querySelector("#saveIndicator")?.textContent!=="準備中");
    await page.evaluate(()=>{
      const dlg=document.querySelector("#confirmDialog");
      document.querySelector("#confirmTitle").textContent="一括購入の確認／費用・購入対象";
      document.querySelector("#confirmText").textContent=Array.from({length:60},(_,i)=>"強化 "+(i+1)+": 資源消費 3.14159e+100 / 購入後残高 2.71828e+99").join("\n");
      dlg.showModal();
    });
    const boxes=await page.evaluate(()=>{
      const dlg=document.querySelector("#confirmDialog");
      const text=document.querySelector("#confirmText");
      const action=document.querySelector(".confirm-dialog .dialog-actions");
      const no=document.querySelector("#confirmNo");
      const yes=document.querySelector("#confirmYes");
      const b=el=>{const x=el.getBoundingClientRect();return {left:x.left,right:x.right,top:x.top,bottom:x.bottom,width:x.width,height:x.height};};
      return {dlg:b(dlg),text:b(text),action:b(action),no:b(no),yes:b(yes),
        screen:{width:innerWidth,height:innerHeight},
        overflow:text.scrollHeight>text.clientHeight+5,scroll:text.scrollHeight,client:text.clientHeight,
        mode:getComputedStyle(dlg).display};
    });
    assert.equal(boxes.mode,"flex");
    assert.ok(boxes.overflow,JSON.stringify({width,height,boxes}));
    assert.ok(boxes.dlg.top>=-1 && boxes.dlg.bottom<=height+1,"dialog extends offscreen "+JSON.stringify({width,height,boxes}));
    for(const [name,box] of [["no",boxes.no],["yes",boxes.yes]]) {
      assert.ok(box.left>=-1 && box.right<=width+1,name+" clipped horizontally "+JSON.stringify({width,height,box}));
      assert.ok(box.top>=-1 && box.bottom<=height+1,name+" hidden vertically "+JSON.stringify({width,height,box}));
      assert.ok(box.height>=40,name+" tap target too small");
    }
    await page.locator("#confirmText").evaluate(el=>{el.scrollTop=el.scrollHeight;});
    assert.ok(await page.locator("#confirmText").evaluate(el=>el.scrollTop>0),"details do not scroll");
    await page.locator("#confirmNo").click();
    assert.equal(await page.locator("#confirmDialog").evaluate(el=>el.open),false);
    assert.deepEqual(errors,[],"uncaught JavaScript errors");
    console.log("PASS I-40 confirm UX "+width+"x"+height+" buttons reachable, detail scrolls");
    await context.close();
  }
} finally {if(browser)await browser.close();server?.kill("SIGTERM");}
