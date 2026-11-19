import assert from "node:assert/strict";
import {A} from "../numbers.mjs";
import {
 createState,createPlanet,planet,interferenceQuote,collidePlanets,
 transferPlanetGrowth,inducePlanetCollapse,stabilizePlanet,advance,validateState
} from "../game.mjs";
import {resourceSpendPlan,induceResourceCost,INTERFERENCE_RULES} from "../universe-interference-v318.mjs";
import {encode,decode,checksum,SaveStore,KEYS} from "../save.mjs";
const NOW=1763600000000;
let count=0;const test=(name,fn)=>{fn();count++;console.log("✓",name);};
const build=(n=2)=>{
 const s=createState(NOW);s.intro.complete=true;s.universe.unlocked=true;
 s.universe.maxPlanets=10;
 const ids=[];
 for(let i=0;i<n;i++){ids.push(createPlanet(s,NOW).id);}
 s.universe.knowledge={collision:100,transfer:100,collapse:100,stability:100};
 for(const k of ["UR1_01","UR1_04","UR1_11"])s.universe.resources[k]="10000";
 return {s,ids};
};
test("spend quote uses only declared resources and never spends on failure",()=>{
 const s={UR1_01:"25",UR1_04:"25",UR2_01:"1000"};
 const bad=resourceSpendPlan(s,100);
 assert.equal(bad.ok,false);
 assert.equal(s.UR1_01,"25");
 const good=resourceSpendPlan(s,50);
 assert.equal(good.ok,true);
 assert.equal(good.items.length,2);
 assert.equal(induceResourceCost("1e5").cmp("1e4"),0);
 assert.equal(induceResourceCost("100").cmp(100),0);
});
test("collision requires eligible living pair; rejects cores without charging",()=>{
 const {s,ids}=build();
 const a=planet(s,ids[0]),b=planet(s,ids[1]);
 a.stats.mass="100";b.stats.mass="300";
 a.stats.temperature="20";b.stats.temperature="40";
 a.core.formed=true;
 assert.equal(collidePlanets(s,...ids,NOW).ok,false);
 assert.equal(A(s.universe.resources.UR1_01).cmp(10000),0);
 a.core.formed=false;
 assert.equal(collidePlanets(s,ids[0],ids[0],NOW).ok,false);
 const result=collidePlanets(s,...ids,NOW);
 assert.ok(result.ok);
 assert.equal(s.universe.planets.length,1);
 const p=s.universe.planets[0];
 assert.equal(A(p.stats.mass).cmp(320),0);
 assert.equal(A(p.stats.temperature).cmp(35),0);
 assert.equal(s.universe.collapseCount,0);
 assert.equal(A(s.universe.resources.UR1_01).cmp(9900),0);
 assert.equal(collidePlanets(s,...ids,NOW).ok,false);
 assert.equal(A(s.universe.resources.UR1_01).cmp(9900),0);
});
test("transfer stops only source mass growth, adds 50% to destination",()=>{
 const {s,ids}=build();s.lastWall=NOW;
 const a=planet(s,ids[0]),b=planet(s,ids[1]);
 assert.ok(transferPlanetGrowth(s,...ids,NOW).ok);
 assert.equal(s.universe.interference.transfers.length,1);
 assert.equal(A(s.universe.resources.UR1_01).cmp(9950),0);
 const again=transferPlanetGrowth(s,...ids,NOW);
 assert.equal(again.ok,false);
 assert.equal(A(s.universe.resources.UR1_01).cmp(9950),0);
 // One active minute: source +0, target own +1 +0.5.
 advance(s,NOW+60000,{rng:()=>.999999});
 assert.equal(A(a.stats.mass).cmp(10),0);
 assert.equal(A(b.stats.mass).cmp(11.5),0);
 // 9 minutes left, then one minute normal recovery.
 advance(s,NOW+660000,{rng:()=>.999999});
 assert.equal(A(a.stats.mass).cmp(11),0);
 assert.equal(A(b.stats.mass).cmp(25),0);
 assert.equal(s.universe.interference.transfers.length,0);
});
test("induction charges once, checks ten collapses, cooldown and offline",()=>{
 const {s,ids}=build();
 assert.equal(inducePlanetCollapse(s,ids[0],NOW,()=>.9).ok,false);
 assert.equal(A(s.universe.resources.UR1_01).cmp(10000),0);
 s.universe.collapseCount=10;
 const out=inducePlanetCollapse(s,ids[0],NOW,()=>.99999);
 assert.ok(out.ok);
 assert.equal(A(s.universe.resources.UR1_01).cmp(9900),0);
 assert.equal(s.universe.collapseCount,11);
 assert.equal(inducePlanetCollapse(s,ids[0],NOW,()=>.1).ok,false);
 assert.equal(inducePlanetCollapse(s,ids[1],NOW+599999,()=>.1).ok,false);
 assert.equal(inducePlanetCollapse(s,ids[1],NOW+600000,()=>.1).ok,true);
 assert.equal(s.universe.collapseCount,12);
});
test("stabilization uses protective IDs only and 5-min effective cooldown",()=>{
 const {s,ids}=build(1);s.lastWall=NOW;
 const p=planet(s,ids[0]);
 p.stats.stability="89.5";
 const n=stabilizePlanet(s,ids[0],NOW);
 assert.equal(n.ok,true);
 assert.equal(A(p.stats.stability).cmp(90),0);
 assert.equal(A(s.universe.resources.UR1_04).cmp(9950),0);
 assert.equal(stabilizePlanet(s,ids[0],NOW).ok,false);
 // progress timer while planet remains alive
 advance(s,NOW+300000,{rng:()=>.999999});
 assert.equal(s.universe.interference.stabilizeCooldowns[ids[0]],0);
 assert.equal(stabilizePlanet(s,ids[0],NOW+300000).ok,false); // at cap
 p.stats.stability="88";
 assert.equal(stabilizePlanet(s,ids[0],NOW+300000).ok,true);
});
test("saving transfers and cooldowns roundtrips without source IDs being rewritten",()=>{
 const {s,ids}=build();transferPlanetGrowth(s,...ids,NOW);
 s.universe.interference.stabilizeCooldowns[ids[1]]=200;
 const decoded=decode(encode(s,"universe-ci"),"normal");
 assert.equal(decoded.universe.interference.transfers.length,1);
 assert.equal(decoded.universe.interference.transfers[0].remainingSeconds,600);
 assert.equal(decoded.universe.interference.stabilizeCooldowns[ids[1]],200);
 assert.equal(decoded.universe.planets.length,2);
});
test("old v31 save gets empty interference state, rejected corrupt duplicates",()=>{
 const {s}=build();
 delete s.universe.interference;
 const migrated=validateState(s,"normal");
 assert.deepEqual(migrated.universe.interference.transfers,[]);
 const t=structuredClone(migrated);
 t.universe.interference.transfers=[{id:"TRANSFER_1",from:t.universe.planets[0].id,to:t.universe.planets[0].id,remainingSeconds:600}];
 assert.throws(()=>validateState(t,"normal"),/成長移転/);
});
console.log("PASS "+count+" universe interference regression");
