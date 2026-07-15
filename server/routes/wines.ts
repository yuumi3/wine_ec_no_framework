// ワインAPI: 一覧（カーソルページング）・詳細。
import type { Router } from "../router.ts";
import { HttpError, sendJson } from "../http.ts";
import { getDb } from "../db/index.ts";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

type WineRow = {
  id: number;
  name: string;
  price: number;
  currency: string;
  image: string;
  category: string;
  region: string;
  appellation: string | null;
  vintage: number | null;
  grape: string | null;
  alcohol: string | null;
  description: string;
  food_pairing: string | null;
};

function imageUrl(image: string): string {
  return `/images/wines/${encodeURIComponent(image)}`;
}

function toListItem(row: WineRow) {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    currency: row.currency,
    imageUrl: imageUrl(row.image),
  };
}

function toDetail(row: WineRow) {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    currency: row.currency,
    imageUrl: imageUrl(row.image),
    description: row.description,
    category: row.category,
    region: row.region,
    appellation: row.appellation,
    vintage: row.vintage,
    grape: row.grape,
    alcohol: row.alcohol,
    foodPairing: row.food_pairing,
  };
}

export function registerWineRoutes(router: Router): void {
  // 一覧（?cursor=<id>&limit=10）
  router.get("/api/wines", ({ res, query }) => {
    const rawLimit = Number.parseInt(query.get("limit") ?? "", 10);
    const limit = Number.isInteger(rawLimit)
      ? Math.min(Math.max(rawLimit, 1), MAX_LIMIT)
      : DEFAULT_LIMIT;

    const rawCursor = query.get("cursor");
    const cursor = rawCursor !== null && /^\d+$/.test(rawCursor) ? Number.parseInt(rawCursor, 10) : null;

    const db = getDb();
    // limit+1 件取得し、超過分の有無で nextCursor を決める。
    const rows = (
      cursor === null
        ? db.prepare("SELECT * FROM wines ORDER BY id ASC LIMIT ?").all(limit + 1)
        : db.prepare("SELECT * FROM wines WHERE id > ? ORDER BY id ASC LIMIT ?").all(cursor, limit + 1)
    ) as WineRow[];

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const items = page.map(toListItem);
    const nextCursor = hasMore && page.length > 0 ? page[page.length - 1]!.id : null;

    sendJson(res, 200, { items, nextCursor });
  });

  // 詳細
  router.get("/api/wines/:id", ({ res, params }) => {
    const id = Number.parseInt(params.id ?? "", 10);
    if (!Number.isInteger(id)) {
      throw new HttpError(404, "NOT_FOUND", "ワインが見つかりません");
    }
    const row = getDb().prepare("SELECT * FROM wines WHERE id = ?").get(id) as WineRow | undefined;
    if (!row) {
      throw new HttpError(404, "NOT_FOUND", "ワインが見つかりません");
    }
    sendJson(res, 200, toDetail(row));
  });
}
