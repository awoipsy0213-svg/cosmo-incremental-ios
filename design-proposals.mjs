/**
 * 《理》3.5 — RESEARCH / PLAYTEST CANDIDATES, NOT APPROVED DESIGN.
 * Never mutate CONTENT.*.effects / confirmed / unresolved from this file.
 * Only the isolated lab save may execute a candidate effect.
 */
export const PROPOSAL_STATUS = "暫定・未採用";

// Example economic curve. Numbers are *our playtest proposals*, never attributed
// to any reference game or to the user's final specification.
export const PROPOSED = Object.freeze({
  phase: "trial-v35",
  boost: {initialCostSeconds:240, nextCostGrowth:1.22, limits:[14,20,20,20,15],
    offlineEfficiencyStep:.04, maxOfflineEfficiency:.86,
    offlineCapStepSeconds:600,maxOfflineCapSeconds:21600,
    basicGainRateStep:.12, offlineGainMultiplierStep:.1,
    capacityStepSeconds:1200,maxCapacitySeconds:21600},
  universe: {
    // All resources already give +1 mass. These are additional lab-only
    // specializations, not replacements for that rule.
    specializeByRank:[.18,.3,.45,.65,.9,1.2],
    passive: {gravityRatePerPoint:.005,gravityMaxExtra:1,activityUnit:10,activityFactor:1.01,activityMaxFactor:2},
    draw: {densityPer10:.02,densityMaxExtra:.4,temperaturePer10:.01,temperatureMaxExtra:.3},
    // Candidate formula previews for features not yet in the engine.
    observation:{energyPer10:.05,maxExtra:.5},
    collision:{accelerationPer10:.03,maxExtra:.6},
    radiation:{per10:.01,maxExtra:.3},
    magnetic:{resistancePer10:.01,maxReduction:.3},
    purity:{thresholdReductionPer10:.01,maxReduction:.15},
    // These intentionally do not settle the resource receipt A/B question.
    receiptMode:"undecided"
  },
  sourceSlots: [25,100,1000,10000,50000,300000,1000000],
  // The 1%-...-50% historical values are guidance, not final data.
  sourcePrototypeSteps: [.01,.025,.04,.07,.11,.18],
  conceptTrial: {firstCost:10, candidateImpactRange:[.0001,.004]},
  sourceLifetimeGoal: {firstPurchasePaybackSeconds:[120,360], latePurchasePaybackSeconds:[300,3600]}
});

export const PLANET_EFFECT_PROPOSALS = Object.freeze([
  {id:"density",name:"密度",summary:"解放済みR2資源の出現重みを上げる",formula:"10ごとに+2%、上限+40%",function:"eligible-r2-weight",status:"検証で適用可能",risk:"R2の解放条件そのものは変更しない"},
  {id:"temperature",name:"温度",summary:"熱に関連する特性の資源の重みを上げる",formula:"10ごとに+1%、上限+30%",function:"thermal-resource-weight",status:"検証で適用可能",risk:"温度が高ければ必ず有利とは確定していない"},
  {id:"energy",name:"エネルギー",summary:"惑星の観測イベントを発見しやすくする",formula:"10ごとに+5%、上限+50%",function:"observation-events",status:"計算プレビューのみ",risk:"観測判定・解放条件が未確定"},
  {id:"gravity",name:"重力",summary:"自発的な集積を増やし自然な質量成長へ寄与",formula:"1ごとに自然成長+0.5%、上限+100%",function:"mass-growth",status:"検証で適用可能",risk:"質量と同じ値・同じ役割にはしない"},
  {id:"acceleration",name:"加速度",summary:"複数惑星間の遭遇イベントの頻度へ作用",formula:"10ごとに+3%、上限+60%",function:"encounter-events",status:"計算プレビューのみ",risk:"衝突・遭遇イベントのルールが未確定"},
  {id:"radiation",name:"放射",summary:"放出・異常現象の観測抽選の重みへ作用",formula:"10ごとに+1%、上限+30%",function:"radiation-events",status:"計算プレビューのみ",risk:"宇宙イベント・報酬体系が未確定"},
  {id:"magnetism",name:"磁場",summary:"外的な不安定現象を減らす候補",formula:"10ごとに危険抽選-1%、上限-30%",function:"external-risk",status:"計算プレビューのみ",risk:"安定・硬度との重複を要調整"}
]);

