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
