import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {A,seriesCost,maxAffordable,formatOrbAmount} from "../numbers.mjs";
import {CONFIG,EXISTENCE_BALANCE_V352 as BAL} from "../balance-config.mjs";
import {CONTENT} from "../content.mjs";
import * as G from "../game.mjs";
import {encode,decode,KEYS} from "../save.mjs";

const NOW=1800000000000;
const fresh=()=>{const s=G.createState(NOW);s.intro.complete=true;s.time.unlocked=true;return s};
const near=(a,b,rel=1e-7)=>assert.ok(Math.abs(A(a).div(b).toNumber()-1)<rel,`${a} vs ${b}`);
const sources=CONTENT.sources.map(x=>x.id),moments=CONTENT.moment.map(x=>x.id);
const source=CONFIG.provisional.source,moment=CONFIG.provisional.moment;
assert.equal(CONFIG.schemaVersion,31);assert.equal(KEYS.normal,"kotowari_v31_normal");
assert.equal(BAL.gradeLevelRatio,10);
assert.equal(BAL.gradeLogs.length,30);
assert.equal(source.baseCosts[29],"1e1000000");
assert.equal(moment[moments[29]].baseCost,"1e1000000");
assert.ok(!/Infinity|NaN/.test(formatOrbAmount("1e1000000")));

for(const [kind,ids] of [["source",sources],["moment",moments]]){
  const s=fresh();
  for(let i=0;i<30;i++){
    const id=ids[i],base=kind==="source"?source.baseCosts[i]:moment[id].baseCost;
    const curve=kind==="source"?source.costCurves[i]:moment[id].growth;
    const level=n=>{if(kind==="source")s.sources[id].level=n;else s.moment[id]=n};
    level(0);
    near(G.purchaseQuote(s,kind,id,"1").cost,base);
    for(const [start,count] of [[0,10],[8,3],[90,15],[100,20],[999990,10]]){
      const total=seriesCost(base,curve,start,count);
      let sum=A(0);for(let k=0;k<count;k++)sum=sum.add(seriesCost(base,curve,start+k,1));
      near(total,sum);
      assert.equal(maxAffordable(total,base,curve,start,count),count);
      assert.ok(maxAffordable(total.mul(.99999),base,curve,start,count)<count);
    }
    if(i<29){
      const next=A(G.purchaseQuote(s,kind,ids[i+1],"1").cost);
      level(9);assert.ok(A(G.purchaseQuote(s,kind,id,"1").cost).cmp(next)<0,id+" Lv10");
      level(10);assert.ok(A(G.purchaseQuote(s,kind,id,"1").cost).cmp(next)>0,id+" Lv11");
    }
    if(i<28){
      const next2=A(G.purchaseQuote(s,kind,ids[i+2],"1").cost);
      level(99);assert.ok(A(G.purchaseQuote(s,kind,id,"1").cost).cmp(next2)<0,id+" Lv100");
      level(100);assert.ok(A(G.purchaseQuote(s,kind,id,"1").cost).cmp(next2)>0,id+" Lv101");
    }
    let prior=A(0);
    for(const lv of [1,9,10,24,25,50,99,100,101,1000,10000,999999,1000000]){
      level(lv);
      const gain=kind==="source"?G.sourceProduction(s,id):G.momentEconomicGain(id,lv);
      assert.ok(gain.cmp(prior)>0,id+" income Lv"+lv);
      prior=gain;
      if(kind==="source"&&lv<1000000)assert.ok(G.sourceNextGain(s,id).cmp(0)>0);
    }
    assert.equal(G.purchaseQuote(s,kind,id,"1").enabled,false);
    level(0);
  }
}
const high=fresh(),finalSource=sources[29],finalMoment=moments[29];
for(const [kind,id,base,curve] of [
  ["source",finalSource,source.baseCosts[29],source.costCurves[29]],
  ["moment",finalMoment,moment[finalMoment].baseCost,moment[finalMoment].growth]
]){
  high.orbs=seriesCost(base,curve,0,3005).toString();
  const q=G.purchaseQuote(high,kind,id,"MAX");
  assert.equal(q.count,3000);assert.equal(q.limitReached,true);
  high.purchaseMode="MAX";
  assert.equal(G.buy(high,kind,id).ok,true);
  assert.equal(kind==="source"?high.sources[id].level:high.moment[id],3000);
}
assert.ok(G.tapPower(high,NOW).cmp("1e1000000")>0);
assert.ok(G.production(high,NOW).cmp("1e1000000")>0);
const restored=decode(encode(high,"v352-huge-save"),"normal");
assert.equal(restored.sources[finalSource].level,3000);
assert.equal(restored.moment[finalMoment],3000);
near(restored.orbs,high.orbs);
near(G.production(restored,NOW),G.production(high,NOW));
assert.ok(G.momentEffects(restored)[29].current.includes("基礎+"));
const c=fresh();assert.equal(A(G.convergenceQuote(c).nextRequired).cmp(1000000),0);
G.addOrbs(c,"999999");assert.equal(G.convergenceQuote(c).steps,0);
G.addOrbs(c,1);assert.equal(G.convergenceQuote(c).steps,1);
assert.equal(A(G.convergenceQuote(c).nextRequired).cmp(2200000),0);
G.addOrbs(c,"1e1000000");
const cq=G.convergenceQuote(c);
assert.ok(cq.steps>10000000&&cq.steps<1000000000);
assert.ok(A(cq.nextRequired).cmp(c.runOrbsEarned)>0);
assert.ok(A(cq.reward).cmp(0)>0);
assert.equal(G.converge(c).ok,true);
assert.equal(c.runOrbsEarned,"0");
assert.ok(A(c.totalExistenceEarned).cmp(cq.reward)===0);

