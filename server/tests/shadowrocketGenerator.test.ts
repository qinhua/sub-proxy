import assert from "node:assert/strict";
import test from "node:test";
import { generateShadowrocketConfig } from "../src/shadowrocketGenerator";
import { createRouter } from "../src/routes";
import type { DbSchema, Subscription } from "../src/types";

const sampleYaml = `proxies:
  - name: HK
    type: anytls
    server: relay.example.com
    port: 443
    password: example-password
    sni: relay.example.com
    udp: true
  - name: Residential
    type: socks5
    server: exit.example.com
    port: 1080
    username: example-user
    password: example-password
    dialer-proxy: HK
proxy-groups:
  - name: Foreign
    type: select
    proxies: [HK, Residential]
rules:
  - DOMAIN-SUFFIX,claude.com,Residential
  - IP-CIDR,192.168.0.0/16,DIRECT
  - GEOIP,CN,DIRECT
  - MATCH,Foreign
`;

test("Shadowrocket profile has nodes, chain, one DNS key and no local lookup from IP rules", () => {
  const result = generateShadowrocketConfig(sampleYaml);
  assert.match(result, /\[Proxy\]\nHK = anytls,/);
  assert.match(result, /Residential = socks5,[^\n]*dialer-proxy=HK/);
  assert.match(result, /IP-CIDR,192\.168\.0\.0\/16,DIRECT,no-resolve/);
  assert.match(result, /GEOIP,CN,DIRECT,no-resolve/);
  assert.match(result, /FINAL,Foreign/);
  assert.equal(result.match(/^dns-server =/gm)?.length, 1);
  assert.match(
    result,
    /^dns-server = tls:\/\/223\.5\.5\.5, tls:\/\/223\.6\.6\.6$/m
  );
  assert.doesNotMatch(result, /tls:\/\/119\.29\.29\.29/);
  assert.match(result, /^close-if-proxy-chain-missing = true$/m);
  assert.equal(result.match(/^tun-excluded-routes =/gm)?.length, 1);
  assert.doesNotMatch(result, /^proxy-dns-server =/m);
});

test("a subscription may override a General key once", () => {
  const result = generateShadowrocketConfig(
    sampleYaml,
    "dns-server = tls://223.5.5.5\nproxy-dns-server = tls://223.5.5.5"
  );
  assert.equal(result.match(/^dns-server =/gm)?.length, 1);
  assert.match(result, /^dns-server = tls:\/\/223\.5\.5\.5$/m);
  assert.match(result, /^proxy-dns-server = tls:\/\/223\.5\.5\.5$/m);
  assert.throws(
    () =>
      generateShadowrocketConfig(sampleYaml, "dns-server = a\ndns-server = b"),
    /重复/
  );
});

test("unsupported protocols fail instead of silently dropping a node", () => {
  assert.throws(
    () =>
      generateShadowrocketConfig(
        sampleYaml.replace("type: anytls", "type: hysteria2")
      ),
    /暂不支持/
  );
});

test("subscription returns YAML regardless of User-Agent unless Shadowrocket is explicit", async () => {
  const sub = {
    id: "s",
    name: "example",
    enabled: true,
    totalTrafficBytes: null,
    expireAt: "",
    yamlConfig: sampleYaml
  } as Subscription;
  const route = createRouter({
    data: { subscriptions: [sub], users: [], settings: {} } as DbSchema,
    write: async () => {}
  }).stack.find(item => item.path === "/subscribe")!;
  const request = async (client?: string, userAgent = "", yaml?: string) => {
    const headers: Record<string, string> = {};
    const ctx: any = {
      query: { id: "s", client, yaml },
      request: { protocol: "http", host: "localhost", url: "/subscribe?id=s" },
      get: (key: string) => (key === "User-Agent" ? userAgent : ""),
      set: (key: string, value: string) => (headers[key] = value)
    };
    await route.stack.at(-1)!(ctx, async () => {});
    return { ctx, headers };
  };
  const clash = await request();
  const shadowrocket = await request("shadowrocket", "clash-verge/v2.5.0");
  const shadowrocketAgent = await request(
    undefined,
    "Shadowrocket/2000 CFNetwork/123 Darwin/24"
  );
  const forcedClash = await request("clash", "Shadowrocket/2000");
  const forcedYaml = await request(undefined, "Shadowrocket/2000", "1");
  const verge = await request(undefined, "clash-verge/v2.5.0");
  assert.match(clash.ctx.body, /proxies:/);
  assert.doesNotMatch(clash.ctx.body, /\[General\]/);
  assert.match(shadowrocket.ctx.body, /\[General\]/);
  assert.match(shadowrocket.ctx.body, /\[Proxy\]/);
  assert.match(shadowrocket.headers["Content-Disposition"], /\.conf/);
  assert.match(shadowrocketAgent.ctx.body, /proxies:/);
  assert.doesNotMatch(shadowrocketAgent.ctx.body, /\[General\]/);
  assert.equal(
    shadowrocketAgent.headers["Content-Type"],
    "application/octet-stream; charset=utf-8"
  );
  assert.match(forcedClash.ctx.body, /proxies:/);
  assert.match(forcedYaml.ctx.body, /proxies:/);
  assert.match(verge.ctx.body, /proxies:/);
  assert.equal(shadowrocketAgent.headers.Vary, undefined);
});
