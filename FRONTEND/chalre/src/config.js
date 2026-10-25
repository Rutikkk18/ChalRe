// src/config.js
import { isStagingEnvironment } from "./api/axios";

const getBackendUrl = () => {
  const rawBase = import.meta.env?.VITE_API_BASE_URL;
  if (typeof rawBase === "string" && rawBase.trim().length > 0) {
    return rawBase.trim().replace(/\/+$/, "").replace(/\/api$/, "");
  }
  if (isStagingEnvironment()) {
    return "https://chalre-api-staging.onrender.com";
  }
  return "http://localhost:8080";
};

export const BACKEND_URL = getBackendUrl();
