export const getProfileImageUrl = (path) => {
  if (!path) return "/profileimage.png";

  // already absolute
  if (path.startsWith("http")) return path;

  return `${import.meta.env.VITE_API_BASE_URL}${path}`;
};
