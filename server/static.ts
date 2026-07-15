// 静的ファイル配信（web/ アセットとワイン画像）。パストラバーサル対策込み。
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import type { ServerResponse } from "node:http";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

/** baseDir 配下の relPath を安全に絶対パスへ解決する。範囲外なら null。 */
export function safeResolve(baseDir: string, relPath: string): string | null {
  const decoded = decodeURIComponent(relPath);
  const target = resolve(baseDir, "." + sep + normalize(decoded));
  const base = resolve(baseDir);
  if (target !== base && !target.startsWith(base + sep)) return null;
  return target;
}

/** 指定ファイルを配信する。存在すれば true、無ければ false（呼び出し側で404）。 */
export async function serveFile(res: ServerResponse, absPath: string): Promise<boolean> {
  try {
    const info = await stat(absPath);
    if (!info.isFile()) return false;
    const type = MIME[extname(absPath).toLowerCase()] ?? "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": type,
      "Content-Length": info.size,
    });
    await new Promise<void>((resolvePromise, rejectPromise) => {
      const stream = createReadStream(absPath);
      stream.on("error", rejectPromise);
      stream.on("end", resolvePromise);
      stream.pipe(res);
    });
    return true;
  } catch {
    return false;
  }
}

/** baseDir 配下の relPath を配信する（解決失敗・不存在は false）。 */
export async function serveFromDir(
  res: ServerResponse,
  baseDir: string,
  relPath: string,
): Promise<boolean> {
  const abs = safeResolve(baseDir, relPath);
  if (!abs) return false;
  return serveFile(res, abs);
}

export { join };
