import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as G from "../game.mjs";
import {CONTENT} from "../content.mjs";
import {A} from "../numbers.mjs";
import {encode,decode} from "../save.mjs";
import {ENGRAVE_ORDER} from "../engraving-v342.mjs";

const NOW=1800000000000;
const state=()=>{const s=G.createState(NOW);s.intro.complete=true;return s;};
const own=(s,id,lv=1)=>{
  if(!s.engraving.owned.includes(id))s.engraving.owned.push(id);
  s.engraving.levels[id]=lv;
  return s;
};
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const check=(name,fn)=>{fn();console.log("PASS v343",name);};

check("authored 30-grade positions are independent of current resource prices",()=>{
  const s=state();s.orbs=G.purchaseQuote(s,"source","SOURCE_06","1").cost;s.sources.SOURCE_01.level=20000;
  const lowQuote=G.purchaseQuote(s,"source","SOURCE_01","1");
  assert.equal(lowQuote.enabled,false,"inflated low-grade source is unaffordable");
  const highQuote=G.purchaseQuote(s,"source","SOURCE_06","1");
  assert.equal(highQuote.enabled,true,"high-grade source is affordable");
  assert.ok(A(lowQuote.cost).cmp(highQuote.cost)>0,"lower grade is more expensive");
  assert.equal(G.affordablePriorityOrder(s,"source","grade")[0],"SOURCE_06");
  assert.equal(G.affordablePriorityOrder(s,"source","cheap")[0],"SOURCE_02");
  assert.equal(G.affordablePriorityOrder(s,"source","grade").includes("SOURCE_01"),false);
});

check("one-click bulk spends available wallet on the highest affordable grade before cheaper rows",()=>{
  const s=state();own(s,"ENG-05");s.orbs=G.purchaseQuote(s,"source","SOURCE_06","1").cost;s.sources.SOURCE_01.level=20000;
  const initial=G.affordablePriorityOrder(s,"source","grade");
  assert.equal(initial[0],"SOURCE_06");
  const r=G.buyAll(s,"source","grade");
  assert.equal(r.ok,true);
  assert.equal(r.count,1,"exact high-tier cost should allow only one purchase");
  assert.equal(s.sources.SOURCE_06.level,1);
  assert.equal(s.sources.SOURCE_05.level,0);
  assert.equal(s.sources.SOURCE_01.level,20000);
  assert.equal(A(s.orbs).cmp(0),0);
});

check("manual bulk retains low-price, grade and auto modes with independent scope",()=>{
  const s=state();own(s,"ENG-05");s.orbs=G.purchaseQuote(s,"source","SOURCE_06","1").cost;
  assert.equal(G.affordablePriorityOrder(s,"source","cheap")[0],"SOURCE_01");
  assert.equal(G.affordablePriorityOrder(s,"source","grade")[0],"SOURCE_06");
  assert.equal(G.affordablePriorityOrder(s,"source","auto")[0],"SOURCE_01");
  assert.equal(G.affordablePriorityOrder(s,"source","grade",["SOURCE_02","SOURCE_05"])[0],"SOURCE_05");
  assert.equal(G.buyAll(s,"source","efficient").ok,false,"efficiency still needs the optimizer");
  own(s,"ENG-27");
  assert.ok(G.affordablePriorityOrder(s,"source","efficient").length>0);
  assert.equal(G.affordablePriorityOrder(s,"source","auto")[0],
    G.affordablePriorityOrder(s,"source","efficient")[0]);
});

check("new auto purchase honors grade and saves the selector unchanged",()=>{
  const s=state();own(s,"ENG-26");s.orbs=G.purchaseQuote(s,"source","SOURCE_06","1").cost;
  assert.equal(G.configureAutoPurchase(s,"source",{priority:"grade",intervalSeconds:1}).ok,true);
  assert.equal(s.engraving.autoBuy.source.priority,"grade");
  G.advance(s,NOW+4000,{offline:false,rng:()=>.99});
  assert.equal(s.sources.SOURCE_06.level,1,"source rank six wins over a lower price");
  assert.equal(s.sources.SOURCE_05.level,0);
  const restored=decode(encode(s,"v343-grade"),"normal");
  assert.equal(restored.engraving.autoBuy.source.priority,"grade");
  assert.equal(restored.sources.SOURCE_06.level,1);
});

