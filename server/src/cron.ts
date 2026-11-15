import { DbSchema } from "./types";
import { syncProvider } from "./providerSync";
import dayjs from "dayjs";

export async function runPeriodicFetch(db: {
  data: DbSchema;
  write: () => Promise<void>;
}) {
  let needsSave = false;
  for (const sub of db.data.subscriptions) {
    if (!sub.enabled || sub.configMode !== "visual") continue;
    for (const provider of sub.visualConfig?.proxyProviders || []) {
      if (
        provider.enabled === false ||
        provider.type !== "url" ||
        !provider.url ||
        !provider.updateInterval
      )
        continue;
      const lastAttempt = provider.lastSyncAt || provider.lastFetchTime;
      if (
        lastAttempt &&
        !dayjs().isAfter(
          dayjs(lastAttempt).add(provider.updateInterval, "hour")
        )
      )
        continue;
      await syncProvider(provider);
      sub.lastSyncedAt = provider.lastSyncAt;
      needsSave = true;
    }
  }
  if (needsSave) await db.write();
}

export function startPeriodicFetch(db: {
  data: DbSchema;
  write: () => Promise<void>;
}) {
  setInterval(
    () => {
      runPeriodicFetch(db).catch(() => console.error("定时同步保存失败"));
    },
    1000 * 60 * 60
  );
}
