# ワインEC 設計書

ワインに特化したECサイトの一部を、フレームワークを使わず TypeScript で実装するための設計。

---

## 1. 設計方針（設計書）

### 1.1 全体構成

```
┌─────────────────┐        fetch (JSON API)        ┌─────────────────┐
│  フロントエンド  │  ───────────────────────────▶ │  バックエンド    │
│  (SPA / ブラウザ)│  ◀───────────────────────────  │  (node:http)     │
│   JSX + Tailwind │      Cookie(セッション)         │                  │
└─────────────────┘                                 └────────┬────────┘
                                                             │ node:sqlite
                                                    ┌────────▼────────┐
                                                    │   SQLite (file) │
                                                    └─────────────────┘
```

- **SPA構成**：フロントエンドは単一の HTML から起動する SPA。画面遷移は History API による簡易クライアントルーターで行う。
- **API通信**：フロントは全て `fetch` で JSON API を叩く。サーバはビュー（HTML）を返さず、静的アセット配信と JSON API のみを担う。
- **状態**：クライアント側はグローバルなミニストア（カート件数・ログイン状態）を持つ。サーバ側の正が常に優先。

### 1.2 技術選定と「フレームワーク不使用」の担保

| 領域 | 採用 | 理由・補足 |
|------|------|-----------|
| 言語 | TypeScript | 原則どおり |
| バックエンドHTTP | `node:http` | Express等を使わず標準モジュールで自作ルーター |
| DB | SQLite（`node:sqlite`） | Node標準の同期API。別プロセス不要 |
| パスワードハッシュ | `node:crypto` (scrypt) | 外部ライブラリ不使用 |
| セッション | Cookie + サーバ側セッションテーブル | JWTライブラリ等を使わない |
| フロントView | JSX | Reactは使わず**自作の軽量JSXランタイム**（`h`/`Fragment`）でDOM生成 |
| CSS | Tailwind CSS | Tailwind CLI でビルド（フレームワークではないため可） |
| ビルド | esbuild | TS/JSXのトランスパイル用の**ツール**。ランタイムフレームワークではない |
| テスト | `node:test` | 標準のテストランナー。APIテストを記述 |

> **補足：JSXについて**
> 「Reactを使わない」ため、JSXは React ではなく自作ランタイムにトランスパイルする。esbuild の
> `jsxFactory=h` / `jsxFragment=Fragment` を設定し、`h()` が本物のDOMノード（`HTMLElement`）を返す
> 最小実装を用意する。これによりフレームワーク非依存のまま JSX で View を記述できる。

> **補足：Nodeバージョン**
> 要件は node v26.4。`node:sqlite` はバージョンによって実験的フラグや API 差異があるため、
> 実行環境の node で `node:sqlite` が安定利用できることを前提とする（開発機が古い場合は要調整）。

### 1.3 非機能・スコープ

- 対象は「一部」実装。決済処理・在庫引当・注文確定は**スコープ外**（カートまで）。
- HMR不要。開発時は `esbuild --watch` + `tailwind --watch` + サーバ再起動で足りる。
- セキュリティ最低限：パスワードハッシュ化、セッションCookieに `HttpOnly`、入力バリデーション、パラメタライズドクエリ（SQLインジェクション対策）。

---

## 2. 画面構成

### 2.1 画面一覧とルート

| 画面 | パス | 認証 | 概要 |
|------|------|------|------|
| ワイン一覧 | `/` | 不要 | 画像・名前・価格。インフィニティスクロール |
| ワイン詳細 | `/wines/:id` | 不要（購入操作のみ要ログイン） | 画像・名前・価格・解説・購入ボタン |
| ショッピングカート | `/cart` | **必要** | 画像(小)・名前・価格・数量。数量変更／削除 |
| ログイン | `/login` | 不要 | email・パスワード |
| ユーザー登録 | `/register` | 不要 | email・パスワード・確認・氏名・住所 |

### 2.2 画面遷移図

