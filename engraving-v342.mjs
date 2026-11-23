/*
 * 《理》 DEC-20261124-002 -- additive v3.42 permanent engraving helpers.
 * Never infer historical run-purchased levels from legacy owned levels.
 */
export const BULK_ENGRAVING_ID="ENG-05";
export const AUTOMATIC_ENGRAVING_ID="ENG-17";
export const SOURCE_RETAIN_ENGRAVING_ID="ENG-25";
export const MOMENT_RETAIN_ENGRAVING_ID="ENG-29";
export const PRESET_ENGRAVING_ID="ENG-30";
export const ONE_TIME_ENGRAVINGS=Object.freeze(["ENG-05","ENG-24","ENG-27","ENG-28","ENG-30"]);
export const RETAIN_RATE_PER_LEVEL=0.02;
export const RETAIN_MAX_RATE=0.10;
export const RETAIN_MAX_LEVEL_PER_ITEM=100;
export const ENGRAVING_AUTO_MIN_INTERVAL=0.5;
export const ENGRAVING_AUTO_MAX_BATCH=20;
export const PRICE_GROUPS=Object.freeze(["0.001","0.025","0.125"]);
export const ENGRAVE_ORDER=Object.freeze(["cheap","expensive","unowned"]);
export const ENGRAVE_MODES=Object.freeze(["new","upgrade","both"]);

export const freshRunPurchases=()=>({moment:{},source:{}});
export const freshAutoEngraving=()=>({
 enabled:false,priority:"unowned",mode:"both",minReserve:"0.001",credit:0
});
export const freshPurchasePlan=()=>({
 moment:{targets:{},excluded:[]},source:{targets:{},excluded:[]}
});
export const freshPresetSystem=()=>({
 presets:[null,null,null],activePreset:null,plan:freshPurchasePlan()
});
export function recordRunPurchase(s,kind,id,count){
 if(!["moment","source"].includes(kind)||!Number.isSafeInteger(count)||count<=0)return;
 const e=s.engraving;
 if(!e.runPurchases)e.runPurchases=freshRunPurchases();
 const list=e.runPurchases[kind];
 list[id]=Math.min(1_000_000,(list[id]||0)+count);
}
export function retainedMap(s,kind,engravingLv,ids){
 const run=s.engraving?.runPurchases?.[kind]||{};
 const factor=Math.min(RETAIN_MAX_RATE,RETAIN_RATE_PER_LEVEL*Math.max(0,engravingLv));
 const result={};
 if(!factor)return result;
 for(const id of ids){
   const bought=Math.max(0,Number(run[id])||0);
   const keep=Math.min(RETAIN_MAX_LEVEL_PER_ITEM,Math.floor(bought*factor+1e-9));
   if(keep>0)result[id]=keep;
 }
 return result;
}
export function engravingInterval(verifiedLv){
 if(verifiedLv<=0)return Infinity;
 return Math.max(ENGRAVING_AUTO_MIN_INTERVAL,3/(1+0.12*(verifiedLv-1)));
}
export function autoPurchaseRate(level){
 const interval=engravingInterval(level);
 return Number.isFinite(interval)?1/interval:0;
}
export function planAllows(s,kind,id,nextLevel){
 const control=s.engraving?.presetSystem;
 if(!control||control.activePreset===null||!s.engraving.owned.includes(PRESET_ENGRAVING_ID))return true;
 const plan=control.plan?.[kind];
 if(!plan)return true;
 if(plan.excluded?.includes(id))return false;
 const cap=plan.targets?.[id];
 return cap===undefined||nextLevel<=cap;
}
export function verifyPlanEntry(kind,id,ids,level,excluded){
 if(!["moment","source"].includes(kind)||!ids.includes(id))return false;
 return Number.isSafeInteger(level)&&level>=0&&level<=1_000_000&&typeof excluded==="boolean";
}
export function snapshotPreset(s){
 return {
   moment:{priority:s.engraving.autoBuy.moment.priority,intervalSeconds:s.engraving.autoBuy.moment.intervalSeconds},
   source:{priority:s.engraving.autoBuy.source.priority,intervalSeconds:s.engraving.autoBuy.source.intervalSeconds},
   plan:structuredClone(s.engraving.presetSystem.plan)
 };
}
export function validateRunPurchaseMap(list,ids){
 return !!list&&typeof list==="object"&&!Array.isArray(list)&&
   Object.entries(list).every(([id,amount])=>ids.includes(id)&&
     Number.isSafeInteger(amount)&&amount>=0&&amount<=1_000_000);
}
export function validatePlan(plan,momentIds,sourceIds){
 if(!plan||typeof plan!=="object"||Array.isArray(plan))return false;
 for(const [kind,ids] of [["moment",momentIds],["source",sourceIds]]){
   const cfg=plan[kind];
   if(!cfg||!cfg.targets||!Array.isArray(cfg.excluded)||new Set(cfg.excluded).size!==cfg.excluded.length)return false;
   if(cfg.excluded.some(id=>!ids.includes(id)))return false;
   if(!validateRunPurchaseMap(cfg.targets,ids))return false;
 }
 return true;
}
export function validatePresets(system,momentIds,sourceIds){
 if(!system||!Array.isArray(system.presets)||system.presets.length!==3||
   !(system.activePreset===null||Number.isInteger(system.activePreset)&&system.activePreset>=0&&system.activePreset<3)||
   !validatePlan(system.plan,momentIds,sourceIds))return false;
 return system.presets.every(p=>p===null||
   !!p&&validatePlan(p.plan,momentIds,sourceIds)&&
   ["moment","source"].every(kind=>p[kind]&&
     ["auto","cheap","expensive","efficient"].includes(p[kind].priority)&&
     Number.isSafeInteger(p[kind].intervalSeconds)&&p[kind].intervalSeconds>=1&&p[kind].intervalSeconds<=60));
}
