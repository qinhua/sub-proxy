import assert from "node:assert/strict";
import test from "node:test";
import { createRouter } from "./routes";
import { validateVisualConfig } from "./visualConfigValidation";
import type { DbSchema, Subscription } from "./types";

const body = {
  name: "test",
  totalTrafficBytes: null,
  startAt: "",
  expireAt: "",
  configMode: "visual",
  visualConfig: { proxyProviders: [] }
};

test("create, update and preview reject zero enabled providers without writes", async () => {
  for (const providers of [[], [{ enabled: false }]]) {
    for (const [method, path] of [
      ["POST", "/api/subscription"],
      ["PUT", "/api/subscription/:id"],
      ["POST", "/api/subscription/preview"]
    ]) {
      const original = {
        ...body,
        id: "existing",
        visualConfig: {
          proxyProviders: [
            { id: "a", name: "old", type: "url", url: "https://example.test" }
          ]
        }
      } as Subscription;
      const data = {
        subscriptions: [original],
        settings: {},
        users: []
      } as DbSchema;
      let writes = 0;
      const router = createRouter({
        data,
        write: async () => {
          writes++;
        }
      });
      const route = router.stack.find(
        r => r.path === path && r.methods.includes(method)
      )!;
      const ctx: any = {
        request: {
          body: { ...body, visualConfig: { proxyProviders: providers } }
        },
        params: { id: "existing" },
        query: {}
      };
      await route.stack[route.stack.length - 1](ctx, async () => {});
      assert.equal(ctx.status, 400);
      assert.equal(ctx.body.success, false);
      assert.match(ctx.body.message, /至少启用一个/);
      assert.equal(writes, 0);
      assert.equal(data.subscriptions.length, 1);
      assert.equal(data.subscriptions[0], original);
    }
  }
});

test("validation accepts legacy enabled sources and incomplete disabled sources", () => {
  assert.equal(
    validateVisualConfig({
      configMode: "visual",
      visualConfig: {
        proxyProviders: [
          {
            id: "legacy",
            name: "legacy",
            type: "url",
            url: "https://example.test/sub"
          },
          { enabled: false } as any
        ]
      }
    }),
    undefined
  );
  assert.equal(validateVisualConfig({ configMode: "yaml" }), undefined);
});

test("validation rejects incomplete enabled sources and malformed node content", () => {
  for (const source of [
    { name: "", type: "url" },
    { name: "a", type: "invalid" },
    { name: "a", type: "url", url: "file:///tmp/test" },
    { name: "a", type: "content", content: "[" },
    { name: "a", type: "content", content: "[]" },
    { name: "a", type: "content", content: "- name: a" }
  ]) {
    assert.ok(
      validateVisualConfig({
        configMode: "visual",
        visualConfig: { proxyProviders: [source as any] }
      })
    );
  }
});