// R1: one unique prototype axis per material (the final R1 is mass-only with
// a slightly larger common mass increment). Higher ranks are cycled as
// provisional *experiment profiles* and are not an approved effects table.
export const RESOURCE_AXES = Object.freeze([
  "density","pressure","stability","temperature","activity",
  "energy","gravity","acceleration","radiation","magnetism",
  "hardness","purity","diversity","mass","dual"
]);
const statNames={mass:"質量",density:"密度",pressure:"圧力",stability:"安定",temperature:"温度",activity:"活性",energy:"エネルギー",gravity:"重力",acceleration:"加速度",radiation:"放射",magnetism:"磁場",hardness:"硬度",purity:"純度",diversity:"多様性",dual:"熱とエネルギー"};
export function resourcePrototype(resource){
  if(!resource || !Number.isInteger(resource.rank)||resource.rank<1||resource.rank>6)return null;
  const num=Number(resource.id.match(/_(\d+)$/)?.[1]);
  if(!Number.isInteger(num) || num<=0)return null;
  const index=resource.rank===1?num-1:(num+resource.rank*3-1)%RESOURCE_AXES.length;
  const key=RESOURCE_AXES[index];
  const stat=key==="dual"?"energy":key,stat2=key==="dual"?"temperature":null;
  const perUnit=PROPOSED.universe.specializeByRank[resource.rank-1];
  return {stat,stat2,statName:statNames[key],perUnit,rank:resource.rank,
    description:stat2?`質量+1・エネルギー+${perUnit}・温度+${perUnit/2} / 個（検証案）`:`共通の質量+1に加え、${statNames[stat]}+${perUnit} / 個（検証案）`};
}
const val=n=>Math.max(0,Number.isFinite(n)?n:(n===Infinity?1e9:0));
const bounded=(x,max)=>Math.min(max,val(x));
export function naturalGrowthFactors(stats={}) {
  const g=PROPOSED.universe.passive;
  const gravity=val(Number(stats.gravity||0));
  const activity=val(Number(stats.activity||0));
  return {gravity:1+bounded(gravity*g.gravityRatePerPoint,g.gravityMaxExtra),
    activity:Math.min(g.activityMaxFactor,Math.pow(g.activityFactor,Math.floor(activity/g.activityUnit)))};
}
export function trialResourceWeights(resources,stats={}) {
  // Only eligible rank IDs are passed in. No hidden pity or synthesis.
  const c=PROPOSED.universe.draw,density=val(Number(stats.density||0)),temp=val(Number(stats.temperature||0));
  return resources.map(r=>{
    const profile=resourcePrototype(r);
    let factor=1;
    if(r.rank===2)factor*=1+bounded(Math.floor(density/10)*c.densityPer10,c.densityMaxExtra);
    if(profile?.stat==="temperature")factor*=1+bounded(Math.floor(temp/10)*c.temperaturePer10,c.temperatureMaxExtra);
    return factor;
  });
}
export function trialPreview(statId,value){
  const v=val(value),c=PROPOSED.universe;
  switch(statId){
    case "density": return 1+bounded(Math.floor(v/10)*c.draw.densityPer10,c.draw.densityMaxExtra);
    case "temperature":return 1+bounded(Math.floor(v/10)*c.draw.temperaturePer10,c.draw.temperatureMaxExtra);
    case "energy":return 1+bounded(Math.floor(v/10)*c.observation.energyPer10,c.observation.maxExtra);
    case "gravity":return naturalGrowthFactors({gravity:v}).gravity;
    case "acceleration":return 1+bounded(Math.floor(v/10)*c.collision.accelerationPer10,c.collision.maxExtra);
    case "radiation":return 1+bounded(Math.floor(v/10)*c.radiation.per10,c.radiation.maxExtra);
    case "magnetism":return 1-bounded(Math.floor(v/10)*c.magnetic.resistancePer10,c.magnetic.maxReduction);
    case "activity":return naturalGrowthFactors({activity:v}).activity;
    case "purity":return 1-bounded(Math.floor(v/10)*c.purity.thresholdReductionPer10,c.purity.maxReduction);
    default:return null;
  }
}
export function boostTrialCost(level) {
  const n=Math.max(0,Math.min(25,Math.floor(val(level))));
  return Math.ceil(PROPOSED.boost.initialCostSeconds * Math.pow(PROPOSED.boost.nextCostGrowth,n));
}

