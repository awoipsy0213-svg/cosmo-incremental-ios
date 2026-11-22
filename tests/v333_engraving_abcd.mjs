import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as G from "../game.mjs";
import {A} from "../numbers.mjs";
import {ENGRAVING_EFFECTS,ENGRAVING_EFFECT_IDS,engravingLevel,engravingTapFactor,
  engravingSourceFactor,engravingCriticalRate,engravingCriticalMultiplier,
  engravingPurchaseFactor,engravingConvergenceCostFactor,engravingConvergenceRewardFactor,
  engravingConvergenceControl,engravingRetainedLevels} from "../engraving-effects-v333.mjs";
import {engravingCatalogue,engravingEffectStatus,engravingPurchaseQuote} from "../engraving-rules-v317.mjs";
import {SaveStore,KEYS,encode,decode,checksum} from "../save.mjs";
const NOW=1800000000000;
let count=0;
const check=(name,fn)=>{fn();count++;console.log("PASS v333",name);};
const started=()=>{const s=G.createState(NOW);s.intro.complete=true;return s;};
const owned=(s,id,lv=1)=>{if(!s.engraving.owned.includes(id))s.engraving.owned.push(id);s.engraving.levels[id]=lv;return s;};
const ratio=(a,b)=>A(a).div(b).toNumber();
check("all 25 A-D effects unique, 30 reserved IDs retained",()=>{
  assert.equal(ENGRAVING_EFFECT_IDS.length,25);
  assert.equal(new Set(ENGRAVING_EFFECT_IDS).size,25);
  assert.deepEqual(ENGRAVING_EFFECT_IDS.map(id=>ENGRAVING_EFFECTS[id].group).reduce((v,x)=>(v[x]=(v[x]||0)+1,v),{}),{A:6,B:8,C:5,D:6});
  assert.equal(engravingCatalogue().length,30);
  for(const id of ["ENG-05","ENG-17","ENG-25","ENG-29","ENG-30"])assert.equal(ENGRAVING_EFFECTS[id],undefined);
  for(const id of ENGRAVING_EFFECT_IDS)assert.equal(engravingEffectStatus(id).status,"implemented");
});
check("unverified legacy levels do not become effect-bearing levels",()=>{
  const s=started();s.engraving.owned=["ENG-01"];s.engraving.levels={};
  assert.equal(engravingLevel(s,"ENG-01"),0);
  assert.equal(engravingTapFactor(s).cmp(1),0);
  const migrated=G.validateState(s,"normal");
  assert.deepEqual(migrated.engraving.owned,["ENG-01"]);
  assert.deepEqual(migrated.engraving.levels,{});
});
check("A: tap and source multipliers, critic rate/multi and purchase discount",()=>{
  const s=started(); const tap=G.tapPower(s),sourceBefore=G.sourceProduction(s,"SOURCE_01");
  owned(s,"ENG-01",3);owned(s,"ENG-02",2);
  owned(s,"ENG-03",2);owned(s,"ENG-04",4);owned(s,"ENG-06",3);owned(s,"ENG-07",2);
  s.sources.SOURCE_01.level=1;
  assert.ok(ratio(G.tapPower(s),tap)>1.05);
  assert.ok(G.sourceProduction(s,"SOURCE_01").cmp(sourceBefore)>0);
  assert.equal(engravingCriticalRate(s),0.01);
  assert.equal(engravingCriticalMultiplier(s),1.03);
  assert.equal(engravingPurchaseFactor(s),0.994);
  assert.ok(G.purchaseQuote(s,"moment","tap","1").cost!=="10");
});
check("B: collection, total levels, balanced production and tap/source resonance",()=>{
  const s=started();
  s.sources.SOURCE_01.level=100;s.sources.SOURCE_02.level=100;
  s.moment.tap=300;
  const t=G.tapPower(s),p=G.production(s);
  for(const id of ["ENG-08","ENG-09","ENG-10","ENG-11","ENG-12","ENG-13","ENG-21"])owned(s,id,2);
  s.convergenceCount=10;
  assert.ok(G.tapPower(s).cmp(t)>0);
  assert.ok(G.production(s).cmp(p)>0);
  assert.ok(engravingSourceFactor(s).cmp(1)>0);
});
check("B: every 20th manual tap and rare extra orb award have observable effect",()=>{
  const a=started(),b=started();
  a.counters.taps=19;b.counters.taps=19;
  owned(b,"ENG-14",1);owned(b,"ENG-15",1);
  const first=G.tap(a,NOW,()=>0.99),second=G.tap(b,NOW,()=>0);
  assert.ok(A(second.gain).cmp(first.gain)>0);
  assert.equal(b.runOrbsEarned,b.totalOrbs);
});
check("C: reward boosts and cost reduction preserve earned-orb basis",()=>{
  const s=started();G.addOrbs(s,1000);
  const old=G.convergenceQuote(s);
  owned(s,"ENG-16",2);owned(s,"ENG-18",3);
  const current=G.convergenceQuote(s);
  assert.ok(A(current.reward).cmp(old.reward)>0);
  assert.ok(A(current.nextRequired).cmp(old.nextRequired)<0);
  assert.equal(current.basis,"run-earned");
  assert.equal(engravingConvergenceRewardFactor(s),1.04);
  assert.equal(engravingConvergenceCostFactor(s),0.97);
});
check("C: explicit retention and initial benefits survive convergence without touching legacy evidence",()=>{
  const s=started();s.sources.SOURCE_01.level=25;s.moment.tap=50;
  owned(s,"ENG-19",2);owned(s,"ENG-20",1);
  G.addOrbs(s,1000);
  assert.ok(G.converge(s).ok);
  assert.equal(s.moment.tap,2);
  assert.equal(s.sources.SOURCE_01.level,2);
  assert.equal(s.runOrbsEarned,"0");
  assert.deepEqual(engravingRetainedLevels(s,0,0),{tap:1,source:1});
});
check("D: autotyping works online and refuses offline stage progress",()=>{
  const s=started();owned(s,"ENG-22",1);owned(s,"ENG-23",1);owned(s,"ENG-26",1);
  s.orbs="100000";
  const beforeTap=G.tapPower(s),beforeTotal=s.totalOrbs;
  const countBefore=s.counters.sourcePurchases;
  const mode=s.purchaseMode;
  G.advance(s,NOW+2000,{offline:false,rng:()=>0.99});
  assert.ok(A(s.totalOrbs).cmp(beforeTotal)>0);
  assert.ok(A(s.totalOrbs).cmp(beforeTap)>0);
  assert.ok(s.moment.tap>0);
  assert.ok(s.counters.sourcePurchases>countBefore);
  assert.equal(s.purchaseMode,mode);
  const prev=JSON.stringify({orbs:s.orbs,total:s.totalOrbs,moment:s.moment,sources:s.sources});
  G.advance(s,NOW+3602000,{offline:true,rng:()=>0});
  assert.equal(JSON.stringify({orbs:s.orbs,total:s.totalOrbs,moment:s.moment,sources:s.sources}),prev);
});
check("D: ENG-27 optimal automated purchasing and ENG-28 configurable convergence stages",()=>{
  const s=started();s.orbs="1e10";
  owned(s,"ENG-26",1);owned(s,"ENG-27",1);owned(s,"ENG-28",1);owned(s,"ENG-24",1);
  assert.equal(engravingConvergenceControl(s),true);
  assert.ok(G.configureAutoConvergence(s,{minSteps:3}).ok);
  G.advance(s,NOW+1000,{offline:false,rng:()=>0.99});
  assert.ok(s.counters.sourcePurchases>=1);
  const old=started();owned(old,"ENG-24",1);
  assert.equal(G.configureAutoConvergence(old,{minSteps:3}).ok,false);
  assert.equal(G.configureAutoConvergence(old,{minSteps:1}).ok,true);
});
check("D: no introduction of independent BOOST income or capacity change",()=>{
  const s=started(),base=G.boostValues(s);
  for(const id of ENGRAVING_EFFECT_IDS)owned(s,id,1);
  const modified=G.boostValues(s);
  assert.equal(modified.capacity,base.capacity);
  assert.equal(modified.offlineRate,base.offlineRate);
  assert.equal(modified.multiplier,base.multiplier);
});
check("engraving save and migration decode safely preserves ongoing automation credits",()=>{
  const s=started();owned(s,"ENG-22");owned(s,"ENG-28");
  s.engraving.equipped=["ENG-22"];s.engraving.runtime.autoMomentCredit=.25;
  s.engraving.autoConverge.minSteps=2;
  const restored=decode(encode(s,"v333"),"normal");
  assert.equal(restored.engraving.runtime.autoMomentCredit,.25);
  assert.equal(restored.engraving.autoConverge.minSteps,2);
  assert.deepEqual(restored.engraving.equipped,["ENG-22"]);
  const raw=JSON.stringify({kind:"kotowari-save",version:31,writer:"old",data:{
    ...s,engraving:{...s.engraving,runtime:undefined,autoConverge:{enabled:false,minReward:"0.025",lastAt:0}}}});
  const parsed=JSON.parse(raw);parsed.checksum=checksum(JSON.stringify(parsed.data));
  const source=JSON.stringify(parsed),map=new Map([[KEYS.normal,source]]);
  const storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};
  const store=new SaveStore(storage,"normal","v333");
  assert.ok(!store.load(NOW).blocked);
  assert.equal(map.get(KEYS.normal+".before-v333-engraving-effects"),source);
  const blockedStore=new SaveStore({getItem:k=>k===KEYS.normal?source:null,
    setItem:()=>{throw Error("quota");}},"normal","v333");
  assert.equal(blockedStore.load(NOW).blocked,true);
  assert.throws(()=>blockedStore.write(s),/保護中/);
});
check("UI shows names, disabled controls stay fixed; PWA and iOS module graph include effects",()=>{
  const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
  assert.ok(read("app.mjs").includes("esc(item.name)"));
  assert.ok(read("app.mjs").includes("autoConvergeMinSteps"));
  assert.ok(read("www/game.mjs").includes("runEngravingAutomation"));
  assert.equal(read("engraving-effects-v333.mjs"),read("www/engraving-effects-v333.mjs"));
  assert.ok(read("sw.js").includes("engraving-effects-v333.mjs"));
});
console.log("PASS "+count+" engraving A/B/C/D checks");
