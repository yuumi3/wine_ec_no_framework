// Cookie からログインユーザーを解決する。要ログインエンドポイント向けの補助。
import type { IncomingMessage } from "node:http";
import { HttpError, parseCookies } from "../http.ts";
import { getSessionUser, SESSION_COOKIE, type SessionUser } from "./session.ts";

/** ログイン中ならユーザー、未ログインなら null。 */
export function currentUser(req: IncomingMessage): SessionUser | null {
  const cookies = parseCookies(req);
  return getSessionUser(cookies[SESSION_COOKIE]);
}

/** ログイン必須。未ログインなら 401 を throw する。 */
export function requireUser(req: IncomingMessage): SessionUser {
  const user = currentUser(req);
  if (!user) {
    throw new HttpError(401, "UNAUTHENTICATED", "ログインが必要です");
  }
  return user;
}
