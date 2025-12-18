// src/context/AuthContext.jsx
import { createContext, useState, useEffect } from "react";
import api from "../api/axios";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // Load user from localStorage immediately on refresh
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));   // ⬅ important
    }
  }, []);

  const fetchUser = async () => {
    try {
      const res = await api.get("/auth/me");  // correct route
      setUser(res.data);

      localStorage.setItem("user", JSON.stringify(res.data));
    } catch (err) {
      console.error("Failed to fetch user:", err);

      setUser(null);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    }
  };

  // login stores token → THEN fetches user
  const login = async (token) => {
    localStorage.setItem("token", token);

    // must wait so ProtectedRoute does not redirect
    await fetchUser();
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  // On reload if token exists → fetch user
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) fetchUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
