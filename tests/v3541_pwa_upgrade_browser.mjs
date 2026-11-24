import assert from "node:assert/strict";
import {readFileSync,mkdtempSync,rmSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {createServer} from "node:http";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "@playwright/test";

const root=fileURLToPath(new URL("../",import.meta.url));
const old=mkdtempSync(join(tmpdir(),"kotowari-old-"));
const OLD="c915a3732444b7189bc8fe516e78556e8c486eac",release="3.54.1";
const oldSW=execFileSync("git",["show",OLD+":sw.js"],{cwd:root,encoding:"utf8"});
const files=[...oldSW.match(/const CORE_FILES = \[([\s\S]*?)\];/)[1].matchAll(/"([^"]+)"/g)].map(m=>m[1]);
const archive=execFileSync("git",["archive","--format=tar",OLD,"sw.js",...files],{cwd:root,maxBuffer:32*1024*1024});
execFileSync("tar",["-xf","-","-C",old],{input:archive});
let phase="old",browser,server;
const mime=p=>p.endsWith(".mjs")||p.endsWith(".js")?"text/javascript":p.endsWith(".css")?"text/css":p.endsWith(".html")?"text/html":p.endsWith(".webmanifest")?"application/manifest+json":p.endsWith(".png")?"image/png":"text/plain";
try{
  server=createServer((req,res)=>{
    try{
      const path=decodeURIComponent(new URL(req.url,"http://localhost").pathname).replace(/^\/+/, "")||"index.html";
      if(path.includes(".."))throw Error("bad path");
      const prior=(phase==="old"&&path!=="update.html")||(phase==="mixed"&&path==="balance-config.mjs");
      const filename=resolve(prior?old:root,path);
      const data=readFileSync(filename);
      res.writeHead(200,{"Content-Type":mime(path),"Cache-Control":"no-store"});res.end(data);
    }catch{res.writeHead(404);res.end("Not found");}
  });
  await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
  const base="http://127.0.0.1:"+server.address().port+"/";
  browser=await chromium.launch({headless:true});
  const ctx=await browser.newContext({viewport:{width:375,height:812},serviceWorkers:"allow"});
  const page=await ctx.newPage(),errors=[];
  page.on("pageerror",e=>errors.push(String(e)));
  await page.goto(base+"?dev=1");
  await page.waitForFunction(()=>window.KOTOWARI_DEBUG&&navigator.serviceWorker.controller);
  assert.match(await page.locator("#buildLabel").textContent(),/3\.34/);
  const raw=await page.evaluate(async()=>{
    const G=await import("./game.mjs"),S=await import("./save.mjs");
    const s=G.createState(Date.now());s.intro.complete=true;s.intro.touches=8;
    G.addOrbs(s,"999999");s.orbs="100";s.moment.tap=4;s.settings.reducedMotion=true;
    s.settings.confirmConvergence=false;
    const lab=G.createState(Date.now(),"lab");lab.intro.complete=true;lab.orbs="77";
    const protectedRaw=S.encode(s,"pre-update-protected");
    return {normal:S.encode(s,"pre-update"),lab:S.encode(lab,"pre-update-lab"),archive:JSON.stringify([{at:Date.now(),reason:"manual",raw:protectedRaw}])};
  });
  await page.addInitScript(raw=>{
    if(!sessionStorage.getItem("upgrade-fixture")){
      localStorage.setItem("kotowari_v31_normal",raw.normal);
      localStorage.setItem("kotowari_v31_lab",raw.lab);
      localStorage.setItem("kotowari_v31_normal.protected-backups",raw.archive);
      sessionStorage.setItem("upgrade-fixture","yes");
    }
  },raw);
  await page.reload();await page.waitForFunction(()=>window.KOTOWARI_DEBUG?.state().moment.tap===4);
  await page.evaluate(()=>window.KOTOWARI_DEBUG.save(true));
  const oldState=await page.evaluate(()=>window.KOTOWARI_DEBUG.state());
  assert.equal(oldState.time.unlocked,false);
  // Install a new worker while one core file is intentionally stale.
  phase="mixed";
  await page.evaluate(async()=>{
    const r=await navigator.serviceWorker.getRegistration();
    await r.update();
    const w=r.installing;
    if(w&&w.state!=="redundant")await new Promise((resolve,reject)=>{
      const t=setTimeout(()=>reject(Error("mixed install timeout")),30000);
      w.addEventListener("statechange",()=>{if(w.state==="redundant"||w.state==="installed"){clearTimeout(t);resolve();}});
      if(w.state==="redundant"||w.state==="installed"){clearTimeout(t);resolve();}
    });
  });
  const check=await page.evaluate(async()=>{
    const r=await navigator.serviceWorker.getRegistration();
    return {waiting:!!r.waiting,keys:await caches.keys(),label:document.getElementById("buildLabel").textContent};
  });
  assert.equal(check.waiting,false,"mixed cache must not become waiting");
  assert.equal(check.keys.some(k=>k.includes("pwa-v3541")),false,"failed cache removed");
  assert.match(check.label,/3\.34/);
  // Restore coherent network files. The old page is still alive while the
  // independently reachable recovery page discovers the waiting release.
  phase="new";
  const recovery=await ctx.newPage();
  await recovery.goto(base+"update.html");
  await recovery.locator("#apply").waitFor();
  await recovery.waitForFunction(()=>!document.getElementById("apply").disabled,{},{timeout:90000});
  await recovery.locator("#apply").click();
  await recovery.waitForFunction(()=>document.getElementById("status").textContent.includes("別のゲーム画面"));
  await page.evaluate(()=>window.KOTOWARI_DEBUG.save(true));
  await page.close();
  await recovery.locator("#retry").click();
  await recovery.waitForFunction(()=>!document.getElementById("apply").disabled,{},{timeout:90000});
  await recovery.locator("#apply").click();
  await recovery.waitForFunction(()=>document.getElementById("status").textContent.includes("更新完了"),{},{timeout:90000});
  await recovery.goto(base+"?dev=1");
  await recovery.waitForFunction(()=>window.KOTOWARI_DEBUG?.state().moment.tap===4);
  assert.equal(await recovery.locator("#buildLabel").textContent(),release);
  const restored=await recovery.evaluate(()=>window.KOTOWARI_DEBUG.state());
  assert.equal(restored.moment.tap,4);assert.equal(restored.runOrbsEarned,"9.99999e5");
  assert.equal(restored.time.unlocked,false);
  assert.equal(await recovery.evaluate(()=>localStorage.getItem("kotowari_v31_lab")),raw.lab);
  assert.equal(await recovery.evaluate(()=>localStorage.getItem("kotowari_v31_normal.protected-backups")),raw.archive);
  assert.match(await recovery.locator("[data-time-locked]").innerText(),/解放まで 1/);
  await recovery.locator('[data-stage="existence"]').click();
  assert.equal(await recovery.locator('[data-child="sources"]').count(),0);
  assert.equal(await recovery.locator('[data-child="engraving"]').innerText(),"？？？");
  await recovery.locator('#sheetHandle [data-action="collapse-sheet"]').click();
  await recovery.locator("#touchField").click();
  await recovery.waitForFunction(()=>window.KOTOWARI_DEBUG.state().time.unlocked);
  await recovery.locator("#convergeMain").click();
  await recovery.waitForFunction(()=>window.KOTOWARI_DEBUG.state().convergenceCount===1);
  await recovery.locator('[data-stage="existence"]').click();
  await recovery.locator('[data-child="engraving"]').click();
  assert.match(await recovery.locator('[data-engraving-buy="ENG-05"]').innerText(),/0\.05/);
  const cachesAfter=await recovery.evaluate(()=>caches.keys());
  assert.equal(cachesAfter.filter(k=>k.startsWith("kotowari-handoff:")).length,1);
  assert.ok(cachesAfter.some(k=>k.includes("pwa-v3541")));
  await ctx.setOffline(true);
  await recovery.reload();
  await recovery.waitForFunction(()=>window.KOTOWARI_DEBUG?.state().convergenceCount===1);
  assert.equal(await recovery.locator("#buildLabel").textContent(),release);
  assert.deepEqual(errors,[]);
  await ctx.close();
  console.log("PASS v3541 actual v3.53 PWA -> coherent v3.54.1; mixed release rejection, open-tab guard, saves, 1M threshold and offline reload");
}finally{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));rmSync(old,{recursive:true,force:true});}
