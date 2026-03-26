import { api } from "../api";
import { useSubscriptionStore } from "../stores/subscriptionStore";

/**
 * 初始化订阅基础 URL（在应用启动时调用）
 */
export async function initializeSubscriptionBaseUrl(): Promise<string> {
  const { baseUrl, setBaseUrl, setLoading } = useSubscriptionStore.getState();

  // 如果已经有缓存，直接返回
  if (baseUrl) return baseUrl;

  setLoading(true);

  try {
    // 生产环境：直接使用当前页面的 origin
    if (process.env.NODE_ENV !== "development") {
      const prodUrl = window.location.origin;
      setBaseUrl(prodUrl);
      return prodUrl;
    }

    // 开发环境：调用后端 API 获取局域网 IP
    const response = await api.getSubscriptionBaseUrl();
    const subscriptionBaseUrl =
      response.data?.subscriptionBaseUrl || window.location.origin;
    setBaseUrl(subscriptionBaseUrl);
    return subscriptionBaseUrl;
  } catch (error) {
    console.error("获取订阅基础 URL 失败:", error);
    // 如果请求失败，返回当前页面的 origin
    const fallbackUrl = window.location.origin;
    setBaseUrl(fallbackUrl);
    return fallbackUrl;
  } finally {
    setLoading(false);
  }
}

/**
 * 获取订阅基础 URL（从缓存中获取）
 */
export function getSubscriptionBaseUrl(): string {
  const { baseUrl } = useSubscriptionStore.getState();
  return baseUrl || window.location.origin;
}

/**
 * 清除缓存
 */
export function clearSubscriptionUrlCache(): void {
  const { clearBaseUrl } = useSubscriptionStore.getState();
  clearBaseUrl();
}

/**
 * 构建订阅 URL
 * @param subId 订阅ID
 * @param withTs 是否添加时间戳
 * @param returnYaml 是否返回YAML
 */
export function buildSubscriptionUrl(
  subId: string,
  withTs = true,
  returnYaml = false
): string {
  const baseUrl = getSubscriptionBaseUrl();
  const url = `${baseUrl.replace(/\/$/, "")}/subscribe?id=${subId}`;
  if (returnYaml) {
    return withTs ? `${url}&yaml=1&t=${Date.now()}` : `${url}&yaml=1`;
  }
  return withTs ? `${url}&t=${Date.now()}` : url;
}
