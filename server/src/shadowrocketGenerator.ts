import YAML from "yaml";
import { resolveShadowrocketGeneral } from "@sub-proxy/config";

function field(value: unknown, label: string): string {
  const text = String(value ?? "");
  if (!text || /[,\r\n=]/.test(text)) {
    throw new Error(`${label} 包含空值或 Shadowrocket 不支持的分隔符`);
  }
  return text;
}

function nodeLine(node: Record<string, unknown>): string {
  const name = field(node.name, "节点名称");
  const type = field(node.type, `${name} 的协议`);
  const server = field(node.server, `${name} 的地址`);
  const port = Number(node.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${name} 的端口无效`);
  }
  const parts = [type, server, String(port)];
  if (type === "anytls") {
    parts.push(`password=${field(node.password, `${name} 的密码`)}`);
    if (node.sni) parts.push(`peer=${field(node.sni, `${name} 的 SNI`)}`);
    if (node["skip-cert-verify"] === true) parts.push("allowInsecure=1");
  } else if (type === "socks5") {
    parts.push(
      field(node.username ?? node.user, `${name} 的用户名`),
      field(node.password, `${name} 的密码`)
    );
  } else if (type === "ss") {
    parts.push(`password=${field(node.password, `${name} 的密码`)}`);
    parts.push(`method=${field(node.cipher, `${name} 的加密方法`)}`);
  } else if (type === "trojan") {
    parts.push(`password=${field(node.password, `${name} 的密码`)}`);
    if (node.sni) parts.push(`peer=${field(node.sni, `${name} 的 SNI`)}`);
    if (node["skip-cert-verify"] === true) parts.push("allowInsecure=1");
  } else {
    throw new Error(`暂不支持将 ${type} 节点转换为 Shadowrocket 配置`);
  }
  if (node.udp === true) parts.push("udp=1");
  if (node["dialer-proxy"]) {
    parts.push(
      `dialer-proxy=${field(node["dialer-proxy"], `${name} 的代理链`)}`
    );
  }
  return `${name} = ${parts.join(",")}`;
}

function groupLine(group: Record<string, unknown>): string {
  const name = field(group.name, "策略组名称");
  const type = field(group.type, `${name} 的类型`);
  if (!["select", "url-test", "fallback", "load-balance"].includes(type)) {
    throw new Error(`暂不支持 ${name} 的 ${type} 策略组`);
  }
  if (!Array.isArray(group.proxies) || group.proxies.length === 0) {
    throw new Error(`${name} 没有可用策略`);
  }
  const parts = [
    type,
    ...group.proxies.map((p: unknown) => field(p, `${name} 的策略`))
  ];
  if (type !== "select") {
    if (group.url) parts.push(`url=${field(group.url, `${name} 的测试地址`)}`);
    if (group.interval) parts.push(`interval=${Number(group.interval)}`);
    if (group.tolerance) parts.push(`tolerance=${Number(group.tolerance)}`);
  }
  if (group.hidden === true) parts.push("hidden=1");
  return `${name} = ${parts.join(",")}`;
}

function ruleLine(raw: string): string {
  const parts = raw.split(",").map(part => part.trim());
  const type = parts[0];
  if (type === "MATCH") return `FINAL,${field(parts[1], "最终策略")}`;
  if (
    ![
      "DOMAIN",
      "DOMAIN-SUFFIX",
      "DOMAIN-KEYWORD",
      "IP-CIDR",
      "IP-CIDR6",
      "GEOIP"
    ].includes(type)
  ) {
    throw new Error(`暂不支持 ${type} 规则转换为 Shadowrocket`);
  }
  if (parts.length < 3) throw new Error(`${type} 规则缺少字段`);
  const result = parts
    .slice(0, 3)
    .map((p, i) => field(p, `${type} 规则字段 ${i + 1}`));
  if (["IP-CIDR", "IP-CIDR6", "GEOIP"].includes(type)) {
    result.push("no-resolve");
  }
  return result.join(",");
}

export function generateShadowrocketConfig(
  sourceYaml: string,
  generalOverrides = ""
): string {
  const doc = YAML.parse(sourceYaml);
  if (!doc || typeof doc !== "object")
    throw new Error("YAML 配置为空或格式错误");
  if (
    !Array.isArray(doc.proxies) ||
    !Array.isArray(doc["proxy-groups"]) ||
    !Array.isArray(doc.rules)
  ) {
    throw new Error("YAML 必须包含 proxies、proxy-groups 和 rules");
  }
  if (doc["rule-providers"] && Object.keys(doc["rule-providers"]).length) {
    throw new Error("Shadowrocket 转换暂不支持 rule-providers");
  }
  const nodes = doc.proxies.map((node: Record<string, unknown>) =>
    nodeLine(node)
  );
  const groups = doc["proxy-groups"].map((group: Record<string, unknown>) =>
    groupLine(group)
  );
  const rules = doc.rules.map((rule: unknown) => {
    if (typeof rule !== "string") throw new Error("规则必须是字符串");
    return ruleLine(rule);
  });
  if (!nodes.length || !rules.length) throw new Error("节点或规则不能为空");
  return [
    "# 由 SubProxy 从统一配置生成；更新订阅会覆盖本地修改",
    "[General]",
    ...resolveShadowrocketGeneral(generalOverrides).split("\n"),
    "",
    "[Proxy]",
    ...nodes,
    "",
    "[Proxy Group]",
    ...groups,
    "",
    "[Rule]",
    ...rules,
    "",
    "[Host]",
    "localhost = 127.0.0.1",
    ""
  ].join("\n");
}
