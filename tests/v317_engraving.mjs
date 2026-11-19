import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {A} from "../numbers.mjs";
import {createState,buyEngraving,beginEngraving,toggleDraft,engravingQuote,
  confirmEngraving,cancelEngraving,configureAutoConvergence,autoConvergenceTick,
  converge,validateState} from "../game.mjs";
import {ENGRAVING_IDS,ENGRAVING_GROUP_PRICES,engravingCatalogue,engravingSlots,
  engravingTier,engravingPrice,engravingPurchaseQuote} from "../engraving-rules-v317.mjs";
import {checksum,SaveStore,KEYS,encode,decode} from "../save.mjs";

const now=1763600000000;
let count=0;
const test=(name,fn)=>{fn();count++;console.log("✓",name);};
const state=()=>{const s=createState(now,"normal");s.intro.complete=true;s.surplusExistence="10";return s;};

test("30 stable IDs, exactly three tiers, 10 each",()=>{
  assert.equal(ENGRAVING_IDS.length,30);
  assert.equal(new Set(ENGRAVING_IDS).size,30);
  assert.deepEqual(ENGRAVING_IDS[0],"ENG-01");
  assert.equal(ENGRAVING_IDS.at(-1),"ENG-30");
  for(let i=0;i<30;i++){
    const id=ENGRAVING_IDS[i],tier=Math.floor(i/10)+1;
    assert.equal(engravingTier(id),tier);
    assert.equal(engravingPrice(id),ENGRAVING_GROUP_PRICES[tier-1]);
  }
  assert.equal(engravingCatalogue().length,30);
});
test("slot thresholds preserve two base plus 1,5,20,100",()=>{
  assert.deepEqual([0,1,4,5,19,20,99,100].map(engravingSlots),[2,3,3,4,4,5,5,6]);
});
test("higher tier needs three different engraved objects from previous tier",()=>{
  const s=state();
  assert.equal(engravingPurchaseQuote(s,"ENG-11").ok,false);
  for(const id of ["ENG-01","ENG-02","ENG-03"])assert.ok(buyEngraving(s,id).ok);
  assert.ok(engravingPurchaseQuote(s,"ENG-11").ok);
  assert.ok(buyEngraving(s,"ENG-11").ok);
  assert.equal(engravingPurchaseQuote(s,"ENG-21").ok,false);
  assert.ok(buyEngraving(s,"ENG-12").ok);
  assert.ok(buyEngraving(s,"ENG-13").ok);
  assert.ok(buyEngraving(s,"ENG-21").ok);
  assert.equal(new Set(s.engraving.owned).size,7);
});
test("first protected existence is inaccessible, purchase one-time",()=>{
  const s=state();s.surplusExistence="0.0049";
  assert.equal(buyEngraving(s,"ENG-01").ok,false);
  s.surplusExistence="0.005";
  const first=buyEngraving(s,"ENG-01");
  assert.equal(first.ok,true);
  assert.equal(A(s.surplusExistence).cmp(0),0);
  assert.equal(buyEngraving(s,"ENG-01").ok,false);
  assert.equal(s.engraving.owned.length,1);
  assert.equal(s.engraving.equipped.length,0);
});
test("draft is reversible and cannot equip an unowned/invalid engraving",()=>{
  const s=state();buyEngraving(s,"ENG-01");buyEngraving(s,"ENG-02");buyEngraving(s,"ENG-03");
  assert.equal(beginEngraving(s).ok,true);
  assert.equal(toggleDraft(s,"ENG-01").ok,true);
  assert.equal(toggleDraft(s,"ENG-02").ok,true);
  assert.equal(toggleDraft(s,"ENG-03").ok,false);
  assert.equal(toggleDraft(s,"ENG-25").ok,false);
  assert.equal(s.engraving.equipped.length,0);
  assert.equal(cancelEngraving(s).ok,true);
  assert.equal(s.engraving.owned.length,3);
  assert.equal(s.engraving.equipped.length,0);
  assert.ok(beginEngraving(s).ok);
  assert.ok(toggleDraft(s,"ENG-01").ok);
  assert.ok(confirmEngraving(s).ok);
  assert.deepEqual(s.engraving.equipped,["ENG-01"]);
  assert.ok(beginEngraving(s).ok);assert.ok(toggleDraft(s,"ENG-01").ok);
  assert.ok(confirmEngraving(s).ok);
  assert.deepEqual(s.engraving.equipped,[]);
  assert.deepEqual(s.engraving.owned,["ENG-01","ENG-02","ENG-03"]);
});
test("equipped state survives convergence and ENG-05/17/25 do not grant unverified retention",()=>{
  const s=state();for(const id of ["ENG-01","ENG-02","ENG-03","ENG-04","ENG-05"])buyEngraving(s,id);
  s.convergenceCount=5;
  beginEngraving(s);toggleDraft(s,"ENG-05");confirmEngraving(s);
  s.sources.SOURCE_01.level=2000;
  s.orbs="1e18";
  assert.ok(converge(s).ok);
  assert.equal(s.sources.SOURCE_01.level,0);
  assert.deepEqual(s.engraving.equipped,["ENG-05"]);
  assert.equal(s.engraving.owned.length,5);
});
test("ENG-24 only: equipped+enabled, 60s interval and reward threshold",()=>{
  const s=state();
  for(const id of ["ENG-01","ENG-02","ENG-03","ENG-11","ENG-12","ENG-13","ENG-24"])
    assert.ok(buyEngraving(s,id).ok);
  assert.equal(configureAutoConvergence(s,{enabled:true},now).ok,false);
  beginEngraving(s);assert.ok(toggleDraft(s,"ENG-24").ok);
  assert.ok(confirmEngraving(s).ok);
  assert.equal(s.engraving.autoConverge.enabled,false);
  assert.equal(configureAutoConvergence(s,{minReward:"0.01"}).ok,false);
  assert.ok(configureAutoConvergence(s,{enabled:true,minReward:"0.025"},now).ok);
  s.orbs="1e20";
  assert.equal(autoConvergenceTick(s,now+59000).ok,false);
  assert.equal(autoConvergenceTick(s,now+60000,true).ok,false);
  assert.equal(s.convergenceCount,0);
  assert.ok(autoConvergenceTick(s,now+60000,false).ok);
  assert.equal(s.convergenceCount,1);
  assert.equal(autoConvergenceTick(s,now+60000,false).ok,false);
  s.orbs="1e20";
  assert.equal(autoConvergenceTick(s,now+119000,false).ok,false);
  assert.ok(autoConvergenceTick(s,now+120000,false).ok);
  assert.equal(s.convergenceCount,2);
  beginEngraving(s);toggleDraft(s,"ENG-24");confirmEngraving(s);
  assert.equal(s.engraving.autoConverge.enabled,false);
  s.orbs="1e20";
  assert.equal(autoConvergenceTick(s,now+300000,false).ok,false);
});
test("normal save roundtrip retains purchases/config separately from old lab active",()=>{
  const s=state();buyEngraving(s,"ENG-01");
  beginEngraving(s);toggleDraft(s,"ENG-01");confirmEngraving(s);
  const restored=decode(encode(s,"v317"),"normal");
  assert.deepEqual(restored.engraving.owned,["ENG-01"]);
  assert.deepEqual(restored.engraving.equipped,["ENG-01"]);
  assert.deepEqual(restored.engraving.active,[]);
  assert.equal(restored.engraving.autoConverge.enabled,false);
  const lab=createState(now,"lab");lab.engraving.active=["autoTap","autoSource"];
  const l=decode(encode(lab,"v317"),"lab");
  assert.deepEqual(l.engraving.active,["autoTap","autoSource"]);
  assert.deepEqual(l.engraving.owned,[]);
});
test("old v31 saves get safe defaults; invalid equipment rejected",()=>{
  const s=state();delete s.engraving.owned;delete s.engraving.equipped;delete s.engraving.autoConverge;
  const old=validateState(s,"normal");
  assert.deepEqual(old.engraving.owned,[]);
  assert.deepEqual(old.engraving.equipped,[]);
  assert.equal(old.engraving.autoConverge.minReward,"2.5e-2");
  old.engraving.equipped=["ENG-24"];
  assert.throws(()=>validateState(old,"normal"),/刻印装備/);
  old.engraving.equipped=[];old.engraving.autoConverge.enabled=true;
  assert.throws(()=>validateState(old,"normal"),/自動収束/);
});
test("pre-v317 snapshots are preserved exactly, blocked when storage is full",()=>{
  const s=state();const body=structuredClone(s);
  delete body.engraving.owned;delete body.engraving.equipped;delete body.engraving.autoConverge;
  const old={kind:"kotowari-save",version:31,writer:"old",data:body,checksum:checksum(JSON.stringify(body))};
  const raw=JSON.stringify(old);
  const memory=new Map([[KEYS.normal,raw]]);
  const storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
  const store=new SaveStore(storage,"normal","eng-tests");
  const loaded=store.load(now);
  assert.equal(loaded.blocked,undefined);
  assert.equal(memory.get(KEYS.normal+".before-v317"),raw);
  store.write(loaded.state,{snapshot:true});
  assert.equal(memory.get(KEYS.normal+".before-v317"),raw);
  const blocked=new SaveStore({getItem:k=>k===KEYS.normal?raw:null,
    setItem:(k,v)=>{if(k.endsWith(".before-v317"))throw Error("storage full");}}, "normal","eng-tests");
  const fail=blocked.load(now);
  assert.equal(fail.blocked,true);
  assert.throws(()=>blocked.write(fail.state),/保護中/);
});
test("PWA includes engraving module and buttons use stable data attributes",()=>{
  const sw=readFileSync(new URL("../sw.js",import.meta.url),"utf8");
  const app=readFileSync(new URL("../app.mjs",import.meta.url),"utf8");
  assert.ok(sw.includes("engraving-rules-v317.mjs"));
  assert.ok(app.includes("data-engraving-buy"));
  assert.ok(app.includes("toggle-auto-converge"));
});
console.log("PASS "+count+" Ver3.17 engraving purchase / equipment / automation / save checks");
