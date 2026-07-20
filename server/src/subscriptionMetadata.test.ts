import assert from "node:assert/strict";
import { describe, it } from "node:test";
import dayjs from "dayjs";
import {
  buildSubscriptionInfoBlock,
  buildSubscriptionUserinfo,
  getExpireUnix,
  getExpiryMetadata,
  PERMANENT_EXPIRE_TIME,
  UNLIMITED_TRAFFIC_BYTES
} from "./subscriptionMetadata";

describe("subscription metadata", () => {
  it("uses numeric-compatible expiry metadata for permanent subscriptions", () => {
    const now = dayjs("2026-07-20T00:00:00.000Z");
    const metadata = getExpiryMetadata("", now);

    assert.match(metadata.remainingDays, /^\d+$/);
    assert.equal(metadata.expireTime, PERMANENT_EXPIRE_TIME);
    assert.equal(getExpireUnix(""), dayjs(PERMANENT_EXPIRE_TIME).unix());
  });

  it("keeps the subscription-userinfo expire field numeric for permanent subscriptions", () => {
    const userinfo = buildSubscriptionUserinfo(
      {
        expireAt: "",
        totalTrafficBytes: null
      },
      1024
    );

    assert.equal(
      userinfo,
      `upload=0; download=1024; total=${UNLIMITED_TRAFFIC_BYTES}; expire=${dayjs(
        PERMANENT_EXPIRE_TIME
      ).unix()}`
    );
  });

  it("builds YAML info with numeric remain_days and far-future expire_time", () => {
    const info = buildSubscriptionInfoBlock({
      sub: {
        id: "sub-1",
        name: "华炫之光-订阅版",
        description: "测试订阅",
        expireAt: "",
        totalTrafficBytes: null,
        usedTrafficBytes: 100
      },
      websiteUrl: "https://sub-proxy.example.com",
      sourceUrl: "https://sub-proxy.example.com/subscribe?id=sub-1",
      now: dayjs("2026-07-20T00:00:00.000Z")
    });

    assert.match(info, / remain_days: "\d+"/);
    assert.match(info, new RegExp(` expire_time: "${PERMANENT_EXPIRE_TIME}"`));
    assert.doesNotMatch(info, /永久有效/);
  });
});
