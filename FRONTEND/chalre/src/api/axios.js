// src/api/axios.js
import axios from "axios";
import { handleAuthError } from "../utils/errorHandler";

// Dedicated staging backend URL
export const STAGING_API_BASE_URL = "https://chalre-api-staging.onrender.com/api";

/**
 * Determine if current execution environment is staging.
 * Evaluates both Vite build-time mode/env and browser runtime hostname.
 */
export function isStagingEnvironment() {
  const mode = import.meta.env?.MODE;
  const appEnv = import.meta.env?.VITE_APP_ENV;
  if (mode === "staging" || appEnv === "staging") {
    return true;
  }
  if (typeof window !== "undefined" && window.location?.hostname) {
    const host = window.location.hostname.toLowerCase();
    return host.includes("staging") || host.includes("chalre-staging");
  }
  return false;
}

/**
 * Resolve base API URL with fail-closed isolation safety:
 * 1. If Staging:
 *    - Strictly prevents relative "/api" fallback to avoid proxying to production.
 *    - Strictly prevents setting production backend URLs.
 *    - Defaults to STAGING_API_BASE_URL if unset.
 * 2. If Production / Default:
 *    - Preserves existing "/api" fallback when VITE_API_BASE_URL is unset.
 */
export function getApiBaseUrl() {
  const envUrl = import.meta.env?.VITE_API_BASE_URL;
  const isStaging = isStagingEnvironment();

  if (isStaging) {
    if (typeof envUrl === "string" && envUrl.trim().length > 0) {
      const trimmed = envUrl.trim().replace(/\/+$/, "");

      // Critical isolation safety: never allow production backend in staging
      if (
        trimmed.includes("chalre.onrender.com") &&
        !trimmed.includes("chalre-api-staging.onrender.com")
      ) {
        console.error(
          "[CRITICAL ISOLATION ERROR] Staging runtime detected production API target:",
          trimmed
        );
        throw new Error(
          "Staging is configured with production API URL. Request blocked for database safety."
        );
      }

      // Refuse relative /api in staging runtime
      if (trimmed === "/api" || trimmed.startsWith("/")) {
        console.warn(
          "[ChalRe Config Warning] Relative API URL in staging is disallowed. Defaulting to staging backend."
        );
        return STAGING_API_BASE_URL;
      }

      return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
    }

    // Fail-safe in staging: NEVER return relative "/api"
    console.warn(
      "[ChalRe Config Warning] VITE_API_BASE_URL missing in staging. Defaulting to isolated staging backend."
    );
    return STAGING_API_BASE_URL;
  }

  // Non-staging (Production / Development fallback)
  if (!envUrl || typeof envUrl !== "string" || envUrl.trim() === "") {
    return "/api";
  }

  const trimmed = envUrl.trim().replace(/\/+$/, "");
  if (trimmed === "" || trimmed === "/api") {
    return "/api";
  }

  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

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
      handleAuthError(error);
    }

    return Promise.reject(error);
  }
);

export default api;
