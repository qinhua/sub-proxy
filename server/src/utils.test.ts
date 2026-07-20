import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseClashProxyNodes } from "./utils";

const clashYaml = `
proxies:
  - name: "HK 01"
    type: ss
    server: hk.example.com
    port: 443
    cipher: aes-128-gcm
    password: password
`;

describe("subscription source parsing", () => {
  it("parses Clash YAML proxy nodes", () => {
    const nodes = parseClashProxyNodes(clashYaml);

    assert.equal(nodes.length, 1);
    assert.equal(nodes[0].name, "HK 01");
  });

  it("parses base64 wrapped Clash YAML proxy nodes", () => {
    const encoded = Buffer.from(clashYaml, "utf8").toString("base64");
    const nodes = parseClashProxyNodes(encoded);

    assert.equal(nodes.length, 1);
    assert.equal(nodes[0].server, "hk.example.com");
  });
});
