import assert from "node:assert/strict";
import * as G from "../game.mjs";
import {C,unpack,fromLog,splitExistenceShards,formatShardAmount} from "../compact-campaign-v357.mjs";
import {A} from "../numbers.mjs";
import {SaveStore,KEYS,encode,decode} from "../save.mjs";
const NOW=Date.now();
const s=G.createState(NOW,"normal",true);
for(let i=0;i<8;i++)G.tap(s,NOW,()=>.99);
assert.equal(s.intro.complete,true);
assert.equal(A(G.tap(s,NOW,()=>.99).gain).cmp(1),0);
G.addOrbs(s,"1000000");
assert.equal(s.time.unlocked,true);
assert.equal(unpack(s).sourceUnlocked,true);
assert.ok(G.buyCompact(s,"moment","moment:0","MAX").ok);
assert.ok(G.buyCompact(s,"source","source:0","MAX").ok);
assert.ok(G.production(s).cmp(0)>0);
const before=unpack(s),totalBefore=A(s.totalOrbs);
G.advance(s,NOW+1000,{rng:()=>.99});
assert.ok(A(s.totalOrbs).cmp(totalBefore)>0);
assert.ok(s.time.elapsed>0);
assert.ok(G.converge(s).ok);
assert.equal(unpack(s).engravingUnlocked,true);
assert.equal(unpack(s).sourceUnlocked,true);
assert.equal(s.time.unlocked,true);
assert.equal(unpack(s).front,-1);
assert.equal(s.convergenceCount,1);
G.addOrbs(s,"1e200");
assert.ok(G.converge(s).ok);
for(let i=0;i<12;i++)assert.ok(G.buyCompact(s,"engraving","engraving:"+i,"1").ok,"engraving "+i);
assert.ok(C.own(unpack(s),"bulk"));
G.addOrbs(s,"1e100");
const q=G.compactQuote(s,"moment","moment:0","MAX");
assert.ok(q.count>3000);
assert.ok(G.buyCompact(s,"moment","moment:0","MAX").ok);
assert.ok(G.configureCompact(s,"priority","cheap","source").ok);
assert.ok(G.configureCompact(s,"source",true).ok);
assert.ok(G.configureAutomationMaster(s,false).ok);
const c=unpack(s);
assert.equal(c.settings.master,false);
assert.equal(s.settings.automationEnabled,false);
const raw=encode(s,"compact");
assert.deepEqual(decode(raw,"normal",true).compactEconomy,s.compactEconomy);
assert.throws(()=>decode(raw,"normal",false));
const old=encode(G.createState(NOW,"normal"),"old"),lab=encode(G.createState(NOW,"lab"),"lab");
const data=new Map([[KEYS.normal,old],[KEYS.lab,lab]]);
const db={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};
const store=new SaveStore(db,"normal","compact",{compact:true});
assert.ok(G.isCompact(store.load(NOW).state));
store.write(s,{snapshot:true});
assert.equal(db.getItem(KEYS.normal),old);
assert.equal(db.getItem(KEYS.lab),lab);
assert.ok(G.isCompact(store.load(NOW).state));
assert.throws(()=>decode(old,"normal",true));
const beforeOffline=JSON.stringify(s.compactEconomy),boost=s.boost.seconds,elapsed=s.time.elapsed;
G.advance(s,s.lastWall+60000,{offline:true});
assert.equal(JSON.stringify(s.compactEconomy),beforeOffline);
assert.equal(s.time.elapsed,elapsed);
assert.ok(s.boost.seconds>=boost);
const reset=store.reset(s,NOW+61000);
assert.ok(G.isCompact(reset));assert.equal(reset.intro.complete,false);
const restored=store.restoreProtectedBackup(0,NOW+62000);
assert.ok(G.isCompact(restored));assert.equal(restored.convergenceCount,2);
assert.equal(db.getItem(KEYS.normal),old);assert.equal(db.getItem(KEYS.lab),lab);
assert.throws(()=>new SaveStore(db,"normal","legacy").write(s));
console.log("v3.57 compact campaign: economy, stages, full MAX and independent saves");

