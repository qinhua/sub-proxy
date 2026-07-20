import YAML from "yaml";

export const generateAvatarUrl = (avatar?: string, isFullPath = false) => {
  if (!avatar) return "";
  if (avatar.startsWith("http")) return avatar;
  return `${isFullPath ? `${location.origin}` : ""}${avatar.startsWith("/upload/avatar/") ? "" : "/upload/avatar/"}${avatar}`;
};

export async function fetchProxyNodesFromUrl(
  url: string,
  userAgent = "clash"
): Promise<any[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": userAgent
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch from ${url}: ${response.statusText}`);
    }

    const text = await response.text();
    const nodes = parseClashProxyNodes(text);
    if (nodes.length > 0) {
      return nodes;
    }

    throw new Error("Invalid Clash configuration format received from URL.");
  } catch (error) {
    console.error("fetchProxyNodesFromUrl error:", error);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function parseClashProxyNodes(content: string): any[] {
  const candidates = [content, decodeBase64Subscription(content)].filter(
    (item): item is string => Boolean(item)
  );

  for (const candidate of candidates) {
    const yamlNodes = parseYamlProxyNodes(candidate);
    if (yamlNodes.length > 0) {
      return yamlNodes;
    }

    const uriNodes = parseUriProxyNodes(candidate);
    if (uriNodes.length > 0) {
      return uriNodes;
    }
  }

  return [];
}

function parseYamlProxyNodes(content: string): any[] {
  try {
    const parsed = YAML.parse(content);
    if (Array.isArray(parsed)) {
      return parsed.filter(node => node?.name);
    }
    if (parsed && Array.isArray(parsed.proxies)) {
      return parsed.proxies.filter((node: any) => node?.name);
    }
  } catch {
    // Not YAML, try other subscription formats.
  }

  return [];
}

function parseUriProxyNodes(content: string): any[] {
  return content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(parseProxyUri)
    .filter((node): node is Record<string, any> => Boolean(node?.name));
}

function parseProxyUri(uri: string) {
  const protocol = uri.split("://", 1)[0]?.toLowerCase();
  if (protocol === "ss") {
    return parseShadowsocksUri(uri);
  }
  if (protocol === "vmess") {
    return parseVmessUri(uri);
  }

  return null;
}

function parseShadowsocksUri(uri: string) {
  const raw = uri.slice("ss://".length);
  const [withoutFragment, fragment = ""] = raw.split("#");
  const [mainPart] = withoutFragment.split("?");
  const decodedName = decodeText(fragment);

  let userInfo = "";
  let serverInfo = "";

  if (mainPart.includes("@")) {
    const atIndex = mainPart.lastIndexOf("@");
    userInfo = mainPart.slice(0, atIndex);
    serverInfo = mainPart.slice(atIndex + 1);
    if (!userInfo.includes(":")) {
      userInfo = decodeBase64Value(userInfo) || userInfo;
    }
  } else {
    const decoded = decodeBase64Value(mainPart);
    if (!decoded || !decoded.includes("@")) {
      return null;
    }
    const atIndex = decoded.lastIndexOf("@");
    userInfo = decoded.slice(0, atIndex);
    serverInfo = decoded.slice(atIndex + 1);
  }

  const colonIndex = userInfo.indexOf(":");
  if (colonIndex <= 0) {
    return null;
  }

  const method = decodeText(userInfo.slice(0, colonIndex));
  const password = decodeText(userInfo.slice(colonIndex + 1));
  const { host, port } = parseServerInfo(serverInfo);
  if (!host || !port) {
    return null;
  }

  return {
    name: decodedName || `${host}:${port}`,
    type: "ss",
    server: host,
    port,
    cipher: method,
    password,
    udp: true
  };
}

function parseVmessUri(uri: string) {
  const decoded = decodeBase64Value(uri.slice("vmess://".length));
  if (!decoded) {
    return null;
  }

  try {
    const config = JSON.parse(decoded);
    const server = String(config.add || "");
    const port = Number(config.port);
    const uuid = String(config.id || "");
    if (!server || !port || !uuid) {
      return null;
    }

    const network = String(config.net || "tcp");
    const node: Record<string, any> = {
      name: String(config.ps || `${server}:${port}`),
      type: "vmess",
      server,
      port,
      uuid,
      alterId: Number(config.aid || 0),
      cipher: String(config.scy || "auto"),
      tls: config.tls === "tls",
      network,
      udp: true
    };

    if (config.sni) {
      node.servername = String(config.sni);
    }
    if (network === "ws") {
      node["ws-opts"] = {
        path: String(config.path || "/"),
        headers: config.host ? { Host: String(config.host) } : undefined
      };
    }

    return node;
  } catch {
    return null;
  }
}

function decodeBase64Subscription(content: string) {
  const compact = content.trim().replace(/\s+/g, "");
  if (!compact || !/^[A-Za-z0-9+/_-]*={0,2}$/.test(compact)) {
    return "";
  }

  const withoutPadding = compact.replace(/=+$/, "");
  if (withoutPadding.length % 4 === 1) {
    return "";
  }

  const normalized = withoutPadding.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function decodeBase64Value(value: string) {
  try {
    const normalized = value.trim().replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return Buffer.from(padded, "base64").toString("utf8");
  } catch {
    return "";
  }
}

function decodeText(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseServerInfo(value: string) {
  if (value.startsWith("[")) {
    const closeIndex = value.indexOf("]");
    if (closeIndex === -1) {
      return { host: "", port: 0 };
    }
    return {
      host: value.slice(1, closeIndex),
      port: Number(value.slice(closeIndex + 2))
    };
  }

  const lastColonIndex = value.lastIndexOf(":");
  if (lastColonIndex <= 0) {
    return { host: "", port: 0 };
  }

  return {
    host: value.slice(0, lastColonIndex),
    port: Number(value.slice(lastColonIndex + 1))
  };
}
