import { after, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createClient, newUserPayload, resetDb, shutdown } from "./helpers.ts";

describe("Auth API", () => {
  beforeEach(() => resetDb());
  after(() => shutdown());

  it("registers a new user and auto-logs-in", async () => {
    const client = createClient();
    const payload = newUserPayload({ email: "alice@example.com" });
    const res = await client.post("/api/auth/register", payload);

    assert.equal(res.status, 201);
    assert.equal(res.json.user.email, "alice@example.com");
    assert.equal(res.json.user.fullName, "山田太郎");
    assert.ok(res.json.user.id > 0);
    assert.ok(res.headers.get("set-cookie")?.includes("sid="));

    // 自動ログイン済みで me が取れる
    const me = await client.get("/api/auth/me");
    assert.equal(me.status, 200);
    assert.equal(me.json.user.email, "alice@example.com");
  });

  it("rejects registration with validation errors", async () => {
    const client = createClient();
    const res = await client.post("/api/auth/register", {
      email: "not-an-email",
      password: "short",
      passwordConfirm: "mismatch",
      fullName: "",
      address: "",
    });
    assert.equal(res.status, 400);
    assert.equal(res.json.error.code, "VALIDATION_ERROR");
    const fields = res.json.error.fields;
    assert.ok(fields.email);
    assert.ok(fields.password);
    assert.ok(fields.passwordConfirm);
    assert.ok(fields.fullName);
    assert.ok(fields.address);
  });

  it("rejects duplicate email with 409", async () => {
    const client = createClient();
    const payload = newUserPayload({ email: "dup@example.com" });
    const first = await client.post("/api/auth/register", payload);
    assert.equal(first.status, 201);

    const second = await client.post("/api/auth/register", newUserPayload({ email: "dup@example.com" }));
    assert.equal(second.status, 409);
    assert.equal(second.json.error.code, "EMAIL_TAKEN");
  });

  it("logs in with correct credentials and rejects wrong password", async () => {
    const reg = createClient();
    await reg.post("/api/auth/register", newUserPayload({ email: "bob@example.com", password: "secret123", passwordConfirm: "secret123" }));

    const client = createClient();
    const ok = await client.post("/api/auth/login", { email: "bob@example.com", password: "secret123" });
    assert.equal(ok.status, 200);
    assert.equal(ok.json.user.email, "bob@example.com");

    const bad = createClient();
    const ng = await bad.post("/api/auth/login", { email: "bob@example.com", password: "wrongpass" });
    assert.equal(ng.status, 401);
    assert.equal(ng.json.error.code, "INVALID_CREDENTIALS");
  });

  it("returns 401 for /me when not logged in", async () => {
    const client = createClient();
    const res = await client.get("/api/auth/me");
    assert.equal(res.status, 401);
    assert.equal(res.json.error.code, "UNAUTHENTICATED");
  });

  it("logs out and invalidates the session", async () => {
    const client = createClient();
    await client.post("/api/auth/register", newUserPayload({ email: "carol@example.com" }));

    const before = await client.get("/api/auth/me");
    assert.equal(before.status, 200);

    const out = await client.post("/api/auth/logout");
    assert.equal(out.status, 204);

    const after = await client.get("/api/auth/me");
    assert.equal(after.status, 401);
  });
});
