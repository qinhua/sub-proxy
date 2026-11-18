import assert from "node:assert/strict";
import test from "node:test";
import YAML from "yaml";
import { generateVisualYaml } from "../src/yamlGenerator";
import { generateShadowrocketConfig } from "../src/shadowrocketGenerator";
import type { Subscription } from "../src/types";
import {
  DEFAULT_BASE_CONFIG,
  DEFAULT_PROXY_GROUPS_CONFIG,
  DEFAULT_RULES
} from "../../web/src/constants/index";

test("default template has no dangling optional groups before URL nodes are cached", () => {
  const sub = {
    configMode: "visual",
    visualConfig: {
      baseConfig: DEFAULT_BASE_CONFIG,
      proxyGroupsConfig: DEFAULT_PROXY_GROUPS_CONFIG,
      rules: DEFAULT_RULES,
      proxyProviders: [
        {
          name: "pending",
          type: "url",
          enabled: true,
          url: "https://example.test"
        }
      ]
    }
  } as Subscription;
  const doc = YAML.parse(generateVisualYaml(sub));
  const groups = doc["proxy-groups"];
  const available = new Set(["DIRECT", ...groups.map((g: any) => g.name)]);
  assert.deepEqual(doc.dns["default-nameserver"], [
    "tls://223.5.5.5",
    "tls://223.6.6.6"
  ]);
  assert.deepEqual(doc.dns["proxy-server-nameserver"], [
    "tls://223.5.5.5",
    "tls://223.6.6.6"
  ]);
  assert.deepEqual(doc.dns["nameserver-policy"]["geosite:cn"], [
    "tls://223.5.5.5",
    "tls://223.6.6.6"
  ]);
  assert.ok(
    doc.dns.nameserver.every((dns: string) => dns.endsWith("#🌏 国外通用"))
  );
  for (const group of groups) {
    assert.ok(group.proxies.length > 0);
    for (const target of group.proxies)
      assert.ok(available.has(target), target);
  }
  assert.deepEqual(groups.find((g: any) => g.name === "🔧 手动选择").proxies, [
    "DIRECT"
  ]);
  assert.ok(
    groups.find((g: any) => g.name === "🌏 国外通用").proxies.includes("DIRECT")
  );
});

test("visual YAML includes enabled providers and keeps legacy providers enabled", () => {
  const sub = {
    configMode: "visual",
    visualConfig: {
      rules: "- MATCH,DIRECT",
      proxyProviders: [
        {
          id: "off-url",
          name: "关闭的链接",
          type: "url",
          enabled: false,
          fetchedNodes: [{ name: "off-url-node", type: "ss" }]
        },
        {
          id: "off-content",
          name: "关闭的内容",
          type: "content",
          enabled: false,
          content: "- name: off-content-node\n  type: ss"
        },
        {
          id: "on-content",
          name: "启用的内容",
          type: "content",
          enabled: true,
          content: "- name: on-content-node\n  type: ss"
        },
        {
          id: "legacy-url",
          name: "旧配置",
          type: "url",
          fetchedNodes: [{ name: "legacy-node", type: "ss" }]
        }
      ]
    }
  } as Subscription;

  const yaml = YAML.parse(generateVisualYaml(sub));
  assert.deepEqual(
    yaml.proxies.map((node: { name: string }) => node.name),
    ["on-content-node", "legacy-node"]
  );
  const autoSelect = yaml["proxy-groups"].find(
    (group: { name: string }) => group.name === "🚀 自动优选"
  );
  assert.deepEqual(autoSelect.proxies, ["on-content-node", "legacy-node"]);
});

