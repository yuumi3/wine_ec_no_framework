// 認証API: 登録・ログイン・ログアウト・現在ユーザー取得。
import type { ServerResponse } from "node:http";
import type { Router } from "../router.ts";
import {
  appendCookie,
  HttpError,
  readJsonBody,
  sendJson,
  sendNoContent,
  serializeCookie,
} from "../http.ts";
import { getDb } from "../db/index.ts";
import { hashPassword, verifyPassword } from "../auth/password.ts";
import {
  createSession,
  destroySession,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  type SessionUser,
} from "../auth/session.ts";
import { requireUser } from "../auth/middleware.ts";
import { parseCookies } from "../http.ts";
import { asRecord, FieldErrors, isEmail, PASSWORD_MIN_LENGTH, str } from "../validation.ts";

type UserRow = { id: number; email: string; full_name: string; password_hash: string };

function publicUser(u: SessionUser): { id: number; email: string; fullName: string } {
  return { id: u.id, email: u.email, fullName: u.fullName };
}

function setSessionCookie(res: ServerResponse, sessionId: string): void {
  appendCookie(
    res,
    serializeCookie(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "Lax",
      path: "/",
      maxAgeSeconds: SESSION_TTL_SECONDS,
    }),
  );
}

function clearSessionCookie(res: ServerResponse): void {
  appendCookie(
    res,
    serializeCookie(SESSION_COOKIE, "", { httpOnly: true, sameSite: "Lax", path: "/", maxAgeSeconds: 0 }),
  );
}

export function registerAuthRoutes(router: Router): void {
  // 新規登録（成功で自動ログイン）
  router.post("/api/auth/register", async ({ req, res }) => {
    const body = asRecord(await readJsonBody(req));
    const email = str(body.email).trim();
    const password = str(body.password);
    const passwordConfirm = str(body.passwordConfirm);
    const fullName = str(body.fullName).trim();
    const address = str(body.address).trim();

    const errors = new FieldErrors();
    if (email === "") errors.add("email", "メールアドレスは必須です");
    else if (!isEmail(email)) errors.add("email", "メールアドレスの形式が正しくありません");

    if (password === "") errors.add("password", "パスワードは必須です");
    else if (password.length < PASSWORD_MIN_LENGTH)
      errors.add("password", `パスワードは${PASSWORD_MIN_LENGTH}文字以上で入力してください`);

    if (passwordConfirm === "") errors.add("passwordConfirm", "パスワード確認は必須です");
    else if (password !== passwordConfirm)
      errors.add("passwordConfirm", "パスワードが一致しません");

    if (fullName === "") errors.add("fullName", "氏名は必須です");
    if (address === "") errors.add("address", "住所は必須です");
    errors.throwIfAny();

    const db = getDb();
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) {
      throw new HttpError(409, "EMAIL_TAKEN", "このメールアドレスは既に登録されています", {
        email: "このメールアドレスは既に登録されています",
      });
    }

    const result = db
      .prepare("INSERT INTO users (email, password_hash, full_name, address) VALUES (?, ?, ?, ?)")
      .run(email, hashPassword(password), fullName, address);
    const userId = Number(result.lastInsertRowid);

    const sessionId = createSession(userId);
    setSessionCookie(res, sessionId);
    sendJson(res, 201, { user: { id: userId, email, fullName } });
  });

  // ログイン
  router.post("/api/auth/login", async ({ req, res }) => {
    const body = asRecord(await readJsonBody(req));
    const email = str(body.email).trim();
    const password = str(body.password);

    const errors = new FieldErrors();
    if (email === "") errors.add("email", "メールアドレスは必須です");
    if (password === "") errors.add("password", "パスワードは必須です");
    errors.throwIfAny();

    const db = getDb();
    const row = db
      .prepare("SELECT id, email, full_name, password_hash FROM users WHERE email = ?")
      .get(email) as UserRow | undefined;

    if (!row || !verifyPassword(password, row.password_hash)) {
      throw new HttpError(401, "INVALID_CREDENTIALS", "メールアドレスまたはパスワードが違います");
    }

    const sessionId = createSession(row.id);
    setSessionCookie(res, sessionId);
    sendJson(res, 200, { user: { id: row.id, email: row.email, fullName: row.full_name } });
  });

  // ログアウト
  router.post("/api/auth/logout", ({ req, res }) => {
    const cookies = parseCookies(req);
    destroySession(cookies[SESSION_COOKIE]);
    clearSessionCookie(res);
    sendNoContent(res);
  });

  // 現在のログインユーザー
  router.get("/api/auth/me", ({ req, res }) => {
    const user = requireUser(req);
    sendJson(res, 200, { user: publicUser(user) });
  });
}
