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
    try {
      const parsed = YAML.parse(candidate);
      if (Array.isArray(parsed)) {
        return parsed.filter(node => node?.name);
      }
      if (parsed && Array.isArray(parsed.proxies)) {
        return parsed.proxies.filter((node: any) => node?.name);
      }
    } catch {
      // Try the next candidate.
    }
  }

  return [];
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
