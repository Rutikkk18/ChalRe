import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Footer.css";
import { useLanguage } from "../context/LanguageContext";
import { Globe } from "lucide-react";
import { motion } from "framer-motion";

const colVariant = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0, 0, 0.2, 1] } },
};

export default function Footer() {
  const navigate = useNavigate();
  const { selectedLanguage, setSelectedLanguage, t } = useLanguage();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const languages = [
    "English (India)",
    "हिंदी (Hindi)",
    "मराठी (Marathi)",
    "தமிழ் (Tamil)",
    "తెలుగు (Telugu)",
    "ಕನ್ನಡ (Kannada)",
    "বাংলা (Bengali)",
    "ગુજરાતી (Gujarati)"
  ];

  const handleLanguageChange = (language) => {
    setSelectedLanguage(language);
    setIsDropdownOpen(false);
  };

  return (
    <footer className="footer">
      <motion.div
        className="footer-container"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.09 } } }}
      >
        {/* Brand column */}
        <motion.div className="footer-col footer-brand" variants={colVariant}>
          <span className="footer-logo">ChalRe</span>
          <p className="footer-tagline">Miles Better Together</p>
          <p className="footer-desc">
            Connecting people through affordable, safe and local ride sharing.
          </p>
        </motion.div>

        {/* Column 1 — Ride Anywhere */}
        <motion.div className="footer-col" variants={colVariant}>
          <h4>{t("rideAnywhere")}</h4>
          <div className="footer-links">
            <span>{t("popularRides")}</span>
            <span>{t("trendingRides")}</span>
          </div>
        </motion.div>

        {/* Column 2 — Shared Routes */}
        <motion.div className="footer-col" variants={colVariant}>
          <h4>{t("sharedRoutes")}</h4>
          <div className="footer-links">
            <span>Kolhapur → Gargoti</span>
            <span>Sangli → Miraj</span>
            <span>Rajarampuri, Kolhapur → Kalamba</span>
            <span>Ichalkarangi → Pune</span>
            <span>Your Village → Your Destination</span>
          </div>
        </motion.div>

        {/* Column 3 — Learn More, Language, Socials */}
        <motion.div className="footer-col" variants={colVariant}>
          <h4>{t("learnMore")}</h4>
          <div className="footer-links">
            <button onClick={() => navigate("/about")}>{t("aboutChalRe")}</button>
            <button onClick={() => navigate("/about")}>{t("howItWorks")}</button>
            <button onClick={() => navigate("/blog")}>Blog</button>
            <button onClick={() => navigate("/help-center")}>{t("helpSupport")}</button>
            <button className="footer-highlight" onClick={() => navigate("/careers")}>{t("joinTeam")}</button>
          </div>

          {/* Language Dropdown */}
          <div className="language-selector">
            <button
              className="language-btn"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <span className="language-btn-inner">
                <Globe size={14} strokeWidth={2} className="globe-icon" />
                {t("languageLabel")} – {selectedLanguage}
              </span>
              <span className={`dropdown-arrow ${isDropdownOpen ? "open" : ""}`}>▼</span>
            </button>

            {isDropdownOpen && (
              <div className="language-dropdown">
                {languages.map((language) => (
                  <div
                    key={language}
                    className={`language-option ${selectedLanguage === language ? "active" : ""}`}
                    onClick={() => handleLanguageChange(language)}
                  >
                    {language}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Social Icons */}
          <div className="social-icons">
            <a className="social-btn" href="https://www.instagram.com/chalre.in/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
            <a className="social-btn" href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter / X">
              <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
              </svg>
            </a>
            <a className="social-btn" href="https://youtube.com/@chalreofficial?si=R8PHa-HD5lcYnBrt" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
              <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </a>
            <a className="social-btn" href="https://whatsapp.com" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
              <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
            </a>
          </div>
        </motion.div>
      </motion.div>

      <div className="footer-bottom">
        <span onClick={() => navigate("/terms")}>{t("terms")}</span>
        <span onClick={() => navigate("/privacy-policy")}>Privacy Policy</span>
        <span>{t("copyright")}</span>
      </div>
    </footer>
  );
}