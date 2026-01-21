import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function AdminRoute({ children }) {
  const { user, authLoading } = useContext(AuthContext);

  if (authLoading) {
    return (
      <div style={{ textAlign: "center", marginTop: "60px" }}>
        Loading...
      </div>
    );
  }

  // Check if user exists AND has ADMIN role
  if (!user || user.role !== "ADMIN") {
    // Redirect to home if logged in but not admin, or login if not logged in
    return <Navigate to={user ? "/" : "/login"} replace />;
  }

  return children;
}
