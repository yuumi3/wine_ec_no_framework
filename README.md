# wine_ec_no_framework

ワインに特化した EC サイト（の一部）を、**フレームワークを一切使わず** TypeScript で実装したサンプルアプリです。
ワインの一覧・詳細閲覧、ユーザー登録／ログイン、ショッピングカートまでを提供します（決済・注文確定はスコープ外）。

## 特徴

- **React / Next.js を使わない**：View は JSX で書きますが、DOM を直接生成する自作の軽量 JSX ランタイム（`h` / `Fragment`）にトランスパイルします。
- **Express 等を使わない**：`node:http` の上に最小のルーターを自作しています。
- **標準モジュール中心**：DB は `node:sqlite`、パスワードハッシュは `node:crypto`（scrypt）、テストは `node:test`。
- 外部依存は開発ツール（esbuild / Tailwind CSS / Playwright）のみ。

## 機能概要

| 画面 | パス | 認証 | 概要 |
|------|------|------|------|
| ワイン一覧 | `/` | 不要 | 画像・名前・価格。10 件ずつインフィニティスクロール |
| ワイン詳細 | `/wines/:id` | 不要 | 画像・名前・価格・解説。購入はログイン必須 |
| ショッピングカート | `/cart` | 必要 | 数量変更・削除・合計金額 |
| ログイン | `/login` | 不要 | email・パスワード |
| ユーザー登録 | `/register` | 不要 | email・パスワード・氏名・住所 |

API は `/api` 配下の JSON API（`/api/auth/*`、`/api/wines*`、`/api/cart*`）で、認証は HttpOnly な Cookie セッションです。

> **詳細な仕様（画面構成・DB 設計・API 設計・ディレクトリ構成）は [docs/design.md](docs/design.md) を参照してください。**

## 動作環境

- Node.js **v26.0 以上**（`node:sqlite` と TypeScript の直接実行を利用します）
- npm

## セットアップ

```bash
npm install
npm run db:reset   # スキーマ適用 + ワイン 20 件のシード投入
```

`data/wines/wines.json` のワイン情報と `data/wines/*.png` の画像が DB のシード元になります。DB ファイル（`data/wine_ec.db`）は git 管理外です。

## 開発

フロントのビルド（esbuild / Tailwind）とサーバは別プロセスなので、3 つのターミナルで起動します（HMR はありません。変更時はブラウザをリロードしてください）。

```bash
npm run dev:web      # web/src/main.tsx → web/dist/bundle.js（--watch）
npm run dev:css      # Tailwind CSS のビルド（--watch）
npm run dev:server   # node --watch server/main.ts
```

http://localhost:3000 を開きます。ポートは環境変数 `PORT` で変更できます。

## 本番相当の起動

```bash
npm run build:web    # bundle.js + styles.css（minify）
npm start            # http://localhost:3000
```

## テスト

```bash
npm test             # API テスト（node:test）
npm run test:e2e     # E2E テスト（Playwright）
```

E2E は `npm run e2e:server` でフロントのビルド・DB リセット・シードを行ったうえでサーバを自動起動します。開発用 DB とは別の `data/e2e.db` をポート 3210 で使うため、開発用データには影響しません。初回のみブラウザの取得が必要です（`npx playwright install chromium`）。

## npm スクリプト

| コマンド | 内容 |
|---|---|
| `npm run db:migrate` | スキーマ適用（`--reset` で DB ファイルを作り直し） |
| `npm run db:seed` | `data/wines/wines.json` を `wines` テーブルへ投入 |
| `npm run db:reset` | DB を作り直してシード |
| `npm run dev:web` / `dev:css` / `dev:server` | 開発用の watch 起動 |
| `npm run build:web` | フロントの本番ビルド |
| `npm start` | サーバ起動 |
| `npm test` / `npm run test:e2e` | API テスト / E2E テスト |

## ディレクトリ構成（概要）

```
wine_ec/
├── docs/design.md   # 設計書
├── data/            # SQLite 実体・ワインのマスタ情報と画像
├── server/          # バックエンド（node:http + node:sqlite）
│   ├── main.ts      # エントリ。API / 画像配信 / SPA フォールバック
│   ├── db/          # 接続・スキーマ・シード
│   ├── auth/        # パスワード・セッション・認証チェック
│   └── routes/      # /api/auth, /api/wines, /api/cart
├── web/             # フロントエンド（自作 JSX ランタイム + Tailwind）
│   └── src/         # jsx/ router.ts api/ store/ components/ pages/
├── tests/           # API テスト（node:test）
└── e2e/             # E2E テスト（Playwright）
```

## 環境変数

| 変数 | 既定値 | 説明 |
|---|---|---|
| `PORT` | `3000` | サーバの待ち受けポート |
| `WINE_EC_DB` | `data/wine_ec.db` | SQLite のファイルパス（テストでの差し替え用） |

## ライセンス

[MIT License](LICENSE)

Copyright (c) 2026 Yuumi Yoshida

