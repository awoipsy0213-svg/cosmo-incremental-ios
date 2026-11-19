// 《理》検証用価格シミュレーター（通常プレイの価格・セーブを書き換えない）.
// This is an advisory model, not a balance decision or complete simulation of all procs.
import * as G from "./game.mjs";
import {CONFIG} from "./balance-config.mjs";
import {CONTENT} from "./content.mjs";
import {A,formatAmount} from "./numbers.mjs";

export const PRICE_DURATIONS=[300,1800,7200];
export const PRICE_TAP_RATES=[2,5,10];
export const PRICE_PROFILES=["current","early","middle","late"];
export const PRICE_MODEL_VERSION="3.12.0-approx";
const DEFAULT_FACTORS=[0.5,1,2];
const safeClone=value=>JSON.parse(JSON.stringify(value));

export function priceSandbox(snapshot,profile="current",now=Date.now()){
 if(!PRICE_PROFILES.includes(profile))throw Error("未知の検証条件");
 // Every mutation below is local to this detached model; never reuse the live state.
 const s=profile==="current"?safeClone(snapshot):G.createState(now,"normal");
 s.intro.complete=true;s.mode="normal";s.lastWall=now;s.boost.active=false;s.boost.seconds=0;
 s.boost.upgrades=[0,0,0,0,0];s.trial={enabled:false};
 s.engraving.active=[];s.time.unlocked=false;s.universe.unlocked=false;
 s.momentRuntime=G.freshMomentRuntime();s.purchaseMode="1";
 if(profile!=="current"){
   const tier={early:0,middle:1,late:2}[profile];
   s.convergenceCount=[0,10,100][tier];
   for(let i=0;i<CONTENT.sources.length;i++){
     s.sources[CONTENT.sources[i].id].level=i<[5,15,30][tier]?[5,30,150][tier]:0;
   }
   for(let i=0;i<CONTENT.moment.length;i++)
     s.moment[CONTENT.moment[i].id]=i<[6,18,30][tier]?[1,15,100][tier]:0;
 }
 return s;
}
function earnings(snapshot,now,durationSeconds,tapsPerSecond){
 const s=safeClone(snapshot);
 // Manual tap projection excludes additional proc RNG and long manual combo chains.
 const manual=G.tapPower(s,now).mul(tapsPerSecond*durationSeconds);
 const passive=A(G.advance(s,now+durationSeconds*1000,{offline:false,rng:()=>0.5}).orbs);
 return {passive,manual,total:passive.add(manual)};
}
export function compareMomentPrice(snapshot,{momentId,profile="current",durationSeconds=300,tapsPerSecond=5,levelOverride=null,factorOverride=null,now=1800000000000}={}){
 if(!CONTENT.moment.some(x=>x.id===momentId))throw Error("刹那IDが不正");
 if(!PRICE_PROFILES.includes(profile))throw Error("検証条件が不正");
 if(!PRICE_DURATIONS.includes(durationSeconds)||!PRICE_TAP_RATES.includes(tapsPerSecond))throw Error("検証時間・タップ頻度が不正");
 if(!Number.isFinite(now)||now<0)throw Error("時刻が不正");
 if(factorOverride!==null && (!Number.isFinite(factorOverride)||factorOverride<0.01||factorOverride>1000))throw Error("追加候補倍率は0.01〜1000の数値で入力してください");
 const factors=[...new Set([...DEFAULT_FACTORS,...(factorOverride===null?[]:[factorOverride])])].sort((a,b)=>a-b);
 const s=priceSandbox(snapshot,profile,now);
 const cfg=CONFIG.provisional.moment[momentId];
 if(levelOverride!==null){
  if(!Number.isSafeInteger(levelOverride)||levelOverride<0||levelOverride>cfg.maxLevel)throw Error("検証Lvが不正");
  s.moment[momentId]=levelOverride;
 }
 const level=s.moment[momentId];
 const base={momentId,profile,durationSeconds,tapsPerSecond,level,maxed:level>=cfg.maxLevel,
  modelVersion:PRICE_MODEL_VERSION,priceStatus:"試験価格（未確定）",
  includedEffects:["基本タップ量の近似","源生産（現在の計算処理）","自動接触（現在の計算処理）"],
  excludedEffects:["手動コンボの連続再現","手動の確率抽選・奇跡","手動タップによる一時・周期強化の完全再現"],
  disclaimer:"検証値：手動は基本タップ獲得を一定頻度で換算。連撃・確率抽選・奇跡・手動発動の周期効果は未算入。源と自動獲得は現行計算エンジンで代表条件を推計。"};
 const before=earnings(s,now,durationSeconds,tapsPerSecond);
 if(base.maxed)return {...base,deltaPerSecond:"0",cost:"0",recoverSeconds:null,priceCandidates:[],before:before.total.toString(),after:before.total.toString()};
 const upgraded=safeClone(s);upgraded.moment[momentId]=level+1;
 const after=earnings(upgraded,now,durationSeconds,tapsPerSecond);
 const delta=after.total.cmp(before.total)>0?after.total.sub(before.total):A(0);
 const rate=delta.div(durationSeconds);
 const trialCost=A(cfg.baseCost).mul(A(cfg.growth).pow(level));
 const priceCandidates=factors.map(factor=>{
   const price=trialCost.mul(factor);
   const recovery=rate.cmp(0)>0?price.div(rate).toNumber():null;
   const difference=price.cmp(trialCost)>=0?price.sub(trialCost):trialCost.sub(price);
   return {factor,price:price.toString(),priceLabel:formatAmount(price),
     trialPriceDifference:difference.toString(),trialPriceDifferencePercent:(factor-1)*100,
     recoverSeconds:Number.isFinite(recovery)?recovery:null};
 });
 return {...base,before:before.total.toString(),after:after.total.toString(),
  manualBefore:before.manual.toString(),manualAfter:after.manual.toString(),
  passiveBefore:before.passive.toString(),passiveAfter:after.passive.toString(),
  delta:delta.toString(),deltaPerSecond:rate.toString(),trialCost:trialCost.toString(),
  priceCandidates,measured:rate.cmp(0)>0};
}

// Up to three independent profile estimates. The caller's state is never mutated.
export function compareMomentPriceProfiles(snapshot,{profiles=["early","middle","late"],...params}={}){
 if(!Array.isArray(profiles)||profiles.length<1||profiles.length>3||new Set(profiles).size!==profiles.length)
  throw Error("比較条件は重複なしの1〜3件を指定してください");
 return profiles.map(profile=>compareMomentPrice(snapshot,{...params,profile}));
}
// Exports only assumptions and a result snapshot, NEVER a live game save.
export function exportPriceReport(report,{createdAt=new Date().toISOString()}={}){
 const reports=Array.isArray(report)?report:[report];
 if(!reports.length||reports.length>3||reports.some(r=>!r||!CONTENT.moment.some(x=>x.id===r.momentId)))
  throw Error("有効な価格試算結果がありません");
 const out={type:"kotowari-trial-price-report",formatVersion:1,
  modelVersion:PRICE_MODEL_VERSION,createdAt,
  warning:"試験価格・近似計算です。正式な購入価格やゲームセーブには反映されません。",
  reports:reports.map(r=>({...r,priceStatus:"試験価格（未確定）"}))};
 return JSON.stringify(out,null,2);
}
