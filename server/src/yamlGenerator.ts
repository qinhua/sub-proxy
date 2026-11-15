import YAML from "yaml";
import { Subscription } from "./types";

export function generateVisualYaml(sub: Subscription): string {
  if (!sub.visualConfig) return sub.yamlConfig || "";

  const {
    baseConfig,
    proxyGroupsConfig,
    proxyProviders,
    chainProxies,
    ruleProviders,
    rules
  } = sub.visualConfig;

  let finalDoc: any = {};

  // 1. Parse base config
  if (baseConfig) {
    try {
      finalDoc = YAML.parse(baseConfig) || {};
    } catch (e) {
      console.error("Error parsing base config", e);
    }
  }

  if (!finalDoc.proxies) finalDoc.proxies = [];
  if (!finalDoc["proxy-groups"]) finalDoc["proxy-groups"] = [];
  if (!finalDoc.rules) finalDoc.rules = [];

  if (proxyGroupsConfig) {
    try {
      const parsedProxyGroups = YAML.parse(proxyGroupsConfig);
      if (Array.isArray(parsedProxyGroups)) {
        finalDoc["proxy-groups"] = parsedProxyGroups;
      } else if (Array.isArray(parsedProxyGroups?.["proxy-groups"])) {
        finalDoc["proxy-groups"] = parsedProxyGroups["proxy-groups"];
      }
    } catch (e) {
      console.error("Error parsing proxy groups config", e);
    }
  }

  const allNodeNames: string[] = [];

  // 保留所有原始名称，避免生成的前缀名称占用其他节点的名称。
  const providerNodes: { source: string; node: any }[] = [];
  for (const provider of proxyProviders || []) {
    if (!provider || provider.enabled === false) continue;
    let nodes = provider.fetchedNodes;
    if (provider.type === "content" && provider.content) {
      try {
        nodes = YAML.parse(provider.content);
      } catch {
        nodes = [];
      }
    }
    if (Array.isArray(nodes)) {
      for (const node of nodes) {
        if (node?.name) providerNodes.push({ source: provider.name, node });
      }
    }
  }
  const reservedNames = new Set<string>([
    ...finalDoc.proxies.map((node: any) => node.name),
    ...providerNodes.map(({ node }) => node.name)
  ]);
  const usedNames = new Set<string>(
    finalDoc.proxies.map((node: any) => node.name)
  );
  for (const { source, node } of providerNodes) {
    let name = node.name;
    if (usedNames.has(name)) {
      const prefix = `${source} - ${node.name}`;
      name = prefix;
      let sequence = 2;
      while (usedNames.has(name) || reservedNames.has(name))
        name = `${prefix} (${sequence++})`;
    }
    usedNames.add(name);
    finalDoc.proxies.push({ ...node, name });
    allNodeNames.push(name);
  }

  // 2.1 Add Rule Providers (3rd party rulesets)
  if (ruleProviders && Array.isArray(ruleProviders)) {
    for (const rp of ruleProviders) {
      if (rp && rp.name && rp.url) {
        if (!finalDoc["rule-providers"]) {
          finalDoc["rule-providers"] = {};
        }
        finalDoc["rule-providers"][rp.name] = {
          type: "http",
          behavior: rp.behavior || "domain",
          url: rp.url,
          path: rp.path || `./rules/${rp.name}.yaml`,
          interval: rp.interval || 86400
        };
      }
    }
  }

  // 3. Add Chain Proxies (Relay)
  const AUTO_SELECT_GROUP_NAME = "🚀 自动优选";
  const MANUAL_SELECT_GROUP_NAME = "🔧 手动选择";
  const DEFAULT_FOREIGN_GROUP = "🌏 国外通用";
  const DEFAULT_DIRECT_GROUP = "🎯 国内直连";

  // We only add the auto-select group if we have chain proxies or if there are nodes.
  // Actually, user wants it to be added by default to use as first hop.
  if (allNodeNames.length > 0) {
    const existingAutoSelect = finalDoc["proxy-groups"].find(
      (g: any) => g.name === AUTO_SELECT_GROUP_NAME
    );
    if (!existingAutoSelect) {
      finalDoc["proxy-groups"].push({
        name: AUTO_SELECT_GROUP_NAME,
        type: "url-test",
        proxies: [...allNodeNames],
        url: "http://www.gstatic.com/generate_204",
        interval: 300,
        tolerance: 50
      });
    } else {
      existingAutoSelect.proxies = [
        ...new Set([...(existingAutoSelect.proxies || []), ...allNodeNames])
      ];
    }
  }

  const autoSelectGroup = finalDoc["proxy-groups"].find(
    (g: any) => g?.name === AUTO_SELECT_GROUP_NAME
  );
  const autoSelectNodes = Array.isArray(autoSelectGroup?.proxies)
    ? autoSelectGroup.proxies
    : [];
  const manualSelectGroup = finalDoc["proxy-groups"].find(
    (g: any) => g?.name === MANUAL_SELECT_GROUP_NAME
  );
  if (manualSelectGroup) {
    manualSelectGroup.proxies = [
      ...new Set([...(manualSelectGroup.proxies || []), ...autoSelectNodes])
    ];
  }

  // Ensure default select groups exist for generic rules
  const hasDirectGroup = finalDoc["proxy-groups"].some(
    (g: any) => g.name === DEFAULT_DIRECT_GROUP
  );
  if (!hasDirectGroup) {
    finalDoc["proxy-groups"].push({
      name: DEFAULT_DIRECT_GROUP,
      type: "select",
      proxies: ["DIRECT", ...(autoSelectGroup ? [AUTO_SELECT_GROUP_NAME] : [])]
    });
  }

  const hasForeignGroup = finalDoc["proxy-groups"].some(
    (g: any) => g.name === DEFAULT_FOREIGN_GROUP
  );
  if (!hasForeignGroup) {
    finalDoc["proxy-groups"].push({
      name: DEFAULT_FOREIGN_GROUP,
      type: "select",
      proxies: [...(autoSelectGroup ? [AUTO_SELECT_GROUP_NAME] : []), "DIRECT"]
    });
  }

  if (chainProxies) {
    for (const chain of chainProxies) {
      if (chain.secondHopConfig) {
        try {
          const secondHopNode = YAML.parse(chain.secondHopConfig);

          if (secondHopNode && secondHopNode.name) {
            // Check if it's socks5 and uses user/password instead of username/password
            if (secondHopNode.type === "socks5") {
              if (secondHopNode.user && !secondHopNode.username) {
                secondHopNode.username = secondHopNode.user;
                delete secondHopNode.user;
              }
            }

            // Use dialer-proxy instead of relay group for Meta/Mihomo core
            secondHopNode["dialer-proxy"] = autoSelectGroup
              ? AUTO_SELECT_GROUP_NAME
              : "DIRECT";
            finalDoc.proxies.push(secondHopNode);

            // Add a select group so rules can reference the chain proxy by the given name
            finalDoc["proxy-groups"].push({
              name: chain.name,
              type: "select",
              proxies: [secondHopNode.name]
            });
          }
        } catch (e) {
          console.error(`Error parsing second hop config for ${chain.name}`, e);
        }
      }
    }
  }

  // 默认模板引用的可选分组可能尚未生成，保留直连作为可用回退。
  const availableTargets = new Set([
    ...finalDoc.proxies.map((node: any) => node.name),
    ...finalDoc["proxy-groups"].map((group: any) => group.name)
  ]);
  const optionalGroupNames = new Set([AUTO_SELECT_GROUP_NAME, "🏠 美国住宅"]);
  for (const group of finalDoc["proxy-groups"]) {
    if (!Array.isArray(group.proxies)) continue;
    group.proxies = group.proxies.filter(
      (name: string) => !optionalGroupNames.has(name) || availableTargets.has(name)
    );
    if (group.proxies.length === 0) group.proxies = ["DIRECT"];
  }

  if (
    finalDoc["rule-providers"] &&
    typeof finalDoc["rule-providers"] === "object" &&
    Object.keys(finalDoc["rule-providers"]).length === 0
  ) {
    delete finalDoc["rule-providers"];
  }

  delete finalDoc.rules;

  // 5. Serialize to YAML
  let yamlString = YAML.stringify(finalDoc);

  // 6. Append Custom Rules as Raw String to preserve comments and order
  if (rules && rules.trim().length > 0) {
    yamlString += "\nrules:\n";

    // Ensure each line that is not a comment starts with proper indentation if needed,
    // or just append it since rules are usually just strings.
    // The safest way is to just append the user's raw input block directly under rules:
    yamlString += rules
      .split("\n")
      .map(line => {
        if (
          line.trim().startsWith("- ") ||
          line.trim().startsWith("#") ||
          line.trim() === ""
        ) {
          return `  ${line}`;
        }
        return `  - ${line}`; // auto fix missing dash
      })
      .join("\n");
    yamlString += "\n";
  } else {
    yamlString += "\nrules:\n";
    const defaultRules = [
      "# 默认通用分流规则（不依赖链式代理，可直接使用）",
      `- GEOIP,CN,${DEFAULT_DIRECT_GROUP}`,
      `- MATCH,${DEFAULT_FOREIGN_GROUP}`
    ]
      .map(line => `  ${line}`)
      .join("\n");
    yamlString += defaultRules + "\n";
  }

  yamlString = yamlString
    .replace(/\n(proxies:\n)/g, "\n\n$1")
    .replace(/\n(proxy-groups:\n)/g, "\n\n$1")
    .replace(/\n(rule-providers:\n)/g, "\n\n$1")
    .replace(/\n(rules:\n)/g, "\n\n$1")
    .replace(/\n{3,}/g, "\n\n");

  return yamlString;
}
