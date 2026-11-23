import assert from "node:assert/strict";
import {CONTENT} from "../content.mjs";
import {CONFIG} from "../balance-config.mjs";
import {A,formatOrbAmount,seriesCost} from "../numbers.mjs";
import * as G from "../game.mjs";
import {purchasePreview} from "../purchase-preview-v338.mjs";
import {encode,decode,KEYS} from "../save.mjs";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const close=(actual,expected,label)=>{
  const a=A(actual),b=A(expected);
  assert.ok(Math.abs(a.div(b).toNumber()-1)<1e-10,label+" ["+a+" vs "+b+"]");
};
const marks=CONFIG.confirmed.sourceMilestones;
assert.equal(marks.length,21,"21 common thresholds, no new effect slots");
assert.equal(CONTENT.sources.length,30);
assert.equal(CONTENT.sources.reduce((n,x)=>n+x.effects.length,0),210,"unresolved 7 slots per Source unchanged");
assert.equal(CONFIG.schemaVersion,31);
assert.equal(KEYS.normal,"kotowari_v31_normal");
assert.equal(G.sourceMilestoneMultiplier(0).cmp(1),0);
assert.equal(G.sourceMilestoneMultiplier(24).cmp(1),0);
assert.equal(G.sourceMilestoneMultiplier(25).cmp(2),0);
assert.equal(G.sourceMilestoneMultiplier(49).cmp(2),0);
assert.equal(G.sourceMilestoneMultiplier(50).cmp(4),0);
assert.equal(G.sourceMilestoneMultiplier(100).cmp(8),0);
assert.equal(G.sourceMilestoneMultiplier(1000000).cmp(2097152),0);
assert.throws(()=>G.sourceMilestoneMultiplier(-1),/源Lv/);
const first=CONTENT.sources[0].id;
const s=G.createState(1800000000000);s.intro.complete=true;
const unit=CONFIG.provisional.source.perSecondPerLevel[0];
for(const lv of [1,24,25,26,49,50,51,100,250,1000,1000000]){
  s.sources[first].level=lv;
  const expected=seriesCost(unit,CONFIG.provisional.source.productionGrowth,0,lv)
    .mul(G.sourceMilestoneMultiplier(lv));
  close(G.sourceProduction(s,first),expected,"output includes each achieved x2 milestone at "+lv);
  const q=G.purchaseQuote(s,"source",first,"1");
  if(lv<CONFIG.confirmed.sourceMaxLevel){
    close(q.cost,seriesCost(CONFIG.provisional.source.baseCosts[0],
      CONFIG.provisional.source.costGrowth,lv,1),"milestones never alter price Lv "+lv);
  }else assert.equal(q.enabled,false,"max level purchase blocked");
}
s.sources[first].level=24;
const before=G.sourceProduction(s,first),nextGain=G.sourceNextGain(s,first);
s.sources[first].level=25;
assert.equal(G.sourceProduction(s,first).sub(before).toString(),nextGain.toString(),
  "24->25 next gain includes doubling of all previously earned output");
assert.equal(s.sources[first].effects.length,0,"ordinary milestone unlocks no special ability");
s.sources[first].level=49;
const before50=G.sourceProduction(s,first),next50=G.sourceNextGain(s,first);
s.sources[first].level=50;
assert.equal(G.sourceProduction(s,first).sub(before50).toString(),next50.toString(),
  "49->50 stacks another x2 on full production");
s.sources[first].level=24;
G.setPurchaseMode(s,"NEXT");s.orbs="1000000"; // keep spend visible within Amount precision
const quote=G.purchaseQuote(s,"source",first);
assert.equal(quote.count,1,"NEXT stops at 25 milestone");
const preview=purchasePreview(s,"source",first);
assert.equal(preview.count,1);
assert.equal(preview.sourceGain.toString(),nextGain.toString(),"UI previews exact crossing gain");
const cash=A(s.orbs);
const result=G.buy(s,"source",first);
assert.equal(result.ok,true);
assert.equal(s.sources[first].level,25);
close(cash.sub(s.orbs),quote.cost,"unchanged purchase cost charged");
assert.equal(s.sources[first].effects.length,0,"no ordinary special effect at threshold");
const copy=decode(encode(s,"source-milestone-v340"),"normal");
assert.equal(copy.sources[first].level,25,"save roundtrip keeps original level");
assert.equal(copy.sources[first].effects.length,0,"no save migration or new slot");
assert.equal(G.sourceMilestoneMultiplier(copy.sources[first].level).cmp(2),0,"bonus recomputed from level");
s.sources[first].level=1000000;
assert.equal(G.sourceNextGain(s,first).cmp(0),0,"at cap, no more gain");
for(const value of ["0.1","1.99","1234.567","1.234e12","9999999999.9"]){
  assert.doesNotMatch(formatOrbAmount(value),/\d+\.\d+/u,"integer-only Source orb UI");
}
const app=read("app.mjs"),sw=read("sw.js");
assert.match(app,/o\(preview\.sourceGain\)/,"button shows orb integers");
assert.match(app,/o\(G\.sourceProduction\(state,id\)\)/,"button shows current orb integers");
assert.match(app,/毎秒 \$\{esc\(o\(G\.sourceProduction\(state,x\.id\)\)\)\} オーブ/,"left Source production is numeric");
assert.doesNotMatch(app,/毎秒オーブを生成/,"remove redundant fixed Source explanation");
assert.match(sw,/3\.40\.0-source-milestones/);
for(const file of ["game.mjs","app.mjs","purchase-preview-v338.mjs","sw.js"]){
  assert.equal(read(file),read("www/"+file),file+" Web/Capacitor parity");
}
console.log("PASS v340 30 Sources x21 milestones, x2 stacking, accurate NEXT preview, unchanged costs, save compatibility and integer orb UI");
