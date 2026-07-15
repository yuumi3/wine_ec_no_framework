// data/wines/wines.json を読み込み wines テーブルへ投入する。
// 既にデータがある場合はスキップ（--force で全削除してから再投入）。
import { readFileSync } from "node:fs";
import { WINES_JSON } from "../config.ts";
import { closeDb, getDb } from "./index.ts";

type WineSeed = {
  name: string;
  image: string;
  category: string;
  region: string;
  appellation: string | null;
  vintage: number | null;
  grape: string | null;
  alcohol: string | null;
  description: string;
  foodPairing: string | null;
  price: number;
  currency: string;
};

export function seed(force = false): number {
  const db = getDb();

  const count = db.prepare("SELECT COUNT(*) AS n FROM wines").get() as { n: number };
  if (count.n > 0 && !force) {
    return 0;
  }
  if (force) {
    db.exec("DELETE FROM wines");
  }

  const raw = readFileSync(WINES_JSON, "utf8");
  const wines = JSON.parse(raw) as WineSeed[];

  const insert = db.prepare(
    `INSERT INTO wines
       (name, price, currency, image, category, region, appellation, vintage, grape, alcohol, description, food_pairing)
     VALUES
       (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  let inserted = 0;
  db.exec("BEGIN");
  try {
    for (const w of wines) {
      insert.run(
        w.name,
        w.price,
        w.currency ?? "JPY",
        w.image,
        w.category,
        w.region,
        w.appellation ?? null,
        w.vintage ?? null,
        w.grape ?? null,
        w.alcohol ?? null,
        w.description ?? "",
        w.foodPairing ?? null,
      );
      inserted++;
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  return inserted;
}

// CLI として実行された場合のみ副作用を起こす。
if (import.meta.url === `file://${process.argv[1]}`) {
  const force = process.argv.includes("--force");
  const n = seed(force);
  if (n === 0) {
    console.log("seed: wines already present, skipped (use --force to reseed).");
  } else {
    console.log(`seed: inserted ${n} wines.`);
  }
  closeDb();
}
