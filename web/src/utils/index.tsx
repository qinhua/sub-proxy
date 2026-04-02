export const generateAvatarUrl = (avatar?: string, isFullPath = false) => {
  if (!avatar) return "";
  if (avatar.startsWith("http")) return avatar;
  const isDev = process.env.NODE_ENV === "development";
  // 开发环境：使用本地地址和实际后端端口，生产环境：使用当前访问的域名和端口
  const curHost = isDev ? "http://localhost:3001" : window.location.origin;

  // 如果已经是完整路径，直接返回
  if (avatar.startsWith("/upload/avatar/")) {
    return `${isFullPath ? `${curHost}` : ""}${avatar}`;
  }

  // 否则添加前缀
  return `${isFullPath ? `${curHost}` : ""}/upload/avatar/${avatar}`;
};

export const LogoutSystem = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/login";
};

// 格式化流量数值
export const formatTrafficValue = (bytes: number) => {
  const pb = bytes / (1024 * 1024 * 1024 * 1024 * 1024);
  if (pb >= 1) {
    return `${pb.toFixed(2)} PB`;
  }
  const tb = bytes / (1024 * 1024 * 1024 * 1024);
  if (tb >= 1) {
    return `${tb.toFixed(2)} TB`;
  }
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) {
    return `${gb.toFixed(2)} GB`;
  }
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) {
    return `${mb.toFixed(2)} MB`;
  }
  const kb = bytes / 1024;
  return `${kb.toFixed(2)} KB`;
};