```
        ┌──────────────┐
        │  ワイン一覧   │◀──────────────┐
        │     (/)      │                │
        └──────┬───────┘                │
               │ カード/リンク           │
               ▼                        │
        ┌──────────────┐   購入(要ログイン)  ┌──────────────┐
        │  ワイン詳細   │──────────────▶│   カート      │
        │ (/wines/:id) │                │   (/cart)    │
        └──────────────┘                └──────────────┘
               │ 未ログインで購入                ▲ 要ログイン
               ▼                                │
        ┌──────────────┐   登録リンク    ┌──────────────┐
        │  ログイン     │◀──────────────▶│  ユーザー登録  │
        │  (/login)    │                │ (/register)  │
        └──────────────┘                └──────────────┘
```

### 2.3 共通レイアウト

- **ヘッダー**：ロゴ（→一覧へ）／カートアイコン（件数バッジ）／ログイン・ログアウト・ユーザー名。
- **未ログイン時**：ヘッダーに「ログイン」「登録」リンク。カートアイコン押下で `/login` に誘導。
- **ログイン時**：ヘッダーにユーザー名・「ログアウト」。

### 2.4 画面別の振る舞い

#### ワイン一覧 `/`
- 初期に **10件** を取得し、`IntersectionObserver` で末尾監視。到達で次の10件を追加取得（カーソルベース）。
- 各カード：画像・ワイン名・価格。クリックで詳細へ。
- ローディング／これ以上ないの表示。

#### ワイン詳細 `/wines/:id`
- 画像・名前・価格・解説を表示。
- 購入ボタン：
  - **未ログイン**：ボタンを disabled（またはクリック時に「ログインが必要です」→ `/login`）。
  - **ログイン済**：クリックで `POST /api/cart/items`（数量1）。成功でカート件数更新＆トースト表示。

#### ショッピングカート `/cart`
- 未ログインでアクセス → `/login` にリダイレクト。
- 明細：画像(小)・名前・価格・数量（増減入力）・小計。合計金額表示。
- 数量変更：`PUT /api/cart/items/:id`。削除：`DELETE /api/cart/items/:id`。

#### ログイン `/login`
- email・パスワード。`POST /api/auth/login`。成功で元画面 or `/` へ。
- エラー時は「メールまたはパスワードが違います」。

#### ユーザー登録 `/register`
- email・パスワード・パスワード確認・氏名・住所。
- クライアント側で必須・形式・パスワード一致を検証、`POST /api/auth/register`。サーバ側でも再検証。
- 成功で自動ログイン→ `/`。

---

## 3. データベース設計

SQLite。`node:sqlite` でパラメタライズドクエリを使用。

### 3.1 ER図

```
users 1 ──── * sessions
  │
  │ 1
  │
  * carts (users:carts = 1:1 相当。1ユーザー1カート)
  │ 1
  │
  * cart_items * ──── 1 wines
```

### 3.2 テーブル定義

#### users
| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | INTEGER | PK AUTOINCREMENT | |
| email | TEXT | NOT NULL UNIQUE | ログインID |
| password_hash | TEXT | NOT NULL | scryptハッシュ（salt同梱） |
| full_name | TEXT | NOT NULL | 氏名 |
| address | TEXT | NOT NULL | 住所 |
| created_at | TEXT | NOT NULL DEFAULT (datetime('now')) | |

#### sessions
| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | TEXT | PK | ランダムなセッションID（Cookie値） |
| user_id | INTEGER | NOT NULL FK→users(id) | |
| created_at | TEXT | NOT NULL DEFAULT (datetime('now')) | |
| expires_at | TEXT | NOT NULL | 有効期限 |

#### wines
提供データ（`data/wines/wines.json`）の項目をそのまま格納する。一覧は `name/price/image` のみ使用、詳細でその他項目も表示可能にする。