check("moment grade picks the highest affordable authored rank, not a lower inflated tier",()=>{
  const s=state();s.orbs=G.purchaseQuote(s,"moment",CONTENT.moment[2].id,"1").cost;s.moment.tap=100;
  const ids=CONTENT.moment.map(x=>x.id);
  const all=G.affordablePriorityOrder(s,"moment","grade");
  assert.equal(all[0],ids.findLast(id=>G.purchaseQuote(s,"moment",id,"1").enabled));
  const cheapest=G.affordablePriorityOrder(s,"moment","cheap");
  assert.notEqual(cheapest[0],all[0]);
});

check("engraving auto highest-grade order uses the engraving series rather than its price",()=>{
  const s=state();for(const id of ["ENG-01","ENG-02","ENG-03","ENG-11","ENG-12","ENG-13","ENG-17"])own(s,id);
  // Tier 3 is actually unlocked: three owned Tier-2 engravings are mandatory.
  s.surplusExistence="0.125";
  assert.equal(G.configureEngravingAutoBuy(s,{enabled:true,priority:"grade",mode:"new",minReserve:"0"}).ok,true);
  G.advance(s,NOW+4000,{offline:false,rng:()=>.99});
  assert.ok(s.engraving.owned.includes("ENG-30"),"highest unowned engraving grade must win");
  assert.equal(s.engraving.autoEngraving.priority,"grade");
  assert.ok(ENGRAVE_ORDER.includes("grade"));
});

check("legacy expensive settings migrate to grade without losing verified levels or presets",()=>{
  const s=state();own(s,"ENG-30");own(s,"ENG-17");
  s.orbs="654321";s.settings.bulkOrder="expensive";
  s.engraving.autoBuy.moment.priority="expensive";
  s.engraving.autoBuy.source.priority="expensive";
  s.engraving.autoEngraving.priority="expensive";
  s.engraving.presetSystem.presets[0]={
    moment:{priority:"expensive",intervalSeconds:5},
    source:{priority:"expensive",intervalSeconds:10},
    plan:structuredClone(s.engraving.presetSystem.plan)
  };
  s.engraving.presetSystem.activePreset=0;
  const restored=G.validateState(s,"normal");
  assert.equal(restored.settings.bulkOrder,"grade");
  assert.equal(restored.engraving.autoBuy.moment.priority,"grade");
  assert.equal(restored.engraving.autoBuy.source.priority,"grade");
  assert.equal(restored.engraving.autoEngraving.priority,"grade");
  assert.equal(restored.engraving.presetSystem.presets[0].moment.priority,"grade");
  assert.equal(restored.engraving.presetSystem.presets[0].source.priority,"grade");
  assert.equal(restored.orbs,"6.54321e5");
  assert.equal(restored.engraving.levels["ENG-30"],1);
  assert.equal(restored.engraving.presetSystem.presets[0].moment.intervalSeconds,5);
});

check("Web and Capacitor remain byte-identical; UI has no misleading price-high label",()=>{
  for(const p of ["game.mjs","app.mjs","engraving-v342.mjs","engraving-v342-ui.mjs","sw.js"])
    assert.equal(read(p),read("www/"+p),p+" mirror");
  const app=read("app.mjs"),engravingUI=read("engraving-v342-ui.mjs");
  assert.ok(app.includes('["grade","高グレード順"]'));
  assert.ok(app.includes('grade:["上位順"'));
  assert.ok(engravingUI.includes('["grade","高グレード順"]'));
  assert.ok(!app.includes('["expensive","高い順"]'));
});
console.log("PASS v343 all purchase priority scenarios");
