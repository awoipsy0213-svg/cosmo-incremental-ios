// 《理》3.1.0 — 設計値と試験値を分離する。
// null = 未決定。nullを汎用倍率で埋めない。
// provisionalの値は遊べる基盤の動作確認用で、正式な採用値ではない。
export const CONFIG = {
  version: "3.8.0",
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
      // Six independent upgrades in the Setsuna tab (five direct tap lines + legacy amplifier).
      // +1, +3, +9, +27, +81 each time the respective tier is purchased.
      tap: {baseCost:10, growth:1.42, amount:1, maxLevel:1000000},
      tap2: {baseCost:75, growth:1.50, amount:3, maxLevel:1000000},
      tap3: {baseCost:450, growth:1.58, amount:9, maxLevel:1000000},
      tap4: {baseCost:2700, growth:1.66, amount:27, maxLevel:1000000},
      tap5: {baseCost:16200, growth:1.74, amount:81, maxLevel:1000000},
      amplify: {baseCost:200, growth:2, multiplier:1.5, maxLevel:1000000},
      setsuna07: {baseCost:"14753.57142857143", growth:1.75, maxLevel:1000000},
      setsuna08: {baseCost:"72321.42857142858", growth:1.75, maxLevel:1000000},
      setsuna09: {baseCost:"354375.00000000006", growth:1.75, maxLevel:1000000},
      setsuna10: {baseCost:"1735714.2857142857", growth:1.75, maxLevel:1000000},
      setsuna11: {baseCost:"11896875.000000002", growth:1.75, maxLevel:1000000},
      setsuna12: {baseCost:"81506250.00000001", growth:1.75, maxLevel:1000000},
      setsuna13: {baseCost:"558140625", growth:1.75, maxLevel:1000000},
      setsuna14: {baseCost:"3820162500", growth:1.75, maxLevel:1000000},
      setsuna15: {baseCost:"26133384375", growth:1.75, maxLevel:1000000},
      setsuna16: {baseCost:"178679418750.00003", growth:1.75, maxLevel:1000000},
      setsuna17: {baseCost:"1220976028125", growth:1.75, maxLevel:1000000},
      setsuna18: {baseCost:"8338372875000", growth:1.75, maxLevel:1000000},
      setsuna19: {baseCost:"56909394871875", growth:1.75, maxLevel:1000000},
      setsuna20: {baseCost:"388151257331250.06", growth:1.75, maxLevel:1000000},
      setsuna21: {baseCost:"3779367505593750", growth:1.75, maxLevel:1000000},
      setsuna22: {baseCost:"36772224378750010", growth:1.75, maxLevel:1000000},
      setsuna23: {baseCost:"357507737015625000", growth:1.75, maxLevel:1000000},
      setsuna24: {baseCost:"3472932302437500000", growth:1.75, maxLevel:1000000},
      setsuna25: {baseCost:"33707872347187500000", growth:1.75, maxLevel:1000000},
      setsuna26: {baseCost:"326864216700000000000", growth:1.75, maxLevel:1000000},
      setsuna27: {baseCost:"3.16649709928125e+21", growth:1.75, maxLevel:1000000},
      setsuna28: {baseCost:"3.0643520315625e+22", growth:1.75, maxLevel:1000000},
      setsuna29: {baseCost:"2.96220696384375e+23", growth:1.75, maxLevel:1000000},
      setsuna30: {baseCost:"2.8600618961249997e+24", growth:1.75, maxLevel:1000000}
    },
    // NEXT targets trial landmarks; these are not final game design milestones.
    momentMilestones: [10,25,50,100,250,500,1000,2500,5000,10000,25000,50000,100000,250000,500000,1000000],
    // 3.6 PLAYTEST: per-level production increases across all 30 sources.
    // Production and base costs are independent arrays indexed SOURCE_01..SOURCE_30.
    // Each level adds a fixed /second amount; the nth next purchase costs
    // baseCosts[index] * (costGrowth ** currentLevel). All numbers are provisional.
    // Source01..06: player-suggested 0.1,0.5,1,5,25,100/sec; after 06, x4 per tier.
    // Base cost aims for 240-300s simple payback at level 0; NOT the unlock wait.
    // 1.35 is steep; higher milestones need future stage synergies (unresolved).
    source: {
      costGrowth: 1.35,
      // Per-level output also grows exponentially; old v3.6 source base rates stay intact.
      // Next Lv output = baseRate * 1.30^(current Level). Trial value, not a fixed design decision.
      productionGrowth: 1.30,
      perSecondPerLevel: [
      "0.1", "0.5", "1", "5", "25", "100",
      "400", "1600", "6400", "25600", "102400", "409600",
      "1638400", "6553600", "26214400", "104857600", "419430400", "1677721600",
      "6710886400", "26843545600", "107374182400", "429496729600", "1717986918400", "6871947673600",
      "27487790694400", "109951162777600", "439804651110400", "1759218604441600", "7036874417766400", "28147497671065600"
    ],
      baseCosts: [
      "30", "120", "300", "1500", "7500", "30000",
      "120000", "480000", "1920000", "7680000", "30720000", "122880000",
      "491520000", "1966080000", "7864320000", "31457280000", "125829120000", "503316480000",
      "2013265920000", "8053063680000", "32212254720000", "128849018880000", "515396075520000", "2061584302080000",
      "8246337208320000", "32985348833280000", "131941395333120000", "527765581332480000", "2111062325329920000", "8444249301319680000"
    ]
    },
    ui: {refreshMs:150, holdStartMs:480, holdRepeatMs:180},
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
