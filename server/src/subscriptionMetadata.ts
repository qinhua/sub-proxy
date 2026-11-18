import dayjs, { Dayjs } from "dayjs";
import { isPermanentSubscription } from "@sub-proxy/types";
import { Subscription } from "./types";

// 用一个足够远的真实时间表示永久有效，避免订阅客户端无法解析中文值。
export const PERMANENT_EXPIRE_TIME = "2200-12-31 23:59:59";
export const UNLIMITED_TRAFFIC_BYTES = 1024 * 1024 * 1024 * 1024 * 1024 * 1000;

export function getExpiryMetadata(expireAt?: string | null, now = dayjs()) {
  const effectiveExpireAt = isPermanentSubscription(expireAt)
    ? dayjs(PERMANENT_EXPIRE_TIME)
    : dayjs(expireAt);

  return {
    remainingDays: String(Math.max(0, effectiveExpireAt.diff(now, "day"))),
    expireTime: effectiveExpireAt.format("YYYY-MM-DD HH:mm:ss")
  };
}

export function getExpireUnix(expireAt?: string | null) {
  const effectiveExpireAt = isPermanentSubscription(expireAt)
    ? dayjs(PERMANENT_EXPIRE_TIME)
    : dayjs(expireAt);

  return effectiveExpireAt.unix();
}

export function getSubscriptionTotalTraffic(
  sub: Pick<Subscription, "totalTrafficBytes">
) {
  return sub.totalTrafficBytes === null
    ? UNLIMITED_TRAFFIC_BYTES
    : sub.totalTrafficBytes || 0;
}

export function buildSubscriptionUserinfo(
  sub: Pick<Subscription, "expireAt" | "totalTrafficBytes">,
  usedTraffic = 0
) {
  return `upload=0; download=${usedTraffic}; total=${getSubscriptionTotalTraffic(
    sub
  )}; expire=${getExpireUnix(sub.expireAt)}`;
}

function quoteYamlString(value: string) {
  return JSON.stringify(value);
}

export function buildSubscriptionInfoBlock({
  sub,
  sourceUrl,
  websiteUrl,
  now = dayjs(),
  withComments = false
}: {
  sub: Pick<
    Subscription,
    | "id"
    | "name"
    | "description"
    | "expireAt"
    | "totalTrafficBytes"
    | "usedTrafficBytes"
  >;
  sourceUrl: string;
  websiteUrl: string;
  now?: Dayjs;
  withComments?: boolean;
}) {
  const usedTraffic = sub.usedTrafficBytes || 0;
  const { remainingDays, expireTime } = getExpiryMetadata(sub.expireAt, now);
  const updatedAt = now.format("YYYY-MM-DD HH:mm:ss");
  const totalTraffic = getSubscriptionTotalTraffic(sub);
  const description = sub.description || "由 Sub-Proxy 生成的订阅配置";

  const comment = (text: string) => (withComments ? `  # ${text}` : "");

  return [
    "info:",
    ` id: ${quoteYamlString(sub.id)}${comment("订阅ID")}`,
    ` title: ${quoteYamlString(sub.name)}${comment("标题")}`,
    ` website: ${quoteYamlString(websiteUrl)}${comment("网站")}`,
    ` source: ${quoteYamlString(sourceUrl)}${comment("来源")}`,
    ` description: ${quoteYamlString(description)}${comment("描述")}`,
    ` upload: 0${comment("已上传流量（字节）")}`,
    ` download: ${usedTraffic}${comment("已下载流量（字节）")}`,
    ` total: ${totalTraffic}${comment("总流量（字节）")}`,
    ` support: ["clash", "openclash", "clash verge", "shadowrocket"]${comment(
      "支持软件"
    )}`,
    ` remain_days: ${quoteYamlString(remainingDays)}${comment("剩余天数")}`,
    ` expire_time: ${quoteYamlString(expireTime)}${comment("到期时间")}`,
    ` last_update: ${quoteYamlString(updatedAt)}${comment("上次更新时间")}`
  ].join("\n");
}
