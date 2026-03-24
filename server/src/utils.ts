import YAML from "yaml";

export const generateAvatarUrl = (avatar?: string, isFullPath = false) => {
  if (!avatar) return "";
  if (avatar.startsWith("http")) return avatar;
  return `${isFullPath ? `${location.origin}` : ""}${avatar.startsWith("/upload/avatar/") ? "" : "/upload/avatar/"}${avatar}`;
};

export async function fetchProxyNodesFromUrl(url: string): Promise<any[]> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Clash/1.0.0 (Windows NT 10.0; Win64; x64)"
      },
      timeout: 15000
    } as any);

    if (!response.ok) {
      throw new Error(`Failed to fetch from ${url}: ${response.statusText}`);
    }

    const text = await response.text();
    
    // Try to parse as YAML
    try {
      const parsed = YAML.parse(text);
      if (parsed && parsed.proxies && Array.isArray(parsed.proxies)) {
        return parsed.proxies;
      }
    } catch (e) {
      // Not a valid YAML or not clash format
    }
    
    // If we reach here, it might be base64. We could decode it, but converting to clash format is complex.
    // We assume the URL provides Clash config when User-Agent is Clash.
    throw new Error("Invalid Clash configuration format received from URL.");
  } catch (error) {
    console.error("fetchProxyNodesFromUrl error:", error);
    throw error;
  }
}

