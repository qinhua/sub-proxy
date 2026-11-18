// 管理端和服务端共用的 YAML 基础配置。
export const DEFAULT_BASE_CONFIG = `mode: rule
port: 7890
bind-address: "*"
allow-lan: true
log-level: info
dns:
  enable: true
  ipv6: false
  use-hosts: true
  enhanced-mode: fake-ip
  fake-ip-range: 198.18.0.1/16
  respect-rules: true
  default-nameserver:
    - tls://223.5.5.5
    - tls://223.6.6.6
  proxy-server-nameserver:
    - tls://223.5.5.5
    - tls://223.6.6.6
  nameserver:
    - "https://1.1.1.1/dns-query#🌏 国外通用"
    - "https://8.8.8.8/dns-query#🌏 国外通用"
  nameserver-policy:
    "geosite:cn":
      - tls://223.5.5.5
      - tls://223.6.6.6`;

// 管理端和服务端共用的 Shadowrocket [General] 默认配置。
export const DEFAULT_SHADOWROCKET_GENERAL = `ipv6 = false
prefer-ipv6 = false
bypass-system = true
icmp-auto-reply = true
private-ip-answer = true
dns-direct-system = false
dns-fallback-system = false
dns-direct-fallback-proxy = true
close-if-proxy-chain-missing = true
always-reject-url-rewrite = false
dns-server = tls://223.5.5.5, tls://223.6.6.6
skip-proxy = 192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12, localhost, *.local, captive.apple.com
tun-excluded-routes = 10.0.0.0/8, 100.64.0.0/10, 127.0.0.0/8, 169.254.0.0/16, 172.16.0.0/12, 192.0.0.0/24, 192.0.2.0/24, 192.88.99.0/24, 192.168.0.0/16, 198.51.100.0/24, 203.0.113.0/24, 224.0.0.0/4, 255.255.255.255/32, 239.255.255.250/32`;

export function resolveShadowrocketGeneral(overrides = ""): string {
  const entries = new Map<string, string>();
  for (const line of DEFAULT_SHADOWROCKET_GENERAL.split("\n")) {
    const [key, value] = line.split(/\s*=\s*(.*)/s);
    entries.set(key.trim(), value.trim());
  }
  const seen = new Set<string>();
  for (const line of overrides.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([a-z][a-z0-9-]*)\s*=\s*(.+)$/i);
    if (!match) throw new Error("Shadowrocket 通用设置只能填写 key = value");
    const key = match[1].toLowerCase();
    if (seen.has(key)) throw new Error(`Shadowrocket 通用设置重复：${key}`);
    seen.add(key);
    entries.set(key, match[2].trim());
  }
  return [...entries].map(([key, value]) => `${key} = ${value}`).join("\n");
}
