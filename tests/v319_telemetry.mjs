import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {A} from "../numbers.mjs";
import {createState,createPlanet,planet,invest,tap,converge,advance,validateState} from "../game.mjs";
import {freshTelemetry,sampleActualOrbs,recordOfflineReport,recordConvergence,
  consecutiveOrbGains,validateTelemetry,TELEMETRY_LIMITS} from "../telemetry-v319.mjs";
import {SaveStore,KEYS,checksum,encode,decode} from "../save.mjs";

const NOW=1763600000000;
let n=0;
function test(name,fn){fn();n++;console.log("✓",name);}
test("5-second real samples never invent missing time buckets",()=>{
  const t=freshTelemetry();
  assert.ok(sampleActualOrbs(t,NOW,"10"));
  assert.ok(sampleActualOrbs(t,NOW+1000,"20"));
  assert.equal(t.onlineSamples.length,1);
  assert.equal(A(t.onlineSamples[0].total).cmp("20"),0);
  assert.ok(sampleActualOrbs(t,NOW+5000,"45"));
  assert.ok(sampleActualOrbs(t,NOW+15000,"95"));
  const rows=consecutiveOrbGains(t);
  assert.equal(rows.length,2);
  assert.equal(A(rows[0].gain).cmp("25"),0);
  assert.equal(rows[1].gain,null);
  assert.equal(sampleActualOrbs(t,NOW-5000,"100"),false);
  assert.equal(t.onlineSamples.length,3);
});
test("120 samples span only 10 minutes, never excess storage",()=>{
  const t=freshTelemetry();
  for(let i=0;i<150;i++)sampleActualOrbs(t,NOW+i*5000,String(i*13));
  assert.equal(t.onlineSamples.length,TELEMETRY_LIMITS.onlineSamples);
  assert.equal(t.onlineSamples.at(-1).at-t.onlineSamples[0].at,119*5000);
  assert.equal(consecutiveOrbGains(t).length,119);
  assert.ok(validateTelemetry(t).onlineSamples.length===120);
});
test("huge award amounts remain scientific and safe through display accounting",()=>{
  const t=freshTelemetry();
  sampleActualOrbs(t,NOW,"1e400");
  sampleActualOrbs(t,NOW+5000,"2e400");
  assert.equal(A(consecutiveOrbGains(t)[0].gain).cmp("1e400"),0);
});
test("offline and convergence histories cap to 10/20 without altering totals",()=>{
  const t=freshTelemetry();
  for(let i=0;i<15;i++)recordOfflineReport(t,{at:NOW+i*60000,seconds:600,
    effectiveSeconds:300,orbs:String(i),boostEarned:10});
  for(let i=0;i<30;i++)recordConvergence(t,{at:NOW+i*60000,steps:i+1,reward:"0.025"});
  assert.equal(t.offlineReports.length,10);
  assert.equal(t.convergences.length,20);
  assert.equal(A(t.offlineReports[0].orbs).cmp(5),0);
  assert.equal(t.convergences[0].steps,11);
  assert.ok(validateTelemetry(t));
});
test("planet investment ledger keeps stable IDs and purchased units",()=>{
  const s=createState(NOW);s.intro.complete=true;s.universe.unlocked=true;
  s.universe.maxPlanets=2;
  const one=createPlanet(s,NOW).id,two=createPlanet(s,NOW).id;
  s.universe.resources.UR1_01="30";
  assert.ok(invest(s,"UR1_01",5).ok);
  assert.ok(invest(s,"UR1_01",10).ok);
  assert.equal(A(planet(s,two).evidence.investmentsByResource.UR1_01).cmp(15),0);
  assert.equal(planet(s,one).evidence.investmentsByResource?.UR1_01,undefined);
  assert.equal(A(s.universe.resources.UR1_01).cmp(15),0);
  assert.equal(invest(s,"UR1_01",100).ok,false);
  assert.equal(A(planet(s,two).evidence.investmentsByResource.UR1_01).cmp(15),0);
  const restored=decode(encode(s,"v319"),"normal");
  assert.equal(A(planet(restored,two).evidence.investmentsByResource.UR1_01).cmp(15),0);
});
test("actual online gain is measured; offline never backfills online sample",()=>{
  const s=createState(NOW);s.intro.complete=true;s.sources.SOURCE_01.level=10;
  const result=advance(s,NOW+5000,{rng:()=>.99999});
  assert.equal(result.elapsed,5);
  assert.equal(s.telemetry.onlineSamples.length,1);
  const before=A(s.totalOrbs);
  const offline=advance(s,NOW+605000,{offline:true,rng:()=>.99999});
  assert.equal(offline.elapsed,600);
  assert.equal(s.telemetry.onlineSamples.length,1);
  assert.equal(s.telemetry.offlineReports.length,1);
  assert.equal(A(s.telemetry.offlineReports[0].orbs).cmp(A(s.totalOrbs).sub(before)),0);
  advance(s,NOW+605000,{offline:true});
  assert.equal(s.telemetry.offlineReports.length,1);
  advance(s,NOW+610000,{rng:()=>.99999});
  assert.equal(s.telemetry.onlineSamples.length,2);
  assert.equal(consecutiveOrbGains(s.telemetry)[0].gain,null);
});
test("manual tap and convergence add only observed history, once",()=>{
  const s=createState(NOW);s.intro.complete=true;
  const tapResult=tap(s,NOW);
  assert.equal(tapResult.ok,true);
  assert.equal(s.telemetry.onlineSamples.length,1);
  s.orbs="1e20";
  assert.equal(converge(s).ok,true);
  assert.equal(s.telemetry.convergences.length,1);
  const recorded=s.telemetry.convergences[0];
  assert.ok(recorded.steps>0);
  assert.ok(A(recorded.reward).cmp(0)>0);
  assert.equal(converge(s).ok,false);
  assert.equal(s.telemetry.convergences.length,1);
});
test("older v31 saves migrate to empty history without fake samples",()=>{
  const s=createState(NOW);
  delete s.telemetry;s.universe.unlocked=true;
  const {id}=createPlanet(s,NOW);
  delete planet(s,id).evidence.investmentsByResource;
  const migrated=validateState(s,"normal");
  assert.deepEqual(migrated.telemetry,freshTelemetry());
  assert.deepEqual(migrated.universe.planets[0].evidence.investmentsByResource,{});
  assert.equal(decode(encode(migrated,"migration-check"),"normal").mode,"normal");
});
test("v319 save preserves original bytes before first add-only migration",()=>{
  const s=createState(NOW);delete s.telemetry;
  const body=structuredClone(s);
  const raw=JSON.stringify({kind:"kotowari-save",version:31,
    checksum:checksum(JSON.stringify(body)),writer:"v318",data:body});
  const stored=new Map([[KEYS.normal,raw]]);
  const adapter={getItem:key=>stored.get(key)||null,setItem:(key,v)=>stored.set(key,v)};
  const save=new SaveStore(adapter,"normal","test-v319");
  const loaded=save.load(NOW);
  assert.equal(loaded.blocked,undefined);
  assert.equal(stored.get(KEYS.normal+".before-v319"),raw);
  assert.deepEqual(loaded.state.telemetry,freshTelemetry());
  save.write(loaded.state,{snapshot:true});
  assert.equal(stored.get(KEYS.normal+".before-v319"),raw);
});
test("storage quota failure blocks migration, leaves original saved data",()=>{
  const s=createState(NOW);delete s.telemetry;
  const body=structuredClone(s);
  const raw=JSON.stringify({kind:"kotowari-save",version:31,
    checksum:checksum(JSON.stringify(body)),writer:"v318",data:body});
  const stored=new Map([[KEYS.normal,raw]]);
  const adapter={getItem:key=>stored.get(key)||null,setItem:(key,v)=>{
    if(key.endsWith(".before-v319"))throw new Error("quota exceeded");stored.set(key,v);
  }};
  const save=new SaveStore(adapter,"normal","quota-v319");
  const loaded=save.load(NOW);
  assert.equal(loaded.blocked,true);
  assert.equal(stored.get(KEYS.normal),raw);
  assert.throws(()=>save.write(loaded.state),/保護中/);
});
test("corrupted history and resource ledger are explicitly rejected",()=>{
  const s=createState(NOW);
  s.telemetry.onlineSamples=[{at:NOW,total:"not-a-number"}];
  assert.throws(()=>validateState(s,"normal"),/統計履歴/);
  const u=createState(NOW);u.universe.unlocked=true;createPlanet(u,NOW);
  planet(u).evidence.investmentsByResource={FAKE_RESOURCE:"10"};
  assert.throws(()=>validateState(u,"normal"),/投入資源ID/);
});
test("Web UI has real history views and PWA caches telemetry module",()=>{
  const ui=readFileSync(new URL("../app.mjs",import.meta.url),"utf8");
  const sw=readFileSync(new URL("../sw.js",import.meta.url),"utf8");
  assert.ok(ui.includes("telemetry-chart"));
  assert.ok(ui.includes("investmentsByResource"));
  assert.ok(sw.includes("telemetry-v319.mjs"));
});
console.log("PASS "+n+" Ver3.19 telemetry, v31 migration and planet investment checks");
