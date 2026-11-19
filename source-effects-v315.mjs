// 《理》源：第3回J-01〜J-25で明示確定した＋循環・最終効果。
// Numeric effects without a resolved application boundary remain recorded but inactive.
import {A} from "./numbers.mjs";
export const SOURCE_EFFECT_MILESTONES=[25,1000,10000,50000,100000,500000,1000000];
export const FINAL_EFFECTS=Object.freeze({
 SOURCE_01:{label:"収束で獲得する存在 ×2",key:"convergenceReward",implemented:true},
 SOURCE_02:{label:"収束に必要なオーブ −50%",key:"convergenceCost",implemented:true},
 SOURCE_03:{label:"タップ獲得 ×2",key:"tapGain",implemented:true},
 SOURCE_04:{label:"全源の生産 ×2",key:"globalSource",implemented:true},
 SOURCE_05:{label:"会心率 +5ポイント",key:"criticalChance",implemented:true},
 SOURCE_06:{label:"会心倍率 ×2",key:"criticalMultiplier",implemented:true},
 SOURCE_07:{label:"刹那の獲得量系効果 ×2（対象計算を確認中）",key:"setsunaGain",implemented:false},
 SOURCE_08:{label:"源・刹那の購入価格 −10%（価格下限を確認中）",key:"purchaseCost",implemented:false},
 SOURCE_09:{label:"SOURCE_09自身の生産 ×2",key:"selfSource",implemented:true},
 SOURCE_10:{label:"解放済み源特殊効果の数値 +20%（対象計算を確認中）",key:"sourceEffectResonance",implemented:false}
});
export const sourceFinalMarker=id=>"final:"+id;
export function ownsSourceFinal(state,id){
 return !!FINAL_EFFECTS[id]&&Array.isArray(state?.sources?.[id]?.effects)&&
 state.sources[id].effects.includes(sourceFinalMarker(id));
}
export function sourcePlusMultiplier(plus){
 if(!Number.isSafeInteger(plus)||plus<0||plus>1000000)throw Error("源の＋値が不正です");
 return A(1).add(A(plus).mul(.5));
}
