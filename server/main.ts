// HTTP サーバのエントリポイント。
//  - /api/*            → JSON API ルーター
//  - /images/wines/*   → ワイン画像の静的配信 (data/wines/)
//  - それ以外           → web/ アセット配信 + SPA フォールバック(index.html)
import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { PORT, WEB_DIR, WINES_DATA_DIR } from "./config.ts";
import { HttpError, sendError } from "./http.ts";
import { serveFile, serveFromDir } from "./static.ts";
import { join } from "node:path";
import { createApiRouter } from "./routes/index.ts";

const api = createApiRouter();

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const pathname = url.pathname;
  const method = req.method ?? "GET";

  // 1) API
  if (pathname === "/api" || pathname.startsWith("/api/")) {
    const matched = api.match(method, pathname);
    if (!matched) {
      sendError(res, 404, "NOT_FOUND", "エンドポイントが見つかりません");
      return;
    }
    await matched.handler({ req, res, params: matched.params, query: url.searchParams, url });
    return;
  }

  // 2) ワイン画像 (/images/wines/<file>)
  if (pathname.startsWith("/images/wines/")) {
    const rel = pathname.slice("/images/wines/".length);
    const ok = await serveFromDir(res, WINES_DATA_DIR, rel);
    if (!ok) sendError(res, 404, "NOT_FOUND", "画像が見つかりません");
    return;
  }

  // 3) 静的アセット (web/) — GET/HEAD のみ
  if (method === "GET" || method === "HEAD") {
    const rel = pathname === "/" ? "index.html" : pathname;
    if (await serveFromDir(res, WEB_DIR, rel)) return;
    // SPA フォールバック: 拡張子を持たないパスは index.html を返す
    if (!rel.includes(".")) {
      if (await serveFile(res, join(WEB_DIR, "index.html"))) return;
    }
    sendError(res, 404, "NOT_FOUND", "ページが見つかりません");
    return;
  }

  sendError(res, 405, "METHOD_NOT_ALLOWED", "許可されていないメソッドです");
}

const server = createServer((req, res) => {
  handle(req, res).catch((err) => {
    if (res.headersSent) {
      res.destroy();
      return;
    }
    if (err instanceof HttpError) {
      sendError(res, err.status, err.code, err.message, err.fields);
    } else {
      console.error("Unhandled error:", err);
      sendError(res, 500, "INTERNAL_ERROR", "サーバ内部エラーが発生しました");
    }
  });
});

// テストから import された場合はサーバを自動起動しない。
if (import.meta.url === `file://${process.argv[1]}`) {
  server.listen(PORT, () => {
    console.log(`wine_ec server listening on http://localhost:${PORT}`);
  });
}

export { server, handle };
