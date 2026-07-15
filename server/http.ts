// node:http の生の req/res を扱うための薄いヘルパ群（フレームワーク不使用）。
import type { IncomingMessage, ServerResponse } from "node:http";

const MAX_BODY_BYTES = 1_000_000; // 1MB

/** リクエストボディを JSON として読み取る。空ボディは {} を返す。 */
export async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      throw new HttpError(413, "PAYLOAD_TOO_LARGE", "リクエストが大きすぎます");
    }
    chunks.push(chunk as Buffer);
  }
  if (chunks.length === 0) return {};
  const text = Buffer.concat(chunks).toString("utf8").trim();
  if (text === "") return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "INVALID_JSON", "リクエストボディが不正なJSONです");
  }
}

/** JSON レスポンスを返す。 */
export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(text),
  });
  res.end(text);
}

/** 204 No Content を返す。 */
export function sendNoContent(res: ServerResponse): void {
  res.writeHead(204);
  res.end();
}

/** エラー形式 { error: { code, message, fields? } } で返す。 */
export function sendError(
  res: ServerResponse,
  status: number,
  code: string,
  message: string,
  fields?: Record<string, string>,
): void {
  sendJson(res, status, { error: { code, message, ...(fields ? { fields } : {}) } });
}

/** ハンドラ内で throw して集約的にエラー応答へ変換するための型。 */
export class HttpError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;
  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

/** Cookie ヘッダをパースして key-value にする。 */
export function parseCookies(req: IncomingMessage): Record<string, string> {
  const header = req.headers.cookie;
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

export type CookieOptions = {
  maxAgeSeconds?: number;
  httpOnly?: boolean;
  sameSite?: "Lax" | "Strict" | "None";
  path?: string;
  expires?: Date;
};

/** Set-Cookie ヘッダ用の文字列を組み立てる。 */
export function serializeCookie(name: string, value: string, opts: CookieOptions = {}): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${opts.path ?? "/"}`);
  parts.push(`SameSite=${opts.sameSite ?? "Lax"}`);
  if (opts.httpOnly ?? true) parts.push("HttpOnly");
  if (opts.maxAgeSeconds !== undefined) parts.push(`Max-Age=${opts.maxAgeSeconds}`);
  if (opts.expires) parts.push(`Expires=${opts.expires.toUTCString()}`);
  return parts.join("; ");
}

/** 既存の Set-Cookie に追記する（複数 Cookie 対応）。 */
export function appendCookie(res: ServerResponse, cookie: string): void {
  const existing = res.getHeader("Set-Cookie");
  if (existing === undefined) {
    res.setHeader("Set-Cookie", cookie);
  } else if (Array.isArray(existing)) {
    res.setHeader("Set-Cookie", [...existing, cookie]);
  } else {
    res.setHeader("Set-Cookie", [String(existing), cookie]);
  }
}
