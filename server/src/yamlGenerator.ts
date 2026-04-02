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

  // 2. Add Proxy Providers
  if (proxyProviders) {
    for (const provider of proxyProviders) {
      if (provider.type === "content" && provider.content) {
        try {
          const nodes = YAML.parse(provider.content);
          if (Array.isArray(nodes)) {
            nodes.forEach(node => {
              if (node.name) {
                finalDoc.proxies.push(node);
                allNodeNames.push(node.name);
              }
            });
          }
        } catch (e) {
          console.error(
            `Error parsing content for provider ${provider.name}`,
            e
          );
        }
      } else if (provider.type === "url" && provider.fetchedNodes) {
        provider.fetchedNodes.forEach(node => {
          if (node.name) {
            finalDoc.proxies.push(node);
            allNodeNames.push(node.name);
          }
        });
      }
    }
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
  const AUTO_SELECT_GROUP_NAME = "🚀 自动优选加速";
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

  // Ensure default select groups exist for generic rules
  const hasDirectGroup = finalDoc["proxy-groups"].some(
    (g: any) => g.name === DEFAULT_DIRECT_GROUP
  );
  if (!hasDirectGroup) {
    finalDoc["proxy-groups"].push({
      name: DEFAULT_DIRECT_GROUP,
      type: "select",
      proxies: ["DIRECT", AUTO_SELECT_GROUP_NAME].filter(Boolean)
    });
  }

  const hasForeignGroup = finalDoc["proxy-groups"].some(
    (g: any) => g.name === DEFAULT_FOREIGN_GROUP
  );
  if (!hasForeignGroup) {
    finalDoc["proxy-groups"].push({
      name: DEFAULT_FOREIGN_GROUP,
      type: "select",
      proxies: [AUTO_SELECT_GROUP_NAME, "DIRECT"].filter(Boolean)
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
            secondHopNode["dialer-proxy"] = AUTO_SELECT_GROUP_NAME;
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

  if (
    finalDoc["rule-providers"] &&
    typeof finalDoc["rule-providers"] === "object" &&
    Object.keys(finalDoc["rule-providers"]).length === 0
  ) {
    delete finalDoc["rule-providers"];
  }

  finalDoc.rules = [];

  // 5. Serialize to YAML
  let yamlString = YAML.stringify(finalDoc);

  // 6. Append Custom Rules as Raw String to preserve comments and order
  if (rules && rules.trim().length > 0) {
    // Remove the empty rules array generated by stringify if it was empty
    yamlString = yamlString.replace(/rules:\s*\[\]\n?/g, "");

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
