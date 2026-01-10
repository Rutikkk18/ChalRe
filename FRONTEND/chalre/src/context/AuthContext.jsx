// src/context/AuthContext.jsx
import { createContext, useState, useEffect } from "react";
import api from "../api/axios";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // Load user from localStorage immediately on refresh
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

 const fetchUser = async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    console.warn("fetchUser skipped: no token");
    return;
  }

  try {
    const res = await api.get("/auth/me");
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
    await fetchUser();
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };



  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,     // ✅ FIX: expose setUser
        login,
        logout,
        fetchUser    // ✅ optional but useful
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
