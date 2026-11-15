import assert from "node:assert/strict";
import test from "node:test";
import YAML from "yaml";
import { generateVisualYaml } from "./yamlGenerator";
import type { Subscription } from "./types";

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