| カラム | 型 | 制約 | 説明 | JSONキー |
|--------|-----|------|------|---------|
| id | INTEGER | PK AUTOINCREMENT | | (連番付与) |
| name | TEXT | NOT NULL | ワイン名 | name |
| price | INTEGER | NOT NULL | 価格（整数） | price |
| currency | TEXT | NOT NULL DEFAULT 'JPY' | 通貨 | currency |
| image | TEXT | NOT NULL | 画像ファイル名（例 `bartolo.png`） | image |
| category | TEXT | NOT NULL | 赤/白/ロゼ/スパークリング/オレンジ | category |
| region | TEXT | NOT NULL | 産地 | region |
| appellation | TEXT | | 原産地呼称 | appellation |
| vintage | INTEGER | NULL許容 | 収穫年（不明は NULL） | vintage |
| grape | TEXT | | ブドウ品種 | grape |
| alcohol | TEXT | | アルコール度数（例 `13.5%`） | alcohol |
| description | TEXT | NOT NULL DEFAULT '' | 解説 | description |
| food_pairing | TEXT | | 料理との相性 | foodPairing |
| created_at | TEXT | NOT NULL DEFAULT (datetime('now')) | | |

> **画像の扱い**：`data/wines/*.png`（ファイル名に空白・アクセント記号・アポストロフィを含む）をサーバが静的配信する。
> 公開URLは `/images/wines/<encodeURIComponent(image)>` とし、DBにはファイル名だけを保持。APIレスポンスでは
> エンコード済みの `imageUrl` を組み立てて返す。

#### cart_items
| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | INTEGER | PK AUTOINCREMENT | |
| user_id | INTEGER | NOT NULL FK→users(id) | カートの所有者 |
| wine_id | INTEGER | NOT NULL FK→wines(id) | |
| quantity | INTEGER | NOT NULL CHECK(quantity > 0) | 購入数量 |
| created_at | TEXT | NOT NULL DEFAULT (datetime('now')) | |
| | | UNIQUE(user_id, wine_id) | 同一ワインは1行にまとめ数量加算 |

> `carts` テーブルは分けず、`cart_items.user_id` で1ユーザー1カートを表現（スコープが小さいため簡素化）。

### 3.3 インデックス

- `users.email`：UNIQUE制約で自動。
- `sessions.user_id`、`sessions.expires_at`（期限切れ削除用）。
- `cart_items(user_id)`：カート取得用。
- `wines.id` のカーソルページング：PKのため自動。

### 3.4 スキーマ（`schema.sql` 抜粋）

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  address       TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS wines (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  price        INTEGER NOT NULL,
  currency     TEXT NOT NULL DEFAULT 'JPY',
  image        TEXT NOT NULL,
  category     TEXT NOT NULL,
  region       TEXT NOT NULL,
  appellation  TEXT,
  vintage      INTEGER,
  grape        TEXT,
  alcohol      TEXT,
  description  TEXT NOT NULL DEFAULT '',
  food_pairing TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cart_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wine_id    INTEGER NOT NULL REFERENCES wines(id) ON DELETE CASCADE,
  quantity   INTEGER NOT NULL CHECK(quantity > 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, wine_id)
);
```

---

## 4. API設計

- ベースパス：`/api`
- 形式：リクエスト／レスポンスともに JSON（`Content-Type: application/json`）。
- 認証：ログイン時に `Set-Cookie: sid=...; HttpOnly; SameSite=Lax; Path=/`。以降のリクエストで Cookie を検証。
- エラー形式：`{ "error": { "code": string, "message": string, "fields"?: {field: message} } }`
- ステータス：200/201 成功、400 バリデーション、401 未認証、404 not found、409 競合、500 サーバエラー。

### 4.1 認証系

#### POST `/api/auth/register`
新規登録（成功でセッション発行＝自動ログイン）。
```jsonc
// req
{ "email": "a@example.com", "password": "secret123",
  "passwordConfirm": "secret123", "fullName": "山田太郎", "address": "東京都..." }