const cap=fresh();for(const id of sources)cap.sources[id].level=1000000;
assert.equal(G.sourceCycleStatus(cap).unlocked,true);
assert.equal(G.breakthrough(cap,sources[0]).ok,true);
assert.equal(cap.sources[sources[0]].level,1);

// Post-unlock deterministic constant-rate routes using actual quotes and outputs.
// These isolate the post-unlock economy, not the new pre-unlock game.
// No proc RNG, automatic convergence or wall-clock advancement.
function route(kind,permanent=false){
  const s=fresh();
  if(permanent){
    s.totalExistenceEarned="10";s.surplusExistence="10";
    for(const id of ["ENG-01","ENG-02","ENG-06","ENG-07","ENG-08","ENG-09","ENG-10","ENG-12","ENG-16","ENG-21","ENG-22"]){
      s.engraving.owned.push(id);s.engraving.levels[id]=5;
    }
  }
  const ids=kind==="source"?sources:moments;
  let seconds=0,finalAt=0;
  const points=[];
  for(let i=0;i<ids.length;i++)for(let lv=1;lv<=10;lv++){
    const q=G.purchaseQuote(s,kind,ids[i],"1");
    const income=G.production(s,NOW).add(G.tapPower(s,NOW).mul(5));
    const needed=A(q.cost).sub(s.orbs);
    const dt=needed.div(income).toNumber();
    assert.ok(Number.isFinite(dt)&&dt>=0,`${kind}/${i+1}/${lv} stalled`);
    seconds+=dt;G.addOrbs(s,needed);
    if(A(s.orbs).cmp(q.cost)<0)G.addOrbs(s,A(q.cost).mul(1e-12));
    assert.equal(G.buy(s,kind,ids[i]).ok,true);
    if(lv===1&&[0,1,2,4,9,14,19,24,29].includes(i))
      points.push([i+1,Math.round(seconds)]);
    if(i===29&&lv===1)finalAt=seconds;
  }
  return {kind,permanent,finalAt:Math.round(finalAt),allLv10At:Math.round(seconds),points};
}
const a=route("source"),b=route("source",true),d=route("moment");
assert.ok(a.finalAt>36000&&a.finalAt<172800);
assert.ok(b.finalAt<a.finalAt/10);
assert.ok(d.finalAt>36000&&d.finalAt<172800);
console.log("V352 deterministic routes",JSON.stringify({a,b,d}));
for(const p of ["numbers.mjs","balance-config.mjs","game.mjs","setsuna-rules-v39.mjs","sw.js"])
  assert.equal(readFileSync(new URL("../"+p,import.meta.url),"utf8"),readFileSync(new URL("../www/"+p,import.meta.url),"utf8"),p);
console.log("PASS v352 million-exponent price, gain, convergence, bulk, save, and progression routes");
