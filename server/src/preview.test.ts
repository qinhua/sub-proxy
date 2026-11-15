import assert from "node:assert/strict";
import test from "node:test";
import { createRouter } from "./routes";
import type { Subscription, DbSchema } from "./types";

test("preview without enabled providers remains available without saving", async () => {
  const sub = {
    name: "empty preview",
    configMode: "visual",
    visualConfig: { proxyProviders: [{ enabled: false }] }
  } as Subscription;
  let writes = 0;
  const db = {
    data: { subscriptions: [], users: [], settings: {} } as DbSchema,
    write: async () => {
      writes++;
    }
  };
  const route = createRouter(db).stack.find(
    item => item.path === "/api/subscription/preview"
  )!;
  const ctx: any = {
    request: { body: sub, protocol: "http", host: "localhost" },
    query: {}
  };

  await route.stack.at(-1)!(ctx, async () => {});

  assert.equal(ctx.body.success, true);
  assert.match(ctx.body.data.content, /DIRECT/);
  assert.equal(writes, 0);
  assert.equal(db.data.subscriptions.length, 0);
});

for (const refresh of [false, true]) {
  test(`${refresh ? "refresh" : "cached"} preview is isolated and reports source failures`, async () => {
    const originalFetch = globalThis.fetch;
    const requests: string[] = [];
    globalThis.fetch = async input => {
      requests.push(String(input));
      if (String(input).includes("bad")) throw new Error("secret credentials");
      return new Response("proxies: [{name: refreshed, type: ss}]");
    };
    try {
      const sub = {
        id: "s",
        name: "preview",
        configMode: "visual",
        visualConfig: {
          proxyProviders: [
            {
              id: "good",
              name: "正常来源",
              type: "url",
              url: "https://good.test",
              fetchedNodes: [{ name: "cached", type: "ss" }]
            },
            {
              id: "bad",
              name: "失败来源",
              type: "url",
              url: "https://bad.test",
              fetchedNodes: [{ name: "fallback", type: "ss" }]
            },
            {
              id: "off",
              name: "停用",
              type: "url",
              enabled: false,
              url: "https://off.test"
            },
            {
              id: "direct",
              name: "直接内容",
              type: "content",
              content: "[{name: direct, type: ss}]"
            }
          ]
        }
      } as Subscription;
      const before = structuredClone(sub);
      let writes = 0;
      const db = {
        data: { subscriptions: [sub], users: [], settings: {} } as DbSchema,
        write: async () => {
          writes++;
        }
      };
      const route = createRouter(db).stack.find(
        route => route.path === "/api/subscription/preview"
      )!;
      const ctx: any = {
        request: { body: sub, protocol: "http", host: "localhost" },
        query: refresh ? { refresh: "true" } : {}
      };
      await route.stack.at(-1)!(ctx, async () => {});
      assert.equal(ctx.body.success, true);
      assert.equal(writes, 0);
      assert.deepEqual(sub, before);
      const { content, failedProviders } = ctx.body.data;
      assert.match(content, /fallback/);
      assert.match(content, /direct/);
      if (refresh) {
        assert.deepEqual(requests, ["https://good.test", "https://bad.test"]);
        assert.match(content, /refreshed/);
        assert.deepEqual(failedProviders, [
          { name: "失败来源", error: "网络请求失败，请稍后重试" }
        ]);
        assert.match(ctx.body.message, /刷新失败/);
        assert.doesNotMatch(JSON.stringify(ctx.body), /secret/);
      } else {
        assert.deepEqual(requests, []);
        assert.match(content, /cached/);
        assert.deepEqual(failedProviders, []);
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
}
