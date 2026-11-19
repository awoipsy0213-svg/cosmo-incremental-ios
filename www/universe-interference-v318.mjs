/*
 * 《理》U19 all-B: four planetary interventions.
 * Resource quote helpers only; the game engine owns atomic commit.
 * Never use protection existence or current orbs for interventions.
 */
import {A} from "./numbers.mjs";
export const INTERFERENCE_TYPES=Object.freeze(["collision","transfer","induce","stabilize"]);
export const R1_RESOURCE_IDS=Object.freeze(Array.from({length:15},(_,i)=>"UR1_"+String(i+1).padStart(2,"0")));
export const STABILIZING_RESOURCES=Object.freeze(["UR1_04","UR1_11"]);
export const INTERFERENCE_RULES=Object.freeze({
  collision:Object.freeze({cost:"100",knowledge:"collision",minimumPlanets:2}),
  transfer:Object.freeze({cost:"50",knowledge:"transfer",minimumPlanets:2,durationSeconds:600,transferredGrowthFraction:.5}),
  induce:Object.freeze({knowledge:"collapse",requiredCollapses:10,cooldownMs:600000}),
  stabilize:Object.freeze({cost:"50",knowledge:"stability",cooldownMs:300000,stabilityGain:1,maxStability:90})
});
export function integerCeilAmount(value){
  const x=A(value);
  if(x.e>=15)return x; // >14 significant figures are already approximate.
  return A(Math.ceil(x.toNumber()));
}
export function induceResourceCost(mass){
  const x=integerCeilAmount(A(mass).mul(.1));
  return x.cmp(100)<0?A(100):x;
}
export function resourceSpendPlan(inventory,cost,allowed=R1_RESOURCE_IDS) {
  let remaining=A(cost);
  if(remaining.cmp(0)<=0)return {ok:false,reason:"費用が不正です"};
  const items=[];
  for(const id of allowed) {
    const available=A(inventory?.[id]||0);
    const take=available.cmp(remaining)>=0?remaining:available;
    if(take.cmp(0)>0)items.push({id,count:take.toString()});
    remaining=remaining.sub(take);
    if(remaining.cmp(0)===0)break;
  }
  if(remaining.cmp(0)>0)return {ok:false,cost:A(cost).toString(),reason:"必要なR1資源が不足しています"};
  return {ok:true,cost:A(cost).toString(),items};
}
export function interferenceKnowledgeReady(universe,id) {
  return Number(universe?.knowledge?.[id]||0)>=100;
}
