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

// 默认基础配置
export const DEFAULT_BASE_CONFIG = `mode: rule
port: 7890
bind-address: "*"
allow-lan: true
log-level: info
dns:
  enable: true
  ipv6: false
  use-hosts: true
  respect-rules: true
  enhanced-mode: fake-ip
  fake-ip-range: 198.18.0.1/16
  default-nameserver:
    - 223.5.5.5
    - 119.29.29.29
    - 114.114.114.114
  nameserver:
    - 223.5.5.5
    - 119.29.29.29
    - 114.114.114.114
  fallback:
    - https://doh.dns.sb/dns-query
    - https://dns.cloudflare.com/dns-query
    - https://dns.twnic.tw/dns-query
  fallback-filter:
    geoip: true
    geoip-code: CN
    ipcidr:
      - 240.0.0.0/4
      - 127.0.0.1/32
      - 0.0.0.0/32
    domain:
      - geosite:geolocation-!cn`;

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
