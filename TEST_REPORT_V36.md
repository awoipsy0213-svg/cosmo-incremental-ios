# 《理》Ver.3.6 《源》数値調整テスト記録

## 変更したファイル

- `balance-config.mjs`：30種の秒間生産量・初回価格・購入倍率1.35
- `game.mjs`：生産量と1Lv購入価格を共通のテーブルから計算する関数に統一
- `app.mjs` / `live-ui.css`：《源》の1Lvあたり秒間生産量表示と購入時の生成量表示
- `index.html`：`3.6 · SOURCES` と表示
- `sw.js`：バージョン付きPWAキャッシュ更新
- `README.md` / `BALANCE_V36.md`：調整内容とリスク・変更箇所を記録
- `tests/v36_sources.mjs` / `tests/v36_ui_sources.py`：追加したゲーム数値・画面テスト
- 旧テストの固定バージョン判定を更新。旧UI・BOOST・研究試案の検証機能は維持。

## 実行したテスト

- `node tests/v36_sources.mjs`：215件、**PASS**。30種の率、段階別初期価格、1.35倍、MAX/NEXT、購入後の実収入、保存互換性を検証。
- `node tests/v34_logic.mjs`：**PASS**。BOOSTと保存互換性。
- `node tests/v35_logic.mjs`：59件、**PASS**。通常と研究セーブの分離、資源・源の未決定能力の保持。
- `node tests/v35_boost_regression.mjs`：**PASS**。加速とセーブ。
- `node tests/v35_sw_smoke.mjs`：13件、**PASS**。モック環境でのキャッシュ分離とナビゲーション。
- `python tests/v34_ui_smoke.py`：320/375/430px、**PASS**。数値更新時の強化カードとBOOSTの固定配置。
- `python tests/v35_ui_smoke.py`：通常/研究×320/375/430px、**PASS**。研究未確定情報の分離。
- `python tests/v34_normal_smoke.py`：通常導入からBOOST獲得・開始・停止、**PASS**。
- `python tests/v36_ui_sources.py`：320/375/430px、**PASS**。30種類の秒間レート、1.35倍でのリアルタイム価格更新、源購入による《時》解放、横はみ出しなし。

## 未検証・注意事項

- 実際のiPhone Safari/PWAにおける既存セーブのロード、長時間放置、オフライン再起動は未検証。
- 長期ステージ全体の経済バランス、100万Lv、源の210個の正式能力は未決定のため保証していない。
- Lvの購入以外に《源》の効果を新設せず、ユニット生産量と購入価格のみを試験変更。
