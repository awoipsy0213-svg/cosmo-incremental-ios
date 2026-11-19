import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {CONTENT} from "../content.mjs";
import {CONFIG} from "../balance-config.mjs";
import {A} from "../numbers.mjs";
import {UNIVERSE_RESOURCE_RULES,RANK_BASE_WEIGHTS,resourceEligible,eligibleResourceWeights,investmentDelta} from "../universe-confirmed-v4.mjs";
import {TIME_EFFECTS,conceptLevelCost,conceptBonuses,conceptActive,residueWeights} from "../time-confirmed-v4.mjs";
import {createState,createPlanet,planet,invest,formConcept,conceptEffect,confirmedResourceBag,collapsePlanet,advance,validateState,checkUniverse} from "../game.mjs";
import {encode,decode,KEYS} from "../save.mjs";

let passed=0;
function test(name,fn){fn();passed++;console.log("✓",name);}
const t0=1763600000000; // fixed timestamp for deterministic save and progress tests
test("all source datasets stay intact",()=>{
  assert.equal(CONTENT.sources.length,30);
  assert.equal(CONTENT.concepts.length,77);
  assert.equal(CONTENT.resources.length,42);
  assert.equal(CONTENT.stats.length,15);
  assert.equal(Object.keys(TIME_EFFECTS).length,77);
  assert.equal(Object.keys(UNIVERSE_RESOURCE_RULES).length,42);
});
test("stable source IDs and save schema remain unchanged",()=>{
  assert.equal(CONFIG.schemaVersion,31);
  assert.equal(KEYS.normal,"kotowari_v31_normal");
  assert.equal(KEYS.lab,"kotowari_v31_lab");
});
test("one resource every rank and mass distribution",()=>{
  const tallies=[15,10,8,5,3,1];
  for(let rank=1;rank<=6;rank++){
    const rows=Object.values(UNIVERSE_RESOURCE_RULES).filter(x=>x.rank===rank);
    assert.equal(rows.length,tallies[rank-1]);
    assert.ok(rows.every(x=>x.mass===2**(rank-1)));
    assert.ok(RANK_BASE_WEIGHTS[rank]>0);
  }
});
test("resource effects and caps are attached to stable IDs",()=>{
  assert.deepEqual(investmentDelta("UR1_01",2),{mass:2,effects:{density:2}});
  assert.deepEqual(investmentDelta("UR1_14",2),{mass:2,effects:{density:1,pressure:1}});
  assert.deepEqual(investmentDelta("UR6_01",1),{mass:32,effects:{energy:32,gravity:16,stability:3.2}});
  assert.equal(investmentDelta("bad",1),null);
});
test("resource eligibility: R1, R2 with purity, R6 threshold",()=>{
  assert.equal(resourceEligible(UNIVERSE_RESOURCE_RULES.UR1_01,{}),true);
  assert.equal(resourceEligible(UNIVERSE_RESOURCE_RULES.UR2_01,{density:99,purity:0}),false);
  assert.equal(resourceEligible(UNIVERSE_RESOURCE_RULES.UR2_01,{density:80,purity:400}),true);
  assert.equal(resourceEligible(UNIVERSE_RESOURCE_RULES.UR6_01,{energy:1600,gravity:1600,stability:75}),true);
  assert.equal(resourceEligible(UNIVERSE_RESOURCE_RULES.UR6_01,{energy:1600,gravity:1600,stability:74.99}),false);
});
test("rank eligible weights never contain unauthorized resources",()=>{
  const eligible=eligibleResourceWeights(CONTENT.resources,{mass:1});
  assert.equal(eligible.length,15);
  assert.ok(eligible.every(x=>x.rank===1));
});
test("concept leveling uses 10 per new Lv and cap 100",()=>{
  assert.equal(conceptLevelCost(1),10);
  assert.equal(conceptLevelCost(2),20);
  assert.equal(conceptLevelCost(100),1000);
  assert.equal(conceptLevelCost(101),null);
});
test("flow-only residue distribution is unchanged",()=>{
  const s=createState(t0,"normal");
  const r=residueWeights(s,CONTENT.concepts);
  assert.deepEqual(r,[{id:"TC001",prob:.25},{id:"TC002",prob:.25},{id:"common",prob:.5}]);
});
test("concept levels, permanent history and effective bonuses",()=>{
  const s=createState(t0,"normal");
  s.time.unlocked=true;
  s.time.residues.TC001=30;
  assert.ok(formConcept(s,"TC001").ok);
  assert.equal(s.time.concepts.TC001,1);
  assert.ok(formConcept(s,"TC001").ok);
  assert.equal(s.time.concepts.TC001,2);
  assert.equal(s.time.residues.TC001,0);
  assert.ok(conceptActive(s,CONTENT.concepts[0]));
  assert.ok(conceptBonuses(s,CONTENT.concepts).event>0);
  assert.equal(conceptEffect(s,"TC001").level,2);
  assert.equal(s.time.concepts.TC001,2);
});
test("unrevealed concept cannot be formed even if residue exists",()=>{
  const s=createState(t0,"normal");s.time.unlocked=true;
  s.time.residues.TC003=10;
  assert.equal(formConcept(s,"TC003").ok,false);
  assert.equal(s.time.residues.TC003,10);
});
test("regular investments update mass and specialized stats",()=>{
  const s=createState(t0,"normal");s.intro.complete=true;s.universe.unlocked=true;
  const created=createPlanet(s,t0);assert.equal(created.ok,true);
  assert.equal(A(planet(s).stats.mass).toNumber(),10);
  s.universe.resources.UR1_01="2";
  const result=invest(s,"UR1_01",2);
  assert.equal(result.ok,true);
  assert.equal(A(planet(s).stats.mass).toNumber(),12);
  assert.equal(A(planet(s).stats.density).toNumber(),2);
  assert.equal(A(s.universe.resources.UR1_01).toNumber(),0);
  assert.equal(invest(s,"UR1_01",1).ok,false);
});
test("ordinary mode generates resources and grows planet naturally",()=>{
  const s=createState(t0,"normal");s.intro.complete=true;s.universe.unlocked=true;
  createPlanet(s,t0);s.lastWall=t0;
  advance(s,t0+60000,{rng:()=>.9});
  assert.ok(A(planet(s).stats.mass).toNumber()>10);
  assert.ok(s.universe.discoveredResources.length>0);
  assert.ok(Object.keys(s.universe.resources).length>0);
});
test("collapse awards only once and protects existence",()=>{
  const s=createState(t0,"normal");s.intro.complete=true;s.universe.unlocked=true;
  const {id}=createPlanet(s,t0);
  const r=collapsePlanet(s,id,()=>.2,t0+1000);
  assert.equal(r.ok,true);
  assert.equal(collapsePlanet(s,id,()=>.2,t0+1001).ok,false);
  assert.equal(s.universe.collapseCount,1);
  assert.equal(s.universe.maxPlanets,2);
  assert.ok(s.achievements.includes("planetRuin"));
  assert.equal(s.surplusExistence,"0");
});
test("legacy save without new optional fields is migrated without wiping data",()=>{
  const s=createState(t0,"normal");s.intro.complete=true;s.universe.unlocked=true;
  createPlanet(s,t0);
  s.surplusExistence="25";s.universe.resources.UR1_01="123";
  delete s.time.miracles;delete s.universe.autoGenerate;delete s.universe.autoAccumulator;
  delete s.universe.planets[0].core;delete s.universe.planets[0].evidence;
  const migrated=validateState(s,"normal");
  assert.equal(migrated.surplusExistence,"2.5e1");
  assert.ok(migrated.time.miracles.length===0);
  assert.equal(migrated.universe.autoGenerate,false);
  assert.equal(migrated.universe.planets[0].core.formed,false);
  assert.equal(A(migrated.universe.resources.UR1_01).toNumber(),123);
  assert.equal(decode(encode(migrated,"tests"),"normal").mode,"normal");
});
test("World time requires all 6 directions",()=>{
  const s=createState(t0,"normal");
  s.time.unlocked=true;s.time.worldSeconds=1;
  assert.equal(checkUniverse(s),false);
  s.time.revealedDirections=6;
  assert.equal(checkUniverse(s),true);
  assert.equal(s.universe.unlocked,true);
});
test("astral styling is additive and old layout root still exists",()=>{
  const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
  const css=readFileSync(new URL("../astral-observatory.css",import.meta.url),"utf8");
  assert.ok(html.includes("astral-observatory.css"));
  for(const id of ["appRoot","touchField","sheet","stageNav"])assert.ok(html.includes('id="'+id+'"'));
  assert.ok(css.includes("prefers-reduced-motion"));
});
console.log("PASS "+passed+" v3.16 confirmed universe/time + migrated saves + astral UI checks");
