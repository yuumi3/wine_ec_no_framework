// node:sqlite への接続を集約する。プロセス内で単一のコネクションを共有する。
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DB_PATH } from "../config.ts";

const here = dirname(fileURLToPath(import.meta.url)); // server/db/
const SCHEMA_PATH = resolve(here, "schema.sql");

let db: DatabaseSync | null = null;

/** 単一の DB コネクションを返す（初回にスキーマを適用する）。 */
export function getDb(): DatabaseSync {
  if (db) return db;
  db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA foreign_keys = ON;");
  migrate(db);
  return db;
}

/** schema.sql を適用する（IF NOT EXISTS のため冪等）。 */
export function migrate(connection: DatabaseSync = getDb()): void {
  const schema = readFileSync(SCHEMA_PATH, "utf8");
  connection.exec(schema);
}

/** 主にテストで利用。コネクションを閉じて次回再取得できるようにする。 */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
