import YAML from "yaml";
import { Subscription } from "./types";

export class FirstHopFilterError extends Error {}

const filterKeywords = (value = "") =>
  value
    .split(/[,，\n]/)
    .map(keyword => keyword.trim().toLocaleLowerCase())
    .filter(Boolean);

function copyComments(source: any, target: any) {
  if (!source || !target) return;
  for (const key of ["commentBefore", "comment", "spaceBefore"])
    if (source[key]) target[key] = source[key];

  if (YAML.isMap(source) && YAML.isMap(target)) {
    for (const pair of source.items) {
      const key = YAML.isScalar(pair.key)
        ? String(pair.key.value)
        : String(pair.key);
      const targetPair = target.items.find(
        (item: any) =>
          (YAML.isScalar(item.key)
            ? String(item.key.value)
            : String(item.key)) === key
      );
      if (!targetPair) continue;
      copyComments(pair.key, targetPair.key);
      copyComments(pair.value, targetPair.value);
    }
  } else if (YAML.isSeq(source) && YAML.isSeq(target)) {
    for (const [index, item] of source.items.entries()) {
      const name = YAML.isMap(item) ? item.get("name") : undefined;
      const targetItem = name
        ? target.items.find(
            (candidate: any) =>
              YAML.isMap(candidate) && candidate.get("name") === name
          )
        : YAML.isScalar(item)
          ? target.items.find(
              (candidate: any) =>
                YAML.isScalar(candidate) && candidate.value === item.value
            )
          : target.items[index];
      copyComments(item, targetItem);
    }
  }
}

function clearComments(node: any) {
  if (!node) return;
  node.commentBefore = undefined;
  node.comment = undefined;
  node.spaceBefore = false;
  if (YAML.isMap(node)) {
    for (const pair of node.items) {
      clearComments(pair.key);
      clearComments(pair.value);
    }
  } else if (YAML.isSeq(node)) {
    for (const item of node.items) clearComments(item);
  }
}

export function generateVisualYaml(sub: Subscription): string {
  if (!sub.visualConfig) return sub.yamlConfig || "";

  const {
    baseConfig,
    proxyGroupsConfig,
    proxyProviders,
    chainProxies,
    ruleProviders,
    rules,
    preserveComments,
    firstHopFilter
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
  const CHAIN_SELECT_GROUP_NAME = "🔗 链式优选";
  const MANUAL_SELECT_GROUP_NAME = "🔧 手动选择";
  const DEFAULT_FOREIGN_GROUP = "🌏 国外通用";
  const DEFAULT_DIRECT_GROUP = "🎯 国内直连";

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
  const hasChainProxy = chainProxies?.some(chain => chain?.secondHopConfig);
  let firstHopNames = allNodeNames;
  if (hasChainProxy && firstHopFilter?.enabled && allNodeNames.length > 0) {
    const include = filterKeywords(firstHopFilter.include);
    const exclude = filterKeywords(firstHopFilter.exclude);
    if (include.length === 0)
      throw new FirstHopFilterError(
        "第一跳筛选已启用，请填写至少一个地区或节点关键词"
      );
    firstHopNames = allNodeNames.filter(name => {
      const normalized = name.toLocaleLowerCase();
      return (
        include.some(keyword => normalized.includes(keyword)) &&
        !exclude.some(keyword => normalized.includes(keyword))
      );
    });
    if (firstHopNames.length === 0)
      throw new FirstHopFilterError(
        "第一跳筛选没有匹配到可用节点，请检查地区和排除关键词"
      );
  }

  if (hasChainProxy && firstHopNames.length > 0) {
    const existingChainSelect = finalDoc["proxy-groups"].find(
      (g: any) => g.name === CHAIN_SELECT_GROUP_NAME
    );
    if (!existingChainSelect) {
      finalDoc["proxy-groups"].push({
        name: CHAIN_SELECT_GROUP_NAME,
        type: "url-test",
        proxies: [...firstHopNames],
        url: "http://www.gstatic.com/generate_204",
        interval: 300,
        tolerance: 50,
        hidden: true
      });
    } else {
      existingChainSelect.type = "url-test";
      existingChainSelect.proxies = [...firstHopNames];
      existingChainSelect.hidden = true;
    }
  }
  const manualSelectGroup = finalDoc["proxy-groups"].find(
    (g: any) => g?.name === MANUAL_SELECT_GROUP_NAME
  );
  if (manualSelectGroup) {
    manualSelectGroup.proxies = [
      ...new Set([...(manualSelectGroup.proxies || []), ...allNodeNames])
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
            secondHopNode["dialer-proxy"] =
              firstHopNames.length > 0 ? CHAIN_SELECT_GROUP_NAME : "DIRECT";
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
      (name: string) =>
        !optionalGroupNames.has(name) || availableTargets.has(name)
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

  // Rules are appended after serializing the rest of the document so standalone
  // comments do not become inline comments on the preceding YAML sequence item.
  const output = YAML.parseDocument(YAML.stringify(finalDoc));
  if (output.errors.length > 0) throw output.errors[0];
  if (preserveComments) {
    for (const sourceText of [baseConfig, proxyGroupsConfig]) {
      if (!sourceText) continue;
      const source = YAML.parseDocument(sourceText);
      if (source.errors.length > 0) continue;
      if (YAML.isMap(source.contents))
        copyComments(source.contents, output.contents);
      else if (YAML.isSeq(source.contents) && YAML.isMap(output.contents))
        copyComments(source.contents, output.get("proxy-groups", true));
      if (source.commentBefore) output.commentBefore = source.commentBefore;
    }
  } else {
    clearComments(output);
    clearComments(output.contents);
  }

  const ruleLines =
    rules && rules.trim()
      ? rules.split("\n")
      : [
          "# 默认通用分流规则（不依赖链式代理，可直接使用）",
          `- GEOIP,CN,${DEFAULT_DIRECT_GROUP}`,
          `- MATCH,${DEFAULT_FOREIGN_GROUP}`
        ];
  const formattedRules = ruleLines
    .map(line => line.trim())
    .filter(line => preserveComments || !line.startsWith("#"))
    .map(line =>
      line.startsWith("-") || line.startsWith("#") || !line
        ? `  ${line}`
        : `  - ${line}`
    )
    .join("\n");
  return `${output.toString().trimEnd()}\n\nrules:\n${formattedRules}\n`;
}
