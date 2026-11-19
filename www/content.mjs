// Historical handoff content; v3.16 confirmed rules are attached below.
// Display names may be provisional and are never used as save identifiers.
import {TIME_EFFECTS} from "./time-confirmed-v4.mjs";
import {UNIVERSE_RESOURCE_RULES} from "./universe-confirmed-v4.mjs";
export const CONTENT = {
  "title": "理",
  "version": "3.16.0",
  "reference": "kotowari_handoff_full(1).txt",
  "referenceSha256": "7069b8aa311655b21f84e5af8fd134b716f69bd2baaced838e09606940f241d2",
  "stages": [
    {
      "id": "existence",
      "name": "存在",
      "number": 1,
      "children": [
        "moment",
        "sources",
        "engraving"
      ]
    },
    {
      "id": "time",
      "name": "時",
      "number": 2,
      "children": [
        "flow",
        "concepts"
      ]
    },
    {
      "id": "universe",
      "name": "宇宙",
      "number": 3,
      "children": [
        "planets",
        "resources",
        "observations"
      ]
    },
    {
      "id": "life",
      "name": "生命",
      "number": 4,
      "children": [
        "life"
      ]
    }
  ],
  "principles": [
    "流動",
    "空間",
    "変化",
    "因果",
    "秩序",
    "可能性"
  ],
  "sources": [
    {
      "id": "SOURCE_01",
      "name": "エルネ",
      "nameStatus": "暫定",
      "role": "収束報酬／生産",
      "finalDescription": "収束で得る存在×2。ユーザーが最初に挙げた最終能力。",
      "status": "方向確定",
      "effects": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      "effectUnlockLevels": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ]
    },
    {
      "id": "SOURCE_02",
      "name": "フィルカ",
      "nameStatus": "暫定",
      "role": "収束条件／コスト",
      "finalDescription": "収束必要量−50%。ユーザーが最初に挙げた最終能力。",
      "status": "方向確定",
      "effects": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      "effectUnlockLevels": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ]
    },
    {
      "id": "SOURCE_03",
      "name": "ヴェイラ",
      "nameStatus": "暫定",
      "role": "タップ／クリティカル",
      "finalDescription": "タップ効率×2という最新の配置案。初期のCrit倍率案とは別で、最終数値は暫定。",
      "status": "暫定",
      "effects": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      "effectUnlockLevels": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ]
    },
    {
      "id": "SOURCE_04",
      "name": "セルカ",
      "nameStatus": "暫定",
      "role": "全源生産／個別源",
      "finalDescription": "全《源》生産×2の案。",
      "status": "暫定",
      "effects": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      "effectUnlockLevels": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ]
    },
    {
      "id": "SOURCE_05",
      "name": "ノエル",
      "nameStatus": "暫定",
      "role": "クリティカル率／タップ",
      "finalDescription": "Crit率を強化する案。具体式は未決定。",
      "status": "暫定",
      "effects": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      "effectUnlockLevels": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ]
    },
    {
      "id": "SOURCE_06",
      "name": "リエナ",
      "nameStatus": "暫定",
      "role": "クリティカル倍率／タップ",
      "finalDescription": "Crit倍率×2の案。",
      "status": "暫定",
      "effects": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      "effectUnlockLevels": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ]
    },
    {
      "id": "SOURCE_07",
      "name": "アルヴ",
      "nameStatus": "暫定",
      "role": "《刹那》／生産",
      "finalDescription": "《刹那》効果×2の案。対象範囲は未決定。",
      "status": "暫定",
      "effects": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      "effectUnlockLevels": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ]
    },
    {
      "id": "SOURCE_08",
      "name": "ミレア",
      "nameStatus": "暫定",
      "role": "コスト軽減／刹那",
      "finalDescription": "通常強化コストを軽減する案。対象・軽減率は未決定。",
      "status": "暫定",
      "effects": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      "effectUnlockLevels": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ]
    },
    {
      "id": "SOURCE_09",
      "name": "セフィ",
      "nameStatus": "暫定",
      "role": "自身の生産／源Lv",
      "finalDescription": "自身の生産を強化する案。",
      "status": "暫定",
      "effects": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      "effectUnlockLevels": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ]
    },
    {
      "id": "SOURCE_10",
      "name": "オルネ",
      "nameStatus": "暫定",
      "role": "マイルストーン／全源",
      "finalDescription": "源の節目による生産効果を強化する案。",
      "status": "暫定",
      "effects": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      "effectUnlockLevels": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ]
    },
    {
      "id": "SOURCE_11",
      "name": "レイナ",
      "nameStatus": "暫定",
      "role": "源Lv／全源",
      "finalDescription": "Lv由来の生産補正を強化する案。",
      "status": "暫定",
      "effects": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      "effectUnlockLevels": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ]
    },
    {
      "id": "SOURCE_12",
      "name": "ファル",
      "nameStatus": "暫定",
      "role": "源の種類数／全源",
      "finalDescription": "解放済みの源数を参照して生産を強化する案。",
      "status": "暫定",
      "effects": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      "effectUnlockLevels": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ]
    },
    {
      "id": "SOURCE_13",
      "name": "ティル",
      "nameStatus": "暫定",
      "role": "高Lv／生産",
      "finalDescription": "高レベルほど生産へ追加補正する案。",
      "status": "暫定",
      "effects": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      "effectUnlockLevels": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ]
    },
    {
      "id": "SOURCE_14",
      "name": "ネイラ",
      "nameStatus": "暫定",
      "role": "前半の源／相互強化",
      "finalDescription": "SOURCE_01～10の生産を強化する案。",
      "status": "暫定",
      "effects": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      "effectUnlockLevels": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ]
    },
    {
      "id": "SOURCE_15",
      "name": "イルム",
      "nameStatus": "暫定",
      "role": "後半の源／相互強化",
      "finalDescription": "SOURCE_11～30の生産を強化する案。",
      "status": "暫定",
      "effects": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      "effectUnlockLevels": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ]
    },
    {
      "id": "SOURCE_16",
      "name": "シエル",
      "nameStatus": "暫定",
      "role": "《存在》全体／収束",
      "finalDescription": "存在ステージの生産全体×2の案。",
      "status": "暫定",
      "effects": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      "effectUnlockLevels": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ]
    },
    {
      "id": "SOURCE_17",
      "name": "ラグナ",
      "nameStatus": "暫定",
      "role": "収束回数／生産",
      "finalDescription": "収束回数を参照して生産を強化する案。",
      "status": "暫定",
      "effects": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      "effectUnlockLevels": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ]
    },
    {
      "id": "SOURCE_18",
      "name": "メルク",
      "nameStatus": "暫定",
      "role": "保有《存在》／生産",
      "finalDescription": "保有存在量を参照して生産を強化する案。",
      "status": "暫定",
      "effects": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      "effectUnlockLevels": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ]
    },
    {
      "id": "SOURCE_19",
      "name": "クレア",
      "nameStatus": "暫定",
      "role": "各源の＋値／全源",
      "finalDescription": "限界突破の＋値を参照して生産を強化する案。",
      "status": "暫定",
      "effects": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      "effectUnlockLevels": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ]
    },
    {
      "id": "SOURCE_20",
      "name": "ゼルナ",
      "nameStatus": "暫定",
      "role": "一巡／循環",
      "finalDescription": "30源を一巡した成長効果を強化する案。",
      "status": "暫定",
      "effects": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      "effectUnlockLevels": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ]
    },
    {
      "id": "SOURCE_21",
      "name": "アステ",
      "nameStatus": "暫定",
      "role": "《時》からの恩恵／存在",
      "finalDescription": "《時》が存在へ与える加速を強化する案。",
      "status": "暫定",
      "effects": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      "effectUnlockLevels": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ]
    },
    {
      "id": "SOURCE_22",
      "name": "リベル",
      "nameStatus": "暫定",
      "role": "経過時間／生産",
      "finalDescription": "現在の存在周回の経過時間を参照する案。",
      "status": "暫定",
      "effects": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      "effectUnlockLevels": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ]
    },
    {
      "id": "SOURCE_23",
      "name": "エイラ",
      "nameStatus": "暫定",
      "role": "未確定／旧案はBOOST中強化",
      "finalDescription": "旧案は『BOOST中だけ存在を追加強化』。共通BOOSTの独立・同一効果方針に抵触する可能性があるため採用保留。",
      "status": "暫定",
      "effects": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      "effectUnlockLevels": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ]
    },
    {
      "id": "SOURCE_24",
      "name": "ノルン",
      "nameStatus": "暫定",
      "role": "連続収束／報酬",
      "finalDescription": "連続収束を参照した報酬強化案。連続の定義は未決定。",
      "status": "暫定",
      "effects": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      "effectUnlockLevels": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ]
    },
    {
      "id": "SOURCE_25",
      "name": "ヴァル",
      "nameStatus": "暫定",
      "role": "通常特殊効果／全源",
      "finalDescription": "源の通常6効果を増幅する案。自身への再帰的適用は禁止する設計が必要。",
      "status": "暫定",
      "effects": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      "effectUnlockLevels": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ]
    },
    {
      "id": "SOURCE_26",
      "name": "セレス",
      "nameStatus": "暫定",
      "role": "周回後半／成長",
      "finalDescription": "周回後半の成長を強化する案。上限のない収束制度での『後半』の定義は未決定。",
      "status": "暫定",
      "effects": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      "effectUnlockLevels": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ]
    },
    {
      "id": "SOURCE_27",
      "name": "アルカ",
      "nameStatus": "暫定",
      "role": "後続ステージ／存在",
      "finalDescription": "後続ステージから存在への恩恵を強化する案。",
      "status": "暫定",
      "effects": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      "effectUnlockLevels": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ]
    },
    {
      "id": "SOURCE_28",
      "name": "イデア",
      "nameStatus": "暫定",
      "role": "全源の総Lv／全体",
      "finalDescription": "30源の総Lvを参照する強化案。",
      "status": "暫定",
      "effects": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      "effectUnlockLevels": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ]
    },
    {
      "id": "SOURCE_29",
      "name": "エテル",
      "nameStatus": "暫定",
      "role": "全源の最低＋値／循環",
      "finalDescription": "全30源の最低限界突破数を参照する強化案。",
      "status": "暫定",
      "effects": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      "effectUnlockLevels": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ]
    },
    {
      "id": "SOURCE_30",
      "name": "オルド",
      "nameStatus": "暫定",
      "role": "全30源の循環／全体",
      "finalDescription": "一巡ごとに存在側へ数値的な永続倍率を与える案。循環そのものの解放条件とは分ける。",
      "status": "暫定",
      "effects": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ],
      "effectUnlockLevels": [
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ]
    }
  ],
  "concepts": [
    {
      "id": "TC001",
      "name": "衝突",
      "principles": [
        "流動"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 0
    },
    {
      "id": "TC002",
      "name": "移動",
      "principles": [
        "流動"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 1
    },
    {
      "id": "TC003",
      "name": "座標",
      "principles": [
        "空間"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 2
    },
    {
      "id": "TC004",
      "name": "周囲",
      "principles": [
        "空間"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 3
    },
    {
      "id": "TC005",
      "name": "進化",
      "principles": [
        "変化"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 4
    },
    {
      "id": "TC006",
      "name": "退化",
      "principles": [
        "変化"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 5
    },
    {
      "id": "TC007",
      "name": "事象",
      "principles": [
        "因果"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 6
    },
    {
      "id": "TC008",
      "name": "結果",
      "principles": [
        "因果"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 7
    },
    {
      "id": "TC009",
      "name": "法則",
      "principles": [
        "秩序"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 8
    },
    {
      "id": "TC010",
      "name": "均衡",
      "principles": [
        "秩序"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 9
    },
    {
      "id": "TC011",
      "name": "希望",
      "principles": [
        "可能性"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 10
    },
    {
      "id": "TC012",
      "name": "混沌",
      "principles": [
        "可能性"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 11
    },
    {
      "id": "TC013",
      "name": "軌跡",
      "principles": [
        "流動",
        "空間"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 12
    },
    {
      "id": "TC014",
      "name": "漂流",
      "principles": [
        "流動",
        "空間"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 13
    },
    {
      "id": "TC015",
      "name": "速度",
      "principles": [
        "流動",
        "空間"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 14
    },
    {
      "id": "TC016",
      "name": "湾曲",
      "principles": [
        "流動",
        "変化"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 15
    },
    {
      "id": "TC017",
      "name": "加速",
      "principles": [
        "流動",
        "変化"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 16
    },
    {
      "id": "TC018",
      "name": "減速",
      "principles": [
        "流動",
        "変化"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 17
    },
    {
      "id": "TC019",
      "name": "連鎖",
      "principles": [
        "流動",
        "因果"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 18
    },
    {
      "id": "TC020",
      "name": "波及",
      "principles": [
        "流動",
        "因果"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 19
    },
    {
      "id": "TC021",
      "name": "作用",
      "principles": [
        "流動",
        "因果"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 20
    },
    {
      "id": "TC022",
      "name": "周期",
      "principles": [
        "流動",
        "秩序"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 21
    },
    {
      "id": "TC023",
      "name": "律動",
      "principles": [
        "流動",
        "秩序"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 22
    },
    {
      "id": "TC024",
      "name": "循環",
      "principles": [
        "流動",
        "秩序"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 23
    },
    {
      "id": "TC025",
      "name": "分岐",
      "principles": [
        "流動",
        "可能性"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 24
    },
    {
      "id": "TC026",
      "name": "逸脱",
      "principles": [
        "流動",
        "可能性"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 25
    },
    {
      "id": "TC027",
      "name": "飛躍",
      "principles": [
        "流動",
        "可能性"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 26
    },
    {
      "id": "TC028",
      "name": "歪み",
      "principles": [
        "空間",
        "変化"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 27
    },
    {
      "id": "TC029",
      "name": "圧縮",
      "principles": [
        "空間",
        "変化"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 28
    },
    {
      "id": "TC030",
      "name": "膨張",
      "principles": [
        "空間",
        "変化"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 29
    },
    {
      "id": "TC031",
      "name": "距離",
      "principles": [
        "空間",
        "因果"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 30
    },
    {
      "id": "TC032",
      "name": "到達",
      "principles": [
        "空間",
        "因果"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 31
    },
    {
      "id": "TC033",
      "name": "伝播",
      "principles": [
        "空間",
        "因果"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 32
    },
    {
      "id": "TC034",
      "name": "境界",
      "principles": [
        "空間",
        "秩序"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 33
    },
    {
      "id": "TC035",
      "name": "領域",
      "principles": [
        "空間",
        "秩序"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 34
    },
    {
      "id": "TC036",
      "name": "配置",
      "principles": [
        "空間",
        "秩序"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 35
    },
    {
      "id": "TC037",
      "name": "方向",
      "principles": [
        "空間",
        "可能性"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 36
    },
    {
      "id": "TC038",
      "name": "次元",
      "principles": [
        "空間",
        "可能性"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 37
    },
    {
      "id": "TC039",
      "name": "彼方",
      "principles": [
        "空間",
        "可能性"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 38
    },
    {
      "id": "TC040",
      "name": "過程",
      "principles": [
        "変化",
        "因果"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 39
    },
    {
      "id": "TC041",
      "name": "転機",
      "principles": [
        "変化",
        "因果"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 40
    },
    {
      "id": "TC042",
      "name": "変転",
      "principles": [
        "変化",
        "因果"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 41
    },
    {
      "id": "TC043",
      "name": "適応",
      "principles": [
        "変化",
        "秩序"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 42
    },
    {
      "id": "TC044",
      "name": "安定",
      "principles": [
        "変化",
        "秩序"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 43
    },
    {
      "id": "TC045",
      "name": "形成",
      "principles": [
        "変化",
        "秩序"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 44
    },
    {
      "id": "TC046",
      "name": "選択",
      "principles": [
        "変化",
        "可能性"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 45
    },
    {
      "id": "TC047",
      "name": "多様",
      "principles": [
        "変化",
        "可能性"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 46
    },
    {
      "id": "TC048",
      "name": "創発",
      "principles": [
        "変化",
        "可能性"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 47
    },
    {
      "id": "TC049",
      "name": "規則",
      "principles": [
        "因果",
        "秩序"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 48
    },
    {
      "id": "TC050",
      "name": "恒常",
      "principles": [
        "因果",
        "秩序"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 49
    },
    {
      "id": "TC051",
      "name": "帰結",
      "principles": [
        "因果",
        "秩序"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 50
    },
    {
      "id": "TC052",
      "name": "偶然",
      "principles": [
        "因果",
        "可能性"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 51
    },
    {
      "id": "TC053",
      "name": "必然",
      "principles": [
        "因果",
        "可能性"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 52
    },
    {
      "id": "TC054",
      "name": "運命",
      "principles": [
        "因果",
        "可能性"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 53
    },
    {
      "id": "TC055",
      "name": "確率",
      "principles": [
        "秩序",
        "可能性"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 54
    },
    {
      "id": "TC056",
      "name": "自由",
      "principles": [
        "秩序",
        "可能性"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 55
    },
    {
      "id": "TC057",
      "name": "調和",
      "principles": [
        "秩序",
        "可能性"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 56
    },
    {
      "id": "TC058",
      "name": "遷移",
      "principles": [
        "流動",
        "空間",
        "変化"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 57
    },
    {
      "id": "TC059",
      "name": "波紋",
      "principles": [
        "流動",
        "空間",
        "因果"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 58
    },
    {
      "id": "TC060",
      "name": "天則",
      "principles": [
        "流動",
        "空間",
        "秩序"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 59
    },
    {
      "id": "TC061",
      "name": "越境",
      "principles": [
        "流動",
        "空間",
        "可能性"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 60
    },
    {
      "id": "TC062",
      "name": "奔流",
      "principles": [
        "流動",
        "変化",
        "因果"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 61
    },
    {
      "id": "TC063",
      "name": "輪廻",
      "principles": [
        "流動",
        "変化",
        "秩序"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 62
    },
    {
      "id": "TC064",
      "name": "兆し",
      "principles": [
        "流動",
        "変化",
        "可能性"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 63
    },
    {
      "id": "TC065",
      "name": "幽玄",
      "principles": [
        "流動",
        "因果",
        "秩序"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 64
    },
    {
      "id": "TC066",
      "name": "邂逅",
      "principles": [
        "流動",
        "因果",
        "可能性"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 65
    },
    {
      "id": "TC067",
      "name": "顕現",
      "principles": [
        "流動",
        "秩序",
        "可能性"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 66
    },
    {
      "id": "TC068",
      "name": "幻想",
      "principles": [
        "空間",
        "変化",
        "因果"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 67
    },
    {
      "id": "TC069",
      "name": "定理",
      "principles": [
        "空間",
        "変化",
        "秩序"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 68
    },
    {
      "id": "TC070",
      "name": "呼応",
      "principles": [
        "空間",
        "変化",
        "可能性"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 69
    },
    {
      "id": "TC071",
      "name": "異界",
      "principles": [
        "空間",
        "因果",
        "秩序"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 70
    },
    {
      "id": "TC072",
      "name": "未知",
      "principles": [
        "空間",
        "因果",
        "可能性"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 71
    },
    {
      "id": "TC073",
      "name": "継承",
      "principles": [
        "空間",
        "秩序",
        "可能性"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 72
    },
    {
      "id": "TC074",
      "name": "構造",
      "principles": [
        "変化",
        "因果",
        "秩序"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 73
    },
    {
      "id": "TC075",
      "name": "宿命",
      "principles": [
        "変化",
        "因果",
        "可能性"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 74
    },
    {
      "id": "TC076",
      "name": "矛盾",
      "principles": [
        "変化",
        "秩序",
        "可能性"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 75
    },
    {
      "id": "TC077",
      "name": "摂理",
      "principles": [
        "因果",
        "秩序",
        "可能性"
      ],
      "effect": null,
      "status": "未決定",
      "iconIndex": 76
    }
  ],
  "resources": [
    {
      "id": "UR1_01",
      "rank": 1,
      "name": "エルム",
      "nameStatus": "暫定",
      "effect": null,
      "unlock": null
    },
    {
      "id": "UR1_02",
      "rank": 1,
      "name": "セラム",
      "nameStatus": "暫定",
      "effect": null,
      "unlock": null
    },
    {
      "id": "UR1_03",
      "rank": 1,
      "name": "ヴェルナ",
      "nameStatus": "暫定",
      "effect": null,
      "unlock": null
    },
    {
      "id": "UR1_04",
      "rank": 1,
      "name": "カイル",
      "nameStatus": "暫定",
      "effect": null,
      "unlock": null
    },
    {
      "id": "UR1_05",
      "rank": 1,
      "name": "オルム",
      "nameStatus": "暫定",
      "effect": null,
      "unlock": null
    },
    {
      "id": "UR1_06",
      "rank": 1,
      "name": "ネフィア",
      "nameStatus": "暫定",
      "effect": null,
      "unlock": null
    },
    {
      "id": "UR1_07",
      "rank": 1,
      "name": "リュエル",
      "nameStatus": "暫定",
      "effect": null,
      "unlock": null
    },
    {
      "id": "UR1_08",
      "rank": 1,
      "name": "ヴァレス",
      "nameStatus": "暫定",
      "effect": null,
      "unlock": null
    },
    {
      "id": "UR1_09",
      "rank": 1,
      "name": "カルナ",
      "nameStatus": "暫定",
      "effect": null,
      "unlock": null
    },
    {
      "id": "UR1_10",
      "rank": 1,
      "name": "エルシア",
      "nameStatus": "暫定",
      "effect": null,
      "unlock": null
    },
    {
      "id": "UR1_11",
      "rank": 1,
      "name": "ネレム",
      "nameStatus": "暫定",
      "effect": null,
      "unlock": null
    },
    {
      "id": "UR1_12",
      "rank": 1,
      "name": "フェルナ",
      "nameStatus": "暫定",
      "effect": null,
      "unlock": null
    },
    {
      "id": "UR1_13",
      "rank": 1,
      "name": "シエラ",
      "nameStatus": "暫定",
      "effect": null,
      "unlock": null
    },
    {
      "id": "UR1_14",
      "rank": 1,
      "name": "オルナ",
      "nameStatus": "暫定",
      "effect": null,
      "unlock": null
    },
    {
      "id": "UR1_15",
      "rank": 1,
      "name": "イデア",
      "nameStatus": "暫定",
      "effect": null,
      "unlock": null
    },
    {
      "id": "UR2_01",
      "rank": 2,
      "name": "ゼルム",
      "nameStatus": "暫定",
      "effect": null,
      "unlock": null
    },
    {
      "id": "UR2_02",
      "rank": 2,
      "name": "アルネ",
      "nameStatus": "暫定",
      "effect": null,
      "unlock": null
    },
    {
      "id": "UR2_03",
      "rank": 2,
      "name": "レヴィア",
      "nameStatus": "暫定",
      "effect": null,
      "unlock": null
    },
    {
      "id": "UR2_04",
      "rank": 2,
      "name": "ティレス",
      "nameStatus": "暫定",
      "effect": null,
      "unlock": null
    },
    {
      "id": "UR2_05",
      "rank": 2,
      "name": "ノルカ",
      "nameStatus": "暫定",
      "effect": null,
      "unlock": null
    },
    {
      "id": "UR2_06",
      "rank": 2,
      "name": "フィエラ",
      "nameStatus": "暫定",
      "effect": null,
      "unlock": null
    },
    {
      "id": "UR2_07",
      "rank": 2,
      "name": "グレム",
      "nameStatus": "暫定",
      "effect": null,
      "unlock": null
    },
    {
      "id": "UR2_08",
      "rank": 2,
      "name": "セレナ",
      "nameStatus": "暫定",
      "effect": null,
      "unlock": null
    },
    {
      "id": "UR2_09",
      "rank": 2,
      "name": "ヴァルク",
      "nameStatus": "暫定",
      "effect": null,
      "unlock": null
    },
    {
      "id": "UR2_10",
      "rank": 2,
      "name": "メルナ",
      "nameStatus": "暫定",
      "effect": null,
      "unlock": null
    },
    {
      "id": "UR3_01",
      "rank": 3,
      "name": "グラヴィル",
      "nameStatus": "暫定",
      "effect": null,
      "unlock": null
    },
    {
      "id": "UR3_02",
      "rank": 3,
      "name": "ゼフィル",
      "nameStatus": "暫定",
      "effect": null,
      "unlock": null
    },
    {
      "id": "UR3_03",
      "rank": 3,
      "name": "クレイド",
      "nameStatus": "暫定",
      "effect": null,
      "unlock": null
    },
    {
      "id": "UR3_04",
      "rank": 3,
      "name": "ラグネア",
      "nameStatus": "暫定",
      "effect": null,
      "unlock": null
    },
    {
      "id": "UR3_05",
      "rank": 3,
      "name": "ヴェスタル",
      "nameStatus": "暫定",
      "effect": null,
      "unlock": null
    },
    {
      "id": "UR3_06",
      "rank": 3,
      "name": "ネクシア",
      "nameStatus": "暫定",
      "effect": null,
      "unlock": null
    },
    {
      "id": "UR3_07",
      "rank": 3,
      "name": "オルディア",
      "nameStatus": "暫定",
      "effect": null,
      "unlock": null
    },
    {
      "id": "UR3_08",
      "rank": 3,
      "name": "ファレム",
      "nameStatus": "暫定",
      "effect": null,
      "unlock": null
    },
    {
      "id": "UR4_01",
      "rank": 4,
      "name": "アルヴェル",
      "nameStatus": "暫定",
      "effect": null,
      "unlock": null
    },
    {
      "id": "UR4_02",
      "rank": 4,
      "name": "ゼルディア",
      "nameStatus": "暫定",
      "effect": null,
      "unlock": null
    },
    {
      "id": "UR4_03",
      "rank": 4,
      "name": "クレシア",
      "nameStatus": "暫定",
      "effect": null,
      "unlock": null
    },
    {
      "id": "UR4_04",
      "rank": 4,
      "name": "ヴァルネス",
      "nameStatus": "暫定",
      "effect": null,
      "unlock": null
    },
    {
      "id": "UR4_05",
      "rank": 4,
      "name": "ノクティル",
      "nameStatus": "暫定",
      "effect": null,
      "unlock": null
    },
    {
      "id": "UR5_01",
      "rank": 5,
      "name": "エルディオン",
      "nameStatus": "暫定",
      "effect": null,
      "unlock": null
    },
    {
      "id": "UR5_02",
      "rank": 5,
      "name": "ヴァルディア",
      "nameStatus": "暫定",
      "effect": null,
      "unlock": null
    },
    {
      "id": "UR5_03",
      "rank": 5,
      "name": "ネクレア",
      "nameStatus": "暫定",
      "effect": null,
      "unlock": null
    },
    {
      "id": "UR6_01",
      "rank": 6,
      "name": "アステリム",
      "nameStatus": "暫定",
      "effect": null,
      "unlock": null
    }
  ],
  "stats": [
    {
      "id": "mass",
      "name": "質量",
      "status": "確定",
      "description": "リソースの基礎獲得個数。質量100なら100個分。",
      "pending": "端数処理・獲得間隔・報酬参照時点",
      "effect": null,
      "referenceMultiplier": null
    },
    {
      "id": "density",
      "name": "密度",
      "status": "未決定",
      "description": "？？？",
      "pending": "上位資源条件と常時効果は別に決める",
      "effect": null,
      "referenceMultiplier": null
    },
    {
      "id": "pressure",
      "name": "圧力",
      "status": "一部確定",
      "description": "崩壊報酬 ×1.1",
      "pending": "適用単位・重複方法・上限",
      "effect": null,
      "referenceMultiplier": 1.1
    },
    {
      "id": "stability",
      "name": "安定",
      "status": "一部確定",
      "description": "初期0%。破壊後、安定%相当を残留。",
      "pending": "残留対象・自身の残留・上限・破壊との関係",
      "effect": null,
      "referenceMultiplier": null
    },
    {
      "id": "temperature",
      "name": "温度",
      "status": "未決定",
      "description": "？？？",
      "pending": "直接効果",
      "effect": null,
      "referenceMultiplier": null
    },
    {
      "id": "activity",
      "name": "活性",
      "status": "一部確定",
      "description": "成長速度 ×1.01",
      "pending": "適用単位・対象。BOOSTや他ステージには連動させない",
      "effect": null,
      "referenceMultiplier": 1.01
    },
    {
      "id": "energy",
      "name": "エネルギー",
      "status": "未決定",
      "description": "？？？",
      "pending": "直接効果。独立通貨ではない",
      "effect": null,
      "referenceMultiplier": null
    },
    {
      "id": "gravity",
      "name": "重力",
      "status": "未決定",
      "description": "？？？",
      "pending": "直接効果・独立値か派生値か",
      "effect": null,
      "referenceMultiplier": null
    },
    {
      "id": "acceleration",
      "name": "加速度",
      "status": "未決定",
      "description": "？？？",
      "pending": "直接効果。活性と同じ効果を自動で付けない",
      "effect": null,
      "referenceMultiplier": null
    },
    {
      "id": "radiation",
      "name": "放射",
      "status": "未決定",
      "description": "？？？",
      "pending": "直接効果",
      "effect": null,
      "referenceMultiplier": null
    },
    {
      "id": "magnetism",
      "name": "磁場",
      "status": "未決定",
      "description": "？？？",
      "pending": "直接効果",
      "effect": null,
      "referenceMultiplier": null
    },
    {
      "id": "hardness",
      "name": "硬度",
      "status": "一部確定",
      "description": "安定と関連する、破壊への耐性。",
      "pending": "安定との組み合わせ式",
      "effect": null,
      "referenceMultiplier": null
    },
    {
      "id": "purity",
      "name": "純度",
      "status": "一部確定",
      "description": "R2の発生条件を緩和。",
      "pending": "対象・緩和量。R3以降への適用は未決定",
      "effect": null,
      "referenceMultiplier": null
    },
    {
      "id": "diversity",
      "name": "多様性",
      "status": "一部確定",
      "description": "《時》の育成方向で不得意な属性が出やすくなる。",
      "pending": "不得意の判定・係数。未発見救済ではない",
      "effect": null,
      "referenceMultiplier": null
    },
    {
      "id": "age",
      "name": "星齢",
      "status": "確定",
      "description": "誕生からの経過時間。残り寿命ではない。",
      "pending": "実時間／世界時間・BOOSTとの連動",
      "effect": null,
      "referenceMultiplier": null
    }
  ],
  "moment": [
    {"id":"tap","name":"Ⅰ 原初の接触","nameStatus":"第1〜7回効果仕様確定","description":"Lv1〜99＋1、Lv100〜999＋10、Lv1000以降＋100。段階別に合算","group":0,"note":"効果・係数・発動条件は確定。新24件の購入価格・節目倍率は検証値"},
    {"id":"tap2","name":"Ⅱ 干渉増幅","nameStatus":"第1〜7回効果仕様確定","description":"タップ倍率 ×1.02^Lv、Lv0は×1。巨大数対応","group":0,"note":"効果・係数・発動条件は確定。新24件の購入価格・節目倍率は検証値"},
    {"id":"tap3","name":"Ⅲ 余波","nameStatus":"第1〜7回効果仕様確定","description":"基本獲得＋0.5%/Lv（上限＋100%）、別表示・再増幅なし","group":0,"note":"効果・係数・発動条件は確定。新24件の購入価格・節目倍率は検証値"},
    {"id":"tap4","name":"Ⅳ 反響","nameStatus":"第1〜7回効果仕様確定","description":"周回の手動5タップごとに基本タップ×0.1×Lv（最大×25）","group":0,"note":"効果・係数・発動条件は確定。新24件の購入価格・節目倍率は検証値"},
    {"id":"tap5","name":"Ⅴ 集中","nameStatus":"第1〜7回効果仕様確定","description":"操作可能時間で1秒待機後、1＋最大4まで（0.10×√Lv×√待機超過秒）","group":0,"note":"効果・係数・発動条件は確定。新24件の購入価格・節目倍率は検証値"},
    {"id":"amplify","name":"Ⅵ 連撃","nameStatus":"第1〜7回効果仕様確定","description":"1コンボ目から＋0.2%×√Lv/コンボ、最大×5（突破で拡張）","group":1,"note":"効果・係数・発動条件は確定。新24件の購入価格・節目倍率は検証値"},
    {"id":"setsuna07","name":"Ⅶ 残響維持","nameStatus":"第1〜7回効果仕様確定","description":"猶予1.2＋0.02×Lv秒、最大10秒。残りゲージ表示","group":1,"note":"効果・係数・発動条件は確定。新24件の購入価格・節目倍率は検証値"},
    {"id":"setsuna08","name":"Ⅷ 加速","nameStatus":"第1〜7回効果仕様確定","description":"10コンボごとに源と自動タップを各＋0.4%×√Lv/段階、最大＋100%、5秒更新","group":1,"note":"効果・係数・発動条件は確定。新24件の購入価格・節目倍率は検証値"},
    {"id":"setsuna09","name":"Ⅸ 蓄積","nameStatus":"第1〜7回効果仕様確定","description":"追加獲得を5%×√Lv、最大50%蓄積。コンボ終了時×1.2放出","group":1,"note":"効果・係数・発動条件は確定。新24件の購入価格・節目倍率は検証値"},
    {"id":"setsuna10","name":"Ⅹ 連鎖","nameStatus":"第1〜7回効果仕様確定","description":"10／50／100／250／500／1000コンボの全通過節目で順位×0.5×√Lv（最大基本×30）","group":1,"note":"効果・係数・発動条件は確定。新24件の購入価格・節目倍率は検証値"},
    {"id":"setsuna11","name":"Ⅺ 幸運","nameStatus":"第1〜7回効果仕様確定","description":"会心率＋0.05%/Lv。100%超過分は線形実効倍率","group":2,"note":"効果・係数・発動条件は確定。新24件の購入価格・節目倍率は検証値"},
    {"id":"setsuna12","name":"Ⅻ 会心","nameStatus":"第1〜7回効果仕様確定","description":"会心倍率 ×2×1.02^Lv。巨大数対応・個別表示","group":2,"note":"効果・係数・発動条件は確定。新24件の購入価格・節目倍率は検証値"},
    {"id":"setsuna13","name":"ⅩⅢ 二重干渉","nameStatus":"第1〜7回効果仕様確定","description":"確率＋0.05%/Lv、最大25%。1回だけ追加獲得・独立会心","group":2,"note":"効果・係数・発動条件は確定。新24件の購入価格・節目倍率は検証値"},
    {"id":"setsuna14","name":"ⅩⅣ 連鎖会心","nameStatus":"第1〜7回効果仕様確定","description":"会心成功後、＋0.05%/Lv（最大25%）で最大3回連続会心","group":2,"note":"効果・係数・発動条件は確定。新24件の購入価格・節目倍率は検証値"},
    {"id":"setsuna15","name":"ⅩⅤ 奇跡","nameStatus":"第1〜7回効果仕様確定","description":"確率＋0.002%/Lv、最大0.2%。会心後の手動獲得×200","group":2,"note":"効果・係数・発動条件は確定。新24件の購入価格・節目倍率は検証値"},
    {"id":"setsuna16","name":"ⅩⅥ 自動接触","nameStatus":"第1〜7回効果仕様確定","description":"10／(1＋0.05×√Lv)秒で自動タップ。最短0.5秒、突破後0.25秒","group":3,"note":"効果・係数・発動条件は確定。新24件の購入価格・節目倍率は検証値"},
    {"id":"setsuna17","name":"ⅩⅦ 自律増幅","nameStatus":"第1〜7回効果仕様確定","description":"自動獲得倍率×1.02^Lv。オフラインも期待値で計算","group":3,"note":"効果・係数・発動条件は確定。新24件の購入価格・節目倍率は検証値"},
    {"id":"setsuna18","name":"ⅩⅧ 自律連撃","nameStatus":"第1〜7回効果仕様確定","description":"自動タップが＋0.05%/Lv（最大25%）で共通コンボを加算","group":3,"note":"効果・係数・発動条件は確定。新24件の購入価格・節目倍率は検証値"},
    {"id":"setsuna19","name":"ⅩⅨ 余剰回収","nameStatus":"第1〜7回効果仕様確定","description":"源の基礎生産1秒分×2%×√Lvを10秒ごとに追加回収","group":3,"note":"効果・係数・発動条件は確定。新24件の購入価格・節目倍率は検証値"},
    {"id":"setsuna20","name":"ⅩⅩ 自律同期","nameStatus":"第1〜7回効果仕様確定","description":"自動タップの最大50%に通常会心・二重干渉・連鎖会心を適用","group":3,"note":"効果・係数・発動条件は確定。新24件の購入価格・節目倍率は検証値"},
    {"id":"setsuna21","name":"ⅩⅪ 源の反映","nameStatus":"第1〜7回効果仕様確定","description":"源の基礎毎秒生産＋0.02%/Lv（上限25%）をタップに加算","group":4,"note":"効果・係数・発動条件は確定。新24件の購入価格・節目倍率は検証値"},
    {"id":"setsuna22","name":"ⅩⅫ 干渉供給","nameStatus":"第1〜7回効果仕様確定","description":"購入後の手動10タップごと源生産＋1%×√Lv、最大＋50%、5秒更新","group":4,"note":"効果・係数・発動条件は確定。新24件の購入価格・節目倍率は検証値"},
    {"id":"setsuna23","name":"ⅩⅩⅢ 源の共振","nameStatus":"第1〜7回効果仕様確定","description":"30種類の源の達成済み節目ごと＋0.2%×√Lv、最大＋200%","group":4,"note":"効果・係数・発動条件は確定。新24件の購入価格・節目倍率は検証値"},
    {"id":"setsuna24","name":"ⅩⅩⅣ 循環","nameStatus":"第1〜7回効果仕様確定","description":"手動獲得の1%×√Lv、最大50%を5秒間に分散して追加生産","group":4,"note":"効果・係数・発動条件は確定。新24件の購入価格・節目倍率は検証値"},
    {"id":"setsuna25","name":"ⅩⅩⅤ 共鳴暴走","nameStatus":"第1〜7回効果仕様確定","description":"100コンボの倍数で刹那・源＋5%×√Lv、最大＋100%、10秒","group":4,"note":"効果・係数・発動条件は確定。新24件の購入価格・節目倍率は検証値"},
    {"id":"setsuna26","name":"ⅩⅩⅥ 強化共鳴","nameStatus":"第1〜7回効果仕様確定","description":"6系統の購入済み効果量・倍率・確率を＋0.5%×√Lv、最大＋100%","group":5,"note":"効果・係数・発動条件は確定。新24件の購入価格・節目倍率は検証値"},
    {"id":"setsuna27","name":"ⅩⅩⅦ 時の圧縮","nameStatus":"第1〜7回効果仕様確定","description":"有効ゲーム120秒ごと、源の基礎生産（5＋0.1×Lv）秒分、最大60秒分","group":5,"note":"効果・係数・発動条件は確定。新24件の購入価格・節目倍率は検証値"},
    {"id":"setsuna28","name":"ⅩⅩⅧ 限界突破","nameStatus":"第1〜7回効果仕様確定","description":"コンボ上限×（1＋0.03√Lv）。自動タップ間隔は最短0.25秒","group":5,"note":"効果・係数・発動条件は確定。新24件の購入価格・節目倍率は検証値"},
    {"id":"setsuna29","name":"ⅩⅩⅨ 刹那の覚醒","nameStatus":"第1〜7回効果仕様確定","description":"周回の手動1000タップごと刹那＋2%×√Lv、最大＋100%、10秒","group":5,"note":"効果・係数・発動条件は確定。新24件の購入価格・節目倍率は検証値"},
    {"id":"setsuna30","name":"ⅩⅩⅩ 原初回帰","nameStatus":"第1〜7回効果仕様確定","description":"原初回帰Lv購入中、1＋0.002×累計収束回数×√刹那合計Lv×√原初回帰Lv","group":5,"note":"効果・係数・発動条件は確定。新24件の購入価格・節目倍率は検証値"}
  ],
  "engravings": [
    {
      "id": "autoTap",
      "name": "自動タップ",
      "status": "方向確定",
      "cost": null,
      "level": null,
      "description": "タップを自動化。解放条件・費用・頻度は？？？"
    },
    {
      "id": "autoSource",
      "name": "源の自動購入",
      "status": "方向確定",
      "cost": null,
      "level": null,
      "description": "源の購入を自動化。対象・費用・優先順位は？？？"
    },
    {
      "id": "autoConverge",
      "name": "自動収束",
      "status": "方向確定",
      "cost": null,
      "level": null,
      "description": "初期は手動収束。解放条件・費用・実行条件は？？？"
    },
    {
      "id": "retain",
      "name": "強化保持",
      "status": "方向確定",
      "cost": null,
      "level": null,
      "description": "周回内の強化を保持。対象・費用・保持量は？？？"
    }
  ],
  "achievements": [
    {
      "id": "foundation",
      "name": "最初の存在",
      "status": "記録用表示",
      "description": "初めて存在1が成立した。追加倍率なし。"
    },
    {
      "id": "convergence",
      "name": "最初の収束",
      "status": "記録用表示",
      "description": "通常周回で初めて収束した。追加倍率なし。"
    },
    {
      "id": "engravingObservation",
      "name": "刻印の観測",
      "status": "条件未決定",
      "description": "詳細ステータスと仮振り比較を解放。達成条件は？？？"
    },
    {
      "id": "planetRuin",
      "name": "惑星の破滅",
      "status": "確定",
      "description": "最初の崩壊により、2つの惑星を扱える。"
    }
  ],
  "pending": [
    {
      "id": "receipt",
      "name": "宇宙資源の受取時点",
      "description": "A：崩壊時受領 / B：時間受領＋崩壊時報酬。通常版では未確定として自動受領を止めています。"
    },
    {
      "id": "destruction",
      "name": "破壊と崩壊",
      "description": "同一か別イベントか、残留対象・報酬参照値・星齢保持は要確認。"
    },
    {
      "id": "directions",
      "name": "方向解放と世界時間",
      "description": "奇跡の条件、TIMEとの換算、存在配分が消費か参照かは要確認。"
    },
    {
      "id": "sourceCycle",
      "name": "源＋循環の解放・継承",
      "description": "個別突破と全30種一巡の関係、収束時の＋値と能力保持は要確認。"
    },
    {
      "id": "effect",
      "name": "未決定の効果",
      "description": "77概念、源の通常6効果、42資源の個性、7ステータスの直接効果は？？？のまま。"
    },
    {
      "id": "life",
      "name": "生命とコア",
      "description": "コア・脈動・生命発見の方向性のみ。詳細条件と生命の育成システムは未決定。"
    }
  ]
};

/* Confirmed decisions overlay. Old handoff snapshots remain in source history.
 * This does not mark unimplemented phenomenology, engraving or BOOST as complete.
 * Changes to display labels never alter stable TC/UR keys. */
for(const c of CONTENT.concepts){
  if(TIME_EFFECTS[c.id]){
    c.effect=TIME_EFFECTS[c.id];
    c.status="効果仕様確定・数値検証継続";
  }
}
for(const r of CONTENT.resources){
  const rule=UNIVERSE_RESOURCE_RULES[r.id];
  if(rule){
    r.effect=rule.effects;
    r.unlock=rule.conditions;
    r.massPerUnit=rule.mass;
  }
}
const statRoles={
  density:"上位の適格資源の抽選重みを増やす。解放条件の判定とは別。",
  temperature:"熱状態によって熱関連現象と適格資源の抽選傾向を変える。",
  energy:"惑星内部に生じた現象の報酬強度に作用。独立した通貨ではない。",
  gravity:"複数惑星間の引力・接近・合流等の相互作用を強める。",
  acceleration:"惑星間の移動・接近・衝突関連イベントの進行速度に作用。",
  radiation:"周辺惑星への放出現象の発生と影響を強める。",
  magnetism:"周辺からの放射等の外部干渉を緩和する。"
};
for(const st of CONTENT.stats){
  if(statRoles[st.id]){
    st.description=statRoles[st.id];
    st.status="役割確定・計算一部実装";
  }
}
const pendingRevision={
  directions:"6方向と最大3方向配分、初回10残滓、次Lv費用、77概念を確定し、基本進行を実装。細部の抽選率・TIME換算はバランス調整待ち。",
  effect:"77概念と42資源の効果データ・基本計算を採用。源の通常特殊効果、全惑星物理現象、刻印、BOOST等には未実装が残る。",
  life:"コア形成・脈動・生命認識の基本進行を導入。無機現象の全対応表・生命の詳細育成は未実装。"
};
for(const p of CONTENT.pending)if(pendingRevision[p.id])p.description=pendingRevision[p.id];
