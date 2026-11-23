import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as G from "../game.mjs";
import {CONTENT} from "../content.mjs";
import {A} from "../numbers.mjs";
import {encode,decode} from "../save.mjs";

const NOW=1800000000000;
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const state=()=>{const s=G.createState(NOW);s.intro.complete=true;return s;};
const own=(s,id,level=1)=>{if(!s.engraving.owned.includes(id))s.engraving.owned.push(id);s.engraving.levels[id]=level;return s;};
const check=(label,fn)=>{fn();console.log("PASS v336",label);};

check("old schema 31 saves get defaults without changing verified balances or engraving data",()=>{
  const old=state();
  old.orbs="123.75";old.engraving.owned=["ENG-23"];old.engraving.levels={"ENG-23":1};
  old.engraving.runtime.autoMomentCredit=.75;
  delete old.engraving.autoBuy;delete old.engraving.autoConverge.mode;
  delete old.engraving.autoConverge.intervalSeconds;
  delete old.engraving.autoConverge.intervalMinutes;
  delete old.engraving.autoConverge.targetRunOrbs;
  delete old.settings.automationStage;
  const s=G.validateState(old,"normal");
  assert.equal(s.schemaVersion,31);
  assert.equal(A(s.orbs).cmp("123.75"),0,"preserve exact wallet value");
  assert.deepEqual(s.engraving.owned,["ENG-23"]);
  assert.equal(s.engraving.runtime.autoMomentCredit,.75);
  assert.equal(s.engraving.autoBuy.moment.enabled,true);
  assert.equal(s.engraving.autoBuy.moment.priority,"auto");
  assert.equal(s.engraving.autoConverge.mode,"ready");
  assert.equal(s.settings.automationStage,"existence");
  const restored=decode(encode(s,"v336-check"),"normal");
  assert.equal(restored.engraving.autoBuy.moment.intervalSeconds,1);
  assert.equal(restored.settings.automationStage,"existence");
});
check("engraving gates automation; purchase and convergence settings reject invalid values",()=>{
  const s=state();
  assert.equal(G.configureAutoPurchase(s,"moment",{enabled:true}).ok,false);
  assert.equal(G.configureAutoConvergence(s,{enabled:true},NOW).ok,false);
  own(s,"ENG-23");
  assert.equal(G.configureAutoPurchase(s,"moment",{enabled:false}).ok,true);
  assert.equal(G.configureAutoPurchase(s,"moment",{priority:"expensive"}).ok,true);
  assert.equal(G.configureAutoPurchase(s,"moment",{intervalSeconds:5}).ok,true);
  assert.equal(G.configureAutoPurchase(s,"moment",{intervalSeconds:0}).ok,false);
  assert.equal(G.configureAutoPurchase(s,"moment",{priority:"efficient"}).ok,false);
  own(s,"ENG-27");
  assert.equal(G.configureAutoPurchase(s,"moment",{priority:"efficient"}).ok,true);
  own(s,"ENG-24");
  assert.equal(G.configureAutoConvergence(s,{mode:"minutes",intervalMinutes:2,enabled:true},NOW).ok,true);
  const before=JSON.stringify(s.engraving.autoConverge);
  assert.equal(G.configureAutoConvergence(s,{targetRunOrbs:"NOT_A_NUMBER"}).ok,false);
  assert.equal(G.configureAutoConvergence(s,{intervalSeconds:59}).ok,false);
  assert.equal(G.configureAutoConvergence(s,{minSteps:2}).ok,false);
  assert.equal(JSON.stringify(s.engraving.autoConverge),before);
  own(s,"ENG-28");
  assert.equal(G.configureAutoConvergence(s,{minSteps:2}).ok,true);
});
check("cheap versus expensive purchase priority uses the affordable quote from both directions",()=>{
  const cheaper=state(),dearer=state();
  for(const s of [cheaper,dearer]){
    own(s,"ENG-23");s.orbs="1e50";s.runOrbsEarned="0";s.lastWall=NOW;
  }
  const offers=CONTENT.moment.map(({id})=>({id,cost:A(G.purchaseQuote(cheaper,"moment",id,"1").cost)}))
    .sort((a,b)=>a.cost.cmp(b.cost));
  assert.ok(offers.length>2);
  assert.equal(G.configureAutoPurchase(cheaper,"moment",{priority:"cheap",intervalSeconds:1}).ok,true);
  assert.equal(G.configureAutoPurchase(dearer,"moment",{priority:"expensive",intervalSeconds:1}).ok,true);
  G.advance(cheaper,NOW+4000,{offline:false,rng:()=>.99});
  G.advance(dearer,NOW+4000,{offline:false,rng:()=>.99});
  assert.equal(cheaper.moment[offers[0].id],1);
  assert.equal(dearer.moment[offers.at(-1).id],1);
  assert.equal(cheaper.purchaseMode,"1");
  assert.equal(dearer.purchaseMode,"1");
});
check("automation switches and configured game-second interval stop or schedule purchases",()=>{
  const s=state();own(s,"ENG-23");s.orbs="1e40";
  assert.equal(G.configureAutoPurchase(s,"moment",{intervalSeconds:5,enabled:false}).ok,true);
  G.advance(s,NOW+5000,{offline:false,rng:()=>.99});
  assert.equal(Object.values(s.moment).reduce((a,b)=>a+b,0),0);
  assert.equal(G.configureAutoPurchase(s,"moment",{enabled:true}).ok,true);
  G.advance(s,NOW+7000,{offline:false,rng:()=>.99});
  assert.equal(Object.values(s.moment).reduce((a,b)=>a+b,0),0);
  G.advance(s,NOW+10000,{offline:false,rng:()=>.99});
  assert.ok(Object.values(s.moment).reduce((a,b)=>a+b,0)>0);
  const before=Object.values(s.moment).reduce((a,b)=>a+b,0);
  G.advance(s,NOW+3600000,{offline:true,rng:()=>0});
  assert.equal(Object.values(s.moment).reduce((a,b)=>a+b,0),before);
});
check("all four auto-convergence modes obey actual earned orbs and the minimum real 60s guard",()=>{
  const run=(mode,extra,early,late,orbs="1e8")=>{
    const s=state();own(s,"ENG-24");G.addOrbs(s,orbs);
    assert.ok(G.convergenceQuote(s).steps>0);
    const cfg=G.configureAutoConvergence(s,{mode,enabled:true,...extra},NOW);
    assert.equal(cfg.ok,true,mode+" setting");
    assert.equal(G.autoConvergenceTick(s,NOW+early,false).ok,false,mode+" before threshold");
    assert.equal(G.autoConvergenceTick(s,NOW+late,false).ok,true,mode+" at threshold");
  };
  run("ready",{},59000,60000);
  run("seconds",{intervalSeconds:180},120000,180000);
  run("minutes",{intervalMinutes:3},170000,180000);
  run("earned",{targetRunOrbs:"1e8"},59000,60000);
  const s=state();own(s,"ENG-24");G.addOrbs(s,"1e6");
  assert.equal(G.configureAutoConvergence(s,{mode:"earned",targetRunOrbs:"1e8",enabled:true},NOW).ok,true);
  assert.equal(G.autoConvergenceTick(s,NOW+200000).ok,false,"wallet is not the threshold");
  G.addOrbs(s,"1e8");
  assert.equal(G.autoConvergenceTick(s,NOW+200001).ok,true);
});
check("automation UI, PWA cache and Capacitor www source files are identical",()=>{
  const app=read("app.mjs"),sw=read("sw.js"),css=read("automation-center-v336.css");
  assert.match(app,/function openAutomation/);
  assert.match(app,/function automationHTML/);
  assert.match(app,/class="automation-quick/);
  assert.match(app,/data-auto-mode/);
  assert.match(sw,/3\.50\.0-time-residue/);
  assert.ok(css.includes(".automation-convergence"));
  for(const f of ["app.mjs","game.mjs","engraving-effects-v333.mjs","sw.js","index.html","automation-center-v336.css"])
    assert.equal(read(f),read("www/"+f),"Web/iOS mismatch "+f);
});
console.log("PASS v336 all automation center checks");