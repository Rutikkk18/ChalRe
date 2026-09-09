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
          <a
            href="https://play.google.com/store/apps/details?id=com.chalre.app"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-playstore-btn"
            title="Get it on Google Play"
          >
            <svg className="nav-playstore-icon" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fill="#00D2FF" d="M32.5 17.5C28.2 21.8 25.8 28.3 25.8 36.3V475.7c0 8 2.4 14.5 6.7 18.8l1.4 1.3L274 255.7v-4.5L33.9 16.2l-1.4 1.3z"/>
              <path fill="#FFD200" d="M354.3 336.1l-80.3-80.4v-4.5l80.3-80.4 1.8 1 95.3 54.1c27.2 15.4 27.2 40.7 0 56.1l-95.3 54.1-1.8 1z"/>
              <path fill="#FF3A44" d="M274 251.2L33.9 494.6c8.9 9.4 23.4 10.6 39.5 1.5l280.9-159.5-80.3-85.4z"/>
              <path fill="#00F076" d="M274 260.8l80.3-85.4L73.4 15.9C57.3 6.8 42.8 8 33.9 17.4L274 260.8z"/>
            </svg>
            <span>Get on Google Play</span>
          </a>

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
          <a
            href="https://play.google.com/store/apps/details?id=com.chalre.app"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-drawer-playstore-btn"
            onClick={closeMenu}
          >
            <svg className="nav-playstore-icon" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fill="#00D2FF" d="M32.5 17.5C28.2 21.8 25.8 28.3 25.8 36.3V475.7c0 8 2.4 14.5 6.7 18.8l1.4 1.3L274 255.7v-4.5L33.9 16.2l-1.4 1.3z"/>
              <path fill="#FFD200" d="M354.3 336.1l-80.3-80.4v-4.5l80.3-80.4 1.8 1 95.3 54.1c27.2 15.4 27.2 40.7 0 56.1l-95.3 54.1-1.8 1z"/>
              <path fill="#FF3A44" d="M274 251.2L33.9 494.6c8.9 9.4 23.4 10.6 39.5 1.5l280.9-159.5-80.3-85.4z"/>
              <path fill="#00F076" d="M274 260.8l80.3-85.4L73.4 15.9C57.3 6.8 42.8 8 33.9 17.4L274 260.8z"/>
            </svg>
            <span>Get on Google Play</span>
          </a>
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