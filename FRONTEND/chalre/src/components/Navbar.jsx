// src/components/Navbar.jsx
import { useContext, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const { t } = useLanguage();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const currentPath = location.pathname;
  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <nav className="navbar">
        <div className="logo">ChalRe</div>

        {/* Desktop nav links */}
        <div className="nav-links">
          {currentPath !== "/" && <Link to="/">{t("navHome")}</Link>}
          {currentPath !== "/search" && <Link to="/search">{t("navSearchRides")}</Link>}
          {currentPath !== "/offer" && <Link to="/offer">{t("navOfferRide")}</Link>}

          {user && currentPath !== "/dashboard" && (
            <Link to="/dashboard">{t("navDashboard")}</Link>
          )}

          {user?.role === "ADMIN" && (
            <Link to="/admin/dashboard" className="nav-admin-btn">
              {t("navAdminDashboard")}
            </Link>
          )}

          {!user ? (
            currentPath !== "/login" && (
              <Link to="/login" className="register-btn">
                {t("navLogin")}
              </Link>
            )
          ) : (
            <button onClick={logout} className="logout-btn">
              {t("navLogout")}
            </button>
          )}
        </div>

        {/* Hamburger button — only visible on mobile */}
        <button
          className={`nav-hamburger ${menuOpen ? "nav-hamburger--open" : ""}`}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>
      </nav>

      {/* Mobile backdrop */}
      {menuOpen && (
        <div className="nav-backdrop" onClick={closeMenu} aria-hidden="true" />
      )}

      {/* Mobile drawer */}
      <div className={`nav-drawer ${menuOpen ? "nav-drawer--open" : ""}`} role="dialog" aria-modal="true" aria-label="Navigation menu">
        <div className="nav-drawer__header">
          <span className="nav-drawer__logo">ChalRe</span>
          <button className="nav-drawer__close" onClick={closeMenu} aria-label="Close menu">✕</button>
        </div>

        <nav className="nav-drawer__links">
          {currentPath !== "/" && <Link to="/" onClick={closeMenu}>{t("navHome")}</Link>}
          {currentPath !== "/search" && <Link to="/search" onClick={closeMenu}>{t("navSearchRides")}</Link>}
          {currentPath !== "/offer" && <Link to="/offer" onClick={closeMenu}>{t("navOfferRide")}</Link>}

          {user && currentPath !== "/dashboard" && (
            <Link to="/dashboard" onClick={closeMenu}>{t("navDashboard")}</Link>
          )}

          {user?.role === "ADMIN" && (
            <Link to="/admin/dashboard" className="nav-admin-btn" onClick={closeMenu}>
              {t("navAdminDashboard")}
            </Link>
          )}

          <div className="nav-drawer__action">
            {!user ? (
              currentPath !== "/login" && (
                <Link to="/login" className="register-btn nav-drawer__cta" onClick={closeMenu}>
                  {t("navLogin")}
                </Link>
              )
            ) : (
              <button
                onClick={() => { logout(); closeMenu(); }}
                className="logout-btn nav-drawer__cta"
              >
                {t("navLogout")}
              </button>
            )}
          </div>
        </nav>
      </div>
    </>
  );
}