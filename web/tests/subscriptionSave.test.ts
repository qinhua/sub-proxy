import assert from "node:assert/strict";
import test from "node:test";
import {
  hasEnabledProvider,
  needsProviderSync,
  saveThenSync
} from "../src/utils/subscriptionSave.ts";

test("来源增删和开关后按当前状态校验，旧来源默认启用", () => {
  assert.equal(hasEnabledProvider([]), false);
  const providers: any[] = [
    { type: "url", enabled: false, url: "http://local" }
  ];
  assert.equal(hasEnabledProvider(providers), false);
  providers.push({ type: "content" });
  assert.equal(hasEnabledProvider(providers), true);
  assert.equal(needsProviderSync("visual", providers), false);
  providers.pop();
  providers[0].enabled = true;
  assert.equal(hasEnabledProvider(providers), true);
  assert.equal(needsProviderSync("visual", providers), true);
  assert.equal(needsProviderSync("yaml", providers), false);
});

test("保存后只同步一次，区分部分失败、全部失败和真正保存失败", async () => {
  let calls = 0;
  const sync = async () => {
    calls++;
    return {};
  };
  assert.equal(await saveThenSync(async () => "id", sync, true), "synced");
  assert.equal(calls, 1);
  assert.equal(await saveThenSync(async () => "id", sync, false), "saved");
  assert.equal(calls, 1);
  assert.equal(
    await saveThenSync(
      async () => "id",
      async () => ({
        data: {
          visualConfig: {
            proxyProviders: [{ type: "url", lastSyncStatus: "failed" }]
          }
        } as any
      }),
      true
    ),
    "partial"
  );
  assert.equal(
    await saveThenSync(
      async () => "id",
      async () => {
        throw Error("sync");
      },
      true
    ),
    "failed"
  );
  await assert.rejects(
    saveThenSync(
      async () => {
        throw Error("save");
      },
      sync,
      true
    ),
    /save/
  );
  assert.equal(calls, 1);
});
