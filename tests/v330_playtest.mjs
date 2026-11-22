import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as G from "../game.mjs";
import {CONFIG} from "../balance-config.mjs";
import {A} from "../numbers.mjs";
import {SaveStore,KEYS,encode,decode,checksum} from "../save.mjs";
const NOW=1800000000000;
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
let passed=0;
const check=(label,fn)=>{fn();passed++;console.log("PASS v330",label);};
const started=()=>{const s=G.createState(NOW);s.intro.complete=true;return s;};
check("version, save schema and separated provisional constants",()=>{
  assert.equal(CONFIG.version,"3.30.1");assert.equal(CONFIG.schemaVersion,31);
  assert.equal(KEYS.normal,"kotowari_v31_normal");
  assert.deepEqual(CONFIG.provisional.boostTrial.limits,[10,10,12,3,16]);
  assert.deepEqual(started().boost.trialLevels,[0,0,0,0,0]);
});
check("BOOST five roles can be purchased with independent balances, not old levels",()=>{
  const s=started();s.boost.seconds=3600;
  assert.equal(G.boostTrialPurchaseQuote(s,0).cost,300);
  assert.ok(G.buyBoostTrialUpgrade(s,0).ok);
  assert.deepEqual(s.boost.trialLevels,[1,0,0,0,0]);
  assert.deepEqual(s.boost.upgrades,[0,0,0,0,0],"historical upgrades unchanged");
  assert.ok(Math.abs(G.boostValues(s).offlineRate*3600-990)<1e-9);
  for(const index of [1,2,3,4]){
    s.boost.seconds=10000;
    const q=G.boostTrialPurchaseQuote(s,index);
    assert.equal(q.ok,true);
    assert.ok(G.buyBoostTrialUpgrade(s,index).ok);
  }
  assert.deepEqual(s.boost.trialLevels,[1,1,1,1,1]);
  assert.ok(Math.abs(G.boostValues(s).offlineRate*3600-1089)<1e-9);
  assert.equal(G.boostValues(s).capacity,5400);
  assert.equal(G.boostTimeMultiplier(s),3);
  assert.ok(Math.abs(G.boostConsumptionFactor(s)-.95)<1e-9);
  assert.equal(s.boost.accounting.upgrade>0,true);
});
check("BOOST time multiplier/efficiency debits exactly once without resources multiplier",()=>{
  const s=started();s.boost.seconds=100;s.boost.active=true;s.boost.trialLevels=[0,0,0,1,1];
  const result=G.advance(s,NOW+1000,{offline:false,rng:()=>0.8});
  assert.ok(Math.abs(result.gameSeconds-3)<1e-9);
  assert.ok(Math.abs(s.boost.seconds-98.1)<1e-9);
  assert.ok(Math.abs(s.boost.accounting.spent-1.9)<1e-9);
  assert.equal(s.boost.accounting.entries.at(-1).interval.multiplier,3);
  assert.equal(s.totalOrbs,"0");
});
check("BOOST offline awards only buffer, respects new cap and avoids in-game progression",()=>{
  const s=started();s.boost.trialLevels=[1,1,2,0,0];
  const previous=s.orbs,total=s.totalOrbs,previousTime=s.time.elapsed;
  const result=G.advance(s,NOW+3600000,{offline:true,rng:()=>0.3});
  assert.equal(result.orbs,"0");
  assert.ok(Math.abs(result.boost-1089)<1e-9);
  assert.equal(G.boostValues(s).capacity,7200);
  assert.equal(s.orbs,previous);assert.equal(s.totalOrbs,total);
  assert.equal(s.time.elapsed,previousTime);
  assert.equal(s.boost.active,false);
});
check("ENG add-on upgrades never infer legacy owned Lv, and preserve equipment records",()=>{
  const s=started();s.surplusExistence="10";
  s.engraving.owned=["ENG-01"];s.engraving.equipped=["ENG-01"];s.engraving.levels={};
  const old=JSON.stringify(s.engraving.equipped);
  const q=G.engravingTrialUpgradeQuote(s,"ENG-01");
  assert.ok(q.ok);assert.equal(A(q.price).cmp("0.008"),0);
  assert.ok(G.buyEngravingTrialUpgrade(s,"ENG-01").ok);
  assert.deepEqual(s.engraving.equipped,JSON.parse(old));
  assert.equal(s.engraving.levels["ENG-01"],undefined);
  assert.equal(s.engraving.trialLevels["ENG-01"],1);
  assert.equal(G.engravingPlaytestFactor(s).cmp("1.005"),0);
  assert.equal(G.validateState(s,"normal").engraving.trialLevels["ENG-01"],1);
});
check("ENG confirmed initial purchase plus provisional extra levels persist across convergence",()=>{
  const s=started();s.surplusExistence="10";
  assert.ok(G.buyEngraving(s,"ENG-01").ok);
  assert.equal(s.engraving.levels["ENG-01"],1);
  assert.ok(G.buyEngravingTrialUpgrade(s,"ENG-01").ok);
  assert.equal(s.engraving.levels["ENG-01"],2);
  G.addOrbs(s,"1e8");
  assert.ok(G.converge(s).ok);
  assert.equal(s.engraving.levels["ENG-01"],2);
  assert.equal(s.engraving.trialLevels["ENG-01"],1);
  const round=decode(encode(s,"v330"),"normal");
  assert.equal(round.engraving.levels["ENG-01"],2);
  assert.equal(round.engraving.trialLevels["ENG-01"],1);
});
check("convergence progress is based on earned orbs even after spending",()=>{
  const s=started();
  G.addOrbs(s,"1500");
  const q=G.convergenceProgress(s);
  assert.equal(q.basis,"run-earned");
  assert.ok(q.percent>0&&q.percent<100);
  const spent=G.buy(s,"moment","tap");
  assert.ok(spent.ok);
  assert.equal(G.convergenceProgress(s).percent,q.percent);
  assert.equal(G.convergenceProgress(s).steps,q.steps);
  assert.equal(s.runOrbsEarned,"1.5e3");
  assert.ok(G.converge(s).ok);
  assert.equal(s.runOrbsEarned,"0");
  assert.equal(G.convergenceProgress(s).percent,0);
});
check("v3.30 raw pre-upgrade state is backed up exactly; failure halts writes",()=>{
  const s=started();delete s.boost.trialLevels;delete s.engraving.trialLevels;
  const body=JSON.stringify(s);
  const raw=JSON.stringify({kind:"kotowari-save",version:31,data:s,checksum:checksum(body),writer:"pre-v330"});
  const storage=new Map([[KEYS.normal,raw]]);
  const st={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
  const store=new SaveStore(st,"normal","v330");
  const result=store.load(NOW);
  assert.equal(result.blocked,undefined);
  assert.equal(storage.get(KEYS.normal+".before-v330-playtest"),raw);
  store.write(result.state);
  assert.equal(storage.get(KEYS.normal+".before-v330-playtest"),raw);
  const failStore=new SaveStore({getItem:k=>k===KEYS.normal?raw:null,
    setItem:(k,v)=>{if(k.endsWith(".before-v330-playtest"))throw Error("quota");}},"normal","v330");
  const resultFail=failStore.load(NOW);
  assert.equal(resultFail.blocked,true);
  assert.throws(()=>failStore.write(resultFail.state),/保護中/);
});
check("old save schema and byte-compatible www; removed status UI and old tap instruction",()=>{
  assert.equal(read("game.mjs"),read("www/game.mjs"));
  for(const p of ["app.mjs","save.mjs","engraving-rules-v317.mjs","balance-config.mjs","index.html","sw.js","matrix-v324.css"])assert.equal(read(p),read("www/"+p),p);
  assert.ok(!read("index.html").includes('id="worldStatus"'));
  assert.ok(!read("app.mjs").includes("タップして理を観測"));
  assert.ok(read("app.mjs").includes('data-engraving-trial-upgrade'));
  assert.ok(read("app.mjs").includes('data-boost-trial-buy'));
  assert.ok(read("index.html").includes("3.32 · GLASS"));
  assert.ok(read("sw.js").includes("3.30.1-flow-orb-display"));
});
console.log("PASS "+passed+" v330 test-driven provisional upgrade and UI invariants");
