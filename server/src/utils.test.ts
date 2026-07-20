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

  it("parses ss URI subscription lines into Clash proxy nodes", () => {
    const nodes = parseClashProxyNodes(
      "ss://YWVzLTEyOC1nY206cGFzc0Bzcy5leGFtcGxlLmNvbTo4NDQz#SS%2001"
    );

    assert.equal(nodes.length, 1);
    assert.equal(nodes[0].name, "SS 01");
    assert.equal(nodes[0].type, "ss");
    assert.equal(nodes[0].server, "ss.example.com");
    assert.equal(nodes[0].port, 8443);
    assert.equal(nodes[0].cipher, "aes-128-gcm");
    assert.equal(nodes[0].password, "pass");
  });

  it("parses base64 wrapped vmess URI subscription lines into Clash proxy nodes", () => {
    const vmessConfig = {
      v: "2",
      ps: "VMess 01",
      add: "vmess.example.com",
      port: "443",
      id: "11111111-1111-4111-8111-111111111111",
      aid: "0",
      scy: "auto",
      net: "ws",
      host: "cdn.example.com",
      path: "/ws",
      tls: "tls",
      sni: "vmess.example.com"
    };
    const vmessUri = `vmess://${Buffer.from(
      JSON.stringify(vmessConfig),
      "utf8"
    ).toString("base64")}`;
    const subscription = Buffer.from(vmessUri, "utf8").toString("base64");
    const nodes = parseClashProxyNodes(subscription);

    assert.equal(nodes.length, 1);
    assert.equal(nodes[0].name, "VMess 01");
    assert.equal(nodes[0].type, "vmess");
    assert.equal(nodes[0].server, "vmess.example.com");
    assert.equal(nodes[0].port, 443);
    assert.equal(nodes[0].tls, true);
    assert.deepEqual(nodes[0]["ws-opts"], {
      path: "/ws",
      headers: { Host: "cdn.example.com" }
    });
  });
});
