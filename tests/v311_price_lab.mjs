import assert from "node:assert/strict";
import {A} from "../numbers.mjs";
import {CONFIG} from "../balance-config.mjs";
import {CONTENT} from "../content.mjs";
import * as G from "../game.mjs";
import * as L from "../price-lab.mjs";
import {KEYS,encode,decode} from "../save.mjs";
let checks=0;
const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++};
const yes=(v,m)=>{assert.ok(v,m);checks++};
const time=1800000000000;
eq(CONFIG.version,"3.11.0","version");
eq(CONFIG.schemaVersion,31,"schema stays 31");
eq(KEYS.normal,"kotowari_v31_normal","storage key unchanged");
eq(L.PRICE_DURATIONS,[300,1800,7200],"three time windows");
eq(L.PRICE_TAP_RATES,[2,5,10],"three manual rates");
eq(L.PRICE_PROFILES,["current","early","middle","late"],"isolated profiles");
const original=G.createState(time,"normal");
original.intro.complete=true;original.moment.tap=5;original.orbs="1e9";
const raw=JSON.stringify(original);
const cfgRaw=JSON.stringify(CONFIG.provisional.moment);
for(const profile of L.PRICE_PROFILES){
 const sample=L.priceSandbox(original,profile,time);
 eq(sample.mode,"normal","sandbox never switches live mode");
 eq(sample.intro.complete,true,"sandbox unlocked");
 eq(sample.boost.active,false,"boost disabled");
 sample.moment.tap=999;
 eq(original.moment.tap,5,"sandbox is independent");
 const trial=L.compareMomentPrice(original,{momentId:"tap",profile,now:time});
 eq(trial.priceCandidates.length,3,"price candidates x0.5/1/2");
 eq(trial.profile,profile,"profile roundtrip");
 yes(A(trial.trialCost).cmp(0)>0,"trial cost positive");
 yes(trial.priceCandidates[0].price!==trial.priceCandidates[2].price,"price factors distinct");
}
eq(JSON.stringify(original),raw,"never changed original state after all four profiles");
eq(JSON.stringify(CONFIG.provisional.moment),cfgRaw,"never overwrites cost config");
const trial=L.compareMomentPrice(original,{momentId:"tap",durationSeconds:300,tapsPerSecond:5,now:time,levelOverride:9});
eq(trial.level,9,"manual level override");
yes(A(trial.delta).cmp(0)>0,"base tap growth produces gain");
yes(A(trial.deltaPerSecond).cmp(0)>0,"gain per sec positive");
yes(trial.priceCandidates[0].recoverSeconds<trial.priceCandidates[1].recoverSeconds,"lower cost faster recovery");
yes(trial.priceCandidates[1].recoverSeconds<trial.priceCandidates[2].recoverSeconds,"higher cost slower recovery");
const zero=L.compareMomentPrice(original,{momentId:"setsuna15",now:time,levelOverride:0});
eq(zero.measured,false,"unmeasured random proc does not invent a payback");
eq(zero.priceCandidates[1].recoverSeconds,null,"zero delta means unavailable recovery");
const maxed=L.compareMomentPrice(original,{momentId:"tap",now:time,levelOverride:1000000});
eq(maxed.maxed,true,"maximum level detected");
eq(maxed.priceCandidates.length,0,"max level no price candidates");
for(const k of ["bad","setsuna99"]){assert.throws(()=>L.compareMomentPrice(original,{momentId:k,now:time}));checks++;}
for(const profile of ["invalid",""]){assert.throws(()=>L.compareMomentPrice(original,{momentId:"tap",profile,now:time}));checks++;}
for(const seconds of [1,10,7201]){assert.throws(()=>L.compareMomentPrice(original,{momentId:"tap",durationSeconds:seconds,now:time}));checks++;}
for(const taps of [-1,0,200]){assert.throws(()=>L.compareMomentPrice(original,{momentId:"tap",tapsPerSecond:taps,now:time}));checks++;}
for(const level of [-1,1.5,1000001]){assert.throws(()=>L.compareMomentPrice(original,{momentId:"tap",levelOverride:level,now:time}));checks++;}
const before=encode(original),after=decode(before,"normal");
eq(after.moment.tap,5,"export/import intact");
eq(JSON.stringify(original),raw,"no writeback from pricing");
console.log("PASS "+checks+" v3.11 sandbox price comparison and save nonmutation");
