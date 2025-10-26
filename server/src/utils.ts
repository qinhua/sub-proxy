export const generateAvatarUrl = (avatar?: string, isFullPath = false) => {
  if (!avatar) return "";
  if (avatar.startsWith("http")) return avatar;
  return `${isFullPath ? `${location.origin}` : ""}${avatar.startsWith("/upload/avatar/") ? "" : "/upload/avatar/"}${avatar}`;
};
