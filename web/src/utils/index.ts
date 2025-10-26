export const generateAvatarUrl = (avatar?: string, isFullPath = false) => {
  if (!avatar) return "";
  if (avatar.startsWith("http")) return avatar;

  // 如果已经是完整路径，直接返回
  if (avatar.startsWith("/upload/avatar/")) {
    return `${isFullPath ? `${location.protocol}//${location.hostname}:3001` : ""}${avatar}`;
  }

  // 否则添加前缀
  return `${isFullPath ? `${location.protocol}//${location.hostname}:3001` : ""}/upload/avatar/${avatar}`;
};

export const LogoutSystem = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  // window.location.reload();
  window.location.href = "/login";
};
