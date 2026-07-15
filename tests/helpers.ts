// テスト用の共通セットアップ。
// アプリのモジュールを import する前に、隔離された一時DBを指す環境変数を設定する。
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tmp = mkdtempSync(join(tmpdir(), "wine-ec-test-"));
process.env.WINE_EC_DB = join(tmp, "test.db");
process.env.PORT = "0"; // 動的ポート

// 環境変数設定後に動的 import することで、config が正しいDBパスを読む。
const { getDb, closeDb } = await import("../server/db/index.ts");
const { seed } = await import("../server/db/seed.ts");
const { server } = await import("../server/main.ts");

// エフェメラルポートでリッスン開始。
await new Promise<void>((resolve) => server.listen(0, resolve));
const address = server.address();
const port = typeof address === "object" && address ? address.port : 0;
export const baseUrl = `http://localhost:${port}`;

/** users/sessions/cart を全消去し、wines を再投入してクリーンな状態にする。 */
export function resetDb(): void {
  const db = getDb();
  db.exec("DELETE FROM cart_items; DELETE FROM sessions; DELETE FROM users;");
  seed(true); // wines を再投入
}

/** サーバとDBを閉じる（各テストファイルの after で呼ぶ）。 */
export function shutdown(): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => {
      closeDb();
      resolve();
    });
  });
}

export type ApiResponse = {
  status: number;
  json: any;
  headers: Headers;
};

/** Cookie を保持する簡易APIクライアント（ログインセッションを跨いで送る）。 */
export function createClient() {
  let cookie = "";

  async function request(method: string, path: string, body?: unknown): Promise<ApiResponse> {
    const headers: Record<string, string> = {};
    if (cookie) headers["Cookie"] = cookie;
    if (body !== undefined) headers["Content-Type"] = "application/json";

    const res = await fetch(baseUrl + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
      cookie = setCookie.split(";")[0]!; // "sid=..." を保持（clear時は "sid=" になる）
    }

    const text = await res.text();
    let json: any = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = text;
      }
    }
    return { status: res.status, json, headers: res.headers };
  }

  return {
    get: (p: string) => request("GET", p),
    post: (p: string, body?: unknown) => request("POST", p, body),
    put: (p: string, body?: unknown) => request("PUT", p, body),
    delete: (p: string) => request("DELETE", p),
  };
}

/** 標準的な登録用ペイロードを生成する。 */
export function newUserPayload(overrides: Record<string, unknown> = {}) {
  const n = Math.floor(Math.random() * 1_000_000);
  return {
    email: `user${n}@example.com`,
    password: "password123",
    passwordConfirm: "password123",
    fullName: "山田太郎",
    address: "東京都渋谷区1-2-3",
    ...overrides,
  };
}