// res 201
{ "user": { "id": 1, "email": "a@example.com", "fullName": "山田太郎" } }
```
検証：全項目必須／email形式／password 8文字以上等／password === passwordConfirm／email重複（409）。

#### POST `/api/auth/login`
```jsonc
// req { "email": "...", "password": "..." }
// res 200 { "user": { "id": 1, "email": "...", "fullName": "..." } }  + Set-Cookie
// 失敗 401 { "error": { "code": "INVALID_CREDENTIALS", ... } }
```

#### POST `/api/auth/logout`
セッション破棄。res 204。

#### GET `/api/auth/me`
現在のログインユーザー。未ログインは 401。フロント起動時の状態復元に使用。
```jsonc
// res 200 { "user": { "id": 1, "email": "...", "fullName": "..." } }
```

### 4.2 ワイン系

#### GET `/api/wines?cursor=<id>&limit=10`
一覧（インフィニティスクロール用のカーソルページング）。`limit` の既定値は **10**。
```jsonc
// res 200
{
  "items": [ { "id": 42, "name": "...", "price": 3200, "currency": "JPY", "imageUrl": "/images/wines/bartolo.png" } ],
  "nextCursor": 22   // これ以上なければ null
}
```
> カーソルは「最後に取得した wine.id」。`WHERE id > :cursor ORDER BY id ASC LIMIT :limit`
> （提供データの並び順で表示するため昇順。cursor 未指定は先頭から10件）。

#### GET `/api/wines/:id`
詳細。詳細画面で使う項目を含めて返す。
```jsonc
// res 200
{
  "id": 42, "name": "...", "price": 3200, "currency": "JPY",
  "imageUrl": "/images/wines/bartolo.png", "description": "...",
  "category": "赤ワイン", "region": "...", "appellation": "...",
  "vintage": 2016, "grape": "...", "alcohol": "14.5%", "foodPairing": "..."
}
// 404 存在しない
```

### 4.3 カート系（全て要ログイン。未ログインは 401）

#### GET `/api/cart`
```jsonc
// res 200
{
  "items": [
    { "id": 7, "wineId": 42, "name": "...", "price": 3200,
      "imageUrl": "...", "quantity": 2, "subtotal": 6400 }
  ],
  "total": 6400,
  "count": 2   // 数量合計（ヘッダーバッジ用）
}
```

#### POST `/api/cart/items`
カート追加（既存なら数量加算）。
```jsonc
// req { "wineId": 42, "quantity": 1 }
// res 201 （追加後のカート or 追加した明細）
```

#### PUT `/api/cart/items/:id`
数量変更。
```jsonc
// req { "quantity": 3 }
// res 200
// quantity <= 0 は 400（削除は DELETE を使う）
```

#### DELETE `/api/cart/items/:id`
明細削除。res 204。他人の明細（user_id不一致）は 404。

### 4.4 認可ルール

- カート系は Cookie セッションから解決した `user_id` に紐づく行のみ操作可能。
- `:id` 指定の明細は必ず `WHERE id=:id AND user_id=:me` で照合し、他ユーザーのデータへアクセスさせない。

---

## 5. ディレクトリ構成・ファイル構成

```
wine_ec/
├── docs/
│   └── design.md                # 本設計書
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── esbuild.config.mjs           # フロントのTS/JSXビルド設定
├── data/
│   ├── wine_ec.db               # SQLite実体（gitignore）
│   └── wines/                   # 提供データ（seed元・画像配信元）
│       ├── wines.json           # ワイン20件のマスタ情報
│       └── *.png                # ワイン画像20枚（/images/wines/ で配信）
│
├── server/                      # バックエンド（node:http, フレームワーク無し）
│   ├── main.ts                  # エントリ。HTTPサーバ起動・静的配信(web/ + /images/wines/)・ルーティング束ね
│   ├── router.ts                # 最小ルーター（method+path → handler、:param対応）
│   ├── http.ts                  # req/res ヘルパ（JSON読取・JSON返却・Cookie操作）
│   ├── db/
│   │   ├── index.ts             # node:sqlite 接続・マイグレーション実行
│   │   ├── schema.sql           # DDL
│   │   └── seed.ts              # data/wines/wines.json を読み込みwinesへ投入
│   ├── auth/
│   │   ├── password.ts          # scrypt ハッシュ／検証
│   │   ├── session.ts           # セッション発行・検証・破棄
│   │   └── middleware.ts        # requireAuth（未ログイン401）
│   ├── validation.ts            # email/password等の共通バリデータ
│   └── routes/
│       ├── auth.ts              # /api/auth/*
│       ├── wines.ts             # /api/wines*
│       └── cart.ts              # /api/cart*
│
├── web/                         # フロントエンド
│   ├── index.html               # SPAのホスト。bundle.js / styles.css を読み込む
│   ├── src/
│   │   ├── main.tsx             # アプリ起動・ルーターマウント
│   │   ├── jsx/
│   │   │   ├── runtime.ts       # 自作JSXランタイム（h, Fragment → DOM生成）
│   │   │   └── jsx.d.ts         # JSX名前空間の型定義
│   │   ├── router.ts            # History APIベースの簡易クライアントルーター
│   │   ├── api/
│   │   │   ├── client.ts        # fetchラッパ（JSON・エラー整形・credentials同送）
│   │   │   ├── auth.ts          # login/register/logout/me
│   │   │   ├── wines.ts         # 一覧・詳細
│   │   │   └── cart.ts          # カートCRUD
│   │   ├── store/
│   │   │   └── session.ts       # ログイン状態・カート件数のミニストア
│   │   ├── components/          # 再利用コンポーネント（1コンポーネント1ファイル）
│   │   │   ├── Header.tsx
│   │   │   ├── WineCard.tsx
│   │   │   ├── QuantityInput.tsx
│   │   │   ├── Button.tsx
│   │   │   └── Spinner.tsx
│   │   └── pages/               # 画面（ルート単位）
│   │       ├── WineListPage.tsx
│   │       ├── WineDetailPage.tsx
│   │       ├── CartPage.tsx
│   │       ├── LoginPage.tsx
│   │       └── RegisterPage.tsx
│   └── public/
│       └── (画像等の静的アセット)
│
└── tests/                       # APIテスト（node:test）
    ├── helpers.ts               # テスト用DB・サーバ起動・fetchヘルパ
    ├── auth.test.ts
    ├── wines.test.ts
    └── cart.test.ts
