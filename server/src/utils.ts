export const generateAvatarUrl = (avatar?: string, isFullPath = false) => {
  if (!avatar) return "";
  if (avatar.startsWith("http")) return avatar;
  return `${isFullPath ? `${location.protocol}//${location.hostname}:3001` : ""}${avatar.startsWith("/upload/avatar/") ? "" : "/upload/avatar/"}${avatar}`;
};
