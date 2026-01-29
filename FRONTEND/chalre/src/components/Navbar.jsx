// src/components/Navbar.jsx
import { useContext, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";


export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 120);
    };

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const currentPath = location.pathname;

  return (
    <nav className={`navbar ${scrolled ? "navbar-expanded" : ""}`}>
      <div className="logo">ChalRe</div>

      {/* MAIN LINKS */}
      <div className="nav-links">
        {currentPath !== "/" && <Link to="/">Home</Link>}
        {currentPath !== "/search" && <Link to="/search">Search Rides</Link>}
        {currentPath !== "/offer" && <Link to="/offer">Offer Ride</Link>}

        {!user && currentPath !== "/login" && (
          <Link to="/login">Login</Link>
        )}

        {user && currentPath !== "/dashboard" && (
          <Link to="/dashboard">Dashboard</Link>
        )}

        
            {user?.role === "ADMIN" && (
      <Link to="/admin/dashboard" className="nav-admin-btn">
        Admin Dashboard
      </Link>
    )}


        {/* RIGHT SIDE BUTTONS */}
        {!user ? (
          currentPath !== "/register" && (
            <Link to="/register" className="register-btn">
              Register
            </Link>
          )
        ) : (
          <button onClick={logout} className="logout-btn">
            Logout
          </button>
        )}

      </div>
    </nav>
  );
}
