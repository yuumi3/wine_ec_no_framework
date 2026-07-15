import { after, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createClient, newUserPayload, resetDb, shutdown } from "./helpers.ts";

/** 登録済みのログイン状態のクライアントと、先頭2件のワインIDを返す。 */
async function loggedInClient(email: string) {
  const client = createClient();
  await client.post("/api/auth/register", newUserPayload({ email }));
  const wines = await client.get("/api/wines?limit=2");
  const wineIds = wines.json.items.map((w: any) => w.id) as number[];
  return { client, wineIds };
}

describe("Cart API", () => {
  beforeEach(() => resetDb());
  after(() => shutdown());

  it("requires authentication", async () => {
    const anon = createClient();
    const res = await anon.get("/api/cart");
    assert.equal(res.status, 401);
    assert.equal(res.json.error.code, "UNAUTHENTICATED");
  });

  it("starts with an empty cart", async () => {
    const { client } = await loggedInClient("cart1@example.com");
    const res = await client.get("/api/cart");
    assert.equal(res.status, 200);
    assert.deepEqual(res.json.items, []);
    assert.equal(res.json.total, 0);
    assert.equal(res.json.count, 0);
  });

  it("adds an item and computes subtotal/total/count", async () => {
    const { client, wineIds } = await loggedInClient("cart2@example.com");
    const res = await client.post("/api/cart/items", { wineId: wineIds[0], quantity: 2 });
    assert.equal(res.status, 201);
    assert.equal(res.json.items.length, 1);

    const item = res.json.items[0];
    assert.equal(item.wineId, wineIds[0]);
    assert.equal(item.quantity, 2);
    assert.equal(item.subtotal, item.price * 2);
    assert.equal(res.json.total, item.subtotal);
    assert.equal(res.json.count, 2);
  });

  it("merges quantity when adding the same wine twice", async () => {
    const { client, wineIds } = await loggedInClient("cart3@example.com");
    await client.post("/api/cart/items", { wineId: wineIds[0], quantity: 1 });
    const res = await client.post("/api/cart/items", { wineId: wineIds[0], quantity: 3 });
    assert.equal(res.json.items.length, 1);
    assert.equal(res.json.items[0].quantity, 4);
  });

  it("defaults quantity to 1", async () => {
    const { client, wineIds } = await loggedInClient("cart4@example.com");
    const res = await client.post("/api/cart/items", { wineId: wineIds[0] });
    assert.equal(res.json.items[0].quantity, 1);
  });

  it("returns 404 when adding a non-existent wine", async () => {
    const { client } = await loggedInClient("cart5@example.com");
    const res = await client.post("/api/cart/items", { wineId: 999999 });
    assert.equal(res.status, 404);
    assert.equal(res.json.error.code, "WINE_NOT_FOUND");
  });

  it("updates item quantity", async () => {
    const { client, wineIds } = await loggedInClient("cart6@example.com");
    const added = await client.post("/api/cart/items", { wineId: wineIds[0], quantity: 1 });
    const itemId = added.json.items[0].id;

    const res = await client.put(`/api/cart/items/${itemId}`, { quantity: 5 });
    assert.equal(res.status, 200);
    assert.equal(res.json.items[0].quantity, 5);
  });

  it("rejects quantity <= 0 on update", async () => {
    const { client, wineIds } = await loggedInClient("cart7@example.com");
    const added = await client.post("/api/cart/items", { wineId: wineIds[0], quantity: 1 });
    const itemId = added.json.items[0].id;

    const res = await client.put(`/api/cart/items/${itemId}`, { quantity: 0 });
    assert.equal(res.status, 400);
    assert.equal(res.json.error.code, "VALIDATION_ERROR");
  });

  it("deletes an item", async () => {
    const { client, wineIds } = await loggedInClient("cart8@example.com");
    const added = await client.post("/api/cart/items", { wineId: wineIds[0], quantity: 1 });
    const itemId = added.json.items[0].id;

    const del = await client.delete(`/api/cart/items/${itemId}`);
    assert.equal(del.status, 204);

    const cart = await client.get("/api/cart");
    assert.equal(cart.json.items.length, 0);
  });

  it("does not allow modifying another user's cart item", async () => {
    const a = await loggedInClient("owner@example.com");
    const added = await a.client.post("/api/cart/items", { wineId: a.wineIds[0], quantity: 1 });
    const itemId = added.json.items[0].id;

    const b = await loggedInClient("attacker@example.com");
    const put = await b.client.put(`/api/cart/items/${itemId}`, { quantity: 9 });
    assert.equal(put.status, 404);

    const del = await b.client.delete(`/api/cart/items/${itemId}`);
    assert.equal(del.status, 404);
  });
});
