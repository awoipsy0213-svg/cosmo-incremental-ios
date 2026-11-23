/**
 * 《理》Engraving A/B/C/D: 25 explicitly approved permanent effects.
 * The legacy 30 IDs are immutable. ENG-05/17/25 still reserve their
 * unverified source-retention targets; ENG-29/30 remain unassigned.
 * Only verified levels confer numerical bonuses (old ownership alone
 * never proves a level). No effect modifies the independent BOOST pool.
 */
import {A} from "./numbers.mjs";
import {CONFIG} from "./balance-config.mjs";
import {autoPurchaseRate} from "./engraving-v342.mjs";

const RECORDS=[
  ["ENG-01","A","干渉増幅","1タップの獲得オーブ +6%/Lv"],
  ["ENG-02","A","源流増幅","全源生産 +6%/Lv"],
  ["ENG-03","A","共鳴強化","会心倍率 +30%/Lv・初回取得で会心率+2ポイント"],
  ["ENG-04","A","偶発干渉","会心率 +4ポイント/Lv"],
  ["ENG-05","D","一括解放","刹那・源の一括購入を解放（Lv1で完成）"],
  ["ENG-06","A","源の調律","源01〜06の生産 +7%/Lv"],
  ["ENG-07","A","理の節約","刹那・源の購入費 -1.8%/Lv（最大-30%）"],
  ["ENG-08","B","集合共鳴","保有源1種類につき全源 +1.5%/Lv（上限+9%/Lv）"],
  ["ENG-09","B","累積干渉","刹那合計Lv100ごとにタップ+0.6%/Lv（上限+8%/Lv）"],
  ["ENG-10","B","源の連鎖","源合計Lv100ごとに全源+0.6%/Lv（上限+8%/Lv）"],
  ["ENG-11","B","均衡の理","保有源の最低Lv1につき全源+1.2%/Lv（上限+8%/Lv）"],
  ["ENG-12","B","観測共鳴","タップに源生産の0.04×√Lv秒分を追加"],
  ["ENG-13","B","深層共鳴","刻印総Lv×0.3%×Lvでタップと源を強化（総Lv上限30）"],
  ["ENG-14","B","反復観測","20手動タップごとに通常タップ2回分/Lvを追加"],
  ["ENG-15","B","偶発増幅","オーブ獲得が2倍になる確率+4ポイント/Lv（最大64%）"],
  ["ENG-16","C","存在増幅","収束で得る余剰存在+4%/Lv"],
  ["ENG-17","D","刻印自律","刻印を自動購入・強化（初期3ゲーム秒/回）"],
  ["ENG-18","C","輪廻短縮","収束段階の必要累計オーブ-1.5%/Lv（最大25%）"],
  ["ENG-19","C","原初保持","収束前の刹那tap・源01を各刻印Lvまで保持"],
  ["ENG-20","C","初期観測","収束後に刹那tap・源01を各刻印Lvで開始"],
  ["ENG-21","C","収束共鳴","収束回数×0.6%×Lvをタップ・源に適用（上限+10%/Lv）"],
  ["ENG-22","D","自動干渉","オンラインで初期1回/秒、追加Lvごとに+0.4回/秒"],
  ["ENG-23","D","自動成長","オンラインで刹那を自動購入（初期3ゲーム秒/回）"],
  ["ENG-24","D","自動収束","自動収束を解放（現実最短60秒・Lv1完成）"],
  ["ENG-25","C","源の継承","その周回で購入した源Lvの2%/刻印Lvを次周回へ（最大10%・各100Lv）"],
  ["ENG-26","D","源の自律","オンラインで源を自動購入（初期3ゲーム秒/回）"],
  ["ENG-27","D","自律最適化","効率優先の自動購入を解放（Lv1完成）"],
  ["ENG-28","D","循環制御","自動収束の最低段階1〜100を指定（Lv1完成）"],
  ["ENG-29","C","刹那の継承","その周回で購入した刹那Lvの2%/刻印Lvを次周回へ（最大10%・各100Lv）"],
  ["ENG-30","D","周回設計","自動購入プランを最大3つ保存・適用（Lv1完成）"]
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
    .mul(1+Math.min(b.momentEffectCap,b.momentLevelPerLevel*moment)*lv("ENG-09"))
    .mul(1+b.engravingTotalPerLevel*Math.min(b.engravingTotalCap,engravingLevelTotal(s))*lv("ENG-13"))
    .mul(1+Math.min(b.convergenceCountEffectCap,b.convergenceCountPerLevel*limited(s.convergenceCount||0,b.convergenceCountCap))*lv("ENG-21"));
}
export function engravingSourceFactor(s){
  const lv=id=>engravingLevel(s,id),b=B(),levels=sourceLevels(s);
  const count=levels.filter(n=>n>0).length;
  const sum=limited(levels.reduce((x,y)=>x+y,0),b.sourceLevelCap);
  const positive=levels.filter(n=>n>0);
  const minimum=positive.length?limited(Math.min(...positive),b.minimumSourceLevelCap):0;
  return A(1+b.sourcePerLevel*lv("ENG-02"))
    .mul(1+Math.min(b.sourceCountBonusCap,b.sourceCountPerLevel*Math.min(count,b.sourceCountCap))*lv("ENG-08"))
    .mul(1+Math.min(b.sourceEffectCap,b.sourceLevelPerLevel*sum)*lv("ENG-10"))
    .mul(1+Math.min(b.minimumSourceEffectCap,b.minimumSourceLevelPerLevel*minimum)*lv("ENG-11"))
    .mul(1+b.engravingTotalPerLevel*Math.min(b.engravingTotalCap,engravingLevelTotal(s))*lv("ENG-13"))
    .mul(1+Math.min(b.convergenceCountEffectCap,b.convergenceCountPerLevel*limited(s.convergenceCount||0,b.convergenceCountCap))*lv("ENG-21"));
}
export const engravingCriticalRate=s=>B().critRatePerLevel*engravingLevel(s,"ENG-04")+(engravingLevel(s,"ENG-03")>0?B().critLevel1RateBonus:0);
export const engravingCriticalMultiplier=s=>1+B().critMultiplierPerLevel*engravingLevel(s,"ENG-03");
export const engravingPurchaseFactor=s=>Math.max(B().minimumPurchaseFactor,1-B().purchaseDiscountPerLevel*engravingLevel(s,"ENG-07"));
export const engravingSourceTuningFactor=(s,id)=>["SOURCE_01","SOURCE_02","SOURCE_03","SOURCE_04","SOURCE_05","SOURCE_06"].includes(id)?1+B().sourceTuningPerLevel*engravingLevel(s,"ENG-06"):1;
export const engravingTapSourceSeconds=s=>B().tapSourceSecondsPerLevel*Math.sqrt(engravingLevel(s,"ENG-12"));
export const engravingRepeatTaps=s=>B().repeatTapsPerLevel*engravingLevel(s,"ENG-14");
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
export const engravingAutoTapRate=s=>{const level=engravingLevel(s,"ENG-22");return level>0?1+0.4*(level-1):0;};
export const engravingAutoMomentRate=s=>autoPurchaseRate(engravingLevel(s,"ENG-23"));
export const engravingAutoSourceRate=s=>autoPurchaseRate(engravingLevel(s,"ENG-26"));
export const engravingAutoEfficient=s=>s?.engraving?.owned?.includes("ENG-27")===true;
export const engravingConvergenceControl=s=>s?.engraving?.owned?.includes("ENG-28")===true;
export const ENGRAVING_AUTO_BATCH_LIMIT=20;
export function freshEngravingRuntime(){return {autoTapCredit:0,autoMomentCredit:0,autoSourceCredit:0,autoMomentWait:0,autoSourceWait:0};}
