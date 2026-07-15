// アプリ全体で共有する設定値・パス解決。
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url)); // server/
export const ROOT_DIR = resolve(here, "..");

export const DATA_DIR = resolve(ROOT_DIR, "data");
export const WINES_DATA_DIR = resolve(DATA_DIR, "wines");
export const WINES_JSON = resolve(WINES_DATA_DIR, "wines.json");
export const WEB_DIR = resolve(ROOT_DIR, "web");

// テスト時は WINE_EC_DB=:memory: 等で差し替え可能にする。
export const DB_PATH = process.env.WINE_EC_DB ?? resolve(DATA_DIR, "wine_ec.db");

export const PORT = Number(process.env.PORT ?? 3000);

// セッションの有効期間（日数）。
export const SESSION_TTL_DAYS = 7;
