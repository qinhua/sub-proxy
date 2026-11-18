// 默认 YAML 配置
export const DEFAULT_YAML_CONFIG = `# 在此粘贴 yaml 配置，以下是示例：
mode: rule
port: 7890
bind-address: "*"
allow-lan: true
log-level: info
dns:
proxies:
proxy-groups:
rule-providers:
rules:`;

export { DEFAULT_BASE_CONFIG } from "@sub-proxy/config";

export const DEFAULT_FIRST_HOP_INCLUDE =
  "香港, 🇭🇰, HK, Hong Kong, 澳门, 🇲🇴, 澳門, MO, Macau, Macao, 台湾, 🇹🇼, 臺灣, TW, Taiwan, 日本, 🇯🇵, JP, Japan, 韩国, 🇰🇷, KR, Korea, 新加坡, 🇸🇬, SG, Singapore, 马来西亚, 🇲🇾, 馬來西亞, MY, Malaysia";
export const DEFAULT_FIRST_HOP_EXCLUDE =
  "剩余流量, 重置, 套餐, 到期, 节点不通, TG交流群, TG频道, 官网, 公告";

// 默认代理组配置
export const DEFAULT_PROXY_GROUPS_CONFIG = `proxy-groups:
  - name: "🌏 国外通用"
    type: select
    proxies:
      - "🚀 自动优选"
      - "🔧 手动选择"
      - DIRECT
  - name: "🔧 手动选择"
    type: select
    proxies:
      - DIRECT
      - "🏠 美国住宅"`;

// 默认分流规则
export const DEFAULT_RULES = `# 默认分流规则
# 1. 国内流量直连
- GEOIP,CN,🎯 国内直连
# 2. 国外流量走自动优选/通用组
- MATCH,🌏 国外通用`;

// 预设规则集
export const RULE_PRESETS = [
  {
    name: "ACL4SSR_Proxy",
    url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ProxyLite.list",
    behavior: "classical" as const,
    interval: 86400
  },
  {
    name: "ACL4SSR_Direct",
    url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ChinaDomain.list",
    behavior: "classical" as const,
    interval: 86400
  },
  {
    name: "ACL4SSR_BanAD",
    url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/BanAD.list",
    behavior: "classical" as const,
    interval: 86400
  }
];

// 默认 User-Agent
export const DEFAULT_FETCH_UA = "clash-verge";
