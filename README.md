# 理 3.1.0 — ブラウザ/PWA資料反映版

`index.html` が公開ルート。ビルド処理・外部CDN・npmインストール不要のES Modules構成です。
最初に `更新手順.txt` を読んでください。

- `balance-config.mjs`：確定値／仮値／未決定／検証値
- `content.mjs`：資料に基づく名前・ID・状態ラベル
- `game.mjs`：ゲーム進行
- `numbers.mjs`：近似の指数数値
- `save.mjs`：別キー移行・履歴・検証
- `app.mjs`：画面と操作
- `organic-original.css`：旧Organic Flow（同一内容）
- `mobile.css`：スマホ画面
- `legacy/`：Ver.3.0退避版（旧キー維持）
- `docs/implementation.html`：ゲーム内から読める反映・保留一覧

詳細：`IMPLEMENTATION_V31.md` / `TEST_REPORT_V31.md`

通常URL `./`、検証用URL `./?lab=1`。
現行ブラウザ/PWAのみを対象にしています。Expo・署名付きIPAの更新ではありません。