test("empty rules and unavailable URL nodes generate parseable direct defaults", () => {
  const sub = {
    configMode: "visual",
    visualConfig: {
      proxyProviders: [
        { name: "pending", type: "url", url: "https://example.test" }
      ]
    }
  } as Subscription;
  for (const rules of [undefined, "", "   "]) {
    sub.visualConfig!.rules = rules;
    const doc = YAML.parse(generateVisualYaml(sub));
    assert.equal(doc.rules.length, 2);
    assert.deepEqual(
      doc["proxy-groups"].map((g: any) => g.proxies),
      [["DIRECT"], ["DIRECT"]]
    );
  }
});

test("duplicate URL and content nodes get stable names without mutating source objects", () => {
  const sub = {
    configMode: "visual",
    visualConfig: {
      proxyProviders: [
        {
          name: "A",
          type: "url",
          fetchedNodes: [
            { name: "HK", type: "ss" },
            { name: "B - HK", type: "ss" }
          ]
        },
        {
          name: "B",
          type: "content",
          content:
            "- name: HK\n  type: ss\n- name: HK\n  type: ss\n- name: unique\n  type: ss"
        },
        { name: "B", type: "url", fetchedNodes: [{ name: "HK", type: "ss" }] }
      ]
    }
  } as Subscription;
  const before = structuredClone(sub);
  const first = generateVisualYaml(sub);
  assert.equal(first, generateVisualYaml(sub));
  assert.deepEqual(sub, before);
  const doc = YAML.parse(first);
  const names = doc.proxies.map((n: any) => n.name);
  assert.deepEqual(names, [
    "HK",
    "B - HK",
    "B - HK (2)",
    "B - HK (3)",
    "unique",
    "B - HK (4)"
  ]);
  assert.deepEqual(
    doc["proxy-groups"].find((g: any) => g.name === "🚀 自动优选").proxies,
    names
  );
});

test("visual YAML preserves source comments only when requested", () => {
  const sub = {
    configMode: "visual",
    visualConfig: {
      baseConfig: "# 基础说明\nport: 7890 # 端口说明\n",
      proxyGroupsConfig:
        "# 分组说明\nproxy-groups:\n  # 手动分组\n  - name: 🔧 手动选择\n    type: select\n    proxies: [DIRECT]\n",
      rules:
        "# 规则说明\n- DOMAIN-SUFFIX,linkedin.com,DIRECT\n# WhatsApp\n- DOMAIN-SUFFIX,whatsapp.com,DIRECT\n- MATCH,DIRECT",
      proxyProviders: [
        {
          name: "机场",
          type: "content",
          content: "- name: 🇭🇰 香港01\n  type: ss"
        }
      ]
    }
  } as Subscription;
  const withoutComments = generateVisualYaml(sub);
  for (const comment of [
    "基础说明",
    "端口说明",
    "分组说明",
    "手动分组",
    "规则说明",
    "WhatsApp"
  ])
    assert.ok(!withoutComments.includes(comment), comment);
  sub.visualConfig!.preserveComments = true;
  const withComments = generateVisualYaml(sub);
  for (const comment of [
    "基础说明",
    "端口说明",
    "分组说明",
    "手动分组",
    "规则说明",
    "WhatsApp"
  ])
    assert.ok(withComments.includes(comment), comment);
  assert.match(
    withComments,
    /  - DOMAIN-SUFFIX,linkedin\.com,DIRECT\n  # WhatsApp\n  - DOMAIN-SUFFIX,whatsapp\.com,DIRECT/
  );
  assert.deepEqual(YAML.parse(withComments), YAML.parse(withoutComments));
});

