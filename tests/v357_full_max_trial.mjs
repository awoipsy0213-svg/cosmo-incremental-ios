import assert from "node:assert/strict";
import * as G from "../game.mjs";
import {CONFIG} from "../balance-config.mjs";
import {CONTENT} from "../content.mjs";
import {A,seriesCost} from "../numbers.mjs";
import {encode,decode} from "../save.mjs";
const NOW=1800000000000;
const fresh=(mode="lab")=>{const s=G.createState(NOW,mode);s.intro.complete=true;s.time.unlocked=true;return s;};
const source=CONFIG.provisional.source;
for(const [kind,ids] of [["source",CONTENT.sources.map(x=>x.id)],["moment",CONTENT.moment.map(x=>x.id)]]){
  for(const i of [0,14,29]){
    const id=ids[i],base=kind==="source"?source.baseCosts[i]:CONFIG.provisional.moment[id].baseCost;
    const curve=kind==="source"?source.costCurves[i]:CONFIG.provisional.moment[id].growth;
    for(const target of [3001,10000,1000000]){
      const s=fresh(),wallet=seriesCost(base,curve,0,target);
      s.orbs=wallet.toString();
      const before=JSON.stringify(s),q=G.trialFullMaxQuote(s,kind,id);
      assert.equal(JSON.stringify(s),before,"quote has no state side effects");
      assert.equal(q.count,target,kind+"/"+id+"/"+target);
      assert.equal(q.enabled,true);
      assert.equal(q.limitReached,false);
      assert.equal(A(q.cost).cmp(wallet),0);
      assert.ok(G.maxPurchaseRequiresConfirmation(s.orbs,q,"MAX"));
      const result=G.trialBuyFullMax(s,kind,id);
      assert.ok(result.ok);
      assert.equal(result.count,target);
      assert.equal(kind==="source"?s.sources[id].level:s.moment[id],target);
      assert.equal(A(s.orbs).cmp(0),0);
      assert.equal(A(s.counters.orbsSpent).cmp(wallet),0);
      assert.equal(s.engraving.runPurchases[kind][id],target);
      assert.equal(s.purchaseMode,"1");
      assert.equal(G.trialFullMaxQuote(s,kind,id).enabled,false);
      if(kind==="source"&&target===1000000)assert.ok(G.sourceCycleStatus(s).reachedIds.includes(id));
      const copy=decode(encode(s,"full-max-candidate"),"lab");
      assert.equal(kind==="source"?copy.sources[id].level:copy.moment[id],target);
      assert.equal(A(copy.orbs).cmp(0),0);
    }
  }
}
const normal=fresh("normal");normal.orbs="1e1000000";
const before=JSON.stringify(normal);
assert.equal(G.trialFullMaxQuote(normal,"moment","tap").enabled,false);
assert.equal(G.trialBuyFullMax(normal,"moment","tap").ok,false);
assert.equal(JSON.stringify(normal),before);
assert.equal(G.purchaseQuote(normal,"moment","tap","MAX").count,3000);
const lab=fresh();lab.time.unlocked=false;lab.orbs="1e1000000";
const locked=JSON.stringify(lab);
assert.equal(G.trialBuyFullMax(lab,"source",CONTENT.sources[0].id).ok,false);
assert.equal(JSON.stringify(lab),locked);
console.log("PASS lab-only candidate: full MAX quotes, 3001/10000/1000000, huge prices, final effects, accounting, mode isolation and save roundtrip");
