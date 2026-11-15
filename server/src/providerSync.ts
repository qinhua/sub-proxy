import { Subscription } from "./types";
import { fetchProxyNodesFromUrl } from "./utils";

type Provider = NonNullable<
  NonNullable<Subscription["visualConfig"]>["proxyProviders"]
>[number];

// 错误文本只使用本地定义的信息，避免第三方响应、URL 或凭据进入状态及日志。
export async function syncProvider(provider: Provider, userAgent?: string) {
  provider.lastSyncAt = new Date().toISOString();
  try {
    const nodes = await fetchProxyNodesFromUrl(provider.url!, userAgent);
    provider.fetchedNodes = nodes;
    provider.lastFetchTime = provider.lastSyncAt;
    provider.lastSuccessNodeCount = nodes.length;
    provider.lastSyncStatus = "success";
    delete provider.lastSyncError;
    return true;
  } catch (error) {
    provider.lastSyncStatus = "failed";
    provider.lastSyncError =
      error instanceof Error ? error.message : "网络请求失败，请稍后重试";
    return false;
  }
}