test("first-hop filter limits auto testing without removing provider or manual nodes", () => {
  const sub = {
    configMode: "visual",
    visualConfig: {
      proxyGroupsConfig:
        "proxy-groups:\n  - name: 🔧 手动选择\n    type: select\n    proxies: [DIRECT]\n  - name: 🌏 国外通用\n    type: select\n    proxies: [🚀 自动优选, 🔧 手动选择, DIRECT]\n",
      firstHopFilter: {
        enabled: true,
        include: "香港, 日本",
        exclude: "官网, 到期"
      },
      proxyProviders: [
        {
          name: "机场",
          type: "content",
          content:
            "- name: 🇭🇰 香港01\n  type: ss\n- name: 🇯🇵 日本01\n  type: ss\n- name: 🇺🇸 美国01\n  type: ss\n- name: 🇭🇰 香港官网\n  type: ss\n- name: 套餐到期\n  type: ss"
        }
      ],
      chainProxies: [
        {
          name: "🏠 美国住宅",
          secondHopConfig:
            "name: 住宅节点\ntype: socks5\nserver: example.test\nport: 1080"
        }
      ]
    }
  } as Subscription;
  const doc = YAML.parse(generateVisualYaml(sub));
  const groups = doc["proxy-groups"];
  assert.deepEqual(groups.find((g: any) => g.name === "🔗 链式优选").proxies, [
    "🇭🇰 香港01",
    "🇯🇵 日本01"
  ]);
  assert.equal(groups.find((g: any) => g.name === "🔗 链式优选").hidden, true);
  assert.deepEqual(groups.find((g: any) => g.name === "🔧 手动选择").proxies, [
    "DIRECT",
    "🇭🇰 香港01",
    "🇯🇵 日本01",
    "🇺🇸 美国01",
    "🇭🇰 香港官网",
    "套餐到期"
  ]);
  const foreign = groups.find((g: any) => g.name === "🌏 国外通用");
  assert.deepEqual(foreign.proxies, ["🚀 自动优选", "🔧 手动选择", "DIRECT"]);
  assert.deepEqual(groups.find((g: any) => g.name === "🚀 自动优选").proxies, [
    "🇭🇰 香港01",
    "🇯🇵 日本01",
    "🇺🇸 美国01",
    "🇭🇰 香港官网",
    "套餐到期"
  ]);
  assert.equal(
    doc.proxies.find((node: any) => node.name === "住宅节点")["dialer-proxy"],
    "🔗 链式优选"
  );
});

test("first-hop filter rejects an empty result when provider nodes exist", () => {
  const sub = {
    configMode: "visual",
    visualConfig: {
      firstHopFilter: { enabled: true, include: "香港" },
      proxyProviders: [
        { name: "机场", type: "content", content: "- name: 美国01\n  type: ss" }
      ],
      chainProxies: [
        { name: "住宅", secondHopConfig: "name: 住宅节点\ntype: socks5" }
      ]
    }
  } as Subscription;
  assert.throws(() => generateVisualYaml(sub), /没有匹配到可用节点/);
});

test("filtered chain and full foreign auto group convert to Shadowrocket", () => {
  const sub = {
    configMode: "visual",
    visualConfig: {
      proxyGroupsConfig: DEFAULT_PROXY_GROUPS_CONFIG,
      rules: "- MATCH,🌏 国外通用",
      firstHopFilter: { enabled: true, include: "香港" },
      proxyProviders: [
        {
          name: "机场",
          type: "content",
          content:
            "- name: 香港01\n  type: ss\n  server: hk.example.test\n  port: 443\n  cipher: aes-256-gcm\n  password: example\n- name: 美国01\n  type: ss\n  server: us.example.test\n  port: 443\n  cipher: aes-256-gcm\n  password: example"
        }
      ],
      chainProxies: [
        {
          name: "🏠 美国住宅",
          secondHopConfig:
            "name: 住宅节点\ntype: socks5\nserver: residential.example.test\nport: 1080\nusername: demo\npassword: demo"
        }
      ]
    }
  } as Subscription;
  const result = generateShadowrocketConfig(generateVisualYaml(sub));
  assert.match(result, /🚀 自动优选 = url-test,香港01,美国01,/);
  assert.match(result, /🔗 链式优选 = url-test,香港01,.*hidden=1/);
  assert.match(result, /🌏 国外通用 = select,🚀 自动优选,🔧 手动选择,DIRECT/);
  assert.match(result, /住宅节点 = socks5,.*dialer-proxy=🔗 链式优选/);
});
