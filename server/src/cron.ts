import { DbSchema } from "./types";
import { fetchProxyNodesFromUrl } from "./utils";
import dayjs from "dayjs";

export function startPeriodicFetch(db: {
  data: DbSchema;
  write: () => Promise<void>;
}) {
  // Check every hour
  setInterval(
    async () => {
      try {
        let needsSave = false;

        for (const sub of db.data.subscriptions) {
          if (
            sub.enabled &&
            sub.configMode === "visual" &&
            sub.visualConfig?.proxyProviders
          ) {
            for (const provider of sub.visualConfig.proxyProviders) {
              if (
                provider.type === "url" &&
                provider.url &&
                provider.updateInterval
              ) {
                const lastFetch = provider.lastFetchTime
                  ? dayjs(provider.lastFetchTime)
                  : null;
                const nextFetch = lastFetch
                  ? lastFetch.add(provider.updateInterval, "hour")
                  : dayjs().subtract(1, "minute");

                if (dayjs().isAfter(nextFetch)) {
                  try {
                    console.log(
                      `Periodic fetch for provider ${provider.name} in sub ${sub.name}`
                    );
                    const nodes = await fetchProxyNodesFromUrl(provider.url);
                    provider.fetchedNodes = nodes;
                    provider.lastFetchTime = dayjs().toISOString();
                    needsSave = true;
                  } catch (error: any) {
                    console.error(
                      `Periodic fetch failed for provider ${provider.name}: ${error.message}`
                    );
                  }
                }
              }
            }
          }
        }

        if (needsSave) {
          await db.write();
          console.log("Periodic fetch completed and saved to DB.");
        }
      } catch (e) {
        console.error("Error in periodic fetch loop:", e);
      }
    },
    1000 * 60 * 60
  ); // 1 hour
}
