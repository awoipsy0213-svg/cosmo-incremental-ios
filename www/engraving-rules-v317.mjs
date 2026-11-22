/*
 * 《理》 Ver.3.17: 30 engraving ownership/equipment specification.
 * Stable ENG-01..ENG-30. Prices and slot counts are confirmed B decisions.
 * IMPORTANT: names/effects of 27 entries and source-retention target IDs
 * are not available in the versioned handoff; never synthesize them.
 * All owned engravings are permanently active regardless of historical equipment.
 * Unverified effect formulas remain inert until their exact specification is confirmed.
 */
import {A} from "./numbers.mjs";
import {ENGRAVING_EFFECTS,engravingLevel} from "./engraving-effects-v333.mjs";

export const ENGRAVING_IDS=Object.freeze(Array.from({length:30},(_,i)=>"ENG-"+String(i+1).padStart(2,"0")));
export const ENGRAVING_GROUP_PRICES=Object.freeze(["0.005","0.025","0.125"]);
export const ENGRAVING_AUTO_CONVERGE_ID="ENG-24";
// Extra levels are reversible trial effects, independent of old equipment.
export const ENGRAVING_TRIAL=Object.freeze({maxExtraLevels:15,costGrowth:1.6,sharedBonusPerExtraLevel:0.005});
export const AUTO_CONVERGE_MIN_INTERVAL_MS=60000;
export const AUTO_CONVERGE_DEFAULT_MIN_REWARD="0.025";

export function engravingTier(id) {
  const index=ENGRAVING_IDS.indexOf(id);
  return index<0?0:Math.floor(index/10)+1;
}
export function engravingPrice(id){
  const tier=engravingTier(id);
  return tier?ENGRAVING_GROUP_PRICES[tier-1]:null;
}
export function engravingSlots(convergenceCount=0){
  if(!Number.isSafeInteger(convergenceCount)||convergenceCount<0)return 2;
  return 2+[1,5,20,100].filter(count=>convergenceCount>=count).length;
}
export function engravingPrerequisite(tier,owned=[]){
  if(tier<=1)return {ok:true,count:0,targetTier:null,needed:0};
  const targetTier=tier-1;
  const count=owned.filter(id=>engravingTier(id)===targetTier).length;
  return {ok:count>=3,count,targetTier,needed:Math.max(0,3-count)};
}
export function engravingEffectStatus(id){
  if(ENGRAVING_EFFECTS[id])return {status:"implemented",description:ENGRAVING_EFFECTS[id].description};
  if(["ENG-05","ENG-17","ENG-25"].includes(id))
    return {status:"pending-target",description:"この刻印には、まだ明らかになっていない力があります。"};
  return {status:"pending",description:"この刻印の力はまだ明らかになっていません。"};
}
export function engravingCatalogue(){
  return ENGRAVING_IDS.map((id,i)=>Object.freeze({
    id,
    name:ENGRAVING_EFFECTS[id]?.name||"未知の刻印 "+String(i+1),
    tier:engravingTier(id),
    cost:engravingPrice(id),
    ...engravingEffectStatus(id)
  }));
}
export function engravingPurchaseQuote(s,id){
  if(!ENGRAVING_IDS.includes(id))return {ok:false,reason:"刻印IDが不正です"};
  if(s.engraving.owned.includes(id))return {ok:false,reason:"すでに取得しています"};
  if(!s.intro.complete)return {ok:false,reason:"最初の存在を認識してください"};
  const tier=engravingTier(id),price=engravingPrice(id),prerequisite=engravingPrerequisite(tier,s.engraving.owned);
  if(!prerequisite.ok)return {ok:false,tier,price,prerequisite,
    reason:"前段階の刻印を3種所有する必要があります（残り"+prerequisite.needed+"種）"};
  if(A(s.surplusExistence).cmp(price)<0)return {ok:false,tier,price,prerequisite,reason:"余剰存在が不足しています"};
  return {ok:true,tier,price,prerequisite};
}
export function engravingTrialUpgradeQuote(s,id){
  if(!ENGRAVING_IDS.includes(id))return {ok:false,reason:"刻印IDが不正です"};
  if(!s.engraving?.owned?.includes(id))return {ok:false,reason:"最初に刻印を取得してください"};
  const current=s.engraving.trialLevels?.[id]||0;
  if(current>=ENGRAVING_TRIAL.maxExtraLevels)return {ok:false,reason:"強化上限に達しました",current};
  const price=A(engravingPrice(id)).mul(A(ENGRAVING_TRIAL.costGrowth).pow(current+1)).toString();
  const enough=A(s.surplusExistence).cmp(price)>=0;
  return {ok:enough,price,current,next:current+1,reason:enough?"":"余剰存在が不足しています"};
}
export function engravingTrialTotal(s){
  return ENGRAVING_IDS.reduce((sum,id)=>sum+(s.engraving.trialLevels?.[id]||0),0);
}
export function validRewardThreshold(value){
  try{
    return A(value).cmp(AUTO_CONVERGE_DEFAULT_MIN_REWARD)>=0 &&
      A(value).cmp("1e100")<=0;
  }catch{return false;}
}
