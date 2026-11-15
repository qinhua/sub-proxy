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
