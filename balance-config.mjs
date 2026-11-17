// 《理》3.1.0 — 設計値と試験値を分離する。
// null = 未決定。nullを汎用倍率で埋めない。
// provisionalの値は遊べる基盤の動作確認用で、正式な採用値ではない。
export const CONFIG = {
  version: "3.1.0",
  schemaVersion: 31,
  confirmed: {
    sourceMaxLevel: 1000000,
    sourceMilestones: [25,50,100,250,500,1000,2000,3000,4000,5000,10000,20000,30000,40000,50000,100000,200000,300000,400000,500000,1000000],
    sourceEffectSlots: 7,
    maxDirections: 3,
    firstConceptFragments: 10,
    commonFragmentsPerDraw: 100,
    worldGoalSeconds: 1,
    boostCapacitySeconds: 3600,
    boostOnlineSecondsPerHour: 600,
    boostOfflineSecondsPerHour: 900,
    offlineEfficiency: 0.30,
    offlineCapSeconds: 1800
  },
  provisional: {
    // 導入は短い演出。旧試作の25段階・700個等の条件は復活させない。
    introTouches: 8,
    introFadeMs: 1100,
    tapBase: 1,
    moment: {
      tap: {baseCost:10, growth:1.5, amount:1, maxLevel:1000000},
      amplify: {baseCost:200, growth:2, multiplier:1.5, maxLevel:1000000}
    },
    source: {baseCost:100, tierScale:1.4, costGrowth:1.075, productionPerLevel:0.02},
    convergence: {baseCost:1000, costGrowth:1.1, existencePerStep:0.001, spend:"all"},
    // firstSourceは時導入と自動生産の接続を確認するための仮ルール。
    timeUnlock: "firstSource",
    universe: {startingMass:1, massGrowthPerSecond:0.0006, massPerResource:1, ageClock:"real"},
    boost: {multiplier:2, consumptionRule:"additional-time"},
    commonResidueDraw: {trigger:"manual",distribution:"uniform"},
    saveIntervalMs: 5000
  },
  unresolved: {
    sourceBreakthroughGate:null,
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
