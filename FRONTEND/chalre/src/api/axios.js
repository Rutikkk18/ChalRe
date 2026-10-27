// src/api/axios.js
import axios from "axios";
import { handleAuthError } from "../utils/errorHandler";

// Resolve base API URL:
// 1. If VITE_API_BASE_URL is provided (via Vite env or Vercel dashboard), normalize trailing slashes
//    and ensure it points to the /api base (e.g. "https://chalre-backend.onrender.com/api").
// 2. Otherwise default to "/api" to preserve existing production reverse-proxy behavior.
const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (!envUrl || typeof envUrl !== "string" || envUrl.trim() === "") {
    return "/api";
  }
  const trimmed = envUrl.trim().replace(/\/+$/, "");
  if (trimmed === "" || trimmed === "/api") {
    return "/api";
  }
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
};

const api = axios.create({
  baseURL: getApiBaseUrl()
});


api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for handling auth errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || "";
    const isPublicRideFetch =
      requestUrl.includes("/rides/search") ||
      requestUrl.includes("/rides") ||
      requestUrl.includes("/ratings/driver");

    // Handle 401/403 errors globally
    if (
      (error.response?.status === 401 || error.response?.status === 403) &&
      !requestUrl.includes("/auth/me") &&
      !isPublicRideFetch
    ) {
      // Clear auth data
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      
      // Redirect to login if not already there
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
