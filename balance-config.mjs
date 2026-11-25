import {Amount,seriesCost} from "./numbers.mjs";
// 《理》3.1.0 — 設計値と試験値を分離する。
// null = 未決定。nullを汎用倍率で埋めない。
// provisionalの値は遊べる基盤の動作確認用で、正式な採用値ではない。
// DEC-20261124-010/011/012: progression direction; trial coefficients.
export const EXISTENCE_BALANCE_V351 = Object.freeze({gradeLevelRatio:10,earlyPricePower:1.5,
  momentCurve:"moment-price-v351",sourceCurve:"source-price-v351",outputCurve:"source-output-v351"});
// Small tie-break lets the previous grade reach Lv10 before the next first purchase.
// DEC-20261124-014: large-scale trial; prices are Amount strings, never Number.
// Same grade exponent anchors for both series. Preserve a small price offset
// between them except at the exact final anchor.
const GRADE_LOGS=Object.freeze([1,2.5,5,8,12,20,35,55,85,130,200,320,500,800,1300,2000,3200,5000,8000,13000,20000,32000,50000,80000,130000,200000,320000,500000,750000,1000000]);
export const EXISTENCE_BALANCE_V352=Object.freeze({gradeLevelRatio:10,gradeLogs:GRADE_LOGS,
  sourceTail:0.002,momentTail:0.02,sourceWaitSeconds:90,sourceWaitStep:12,
  momentWaitSeconds:150,momentWaitStep:18,referenceTaps:5});
