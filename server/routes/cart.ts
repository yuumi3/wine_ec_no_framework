// カートAPI（全て要ログイン）: 取得・追加・数量変更・削除。
import type { Router } from "../router.ts";
import { HttpError, readJsonBody, sendJson, sendNoContent } from "../http.ts";
import { getDb } from "../db/index.ts";
import { requireUser } from "../auth/middleware.ts";
import { asRecord, toInt } from "../validation.ts";

type CartRow = {
  id: number;
  wineId: number;
  quantity: number;
  name: string;
  price: number;
  currency: string;
  image: string;
};

function imageUrl(image: string): string {
  return `/images/wines/${encodeURIComponent(image)}`;
}

/** ユーザーのカート内容をシリアライズして返す。 */
function getCart(userId: number) {
  const rows = getDb()
    .prepare(
      `SELECT ci.id AS id, ci.wine_id AS wineId, ci.quantity AS quantity,
              w.name AS name, w.price AS price, w.currency AS currency, w.image AS image
         FROM cart_items ci
         JOIN wines w ON w.id = ci.wine_id
        WHERE ci.user_id = ?
        ORDER BY ci.id ASC`,
    )
    .all(userId) as CartRow[];

  const items = rows.map((r) => ({
    id: r.id,
    wineId: r.wineId,
    name: r.name,
    price: r.price,
    currency: r.currency,
    imageUrl: imageUrl(r.image),
    quantity: r.quantity,
    subtotal: r.price * r.quantity,
  }));
  const total = items.reduce((sum, i) => sum + i.subtotal, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return { items, total, count };
}

export function registerCartRoutes(router: Router): void {
  // カート取得
  router.get("/api/cart", ({ req, res }) => {
    const user = requireUser(req);
    sendJson(res, 200, getCart(user.id));
  });

  // カートに追加（既存なら数量加算）
  router.post("/api/cart/items", async ({ req, res }) => {
    const user = requireUser(req);
    const body = asRecord(await readJsonBody(req));

    const wineId = toInt(body.wineId);
    if (wineId === null || wineId <= 0) {
      throw new HttpError(400, "VALIDATION_ERROR", "入力内容を確認してください", {
        wineId: "wineId は正の整数で指定してください",
      });
    }
    const quantity = body.quantity === undefined ? 1 : toInt(body.quantity);
    if (quantity === null || quantity <= 0) {
      throw new HttpError(400, "VALIDATION_ERROR", "入力内容を確認してください", {
        quantity: "quantity は1以上の整数で指定してください",
      });
    }

    const db = getDb();
    const wine = db.prepare("SELECT id FROM wines WHERE id = ?").get(wineId);
    if (!wine) {
      throw new HttpError(404, "WINE_NOT_FOUND", "指定されたワインが見つかりません");
    }

    db.prepare(
      `INSERT INTO cart_items (user_id, wine_id, quantity) VALUES (?, ?, ?)
         ON CONFLICT(user_id, wine_id) DO UPDATE SET quantity = quantity + excluded.quantity`,
    ).run(user.id, wineId, quantity);

    sendJson(res, 201, getCart(user.id));
  });

  // 数量変更
  router.put("/api/cart/items/:id", async ({ req, res, params }) => {
    const user = requireUser(req);
    const itemId = Number.parseInt(params.id ?? "", 10);
    if (!Number.isInteger(itemId)) {
      throw new HttpError(404, "NOT_FOUND", "カート明細が見つかりません");
    }

    const body = asRecord(await readJsonBody(req));
    const quantity = toInt(body.quantity);
    if (quantity === null || quantity <= 0) {
      throw new HttpError(400, "VALIDATION_ERROR", "入力内容を確認してください", {
        quantity: "quantity は1以上の整数で指定してください（削除は DELETE を使用）",
      });
    }

    const result = getDb()
      .prepare("UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?")
      .run(quantity, itemId, user.id);
    if (Number(result.changes) === 0) {
      throw new HttpError(404, "NOT_FOUND", "カート明細が見つかりません");
    }

    sendJson(res, 200, getCart(user.id));
  });

  // 明細削除
  router.delete("/api/cart/items/:id", ({ req, res, params }) => {
    const user = requireUser(req);
    const itemId = Number.parseInt(params.id ?? "", 10);
    if (!Number.isInteger(itemId)) {
      throw new HttpError(404, "NOT_FOUND", "カート明細が見つかりません");
    }

    const result = getDb()
      .prepare("DELETE FROM cart_items WHERE id = ? AND user_id = ?")
      .run(itemId, user.id);
    if (Number(result.changes) === 0) {
      throw new HttpError(404, "NOT_FOUND", "カート明細が見つかりません");
    }

    sendNoContent(res);
  });
}
