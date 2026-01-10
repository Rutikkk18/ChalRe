import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, authLoading } = useContext(AuthContext);

  // ⏳ WAIT until auth check completes
  if (authLoading) {
    return (
      <div style={{ textAlign: "center", marginTop: "60px" }}>
        Loading...
      </div>
    );
  }

  // 🔐 Not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
