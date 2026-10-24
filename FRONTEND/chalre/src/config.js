// src/config.js

const rawBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
export const BACKEND_URL = typeof rawBase === "string"
  ? rawBase.trim().replace(/\/+$/, "").replace(/\/api$/, "")
  : "http://localhost:8080";