```

### 5.1 ビルド・実行フロー

| コマンド（package.json scripts想定） | 内容 |
|---|---|
| `npm run dev:web` | esbuild `--watch` で `web/src/main.tsx` → `web/dist/bundle.js` |
| `npm run dev:css` | tailwind `--watch` で `styles.css` 生成 |
| `npm run dev:server` | `node --watch server/main.ts`（TSは node の型剥がし or tsx想定） |
| `npm run build` | フロント本番ビルド（bundle + css minify） |
| `npm test` | `node --test tests/` でAPIテスト実行 |

- サーバは `web/`（index.html, dist/bundle.js, styles.css, public/）を静的配信し、SPAフォールバック（未知パスは index.html）を行う。`/api/*` はAPIへ。

### 5.2 レイヤ責務まとめ

- **server/routes**：入力の取り出し→バリデーション→DB操作→JSON応答。ビジネスロジックの主。
- **server/db**：接続とクエリ実行の集約。SQLはここに閉じる。
- **server/auth**：ハッシュ・セッションの横断関心事。
- **web/pages**：画面。API呼び出しとDOM構築。
- **web/components**：見た目の再利用単位。状態は最小限、propsで受ける。
- **web/api**：サーバAPIの型付きクライアント。pages はここ経由でのみ通信。

---

## 6. 実装順序（次フェーズの目安）

1. プロジェクト初期化（package.json / tsconfig / tailwind / esbuild）
2. DB（schema・接続・seed）
3. サーバ基盤（http/router/静的配信）
4. 認証API＋テスト
5. ワインAPI＋テスト
6. カートAPI＋テスト
7. フロント基盤（JSXランタイム・ルーター・APIクライアント）
8. 各画面の実装（一覧→詳細→ログイン/登録→カート）
