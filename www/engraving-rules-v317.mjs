/*
 * 《理》 Ver.3.17: 30 engraving ownership/equipment specification.
 * Stable ENG-01..ENG-30. Prices and slot counts are confirmed B decisions.
 * IMPORTANT: names/effects of 27 entries and source-retention target IDs
 * are not available in the versioned handoff; never synthesize them.
 * An unequipped engraving cannot apply an effect. Unimplemented effects
 * may be owned but always remain inert until their exact spec is verified.
 */
import {A} from "./numbers.mjs";

export const ENGRAVING_IDS=Object.freeze(Array.from({length:30},(_,i)=>"ENG-"+String(i+1).padStart(2,"0")));
export const ENGRAVING_GROUP_PRICES=Object.freeze(["0.005","0.025","0.125"]);
export const ENGRAVING_AUTO_CONVERGE_ID="ENG-24";
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
  if(id===ENGRAVING_AUTO_CONVERGE_ID)
    return {status:"implemented",description:"装備中かつONの場合、収束報酬が指定値以上なら実時間60秒以上の間隔で自動収束。オフライン実行なし。"};
  if(["ENG-05","ENG-17","ENG-25"].includes(id))
    return {status:"pending-target",description:"収束時に対象源のLvを1%保持（最大10,000Lv）。対象源IDの原文照合が必要なため未適用。"};
  return {status:"pending",description:"固有効果は確定回答の原文照合待ち。現在は未適用。"};
}
export function engravingCatalogue(){
  return ENGRAVING_IDS.map((id,i)=>Object.freeze({
    id,
    name:"刻印 "+String(i+1).padStart(2,"0")+"（仮表示）",
    tier:engravingTier(id),
    cost:engravingPrice(id),
    ...engravingEffectStatus(id)
  }));
}
export function engravingPurchaseQuote(s,id){
  if(!ENGRAVING_IDS.includes(id))return {ok:false,reason:"刻印IDが不正です"};
  if(s.engraving.owned.includes(id))return {ok:false,reason:"取得済みです"};
  if(!s.intro.complete)return {ok:false,reason:"最初の存在を認識してください"};
  const tier=engravingTier(id),price=engravingPrice(id),prerequisite=engravingPrerequisite(tier,s.engraving.owned);
  if(!prerequisite.ok)return {ok:false,tier,price,prerequisite,
    reason:"前段階の刻印を3種所有する必要があります（残り"+prerequisite.needed+"種）"};
  if(A(s.surplusExistence).cmp(price)<0)return {ok:false,tier,price,prerequisite,reason:"余剰存在が不足しています"};
  return {ok:true,tier,price,prerequisite};
}
export function validRewardThreshold(value){
  try{
    return A(value).cmp(AUTO_CONVERGE_DEFAULT_MIN_REWARD)>=0 &&
      A(value).cmp("1e100")<=0;
  }catch{return false;}
}
