import type { Subscription } from "../types";

type Provider = NonNullable<
  NonNullable<Subscription["visualConfig"]>["proxyProviders"]
>[number];

export const hasEnabledProvider = (providers: Provider[] = []) =>
  providers.some(provider => provider && provider.enabled !== false);

export const needsProviderSync = (mode: string, providers: Provider[] = []) =>
  mode === "visual" &&
  providers.some(
    provider =>
      provider?.enabled !== false &&
      provider?.type === "url" &&
      provider.url?.trim()
  );

// 保存失败向调用方抛出；保存完成后的同步失败作为独立结果返回。
export async function saveThenSync(
  save: () => Promise<string>,
  sync: (id: string) => Promise<{ data?: Subscription }>,
  needsSync: boolean
): Promise<"saved" | "synced" | "partial" | "failed"> {
  const id = await save();
  if (!needsSync) return "saved";
  try {
    if (!id) return "failed";
    const result = await sync(id);
    return result.data?.visualConfig?.proxyProviders?.some(
      provider =>
        provider.enabled !== false &&
        provider.type === "url" &&
        provider.lastSyncStatus === "failed"
    )
      ? "partial"
      : "synced";
  } catch {
    return "failed";
  }
}
