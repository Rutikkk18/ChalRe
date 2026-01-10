import { createContext, useState, useEffect } from "react";
import api from "../api/axios";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true); // ✅ NEW

  // 🔁 Fetch user from backend using JWT
  const fetchUser = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setAuthLoading(false);
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
    } finally {
      setAuthLoading(false); // ✅ IMPORTANT
    }
  };

  // 🔥 Run ONCE on app load (page refresh fix)
  useEffect(() => {
    fetchUser();
  }, []);

  // 🔐 Login: store token → fetch user
  const login = async (token) => {
    localStorage.setItem("token", token);
    setAuthLoading(true);
    await fetchUser();
  };

  // 🚪 Logout
  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,      // kept (no breaking change)
        login,
        logout,
        fetchUser,
        authLoading   // ✅ NEW (used by ProtectedRoute)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
