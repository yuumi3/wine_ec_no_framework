// スキーマ適用用の CLI。`--reset` で既存 DB ファイルを削除してから作り直す。
import { existsSync, rmSync } from "node:fs";
import { DB_PATH } from "../config.ts";
import { closeDb, getDb } from "./index.ts";

const reset = process.argv.includes("--reset");

if (reset && existsSync(DB_PATH)) {
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    const path = DB_PATH + suffix;
    if (existsSync(path)) rmSync(path);
  }
  console.log(`migrate: removed existing DB (${DB_PATH})`);
}

getDb(); // 接続時にスキーマが適用される
closeDb();
console.log("migrate: schema applied.");
