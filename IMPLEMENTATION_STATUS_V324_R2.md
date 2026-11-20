# 《理》Ver.3.24-R2｜小画面購入確認 UI 修正（仕様 I-40）

更新：2026-11-20
ベース：main `3a5ff0ab9fa6fb8dbfd3aba8368e8a9b41494b78`

## 根拠
- GitHub `KOTOWARI_I01_I50_500_MILESTONE_AUDIT.md` の確定B案 **I-40「小画面でも購入確認を隠さない」**。
- 参考：現在の `index.html` の汎用確認ダイアログ（購入・復元等で共用）。
- 注：他チャット「01｜仕様設計」最新原文にはこの連携から直接アクセスできないため、新コンセプト・新ゲームルール・新UIの最新版全体には対応したと認定しない。

## 変更
- 購入／復元確認ダイアログをスマホの縦領域以内に収め、長文の説明のみスクロール可能に。
- 「戻る」「実行する」を常に下端に表示し、両方44px以上のタップ領域を確保。
- `aria-labelledby`、`aria-describedby`、キーボードスクロール用 `tabindex` を設定。
- Web root と Capacitor `www/` のHTML/CSS/SWを同一化。Service Workerのキャッシュ識別子のみ更新。
- `schemaVersion=31`、既存の通常/labセーブキー、購入計算、確認設定デフォルト、現行ステージ構成、現在のUIデザインは不変。

## テスト
- Node: `tests/v324_r2_confirm_dialog.mjs`
- Chromium: `tests/v324_r2_confirm_browser.mjs`（320×360 / 320×440 / 375×667 / 390×844 / 430×932）
- 既存の購入・オフライン・保存互換・Web/Capacitor同期の回帰テスト
- `main`統合後、Pagesデプロイ・同一コミット公開ハッシュ比較・実サイトでのChrome操作まで確認する

## 保留事項
- 他チャットで新規確定したゲーム仕様、新コンセプトの全文が未取得。既存の追跡台帳は最新の逐語原文ではない。
- iPhone Safari実機未検証。

## 作業結果
テスト・公開の各項目は実際のGitHub Actions結果を確認後に更新する。
