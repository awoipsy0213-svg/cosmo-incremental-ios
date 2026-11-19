/*
 * 《理》 — Confirmed universe resource definitions (U16/U17/U18 B decisions).
 * Labels remain provisional. All unlock checks are per planet, never global.
 * R1 mass+1 ... R6 mass+32; stability is measured in percentage points.
 * No resource synthesis or hidden pity; tier weights are group weights.
 */
const RANK_MASS=Object.freeze([0,1,2,4,8,16,32]);
export const RANK_BASE_WEIGHTS=Object.freeze([0,1000,150,40,10,2,0.5]);
const definition=[
  ["UR1_01",{density:1}],["UR1_02",{temperature:1}],
  ["UR1_03",{pressure:1}],["UR1_04",{stability:.1}],
  ["UR1_05",{activity:1}],["UR1_06",{energy:1}],
  ["UR1_07",{gravity:1}],["UR1_08",{acceleration:1}],
  ["UR1_09",{radiation:1}],["UR1_10",{magnetism:1}],
  ["UR1_11",{hardness:1}],["UR1_12",{purity:1}],
  ["UR1_13",{diversity:1}],["UR1_14",{density:.5,pressure:.5}],
  ["UR1_15",{purity:.5,diversity:.5}],
  ["UR2_01",{density:2,purity:1}],["UR2_02",{pressure:2,energy:1}],
  ["UR2_03",{temperature:2,activity:1}],["UR2_04",{gravity:2,acceleration:1}],
  ["UR2_05",{radiation:2,magnetism:1}],["UR2_06",{hardness:2,stability:.2}],
  ["UR2_07",{diversity:2,purity:1}],["UR2_08",{temperature:2,radiation:1}],
  ["UR2_09",{energy:2,magnetism:1}],["UR2_10",{density:2,gravity:1}],
  ["UR3_01",{gravity:4,density:2}],["UR3_02",{temperature:4,energy:2}],
  ["UR3_03",{pressure:4,hardness:2}],["UR3_04",{radiation:4,energy:2}],
  ["UR3_05",{magnetism:4,stability:.4}],["UR3_06",{activity:4,acceleration:2}],
  ["UR3_07",{diversity:4,purity:2}],["UR3_08",{gravity:4,acceleration:2}],
  ["UR4_01",{pressure:8,temperature:4,energy:4}],
  ["UR4_02",{gravity:8,hardness:4,density:4}],
  ["UR4_03",{radiation:8,magnetism:4,stability:.8}],
  ["UR4_04",{activity:8,acceleration:4,energy:4}],
  ["UR4_05",{purity:8,diversity:4,density:4}],
  ["UR5_01",{energy:16,pressure:8,temperature:8}],
  ["UR5_02",{gravity:16,acceleration:8,magnetism:8}],
  ["UR5_03",{stability:1.6,hardness:16,purity:8}],
  ["UR6_01",{energy:32,gravity:16,stability:3.2}]
];
const conditions={
  UR2_01:{density:100},UR2_02:{pressure:100},
  UR2_03:{temperature:100},UR2_04:{gravity:100},
  UR2_05:{radiation:100},UR2_06:{hardness:100},
  UR2_07:{diversity:100},UR2_08:{temperature:100,radiation:50},
  UR2_09:{energy:100,magnetism:50},UR2_10:{density:100,gravity:50},
  UR3_01:{gravity:200,density:200},UR3_02:{temperature:200,energy:200},
  UR3_03:{pressure:200,hardness:200},UR3_04:{radiation:200,energy:200},
  UR3_05:{magnetism:200,hardness:200},UR3_06:{activity:200,acceleration:200},
  UR3_07:{diversity:200,purity:200},UR3_08:{gravity:200,acceleration:200},
  UR4_01:{pressure:400,temperature:400,energy:400},
  UR4_02:{gravity:400,hardness:400,density:400},
  UR4_03:{radiation:400,magnetism:400,stability:40},
  UR4_04:{activity:400,acceleration:400,energy:400},
  UR4_05:{purity:400,diversity:400,density:400},
  UR5_01:{energy:800,pressure:800,temperature:800},
  UR5_02:{gravity:800,acceleration:800,magnetism:800},
  UR5_03:{hardness:800,purity:800,stability:60},
  UR6_01:{energy:1600,gravity:1600,stability:75}
};
export const UNIVERSE_RESOURCE_RULES=Object.freeze(Object.fromEntries(
  definition.map(([id,effects])=>{
    const rank=Number(id.slice(2,3));
    return [id,Object.freeze({id,rank,mass:RANK_MASS[rank],
      effects:Object.freeze(effects),conditions:Object.freeze(conditions[id]||{})})];
  })
));
const number=v=>{const n=Number(v??0);return Number.isFinite(n)&&n>=0?n:0;};
export function resourceEligible(rule,stats={}){
  if(!rule)return false;
  const relax=rule.rank===2?Math.min(.2,Math.floor(number(stats.purity)/100)*.05):0;
  return Object.entries(rule.conditions).every(([stat,required])=>number(stats[stat])+1e-9>=required*(1-relax));
}
export function eligibleResourceWeights(resources,stats={}){
  const eligible=resources.filter(r=>resourceEligible(UNIVERSE_RESOURCE_RULES[r.id],stats));
  const rankCount=new Map();
  for(const r of eligible)rankCount.set(r.rank,(rankCount.get(r.rank)||0)+1);
  return eligible.map(r=>({id:r.id,rank:r.rank,
    weight:RANK_BASE_WEIGHTS[r.rank]/rankCount.get(r.rank)}));
}
export function pickWeightedResource(entries,rng=Math.random){
  let sum=0;
  for(const e of entries)sum+=Math.max(0,e.weight);
  if(!(sum>0))return null;
  let roll=Math.max(0,Math.min(0.999999999999999,Number(rng())))*sum;
  for(const e of entries){roll-=Math.max(0,e.weight);if(roll<0)return e.id;}
  return entries.at(-1)?.id||null;
}
export function investmentDelta(id,count=1){
  const rule=UNIVERSE_RESOURCE_RULES[id];
  if(!rule||!Number.isSafeInteger(count)||count<1)return null;
  return {mass:rule.mass*count,
    effects:Object.fromEntries(Object.entries(rule.effects).map(([stat,perUnit])=>[stat,perUnit*count]))};
}
export function collapsePressureFactor(pressure){
  return Math.min(3,1.1**Math.min(200,Math.floor(number(pressure)/100)));
}
export function collapseHazardPerMinute(stats={}){
  // Initial design rate ~0.58% per minute. Exact balance needs Monte Carlo review.
  // Core presence and event-based multipliers are applied by the caller.
  return .0058;
}
