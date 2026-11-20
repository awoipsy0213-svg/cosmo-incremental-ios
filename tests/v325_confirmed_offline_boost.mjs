import assert from "node:assert/strict";
import {A} from "../numbers.mjs";
import * as G from "../game.mjs";
import {CONFIG} from "../balance-config.mjs";
import {encode,decode,KEYS} from "../save.mjs";
import {recordOfflineReport,validateTelemetry,freshTelemetry} from "../telemetry-v319.mjs";
const T=1800000000000,eps=1e-7;
let tested=0;
function check(label,fn){fn();tested++;console.log("PASS "+label);}
const fresh=(mode="normal")=>{
  const s=G.createState(T,mode);
  s.intro.complete=true;s.sources.SOURCE_01.level=12;
  s.time.unlocked=true;s.universe.unlocked=true;
  const r=G.createPlanet(s,T);
  assert.ok(r.ok);
  const p=G.planet(s);
  p.stats.energy="4";p.stats.temperature="8";p.stats.activity="50";
  s.momentRuntime.combo=5;s.momentRuntime.comboExpire=T+2500;
  s.momentRuntime.comboUntil=T+2500;s.momentRuntime.lastTap=T-300;
  s.momentRuntime.synergyUntil=T+10000;
  s.universe.interference.lastInduceAt=T-800;
  s.universe.interference.stabilizeCooldowns[p.id]=55;
  return s;
};
check("BOOST-CORE-001: offline 1h awards independent 15m BOOST and freezes every stage",()=>{
 const s=fresh(),p=G.planet(s);
 s.boost.seconds=125;s.boost.active=true;
 const values={orbs:s.orbs,total:s.totalOrbs,orbsSpent:s.counters.orbsSpent,
  time:JSON.stringify(s.time),universe:JSON.stringify(s.universe.resources),
  planetMass:p.stats.mass,planetAge:G.ageSeconds(p,T),
  evidence:JSON.stringify(p.evidence),cooldown:s.universe.interference.stabilizeCooldowns[p.id],
  progress:s.universe.resourceAccumulator,history:s.telemetry.onlineSamples.length,
  moments:JSON.stringify(s.moment)};
 const x=G.advance(s,T+3600000,{offline:true,rng:()=>0});
 assert.equal(x.elapsed,3600);assert.equal(x.gameSeconds,0);assert.equal(x.orbs,"0");
 assert.equal(x.boost,900);assert.equal(s.boost.seconds,1025);assert.equal(s.boost.active,false);
 assert.equal(s.orbs,values.orbs);assert.equal(s.totalOrbs,values.total);assert.equal(s.counters.orbsSpent,values.orbsSpent);
 assert.equal(JSON.stringify(s.time),values.time);
 assert.equal(JSON.stringify(s.universe.resources),values.universe);
 assert.equal(p.stats.mass,values.planetMass);assert.equal(JSON.stringify(p.evidence),values.evidence);
 assert.equal(s.universe.resourceAccumulator,values.progress);
 assert.equal(s.universe.interference.stabilizeCooldowns[p.id],values.cooldown);
 assert.ok(Math.abs(G.ageSeconds(p,T+3600000)-values.planetAge)<eps);
 assert.equal(JSON.stringify(s.moment),values.moments);
 assert.equal(s.momentRuntime.comboExpire,T+3600000+2500);
 assert.equal(s.momentRuntime.synergyUntil,T+3600000+10000);
 assert.equal(s.universe.interference.lastInduceAt,T+3600000-800);
 assert.equal(s.telemetry.onlineSamples.length,values.history);
 assert.equal(s.telemetry.offlineReports.length,1);
 assert.equal(s.telemetry.offlineReports[0].orbs,"0");
 assert.equal(s.telemetry.offlineReports[0].effectiveSeconds,0);
 assert.equal(s.telemetry.offlineReports[0].boostDiscarded,0);
 assert.equal(s.counters.offlineSeconds,3600);
});
check("BOOST-Q217: offline base rate is independent of online rate",()=>{
 const s=G.createState(T);
 const b=G.boostValues(s);
 assert.equal(CONFIG.confirmed.boostOnlineSecondsPerHour,0);
 assert.equal(CONFIG.confirmed.boostOfflineSecondsPerHour,900);
 assert.equal(b.onlineRate,0);assert.equal(b.offlineRate,0.25);assert.equal(b.capacity,3600);
 G.advance(s,T+7200000,{offline:true});
 assert.equal(s.boost.seconds,1800);
});
check("BOOST-Q257: foreground idling and direct taps cannot mint offline BOOST",()=>{
 const s=G.createState(T);
 s.intro.complete=true;s.sources.SOURCE_01.level=8;
 G.advance(s,T+3600000,{offline:false,rng:()=>.999});
 assert.equal(s.boost.seconds,0);assert.equal(s.counters.onlineSeconds,3600);
 assert.ok(A(s.totalOrbs).cmp(0)>0);
 G.tap(s,T+7200000,()=>.999);
 assert.equal(s.boost.seconds,0);assert.ok(s.counters.taps>0);
});
check("BOOST-Q253: if background finishes at cap discard only the excess; never re-credit",()=>{
 const s=fresh();
 s.boost.seconds=3550;
 const r=G.advance(s,T+3600000,{offline:true});
 assert.equal(r.boost,50);assert.equal(r.boostDiscarded,850);assert.equal(s.boost.seconds,3600);
 assert.equal(s.telemetry.offlineReports.at(-1).boostDiscarded,850);
 const r2=G.advance(s,T+3600000,{offline:true});
 assert.equal(r2.elapsed,0);assert.equal(r2.boost,0);
 assert.equal(s.telemetry.offlineReports.length,1);
 assert.equal(s.boost.seconds,3600);
});
check("BOOST-Q304: fractional elapsed seconds retain fractional BOOST internally",()=>{
 const s=G.createState(T);
 const r=G.advance(s,T+500,{offline:true});
 assert.ok(Math.abs(r.boost-.125)<eps);
 assert.ok(Math.abs(s.boost.seconds-.125)<eps);
 assert.equal(s.telemetry.offlineReports.length,0);
});
check("BOOST-Q319/320: resume advances only online seconds and never spends paused BOOST",()=>{
 const s=fresh();
 s.boost.seconds=100;
 G.advance(s,T+3600000,{offline:true});
 const before=s.boost.seconds,orb=s.totalOrbs,mass=G.planet(s).stats.mass,tElapsed=s.time.elapsed;
 assert.equal(s.boost.active,false);
 const r=G.advance(s,T+3605000,{offline:false,rng:()=>.99999});
 assert.equal(r.gameSeconds,5);assert.equal(s.boost.seconds,before);
 assert.ok(A(s.totalOrbs).cmp(orb)>0);assert.ok(A(G.planet(s).stats.mass).cmp(mass)>0);
 assert.ok(s.time.elapsed>tElapsed);
 assert.equal(s.counters.onlineSeconds,5);
 assert.equal(s.counters.offlineSeconds,3600);
});
check("Q121: lab retains old isolated test levels but still gets no online BOOST",()=>{
 const s=G.createState(T,"lab");s.boost.upgrades[2]=5;
 assert.equal(G.boostValues(s).onlineRate,0);
 assert.ok(G.boostValues(s).offlineRate>.25);
 G.advance(s,T+10000,{offline:false});
 assert.equal(s.boost.seconds,0);
});
check("Negative clock movement awards nothing and resynchronizes safely",()=>{
 const s=G.createState(T);s.boost.seconds=22;
 const backwards=G.advance(s,T-10000,{offline:true});
 assert.equal(backwards.elapsed,0);assert.equal(s.boost.seconds,22);assert.equal(s.lastWall,T-10000);
 const a=G.advance(s,T,{offline:true});
 assert.equal(a.elapsed,10);assert.ok(Math.abs(s.boost.seconds-24.5)<eps);
});
check("Schema31 and old telemetry records load with default discarded amount",()=>{
 const s=fresh();
 const t=freshTelemetry();
 recordOfflineReport(t,{at:T+20000,seconds:20,effectiveSeconds:0,orbs:"0",boostEarned:5});
 delete t.offlineReports[0].boostDiscarded;
 s.telemetry=t;
 const loaded=decode(encode(s,"offline-v325"),"normal");
 assert.equal(loaded.schemaVersion,31);
 assert.equal(loaded.telemetry.offlineReports[0].boostDiscarded,0);
 assert.equal(KEYS.normal,"kotowari_v31_normal");
 assert.equal(KEYS.lab,"kotowari_v31_lab");
 const invalid={...t,offlineReports:[{...t.offlineReports[0],boostDiscarded:-1}]};
 assert.throws(()=>validateTelemetry(invalid),/オフライン履歴が不正/);
});
console.log("PASS "+tested+" current-spec offline BOOST-only and save regression checks");