const gradeLog=(first,index)=>GRADE_LOGS[index]+(index===29?0:Math.log10(first/10));
const gradeBase=(first,index)=>Amount.fromLog10(gradeLog(first,index)).toString();
const gradeGrowth=(first,index,kind)=>{
  const here=gradeLog(first,index);
  const next=index<29?gradeLog(first,index+1):here+250000;
  const next2=index<28?gradeLog(first,index+2):next+250000;
  const tail=first===10?EXISTENCE_BALANCE_V352.momentTail:EXISTENCE_BALANCE_V352.sourceTail;
  // At Lv10 and Lv100 the lower grade's purchase price stays just below the
  // corresponding next tier; no artificial ownership gate.
  return `grade-${kind}-v352:${next-here-0.000001}:${next2-next}:${tail}`;
};
const gradeYield=(first,index)=>{
  const b=EXISTENCE_BALANCE_V352;
  const wait=first===10?(b.momentWaitSeconds+b.momentWaitStep*index)*b.referenceTaps:
    b.sourceWaitSeconds+b.sourceWaitStep*index;
  return seriesCost(gradeBase(first,index),gradeGrowth(first,index,"price"),1,1).div(wait).toString();
};
export const CONFIG = {
  version: "3.30.1",
  schemaVersion: 31,
  confirmed: {
    sourceMaxLevel: 1000000,
    sourceMilestones: [25,50,100,250,500,1000,2000,3000,4000,5000,10000,20000,30000,40000,50000,100000,200000,300000,400000,500000,1000000],
    sourceEffectSlots: 7,
    sourceEffectUnlockLevels: [25,1000,10000,50000,100000,500000,1000000],
    sourceBreakthroughGate: "individual-max",
    sourcePlusProductionStep: 0.5,
    maxDirections: 3,
    resourceReceipt: "B",
    sourceOfTruth: "2026-11-19 unified decisions; runtime implementation subset",
    conceptMaxLevel: 100,
    conceptNextLevelCostStep: 10,
    firstConceptFragments: 10,
    commonFragmentsPerDraw: 100,
    worldGoalSeconds: 1,
    boostCapacitySeconds: 3600,
    // BOOST-Q121/Q217: online awards are obsolete. Keep past saves, never generate more.
    boostOnlineSecondsPerHour: 0,
    // Independent 15 minutes of BOOST per real offline hour (not online-rate x1.5).
    boostOfflineSecondsPerHour: 900,
    // Historical BASE stage-offline efficiency/cap values, not applied after BOOST-CORE-001.
    offlineEfficiency: 0.30,
    offlineCapSeconds: 1800
  },
  provisional: {
    // 導入は短い演出。旧試作の25段階・700個等の条件は復活させない。
    introTouches: 8,
    introFadeMs: 1100,
    tapBase: 1,
    moment: {
      // All 30 prices follow authored grade order. Approved effect rules and IDs stay intact.
      tap: {baseCost:gradeBase(10,0), growth:gradeGrowth(10,0,"price"), gainBase:gradeYield(10,0), gainCurve:gradeGrowth(10,0,"output"), amount:1, maxLevel:1000000},
      tap2: {baseCost:gradeBase(10,1), growth:gradeGrowth(10,1,"price"), gainBase:gradeYield(10,1), gainCurve:gradeGrowth(10,1,"output"), amount:3, maxLevel:1000000},
      tap3: {baseCost:gradeBase(10,2), growth:gradeGrowth(10,2,"price"), gainBase:gradeYield(10,2), gainCurve:gradeGrowth(10,2,"output"), amount:9, maxLevel:1000000},
      tap4: {baseCost:gradeBase(10,3), growth:gradeGrowth(10,3,"price"), gainBase:gradeYield(10,3), gainCurve:gradeGrowth(10,3,"output"), amount:27, maxLevel:1000000},
      tap5: {baseCost:gradeBase(10,4), growth:gradeGrowth(10,4,"price"), gainBase:gradeYield(10,4), gainCurve:gradeGrowth(10,4,"output"), amount:81, maxLevel:1000000},
      amplify: {baseCost:gradeBase(10,5), growth:gradeGrowth(10,5,"price"), gainBase:gradeYield(10,5), gainCurve:gradeGrowth(10,5,"output"), multiplier:1.5, maxLevel:1000000},
      setsuna07: {baseCost:gradeBase(10,6), growth:gradeGrowth(10,6,"price"), gainBase:gradeYield(10,6), gainCurve:gradeGrowth(10,6,"output"), maxLevel:1000000},
      setsuna08: {baseCost:gradeBase(10,7), growth:gradeGrowth(10,7,"price"), gainBase:gradeYield(10,7), gainCurve:gradeGrowth(10,7,"output"), maxLevel:1000000},
      setsuna09: {baseCost:gradeBase(10,8), growth:gradeGrowth(10,8,"price"), gainBase:gradeYield(10,8), gainCurve:gradeGrowth(10,8,"output"), maxLevel:1000000},
      setsuna10: {baseCost:gradeBase(10,9), growth:gradeGrowth(10,9,"price"), gainBase:gradeYield(10,9), gainCurve:gradeGrowth(10,9,"output"), maxLevel:1000000},
      setsuna11: {baseCost:gradeBase(10,10), growth:gradeGrowth(10,10,"price"), gainBase:gradeYield(10,10), gainCurve:gradeGrowth(10,10,"output"), maxLevel:1000000},
      setsuna12: {baseCost:gradeBase(10,11), growth:gradeGrowth(10,11,"price"), gainBase:gradeYield(10,11), gainCurve:gradeGrowth(10,11,"output"), maxLevel:1000000},
      setsuna13: {baseCost:gradeBase(10,12), growth:gradeGrowth(10,12,"price"), gainBase:gradeYield(10,12), gainCurve:gradeGrowth(10,12,"output"), maxLevel:1000000},
      setsuna14: {baseCost:gradeBase(10,13), growth:gradeGrowth(10,13,"price"), gainBase:gradeYield(10,13), gainCurve:gradeGrowth(10,13,"output"), maxLevel:1000000},
      setsuna15: {baseCost:gradeBase(10,14), growth:gradeGrowth(10,14,"price"), gainBase:gradeYield(10,14), gainCurve:gradeGrowth(10,14,"output"), maxLevel:1000000},
      setsuna16: {baseCost:gradeBase(10,15), growth:gradeGrowth(10,15,"price"), gainBase:gradeYield(10,15), gainCurve:gradeGrowth(10,15,"output"), maxLevel:1000000},
      setsuna17: {baseCost:gradeBase(10,16), growth:gradeGrowth(10,16,"price"), gainBase:gradeYield(10,16), gainCurve:gradeGrowth(10,16,"output"), maxLevel:1000000},
      setsuna18: {baseCost:gradeBase(10,17), growth:gradeGrowth(10,17,"price"), gainBase:gradeYield(10,17), gainCurve:gradeGrowth(10,17,"output"), maxLevel:1000000},
      setsuna19: {baseCost:gradeBase(10,18), growth:gradeGrowth(10,18,"price"), gainBase:gradeYield(10,18), gainCurve:gradeGrowth(10,18,"output"), maxLevel:1000000},
      setsuna20: {baseCost:gradeBase(10,19), growth:gradeGrowth(10,19,"price"), gainBase:gradeYield(10,19), gainCurve:gradeGrowth(10,19,"output"), maxLevel:1000000},
      setsuna21: {baseCost:gradeBase(10,20), growth:gradeGrowth(10,20,"price"), gainBase:gradeYield(10,20), gainCurve:gradeGrowth(10,20,"output"), maxLevel:1000000},
      setsuna22: {baseCost:gradeBase(10,21), growth:gradeGrowth(10,21,"price"), gainBase:gradeYield(10,21), gainCurve:gradeGrowth(10,21,"output"), maxLevel:1000000},
      setsuna23: {baseCost:gradeBase(10,22), growth:gradeGrowth(10,22,"price"), gainBase:gradeYield(10,22), gainCurve:gradeGrowth(10,22,"output"), maxLevel:1000000},
      setsuna24: {baseCost:gradeBase(10,23), growth:gradeGrowth(10,23,"price"), gainBase:gradeYield(10,23), gainCurve:gradeGrowth(10,23,"output"), maxLevel:1000000},
      setsuna25: {baseCost:gradeBase(10,24), growth:gradeGrowth(10,24,"price"), gainBase:gradeYield(10,24), gainCurve:gradeGrowth(10,24,"output"), maxLevel:1000000},
      setsuna26: {baseCost:gradeBase(10,25), growth:gradeGrowth(10,25,"price"), gainBase:gradeYield(10,25), gainCurve:gradeGrowth(10,25,"output"), maxLevel:1000000},
      setsuna27: {baseCost:gradeBase(10,26), growth:gradeGrowth(10,26,"price"), gainBase:gradeYield(10,26), gainCurve:gradeGrowth(10,26,"output"), maxLevel:1000000},
      setsuna28: {baseCost:gradeBase(10,27), growth:gradeGrowth(10,27,"price"), gainBase:gradeYield(10,27), gainCurve:gradeGrowth(10,27,"output"), maxLevel:1000000},
      setsuna29: {baseCost:gradeBase(10,28), growth:gradeGrowth(10,28,"price"), gainBase:gradeYield(10,28), gainCurve:gradeGrowth(10,28,"output"), maxLevel:1000000},
      setsuna30: {baseCost:gradeBase(10,29), growth:gradeGrowth(10,29,"price"), gainBase:gradeYield(10,29), gainCurve:gradeGrowth(10,29,"output"), maxLevel:1000000}
    },
    // NEXT targets trial landmarks; these are not final game design milestones.
    momentMilestones: [10,25,50,100,250,500,1000,2500,5000,10000,25000,50000,100000,250000,500000,1000000],
    // V3.52 trial: independent grade-wise cost and cumulative source gains.
    // The scalar aliases describe SOURCE_01 for older test/lab callers.
    source: {
      costGrowth:gradeGrowth(15,0,"price"),
      productionGrowth:gradeGrowth(15,0,"output"),
      costCurves:Array.from({length:30},(_,i)=>gradeGrowth(15,i,"price")),
      outputCurves:Array.from({length:30},(_,i)=>gradeGrowth(15,i,"output")),
      baseCosts:Array.from({length:30},(_,i)=>gradeBase(15,i)),
      perSecondPerLevel:Array.from({length:30},(_,i)=>i===0?"0.5":gradeYield(15,i))
    },
    ui: {refreshMs:150, holdStartMs:480, holdRepeatMs:180},
    convergence: {baseCost:1000000, costGrowth:1.2, existencePerStep:0.001, spend:"all"},
    // 2026-11-22 user-approved A-D engraving effect provisional balance.
    // Keep in one place for retuning; not an independent BOOST multiplier.
    engravingEffects:{
      maxEffectLevel:16,
      tapPerLevel:0.06,sourcePerLevel:0.06,
      critMultiplierPerLevel:0.30,critRatePerLevel:0.04,
      critLevel1RateBonus:0.02,
      sourceTuningPerLevel:0.07,purchaseDiscountPerLevel:0.018,
      minimumPurchaseFactor:0.7,sourceCountPerLevel:0.015,
      sourceCountCap:6,sourceCountBonusCap:0.09,
      momentLevelCap:10000,momentLevelPerLevel:0.00006,momentEffectCap:0.08,
      sourceLevelCap:100000,sourceLevelPerLevel:0.00006,sourceEffectCap:0.08,
      minimumSourceLevelCap:10000,minimumSourceLevelPerLevel:0.012,minimumSourceEffectCap:0.08,
      engravingTotalPerLevel:0.003,engravingTotalCap:30,convergenceCountCap:50,
      convergenceCountPerLevel:0.006,convergenceCountEffectCap:0.10,tapSourceSecondsPerLevel:0.04,
      repeatEvery:20,repeatTapsPerLevel:2,
      extraChancePerLevel:0.04,extraChanceCap:0.64,
      convergenceRewardPerLevel:0.04,convergenceDiscountPerLevel:0.015,
      minimumConvergenceFactor:0.75
    },
    // firstSourceは時導入と自動生産の接続を確認するための仮ルール。
    timeUnlock: "runEarned",
    timeUnlockRunOrbs: "1000000",
    universe: {startingMass:10, massGrowthPerSecond:1/60, massPerResource:1, ageClock:"real"},
    boost: {multiplier:2, consumptionRule:"additional-time"},
    // Explicit balance-test values, not canonical specification.
    boostTrial: {limits:[10,10,12,3,16],baseCosts:[300,600,1200,900,900],growth:1.3,
      baseGainStep:0.1,offlineGainStep:0.1,capacityStepSeconds:1800,
      timeMultipliers:[2,3,5,10],efficiencyStep:0.05,maxReduction:0.8},
    commonResidueDraw: {trigger:"manual",distribution:"uniform"},
    saveIntervalMs: 5000
  },
  unresolved: {
    sourceEffectAssignment:null,
    residueEventsPerSecond:null,
    miracleUnlockRules:null,
    timeToWorldSeconds:null,
    conceptLevel2Cost:null,
    conceptFromUnrevealedDirection:null,
    resourceReceipt:null,
    resourceInterval:null,
    resourceRankConditions:null,
    pressureUnit:null,
    activityUnit:null,
    destructionRelation:null,
    collapseHazard:null,
    retentionTargets:null,
    statObservationConditions:null,
    coreFormation:null,
    lifeUnlock:null,
    engravingNodes:null,
    reforgeResetTimezone:null,
    boostUpgradePrices:null
  },
  // 検証セーブ専用。通常セーブからは呼び出せない。
  lab: {
    residueEventsPerSecond:0.25,
    worldSecondsPerSecond:0.0001,
    resourceInterval:5,
    collapseHazardPerSecond:1/7200,
    pressureUnit:10,
    engravingCost:0.001,
    autoIntervalSeconds:1,
    autoConvergeOrbs:100000,
    boostUpgradeBaseCost:300
  }
};
