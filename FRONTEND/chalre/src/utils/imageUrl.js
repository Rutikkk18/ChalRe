export const getProfileImageUrl = (path) => {
  if (!path) return "/profileimage.png";

  // already absolute
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  const rawBase = import.meta.env.VITE_API_BASE_URL || "";
  // Strip trailing slashes and any trailing /api to obtain backend host origin
  const origin = typeof rawBase === "string"
    ? rawBase.trim().replace(/\/+$/, "").replace(/\/api$/, "")
    : "";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${origin}${normalizedPath}`;
};
