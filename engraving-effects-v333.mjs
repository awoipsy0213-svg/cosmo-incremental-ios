/**
 * 《理》Engraving A/B/C/D: 25 explicitly approved permanent effects.
 * The legacy 30 IDs are immutable. ENG-05/17/25 still reserve their
 * unverified source-retention targets; ENG-29/30 remain unassigned.
 * Only verified levels confer numerical bonuses (old ownership alone
 * never proves a level). No effect modifies the independent BOOST pool.
 */
import {A} from "./numbers.mjs";
import {CONFIG} from "./balance-config.mjs";

const RECORDS=[
  ["ENG-01","A","干渉増幅","1タップの獲得オーブ +2%/Lv"],
  ["ENG-02","A","源流増幅","源生産 +2%/Lv"],
  ["ENG-03","A","共鳴強化","クリティカル倍率 +1.5%/Lv"],
  ["ENG-04","A","偶発干渉","クリティカル率 +0.25ポイント/Lv"],
  ["ENG-06","A","源の調律","全源の生産 +1%/Lv"],
  ["ENG-07","A","理の節約","刹那と源の購入費 -0.3%/Lv（最大30%）"],
  ["ENG-08","B","集合共鳴","解放済み源1種類につき生産 +0.4%/Lv"],
  ["ENG-09","B","累積干渉","刹那合計Lvにつきタップ上昇（合計10,000Lvまで）"],
  ["ENG-10","B","源の連鎖","源合計Lvにつき生産上昇（合計100,000Lvまで）"],
  ["ENG-11","B","均衡の理","最低Lvの源に応じて全源を強化"],
  ["ENG-12","B","観測共鳴","手動・自動タップに源生産の0.1秒分/Lvを加算"],
  ["ENG-13","B","深層共鳴","刻印の確認済み総Lvに応じタップ・源生産上昇"],
  ["ENG-14","B","反復観測","20タップごとに通常タップ1回分/Lvを追加"],
  ["ENG-15","B","偶発増幅","オーブ獲得ごとに確率で獲得量2倍（+5ポイント/Lv、最大20%）"],
  ["ENG-16","C","存在増幅","収束で得る余剰存在 +2%/Lv"],
  ["ENG-18","C","輪廻短縮","収束報酬段階の必要累計オーブ -1%/Lv（最大25%）"],
  ["ENG-19","C","原初保持","収束前の刹那tap・源01のLvを各1Lv/Lvまで保持"],
  ["ENG-20","C","初期観測","収束後に刹那tap・源01を各1Lv/Lvで開始"],
  ["ENG-21","C","収束共鳴","収束実行回数に応じタップ・源生産 +0.2%/回/Lv"],
  ["ENG-22","D","自動干渉","ゲーム稼働中に自動タップ相当の獲得（1回/秒/Lv）"],
  ["ENG-23","D","自動成長","ゲーム稼働中、刹那を自動購入（1回/秒/Lv）"],
  ["ENG-24","D","自動収束","ON設定・指定報酬以上で自動収束。従来の60秒安全間隔を維持"],
  ["ENG-26","D","源の自律","ゲーム稼働中、源を自動購入（1回/秒/Lv）"],
  ["ENG-27","D","自律最適化","自動購入候補を原則効率優先に切替（未購入時は最安価）"],
  ["ENG-28","D","循環制御","自動収束の最低到達段階を1〜100から追加指定可能"]
];
export const ENGRAVING_EFFECTS=Object.freeze(Object.fromEntries(RECORDS.map(([id,group,name,description])=>[
  id,Object.freeze({id,group,name,description,status:"implemented"})
])));
export const ENGRAVING_EFFECT_IDS=Object.freeze(RECORDS.map(row=>row[0]));
const B=()=>CONFIG.provisional.engravingEffects;
const limited=(x,max)=>Math.max(0,Math.min(max,x));
export function engravingLevel(s,id){
  if(!s?.engraving?.owned?.includes(id))return 0;
  const n=s.engraving.levels?.[id];
  return Number.isSafeInteger(n)&&n>0?limited(n,B().maxEffectLevel):0;
}
export function engravingLevelTotal(s){
  return (s?.engraving?.owned||[]).reduce((n,id)=>n+engravingLevel(s,id),0);
}
const sumMoment=s=>Object.values(s.moment||{}).reduce((v,n)=>v+limited(Number(n)||0,1e6),0);
const sourceLevels=s=>Object.values(s.sources||{}).map(x=>limited(Number(x?.level)||0,1e6));
export function engravingTapFactor(s){
  const lv=id=>engravingLevel(s,id),b=B();
  const moment=limited(sumMoment(s),b.momentLevelCap);
  return A(1+b.tapPerLevel*lv("ENG-01"))
    .mul(1+b.momentLevelPerLevel*moment*lv("ENG-09"))
    .mul(1+b.engravingTotalPerLevel*engravingLevelTotal(s)*lv("ENG-13"))
    .mul(1+b.convergenceCountPerLevel*limited(s.convergenceCount||0,b.convergenceCountCap)*lv("ENG-21"));
}
export function engravingSourceFactor(s){
  const lv=id=>engravingLevel(s,id),b=B(),levels=sourceLevels(s);
  const count=levels.filter(n=>n>0).length;
  const sum=limited(levels.reduce((x,y)=>x+y,0),b.sourceLevelCap);
  const minimum=levels.length?limited(Math.min(...levels),b.minimumSourceLevelCap):0;
  return A(1+b.sourcePerLevel*lv("ENG-02"))
    .mul(1+b.sourceTuningPerLevel*lv("ENG-06"))
    .mul(1+b.sourceCountPerLevel*count*lv("ENG-08"))
    .mul(1+b.sourceLevelPerLevel*sum*lv("ENG-10"))
    .mul(1+b.minimumSourceLevelPerLevel*minimum*lv("ENG-11"))
    .mul(1+b.engravingTotalPerLevel*engravingLevelTotal(s)*lv("ENG-13"))
    .mul(1+b.convergenceCountPerLevel*limited(s.convergenceCount||0,b.convergenceCountCap)*lv("ENG-21"));
}
export const engravingCriticalRate=s=>B().critRatePerLevel*engravingLevel(s,"ENG-04");
export const engravingCriticalMultiplier=s=>1+B().critMultiplierPerLevel*engravingLevel(s,"ENG-03");
export const engravingPurchaseFactor=s=>Math.max(B().minimumPurchaseFactor,1-B().purchaseDiscountPerLevel*engravingLevel(s,"ENG-07"));
export const engravingTapSourceSeconds=s=>B().tapSourceSecondsPerLevel*engravingLevel(s,"ENG-12");
export const engravingRepeatTaps=s=>engravingLevel(s,"ENG-14");
export const engravingRepeatEvery=()=>B().repeatEvery;
export function engravingOrbAward(s,amount,rng=Math.random){
  const gain=A(amount);
  if(gain.cmp(0)<=0)return A(0);
  const chance=Math.min(B().extraChanceCap,B().extraChancePerLevel*engravingLevel(s,"ENG-15"));
  const p=Number(rng());
  return chance>0&&Number.isFinite(p)&&p>=0&&p<chance?gain.mul(2):gain;
}
export const engravingConvergenceCostFactor=s=>Math.max(B().minimumConvergenceFactor,1-B().convergenceDiscountPerLevel*engravingLevel(s,"ENG-18"));
export const engravingConvergenceRewardFactor=s=>1+B().convergenceRewardPerLevel*engravingLevel(s,"ENG-16");
export function engravingRetainedLevels(s,oldTap,oldSource){
  const retained=engravingLevel(s,"ENG-19"),initial=engravingLevel(s,"ENG-20");
  return {tap:Math.max(Math.min(oldTap,retained),initial),
    source:Math.max(Math.min(oldSource,retained),initial)};
}
export const engravingAutoTapRate=s=>engravingLevel(s,"ENG-22");
export const engravingAutoMomentRate=s=>engravingLevel(s,"ENG-23");
export const engravingAutoSourceRate=s=>engravingLevel(s,"ENG-26");
export const engravingAutoEfficient=s=>engravingLevel(s,"ENG-27")>0;
export const engravingConvergenceControl=s=>engravingLevel(s,"ENG-28")>0;
export const ENGRAVING_AUTO_BATCH_LIMIT=20;
export function freshEngravingRuntime(){return {autoTapCredit:0,autoMomentCredit:0,autoSourceCredit:0};}
