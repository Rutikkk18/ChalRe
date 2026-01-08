// src/api/axios.js
import axios from "axios";
import { handleAuthError } from "../utils/errorHandler";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL
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
      requestUrl.includes("/rides/search") || requestUrl.includes("/rides");

    // Handle 401/403 errors globally
    if (
      (error.response?.status === 401 || error.response?.status === 403) &&
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
