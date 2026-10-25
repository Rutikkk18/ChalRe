// src/utils/imageUrl.js
import { isStagingEnvironment } from "../api/axios";

export const getProfileImageUrl = (path) => {
  if (!path) return "/profileimage.png";

  // already absolute
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  const rawBase = import.meta.env?.VITE_API_BASE_URL || "";
  let origin = typeof rawBase === "string"
    ? rawBase.trim().replace(/\/+$/, "").replace(/\/api$/, "")
    : "";

  if (!origin && isStagingEnvironment()) {
    origin = "https://chalre-api-staging.onrender.com";
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${origin}${normalizedPath}`;
};
