import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createClient, resetDb, shutdown } from "./helpers.ts";

describe("Wines API", () => {
  before(() => resetDb());
  after(() => shutdown());

  it("returns first 10 wines by default with nextCursor", async () => {
    const client = createClient();
    const res = await client.get("/api/wines");
    assert.equal(res.status, 200);
    assert.equal(res.json.items.length, 10);
    assert.ok(res.json.nextCursor !== null);

    const first = res.json.items[0];
    assert.ok(typeof first.id === "number");
    assert.ok(typeof first.name === "string");
    assert.ok(typeof first.price === "number");
    assert.match(first.imageUrl, /^\/images\/wines\//);
  });

  it("paginates through all 20 wines via cursor", async () => {
    const client = createClient();
    const seen = new Set<number>();
    let cursor: number | null = null;
    let guard = 0;

    do {
      const path = cursor === null ? "/api/wines?limit=7" : `/api/wines?limit=7&cursor=${cursor}`;
      const res = await client.get(path);
      assert.equal(res.status, 200);
      for (const item of res.json.items) seen.add(item.id);
      cursor = res.json.nextCursor;
      guard++;
    } while (cursor !== null && guard < 10);

    assert.equal(seen.size, 20);
  });

  it("encodes image filenames with spaces/accents", async () => {
    const client = createClient();
    const res = await client.get("/api/wines?limit=20");
    const withSpace = res.json.items.find((i: any) => i.name === "Château Haut-Bois");
    assert.ok(withSpace);
    assert.ok(!withSpace.imageUrl.includes(" "));
    assert.match(withSpace.imageUrl, /%/); // percent-encoded
  });

  it("returns wine detail with extended fields", async () => {
    const client = createClient();
    const list = await client.get("/api/wines?limit=1");
    const id = list.json.items[0].id;

    const res = await client.get(`/api/wines/${id}`);
    assert.equal(res.status, 200);
    assert.equal(res.json.id, id);
    assert.ok("description" in res.json);
    assert.ok("category" in res.json);
    assert.ok("region" in res.json);
    assert.ok("foodPairing" in res.json);
  });

  it("returns 404 for unknown wine", async () => {
    const client = createClient();
    const res = await client.get("/api/wines/999999");
    assert.equal(res.status, 404);
    assert.equal(res.json.error.code, "NOT_FOUND");
  });
});
