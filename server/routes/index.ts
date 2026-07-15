// API ルートの登録を集約する。以降のステップで auth/wines/cart を追加していく。
import { Router } from "../router.ts";
import { sendJson } from "../http.ts";
import { registerAuthRoutes } from "./auth.ts";
import { registerWineRoutes } from "./wines.ts";
import { registerCartRoutes } from "./cart.ts";

export function createApiRouter(): Router {
  const router = new Router();

  // 動作確認用ヘルスチェック。
  router.get("/api/health", ({ res }) => {
    sendJson(res, 200, { status: "ok", time: new Date().toISOString() });
  });

  registerAuthRoutes(router);
  registerWineRoutes(router);
  registerCartRoutes(router);

  return router;
}
