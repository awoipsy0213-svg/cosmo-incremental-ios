import assert from "node:assert/strict";
import {G} from "../playtest/compact-existence-v1/engine.mjs";
const equal=(a,b,e=1e-9)=>assert.ok(a===b||Math.abs(a-b)<e,`${a} != ${b}`);
let s=G.fresh();assert.equal(G.M.length,8);assert.equal(G.E.length,12);assert.equal(G.E.filter(x=>x[3]==="growth").length,7);assert.equal(G.cards(s,"moment").length,1);assert.equal(G.cards(s,"source").length,0);assert.equal(G.cards(s,"engraving").length,0);
assert.equal(G.tap(s,()=>1).gain,0);G.grant(s,"orbs","999999");assert.equal(s.sourceUnlocked,true);assert.equal(G.convergenceQuote(s).steps,1);assert.equal(G.buy(s,"source:1").count,0);assert.ok(G.buy(s,"source:0").count>0);assert.equal(G.encode(G.decode(G.encode(s))),G.encode(s));
assert.ok(G.converge(s));equal(s.existence,-3);assert.equal(s.sourceUnlocked,true);assert.equal(s.engravingUnlocked,true);assert.equal(s.orbs,G.Z);assert.equal(G.buy(s,"engraving:0","1").count,1);assert.equal(G.cards(s,"engraving").filter(x=>x.fresh).length,1);
let mono=0,ms=0,qs=0;
const z=G.fresh();
for(let k of [0,1,29,30,59,300])for(let l=1;l<10000;l++){const a=G.sourceOutput(z,k,l),b=G.sourceOutput(z,k,l+1);assert.ok(b>a);mono++;if(G.marks.includes(l+1)){assert.ok(b-a>=Math.log10(2)-1e-9);ms++;}}
for(let k of [0,29,30,300])for(let l of [0,1,24,25,99,100,999,1000,3000,9998,9999])for(let q of [1,2,10,100,3001,9999]){if(l+q>10000)continue;const c={kind:"source",rank:k,i:k%30,level:l,max:10000,ready:true};z.orbs=G.cost(z,c,q);assert.equal(G.quote(z,c).count,q);qs++}
assert.equal(mono,59994);assert.equal(ms,126);assert.equal(qs,200);
s=G.fresh();G.grant(s,"orbs","1e300");for(let k=0;k<30;k++)assert.equal(G.buy(s,"source:"+k).count,10000);assert.equal(s.front,29);assert.equal(G.buyAll(s,"source").count,0);assert.equal(G.buy(s,"source:31","1").count,0);
const p=G.production(s),oldSource=G.sourceOutput(s,0,10000);assert.equal(G.buy(s,"source:30","1").count,1);assert.equal(s.sources[0].rank,30);assert.equal(s.sources[0].level,1);assert.ok(G.sourceOutput(s,30,1)>oldSource);assert.ok(G.production(s)>=p);assert.equal(G.cards(s,"source").filter(x=>x.fresh).length,1);assert.equal(G.encode(G.decode(G.encode(s))),G.encode(s));
s=G.fresh();G.grant(s,"orbs","1e50");const bulk=G.buyAll(s,"moment","cheap");assert.ok(bulk.count>3000);assert.ok(G.cards(s,"moment").every(c=>!G.quote(s,c,"1").count));assert.equal(G.encode(G.decode(G.encode(s))),G.encode(s));
// Cheapest ordering against the literal one-level reference at moderate budgets.
function reference(s,kind){let n=0;for(;;){const c=G.cards(s,kind,{automatic:true}).filter(x=>x.ready&&G.quote(s,x,"1").count).sort((a,b)=>G.unit(s,a)-G.unit(s,b)||a.rank-b.rank)[0];if(!c)return n;G.buy(s,G.key(c),"1");n++;assert.ok(n<100000);}}
for(const kind of ["moment","source","engraving"])for(const budget of kind==="engraving"?["0.01","1","10"]:["1000000","1e12","1e20"]){
 const a=G.fresh();G.grant(a,"orbs",kind==="engraving"?"1e6":budget);if(kind==="engraving"){G.converge(a);G.grant(a,"existence",budget)}
 const b=G.decode(G.encode(a)),n=reference(b,kind),v=G.buyAll(a,kind,"cheap");assert.equal(v.count,n,kind+" "+budget);
 assert.deepEqual(a.moment,b.moment);assert.deepEqual(a.sources,b.sources);assert.deepEqual(a.engraving,b.engraving);
}
s=G.fresh();G.grant(s,"orbs","1e6");G.converge(s);G.grant(s,"existence","100");assert.ok(G.buy(s,"engraving:0").count>16);
const old=G.encode(s);assert.equal(G.encode(G.decode(old)),old);
s=G.fresh();G.grant(s,"orbs","1e6");G.converge(s);G.grant(s,"existence","1000");for(let i=0;i<12;i++)assert.equal(G.buy(s,"engraving:"+i,"1").count,1);assert.ok(G.own(s,"bulk"));assert.ok(G.own(s,"convergeAuto"));assert.equal(G.buy(s,"engraving:3","MAX").count,0);
s.settings.source=true;s.settings.moment=true;s.settings.master=false;G.grant(s,"orbs","1e20");G.tick(s,1);assert.equal(s.front,-1);s.settings.master=true;G.tick(s,1);G.tick(s,1);assert.ok(s.front>=0);assert.ok(s.moment.some(Boolean));
s.settings.source=false;s.settings.moment=false;s.settings.engraving=false;s.settings.converge=true;s.settings.condition="time";s.settings.seconds=.1;s.autoAge=0;const c=s.convergenceCount;G.tick(s,.1);assert.equal(s.convergenceCount,c+1);assert.ok(G.own(s,"bulk"));assert.equal(s.sourceUnlocked,true);
s.settings.condition="earned";s.settings.target=G.parse("1e7");G.grant(s,"orbs","1e6");G.tick(s,.1);assert.equal(s.convergenceCount,c+1);G.grant(s,"orbs","1e7");G.tick(s,.1);assert.equal(s.convergenceCount,c+2);
assert.throws(()=>G.parse("-1"));assert.throws(()=>G.parse("Infinity"));assert.throws(()=>G.parse("1e10000000001"));
assert.throws(()=>G.decode(JSON.stringify({version:1})));
console.log("PASS compact engine", {mono,ms,qs,maxLevels:bulk.count,legacyStorage:"not referenced"});
// Active-play comparison: five taps per second, one-second ticks, purchase both tabs
// each second in alternating order, no convergence and no paid time acceleration.
// This is a repeatable upper-effort heuristic, not a wall-clock player measurement.
let sim=G.fresh();const rows=[];let firstUnlock=null;let rngSeed=1731;
const rng=()=>{rngSeed=(1664525*rngSeed+1013904223)>>>0;return rngSeed/4294967296;};
for(let t=1;t<=7200;t++){
 for(let i=0;i<5;i++)G.tap(sim,rng);
 G.tick(sim,1);
 for(const kind of t%2?["moment","source"]:["source","moment"])G.buyAll(sim,kind,"grade");
 if(firstUnlock===null&&sim.sourceUnlocked)firstUnlock=t;
 if([300,1800,5400,7200].includes(t))rows.push({seconds:t,grade:sim.front+1,maxSource:Math.max(...sim.sources.map(x=>x.level)),earned:G.fmt(sim.runEarned),momentMax:Math.max(...sim.moment)});
}
assert.ok(firstUnlock!==null&&firstUnlock<7200,"source must be attainable before two hours");
console.log("COMPACT active mixed trial", JSON.stringify({firstUnlock,rows}));
