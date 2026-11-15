import assert from "node:assert/strict";
import test from "node:test";
import { createRouter } from "./routes";
import { runPeriodicFetch } from "./cron";
import type { DbSchema, Subscription } from "./types";

for (const mode of ["manual", "periodic"]) {
  test(`${mode} sync persists success, failure and cached nodes without leaking credentials`, async () => {
    const originalFetch = globalThis.fetch;
    let failing = false;
    const requests: string[] = [];
    globalThis.fetch = async input => {
      requests.push(String(input));
      if (failing) throw new Error("https://secret.test/?token=secret");
      return new Response("proxies:\n  - {name: HK, type: ss}\n");
    };
    try {
      const provider = {
        id: "p",
        name: "source",
        type: "url" as const,
        url: "https://secret.test/?token=secret",
        updateInterval: 1
      };
      const sub = {
        id: "s",
        enabled: true,
        configMode: "visual",
        lastUpdatedAt: "legacy",
        visualConfig: {
          proxyProviders: [provider, { ...provider, id: "off", enabled: false }]
        }
      } as Subscription;
      let writes = 0;
      const db = {
        data: { subscriptions: [sub], users: [], settings: {} } as DbSchema,
        write: async () => {
          writes++;
        }
      };
      const run = async () => {
        if (mode === "periodic") {
          await runPeriodicFetch(db);
          return null;
        }
        const route = createRouter(db).stack.find(
          route => route.path === "/api/subscription/:id/fetch-nodes"
        )!;
        const ctx: any = { params: { id: "s" }, query: {} };
        await route.stack.at(-1)!(ctx, async () => {});
        return ctx;
      };
      await run();
      const saved = sub.visualConfig!.proxyProviders![0];
      assert.equal(saved.lastSyncStatus, "success");
      assert.equal(saved.lastSuccessNodeCount, 1);
      assert.ok(saved.lastFetchTime);
      assert.equal(writes, 1);
      const nodes = saved.fetchedNodes;
      const successTime = saved.lastFetchTime;
      saved.lastSyncAt = "2000-01-01T00:00:00.000Z";
      failing = true;
      const ctx = await run();
      assert.equal(saved.lastSyncStatus, "failed");
      assert.equal(saved.fetchedNodes, nodes);
      assert.equal(saved.lastFetchTime, successTime);
      assert.equal(saved.lastSuccessNodeCount, 1);
      assert.equal(saved.lastSyncError, "网络请求失败，请稍后重试");
      assert.equal(writes, 2);
      assert.equal(requests.length, 2);
      assert.equal(sub.lastUpdatedAt, "legacy");
      if (ctx) {
        assert.equal(ctx.status, 400);
        assert.doesNotMatch(JSON.stringify(ctx.body), /secret/);
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
}

test("client downloads track their own time and preserve configuration timestamp and traffic accounting", async () => {
  const sub = {
    id: "s",
    name: "test",
    enabled: true,
    totalTrafficBytes: null,
    usedTrafficBytes: 10,
    expireAt: "",
    lastUpdatedAt: "legacy",
    configUpdatedAt: "configuration",
    yamlConfig: "proxies: []\nrules: []"
  } as Subscription;
  const router = createRouter({
    data: { subscriptions: [sub], users: [], settings: {} },
    write: async () => {}
  });
  const route = router.stack.find(route => route.path === "/subscribe")!;
  const ctx: any = {
    query: { id: "s" },
    request: { protocol: "http", host: "localhost" },
    get: () => "clash",
    set: () => {}
  };
  await route.stack.at(-1)!(ctx, async () => {});
  assert.equal(sub.lastUpdatedAt, "legacy");
  assert.equal(sub.configUpdatedAt, "configuration");
  assert.ok(sub.lastDownloadedAt);
  assert.equal(sub.usedTrafficBytes, 10 + Buffer.byteLength(ctx.body, "utf8"));
});

test("manual sync returns partial success with persisted failure details", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async input =>
    String(input).includes("bad")
      ? new Response("secret response", { status: 503, statusText: "secret" })
      : new Response("proxies: [{name: HK, type: ss}]");
  try {
    const providers = ["good", "bad"].map(id => ({
      id,
      name: id,
      type: "url" as const,
      url: `https://${id}.test/?token=secret`
    }));
    const sub = {
      id: "s",
      configMode: "visual",
      visualConfig: { proxyProviders: providers }
    } as Subscription;
    let writes = 0;
    const router = createRouter({
      data: { subscriptions: [sub], settings: {}, users: [] },
      write: async () => {
        writes++;
      }
    });
    const route = router.stack.find(
      route => route.path === "/api/subscription/:id/fetch-nodes"
    )!;
    const ctx: any = { params: { id: "s" }, query: {} };
    await route.stack.at(-1)!(ctx, async () => {});
    assert.equal(ctx.body.success, true);
    assert.match(ctx.body.message, /成功更新了 1 个订阅源，失败 1 个/);
    assert.doesNotMatch(ctx.body.message, /secret|https/);
    assert.equal(
      sub.visualConfig!.proxyProviders![1].lastSyncError,
      "订阅源返回 HTTP 503"
    );
    assert.equal(writes, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
