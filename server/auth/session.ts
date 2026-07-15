// サーバ側セッションの発行・検証・破棄。sessions テーブルで管理する。
import { randomBytes } from "node:crypto";
import { getDb } from "../db/index.ts";
import { SESSION_TTL_DAYS } from "../config.ts";

export const SESSION_COOKIE = "sid";
export const SESSION_TTL_SECONDS = SESSION_TTL_DAYS * 24 * 60 * 60;

export type SessionUser = {
  id: number;
  email: string;
  fullName: string;
};

/** 新しいセッションを発行し、セッションID を返す。 */
export function createSession(userId: number): string {
  const id = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
  getDb()
    .prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
    .run(id, userId, expiresAt);
  return id;
}

/** セッションID から有効なユーザーを解決する。無効・期限切れなら null。 */
export function getSessionUser(sessionId: string | undefined): SessionUser | null {
  if (!sessionId) return null;
  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.id AS id, u.email AS email, u.full_name AS fullName, s.expires_at AS expiresAt
         FROM sessions s
         JOIN users u ON u.id = s.user_id
        WHERE s.id = ?`,
    )
    .get(sessionId) as { id: number; email: string; fullName: string; expiresAt: string } | undefined;

  if (!row) return null;
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    destroySession(sessionId);
    return null;
  }
  return { id: row.id, email: row.email, fullName: row.fullName };
}

/** セッションを破棄する。 */
export function destroySession(sessionId: string | undefined): void {
  if (!sessionId) return;
  getDb().prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
}
