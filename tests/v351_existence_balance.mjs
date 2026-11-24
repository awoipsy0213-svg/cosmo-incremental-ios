import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {A,seriesCost,maxAffordable} from "../numbers.mjs";
import {CONFIG,EXISTENCE_BALANCE_V351 as BAL} from "../balance-config.mjs";
import {CONTENT} from "../content.mjs";
import * as G from "../game.mjs";
import {encode,decode,KEYS} from "../save.mjs";
const NOW=1800000000000;
const state=()=>{const s=G.createState(NOW);s.intro.complete=true;s.time.unlocked=true;return s};
const near=(a,b,rel=1e-9)=>assert.ok(Math.abs(A(a).div(b).toNumber()-1)<rel,`${a} vs ${b}`);
const m=CONTENT.moment.map(x=>x.id),ids=CONTENT.sources.map(x=>x.id);
const own=(s,id,lv=1)=>{s.engraving.owned.push(id);s.engraving.levels[id]=lv};
assert.equal(m.length,30);assert.equal(ids.length,30);assert.equal(BAL.gradeLevelRatio,10);
assert.equal(CONFIG.schemaVersion,31);assert.equal(KEYS.normal,"kotowari_v31_normal");
for(const curve of [BAL.sourceCurve,BAL.momentCurve]){
  for(const [start,count] of [[0,10],[24,26],[90,20],[99,2],[100,20],[1000,10],[999990,10]]){
    let sum=A(0);for(let k=0;k<count;k++)sum=sum.add(seriesCost(15,curve,start+k,1));
    const total=seriesCost(15,curve,start,count);
    near(total,sum);
    assert.equal(maxAffordable(total,15,curve,start,count),count);
    assert.equal(maxAffordable(total.mul(.9999999),15,curve,start,count),count-1);
  }
}
for(const [kind,all] of [["moment",m],["source",ids]]){
  const s=state();
  for(let i=1;i<30;i++){
    const previous=all[i-1],next=all[i],get=()=>kind==="moment"?s.moment:s.sources;
    const level=n=>{if(kind==="moment")get()[previous]=n;else get()[previous].level=n};
    const target=A(G.purchaseQuote(s,kind,next,"1").cost);
    level(9);assert.ok(A(G.purchaseQuote(s,kind,previous,"1").cost).cmp(target)<0);
    level(10);assert.ok(A(G.purchaseQuote(s,kind,previous,"1").cost).cmp(target)>0);
    level(0);
  }
}
for(let i=0;i<30;i++){
  const s=state(),id=ids[i];
  for(const lv of [1,24,25,50,99,100,101,1000,10000,999999,1000000]){
    s.sources[id].level=lv;
    const out=G.sourceProduction(s,id);
    assert.ok(out.cmp(0)>0);
    if(lv<1000000)assert.ok(G.sourceNextGain(s,id).cmp(0)>0);
    else assert.equal(G.sourceNextGain(s,id).cmp(0),0);
  }
}
const s=state();s.sources.SOURCE_01.level=99;s.moment.tap=100;s.orbs="1e9";
s.totalExistenceEarned="2.5";s.surplusExistence=".25";own(s,"ENG-07",5);
const restored=decode(encode(s,"v351-old-save"),"normal");
assert.equal(restored.sources.SOURCE_01.level,99);assert.equal(restored.moment.tap,100);
near(restored.orbs,s.orbs);near(restored.totalExistenceEarned,s.totalExistenceEarned);
near(restored.surplusExistence,s.surplusExistence);
const q=G.purchaseQuote(restored,"source",ids[0],"10");assert.equal(q.count,10);
restored.purchaseMode="10";assert.equal(G.buy(restored,"source",ids[0]).ok,true);
assert.equal(restored.sources.SOURCE_01.level,109);
near(A(s.orbs).sub(restored.orbs),q.cost,1e-6);
const max=state();const cost=seriesCost(CONFIG.provisional.source.baseCosts[0],CONFIG.provisional.source.costGrowth,0,3005);
max.orbs=cost.toString();assert.equal(G.purchaseQuote(max,"source",ids[0],"MAX").count,3000);
assert.equal(G.purchaseQuote(max,"source",ids[0],"MAX").limitReached,true);
const cap=state();for(const id of ids){cap.sources[id].level=1000000;}
assert.equal(G.sourceCycleStatus(cap).unlocked,true);
// Historical v3.51 timing estimates are retained in BALANCE_V351.md.
// Current-scale routes and timing assertions are covered by v352_existence_balance.mjs.
for(const p of ["numbers.mjs","balance-config.mjs","game.mjs","price-lab.mjs","sw.js"])
  assert.equal(readFileSync(new URL("../"+p,import.meta.url),"utf8"),readFileSync(new URL("../www/"+p,import.meta.url),"utf8"),p);
console.log("PASS v351 all 60 grade prices, high-level sums, milestones, MAX, save and synergy");