const close=(a,b,msg)=>assert.ok(Math.abs(a-b)<1e-8,msg+" "+a+" vs "+b);
const econ=C.fresh();econ.sourceUnlocked=true;econ.engravingUnlocked=true;
const row=(kind,i,level,rank=i)=>({kind,i,rank,level,max:kind==="source"?C.CAP:C.LIM,ready:true});
close(C.unit(econ,row("source",0,0)),Math.log10(75),"source01 initial");
close(C.unit(econ,row("source",1,0)),Math.log10(15*10**5.3*1.1),"higher source initial");
close(C.unit(econ,row("moment",0,1))-C.unit(econ,row("moment",0,0)),Math.log10(1.052),"moment ratio");
close(C.unit(econ,row("engraving",0,1)),Math.log10(.001*(1+1/5)**3),"engraving ratio");
for(const rank of [0,1,29,30]){
 let prev=-Infinity;
 for(let l=0;l<10000;l++){const v=C.unit(econ,row("source",rank%30,l,rank));assert.ok(v>prev,"monotone "+rank+" "+l);prev=v;}
 for(const l of [0,24,99,442,999,5999,9990]){
  const c=row("source",rank%30,l,rank);
  let cost=C.Z;for(let i=0;i<10;i++)cost=C.add(cost,C.unit(econ,c,l+i));
  close(C.cost(econ,c,10),cost,"source prefix vs sequential");
  const a=C.sourceOutput(econ,rank,l),b=C.sourceOutput(econ,rank,l+10);
  assert.ok(b>a,"growth");
 }
}
for(const kind of ["moment","engraving"]){
 const c=row(kind,0,123);let v=C.Z;for(let i=0;i<100;i++)v=C.add(v,C.unit(econ,c,123+i));
 close(C.cost(econ,c,100),v,kind+" prefix");
}
const c0=row("source",0,442);const expected=C.sourceOutput(econ,0,442);
assert.ok(Math.abs(10**expected-331808)<3,"existing source output preserved");
const original=C.encode(econ),preview=C.effectPreview(econ,c0,10);
assert.ok(preview.current.endsWith("/s")&&preview.delta.startsWith("+"));assert.equal(C.encode(econ),original);
const cycle=C.fresh();cycle.sourceUnlocked=true;cycle.orbs=C.parse("1e500");
for(let rank=0;rank<30;rank++){const q=C.buy(cycle,"source:"+rank,"MAX");assert.equal(q.count,10000,"rank "+rank);}
assert.equal(C.buy(cycle,"source:30","1").count,1);assert.equal(cycle.sources[0].rank,30);
console.log("PASS pacing: monotone price, bulk cost, preserved production, preview purity, all 30 ranks and manual cycle");

{
 assert.equal(formatShardAmount("0.030"),"かけら30");
 assert.equal(formatShardAmount("0.125"),"かけら125");
 assert.equal(formatShardAmount("0.999"),"かけら999");
 assert.equal(formatShardAmount("1.000"),"存在1");
 assert.equal(formatShardAmount("1.025"),"存在1・かけら25");
 assert.equal(formatShardAmount("0.0009"),"かけら1未満");
 assert.equal(formatShardAmount("0.00101",{roundUp:true}),"かけら2");
 assert.equal(formatShardAmount("0.050",{roundUp:true}),"かけら50");
 assert.equal(formatShardAmount("1e1000",{full:true}).startsWith("存在"),true);
 const c=C.fresh();c.existence=C.parse(".98");c.lifetime=c.existence;
 c.runEarned=Math.log10(1e6*(1.2**30-1)/.2)+1e-9;
 assert.equal(C.convergenceQuote(c).steps,30);
 assert.ok(C.converge(c));
 assert.equal(formatShardAmount(fromLog(c.existence)),"存在1・かけら10");
 assert.equal(C.decode(C.encode(c)).existence,c.existence);
 const d=C.fresh();d.existence=C.parse(".0004");
 d.existence=C.add(d.existence,C.parse(".0007"));
 assert.equal(formatShardAmount(fromLog(d.existence)),"かけら1");
 assert.equal(C.decode(C.encode(d)).existence,d.existence);
 console.log("PASS shard split, conservative prices and saved fractional carry");
}

// DEC-016: conservative shard labels at sub-shard and scientific boundaries.
{
 for(const [value,normal,cost] of [
  ["0","かけら0","かけら0"],["0.0009","かけら1未満","かけら1"],
  ["0.9999999","かけら999","存在1"],["1.0258","存在1・かけら25","存在1・かけら26"],
  ["1000000.025","存在1,000,000・かけら25","存在1,000,000・かけら25"],
  ["1000001.025","存在約1.00e+6","存在約1.01e+6"],
  ["1999999.999","存在約1.99e+6","存在約2.00e+6"],
  ["1e12","存在1.00e+12","存在1.00e+12"]
 ]){assert.equal(formatShardAmount(value),normal,value);assert.equal(formatShardAmount(value,{roundUp:true}),cost,value);}
 for(const v of ["1000001.025","1999999.999","1e1000"]){assert.equal(splitExistenceShards(v).shards,null,v);}
 console.log("PASS v360 shard rounding, no misleading mixed scientific fragments");
}
