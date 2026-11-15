import YAML from "yaml";
import { Subscription } from "./types";

export function validateVisualConfig(
  sub: Pick<Subscription, "configMode" | "visualConfig">
): string | undefined {
  if (sub.configMode !== "visual") return;
  const providers = sub.visualConfig?.proxyProviders;
  if (
    !Array.isArray(providers) ||
    !providers.some(p => p && p.enabled !== false)
  ) {
    return "请至少启用一个机场来源";
  }
  for (const provider of providers) {
    if (provider?.enabled === false) continue;
    if (!provider || typeof provider.name !== "string" || !provider.name.trim())
      return "启用的机场来源必须填写名称";
    if (provider.type === "url") {
      try {
        const url = new URL(provider.url || "");
        if (!["http:", "https:"].includes(url.protocol)) throw new Error();
      } catch {
        return `机场来源「${provider.name}」必须填写有效的 HTTP 或 HTTPS URL`;
      }
    } else if (provider.type === "content") {
      try {
        const nodes = YAML.parse(provider.content || "");
        if (
          !Array.isArray(nodes) ||
          nodes.length === 0 ||
          nodes.some(
            node =>
              !node ||
              typeof node.name !== "string" ||
              !node.name.trim() ||
              typeof node.type !== "string" ||
              !node.type.trim()
          )
        )
          throw new Error();
      } catch {
        return `机场来源「${provider.name}」必须填写有效的节点列表（包含名称和类型）`;
      }
    } else return `机场来源「${provider.name}」类型无效`;
  }
}
