import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {A} from "../numbers.mjs";
import {createState,addOrbs,buyEngraving,buy,beginEngraving,toggleDraft,confirmEngraving,cancelEngraving,configureAutoConvergence,autoConvergenceTick,convergenceQuote,converge,validateState} from "../game.mjs";
import {ENGRAVING_IDS,ENGRAVING_GROUP_PRICES,engravingCatalogue,engravingSlots,engravingTier,engravingPrice,engravingPurchaseQuote} from "../engraving-rules-v317.mjs";
import {checksum,SaveStore,KEYS,encode,decode} from "../save.mjs";
const now=1763600000000;
let count=0;
const test=(name,fn)=>{fn();count++;console.log("PASS",name);};
const state=()=>{const s=createState(now,"normal");s.intro.complete=true;s.surplusExistence="10";return s;};
test("30 stable IDs, retained initial costs and historical slot data",()=>{
  assert.equal(ENGRAVING_IDS.length,30);
  for(let i=0;i<30;i++){const id=ENGRAVING_IDS[i],tier=Math.floor(i/10)+1;
    assert.equal(engravingTier(id),tier);assert.equal(engravingPrice(id),ENGRAVING_GROUP_PRICES[tier-1]);}
  assert.equal(engravingCatalogue().length,30);
  assert.deepEqual([0,1,4,5,19,20,99,100].map(engravingSlots),[2,3,3,4,4,5,5,6]);
});
test("first purchase becomes Lv.1, upper levels stay unavailable; first existence protected",()=>{
  const s=state();s.surplusExistence="0.0009";
  assert.equal(buyEngraving(s,"ENG-01").ok,false);
  s.surplusExistence="0.001";assert.ok(buyEngraving(s,"ENG-01").ok);
  assert.equal(A(s.surplusExistence).cmp(0),0);
  assert.deepEqual(s.engraving.owned,["ENG-01"]);assert.equal(s.engraving.levels["ENG-01"],1);
  assert.equal(buyEngraving(s,"ENG-01").ok,false);assert.deepEqual(s.engraving.equipped,[]);
});
test("first acquisition tier gate is not redefined",()=>{
  const s=state();assert.equal(engravingPurchaseQuote(s,"ENG-11").ok,false);
  for(const id of ["ENG-01","ENG-02","ENG-03"])assert.ok(buyEngraving(s,id).ok);
  assert.ok(buyEngraving(s,"ENG-11").ok);assert.equal(engravingPurchaseQuote(s,"ENG-21").ok,false);
  for(const id of ["ENG-12","ENG-13"])assert.ok(buyEngraving(s,id).ok);
  assert.ok(buyEngraving(s,"ENG-21").ok);assert.equal(s.engraving.owned.length,7);
});
test("equipment editor is disabled but original equipment bytes remain",()=>{
  const s=state();buyEngraving(s,"ENG-01");s.engraving.equipped=["ENG-01"];
  const before=JSON.stringify(s.engraving);
  for(const result of [beginEngraving(s),toggleDraft(s,"ENG-01"),confirmEngraving(s),cancelEngraving(s)])assert.equal(result.ok,false);
  assert.equal(JSON.stringify(s.engraving),before);
});
test("run-earned progression cannot decrease when upgrades spend wallet",()=>{
  const s=state();addOrbs(s,"1e10");const q=convergenceQuote(s);
  assert.equal(q.basis,"run-earned");assert.ok(q.steps>0);
  assert.ok(buy(s,"moment","tap").ok);
  assert.equal(convergenceQuote(s).steps,q.steps);assert.equal(s.runOrbsEarned,"1e10");
  addOrbs(s,"1e10");assert.ok(convergenceQuote(s).steps>=q.steps);
  const total=s.totalOrbs;assert.ok(converge(s).ok);
  assert.equal(s.runOrbsEarned,"0");assert.equal(s.runOrbsEvidence,"verified");
  assert.equal(s.orbs,"0");assert.equal(s.totalOrbs,total);assert.equal(s.moment.tap,0);
  assert.equal(convergenceQuote(s).steps,0);
});
test("owned engravings, historical equipped list and source cycle history survive convergence",()=>{
  const s=state();for(const id of ["ENG-01","ENG-02","ENG-03","ENG-04","ENG-05"])buyEngraving(s,id);
  s.engraving.equipped=["ENG-05"];s.sources.SOURCE_01.level=2000;addOrbs(s,"1e10");
  assert.ok(converge(s).ok);assert.equal(s.sources.SOURCE_01.level,0);
  assert.deepEqual(s.engraving.equipped,["ENG-05"]);assert.equal(s.engraving.owned.length,5);
  assert.equal(s.engraving.levels["ENG-05"],1);
});
test("ENG-24 runs when owned and opted-in without equipping, interval and offline protected",()=>{
  const s=state();assert.equal(configureAutoConvergence(s,{enabled:true},now).ok,false);
  for(const id of ["ENG-01","ENG-02","ENG-03","ENG-11","ENG-12","ENG-13","ENG-24"])assert.ok(buyEngraving(s,id).ok);
  assert.equal(configureAutoConvergence(s,{minReward:"0.01"}).ok,false);
  assert.ok(configureAutoConvergence(s,{enabled:true,minReward:"0.025"},now).ok);
  assert.deepEqual(s.engraving.equipped,[]);addOrbs(s,"1e20");
  assert.equal(autoConvergenceTick(s,now+59000).ok,false);
  assert.equal(autoConvergenceTick(s,now+60000,true).ok,false);
  assert.ok(autoConvergenceTick(s,now+60000,false).ok);
  addOrbs(s,"1e20");
  assert.equal(autoConvergenceTick(s,now+119000,false).ok,false);
  assert.ok(autoConvergenceTick(s,now+120000,false).ok);
  assert.equal(s.convergenceCount,2);
  assert.ok(configureAutoConvergence(s,{enabled:false},now+120001).ok);
  addOrbs(s,"1e20");assert.equal(autoConvergenceTick(s,now+300000,false).ok,false);
});
test("legacy owned/equipment remains exact and run-earned history is never fabricated",()=>{
  const s=state();buyEngraving(s,"ENG-01");s.engraving.equipped=["ENG-01"];
  s.orbs="123456789";delete s.runOrbsEarned;delete s.runOrbsEvidence;delete s.engraving.levels;
  const old=validateState(s,"normal");
  assert.equal(old.runOrbsEarned,"0");assert.equal(old.runOrbsEvidence,"legacy-unverified");
  assert.deepEqual(old.engraving.owned,["ENG-01"]);
  assert.deepEqual(old.engraving.equipped,["ENG-01"]);assert.deepEqual(old.engraving.levels,{});
  assert.equal(convergenceQuote(old).basis,"run-earned");
  assert.equal(convergenceQuote(old).steps,0,"unverified prior wallet is not earned history");
  assert.equal(converge(old).ok,false);
  addOrbs(old,convergenceQuote(old).nextRequired);assert.ok(converge(old).ok);assert.equal(old.runOrbsEvidence,"verified");
});
test("old save backed up byte-for-byte; failure blocks rewrite",()=>{
  const s=state();delete s.runOrbsEarned;delete s.runOrbsEvidence;delete s.engraving.levels;
  const body=structuredClone(s);
  const raw=JSON.stringify({kind:"kotowari-save",version:31,writer:"old",data:body,checksum:checksum(JSON.stringify(body))});
  const map=new Map([[KEYS.normal,raw]]);
  const store=new SaveStore({getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)},"normal","v329");
  const loaded=store.load(now);assert.equal(loaded.blocked,undefined);
  assert.equal(map.get(KEYS.normal+".before-v329-earned-engraving"),raw);
  store.write(loaded.state);assert.equal(map.get(KEYS.normal+".before-v329-earned-engraving"),raw);
  const unavailable=new SaveStore({getItem:k=>k===KEYS.normal?raw:null,
    setItem:(k,v)=>{if(k.endsWith(".before-v329-earned-engraving"))throw Error("quota");}},"normal","v329");
  const fail=unavailable.load(now);assert.equal(fail.blocked,true);
  assert.throws(()=>unavailable.write(fail.state),/保護中/);
});
test("serialization preserves current levels and isolated lab mode",()=>{
  const s=state();buyEngraving(s,"ENG-01");addOrbs(s,"12345");
  const recovered=decode(encode(s,"v329"),"normal");
  assert.equal(recovered.engraving.levels["ENG-01"],1);
  assert.equal(A(recovered.runOrbsEarned).cmp(12345),0);
  assert.equal(recovered.runOrbsEvidence,"verified");
  const lab=createState(now,"lab");lab.engraving.active=["autoTap","autoSource"];
  const restored=decode(encode(lab,"v329"),"lab");
  assert.deepEqual(restored.engraving.active,["autoTap","autoSource"]);
});
test("current UI keeps permanent purchase and no visible equipment editor",()=>{
  const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
  assert.ok(read("sw.js").includes("engraving-rules-v317.mjs"));
  const app=read("app.mjs");
  assert.ok(app.includes("data-engraving-buy"));assert.ok(app.includes("toggle-auto-converge"));
  assert.ok(!app.includes("装備を編集</button>"));assert.ok(app.includes("runOrbsEarned"));
});
console.log("PASS "+count+" v329 engraving, run-earned and migration regression");
