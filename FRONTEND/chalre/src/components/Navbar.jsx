// src/components/Navbar.jsx
import { useContext, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const { t } = useLanguage();
  const location = useLocation();

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 120);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const currentPath = location.pathname;

  return (
    <nav className={`navbar ${scrolled ? "navbar-expanded" : ""}`}>
      <div className="logo">ChalRe</div>

      <div className="nav-links">
        {currentPath !== "/" && <Link to="/">{t("navHome")}</Link>}
        {currentPath !== "/search" && <Link to="/search">{t("navSearchRides")}</Link>}
        {currentPath !== "/offer" && <Link to="/offer">{t("navOfferRide")}</Link>}

        {!user && currentPath !== "/login" && (
          <Link to="/login">{t("navLogin")}</Link>
        )}

        {user && currentPath !== "/dashboard" && (
          <Link to="/dashboard">{t("navDashboard")}</Link>
        )}

        {user?.role === "ADMIN" && (
          <Link to="/admin/dashboard" className="nav-admin-btn">
            {t("navAdminDashboard")}
          </Link>
        )}

        {!user ? (
          currentPath !== "/register" && (
            <Link to="/register" className="register-btn">
              {t("navRegister")}
            </Link>
          )
        ) : (
          <button onClick={logout} className="logout-btn">
            {t("navLogout")}
          </button>
        )}
      </div>
    </nav>
  );
}