// Original source themes are preserved; this is not a definitive effects
// assignment. One choice across all 30 sources is NOT forced into a formula.
export function proposedSourceSlots(source){
  const desc=source?.role||"役割は要確認";
  const values=PROPOSED.sourcePrototypeSteps;
  return PROPOSED.sourceSlots.map((level,i)=>({
    level,kind:i===6?"固有最終候補":"通常効果候補",
    description:i===6?(source?.finalDescription||"最終効果 ？？？"):`${desc}に関係する補正の候補 +${(values[i]*100).toFixed(1)}%`,
    status:"暫定・未適用"
  }));
}

// First 12 concept prototypes are *ideas for designer comparison* only.
// The remaining 65 concepts retain no effects. Nothing below changes
// CONTENT.concepts or reveals an undiscovered concept during normal play.
export const FIRST_CONCEPT_PROPOSALS = Object.freeze([
  {name:"衝突",idea:"接触・衝突現象の発見重み",trial:"+2% / 概念Lv、上限+20%",risk:"惑星の崩壊確率とは区別"},
  {name:"移動",idea:"宇宙内の移動・遭遇現象の発見重み",trial:"+1.5% / Lv、上限+15%",risk:"移動そのものの操作は未決定"},
  {name:"座標",idea:"惑星の未知パラメータの観測の精度",trial:"観測必要条件−1% / Lv、上限−10%",risk:"観測条件の正式仕様は未決定"},
  {name:"周囲",idea:"近接する複数惑星の事象を知る範囲",trial:"観測範囲+1段階 / 5Lv、上限+2",risk:"複数惑星の正式進行が必要"},
  {name:"進化",idea:"一度認識した現象の上位発見につなげる",trial:"発見重み+2% / Lv、上限+20%",risk:"《生命》の進化とは別"},
  {name:"退化",idea:"崩壊後の再形成で古い手がかりを残す",trial:"記録保持+1要素 / 5Lv、上限+3",risk:"安定による実際の残留とは別"},
  {name:"事象",idea:"未知現象の観測イベント自体の出現頻度",trial:"+1% / Lv、上限+10%",risk:"抽選を増やしても確定発見にはしない"},
  {name:"結果",idea:"観測記録から得られる統計の粒度",trial:"履歴の統計分類+1 / 5Lv、上限+3",risk:"新通貨や無条件報酬を増やさない"},
  {name:"法則",idea:"既知の抽選傾向を把握する精度",trial:"出現率の表示精度が1桁ずつ向上",risk:"未知の資源名を先に開示しない"},
  {name:"均衡",idea:"偏った育成で生じた極端な強弱を緩和",trial:"最大偏重10%まで緩和（試案）",risk:"多様性や隠れ救済と競合しないよう要検討"},
  {name:"希望",idea:"珍しい事象の存在を匂わせる観測の頻度",trial:"+1% / Lv、上限+10%",risk:"未発見救済の隠し補正にしない"},
  {name:"混沌",idea:"予測できない現象の多彩さを増す",trial:"抽選幅+2% / Lv、上限+20%",risk:"特定の育成方向を無効にしない"}
]);
