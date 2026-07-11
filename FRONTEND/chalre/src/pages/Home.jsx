// src/pages/Home.jsx
import "../styles/Home.css";
import LocationAutocomplete from "../components/LocationAutocomplete";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import Footer from "../components/Footer";
import { ShieldCheck, Compass, Lock, Car, MapPin, Route, ArrowRight, User } from "lucide-react";
import CustomDatePicker from "../components/CustomDatePicker";
import { motion } from "framer-motion";
import { useLanguage } from "../context/LanguageContext";

export default function Home() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [search, setSearch] = useState({
    from: "",
    to: "",
    date: "",
    passengers: 1,
  });

  // ── Refs so coords are always current at button-click time ──
  // useState is async — by the time Search is clicked, state
  // may not have updated yet. Refs update synchronously.
  const fromCoordsRef = useRef(null);
  const toCoordsRef   = useRef(null);

  const updateSearch = (field, value) => {
    setSearch((prev) => ({ ...prev, [field]: value }));
  };

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 120);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="home-wrapper">

      {/* ── HERO ── */}
      <header className="hero">

        <div className="launch-banner">
          <div className="launch-banner-inner">
            <div className="launch-banner-text">
              <span className="launch-banner-title">{t("launchBannerTitle")}</span>
              <span className="launch-banner-desc">{t("launchBannerDesc")}</span>
            </div>
          </div>
        </div>

        <h1>{t("heroTitle")}</h1>
        <p>{t("heroSubtitle")}</p>

        <div className={`home-search-bar ${scrolled ? "search-sticky" : ""}`}>
          <div className="search-item location-from">
            <LocationAutocomplete
              value={search.from}
              onChange={(val) => {
                updateSearch("from", val);
                fromCoordsRef.current = null;
              }}
              placeholder={t("leavingFrom")}
              onSelect={(place) => {
                updateSearch("from", place.name || place.display_name || "");
                if (place.lat && place.lng) {
                  fromCoordsRef.current = { lat: place.lat, lng: place.lng };
                } else {
                  fromCoordsRef.current = null;
                }
              }}
            />
          </div>

          <div className="divider" />

          <div className="search-item location-to">
            <LocationAutocomplete
              value={search.to}
              onChange={(val) => {
                updateSearch("to", val);
                toCoordsRef.current = null;
              }}
              placeholder={t("goingTo")}
              onSelect={(place) => {
                updateSearch("to", place.name || place.display_name || "");
                if (place.lat && place.lng) {
                  toCoordsRef.current = { lat: place.lat, lng: place.lng };
                } else {
                  toCoordsRef.current = null;
                }
              }}
            />
          </div>

          <div className="divider" />

          <div className="search-item small cdp-search-item">
            <CustomDatePicker
              value={search.date}
              onChange={(val) => updateSearch("date", val)}
              placeholder={t("date")}
            />
          </div>

          <div className="divider" />

          <div className="search-item seats-input">
            <div className="seat-input">
              <span className="seat-label" style={{ display: 'inline-flex', alignItems: 'center' }}><User size={16} style={{ marginRight: '6px', color: '#6b7280' }} />{t("seats")}</span>
              <input
                type="number"
                min="1"
                max="10"
                value={search.passengers}
                onChange={(e) => updateSearch("passengers", e.target.value)}
              />
            </div>
          </div>

          <button
            className="search-action"
            onClick={() => {
              if (!search.from.trim() || !search.to.trim()) {
                alert(t("searchAlert"));
                return;
              }
              // ── Read from refs — always current, never stale ──
              const fromCoords = fromCoordsRef.current;
              const toCoords   = toCoordsRef.current;
              console.log("Home search coords:", { fromCoords, toCoords });
              navigate("/search", {
                state: {
                  from:       search.from,
                  to:         search.to,
                  date:       search.date,
                  passengers: search.passengers,
                  fromCoords: fromCoords || null,
                  toCoords:   toCoords   || null,
                },
              });
            }}
          >
            {t("search")}
          </button>
        </div>
      </header>

      {/* ── FEATURES ── */}
      <motion.section
        className="features"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.5 }}
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.12, delayChildren: 0 } },
        }}
      >
        <motion.div
          className="feature-card"
          variants={{
            hidden: { opacity: 0, y: 40, scale: 0.97 },
            visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.8, ease: [0, 0, 0.2, 1] } },
          }}
        >
          <div className="feature-icon-badge">
            <ShieldCheck size={26} strokeWidth={1.5} style={{ color: '#024110' }} />
          </div>
          <h3>{t("verifiedUsers")}</h3>
          <p>{t("verifiedUsersDesc")}</p>
        </motion.div>

        <motion.div
          className="feature-card"
          variants={{
            hidden: { opacity: 0, y: 40, scale: 0.97 },
            visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.8, ease: [0, 0, 0.2, 1] } },
          }}
        >
          <div className="feature-icon-badge">
            <Compass size={26} strokeWidth={1.5} style={{ color: '#024110' }} />
          </div>
          <h3>{t("smartMatching")}</h3>
          <p>{t("smartMatchingDesc")}</p>
        </motion.div>

        <motion.div
          className="feature-card"
          variants={{
            hidden: { opacity: 0, y: 40, scale: 0.97 },
            visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.8, ease: [0, 0, 0.2, 1] } },
          }}
        >
          <div className="feature-icon-badge">
            <Lock size={26} strokeWidth={1.5} style={{ color: '#024110' }} />
          </div>
          <h3>{t("securePayments")}</h3>
          <p>{t("securePaymentsDesc")}</p>
        </motion.div>
        <div className="divider gradient" />
      </motion.section>

      {/* ── SHARE RIDE ── */}
      <div className="ride-sharehome">
        <h2 className="h2hr">{t("shareRideTitle")}</h2>
        <p className="phr">{t("shareRideDesc")}</p>
        <button className="btn-hssr" onClick={() => navigate("/offer")}>
          {t("shareYourRide")}
        </button>
      </div>
      <div className="divider gradient" />

      {/* ── FRAUD ── */}
      <div className="fraud-div">
        <div className="fraud-image">
          <img src="/fraud.png" alt={t("fraudImgAlt")} />
        </div>
        <div className="fraud-content">
          <h2>{t("fraudTitle")}</h2>
          <p>{t("fraudDesc")}</p>
          <button className="fraud-btn" onClick={() => navigate("/scam")}>
            {t("learnMoreBtn")}
            <span className="btn-icon"><ArrowRight size={16} /></span>
          </button>
        </div>
      </div>

      <div className="divider gradient" />

      {/* ── WHY CHALRE ── */}
      <section className="why-chalre">
        <div className="why-header">
          <h2>{t("whyChalRe")}</h2>
          <p>{t("whyChalReSubtitle")}</p>
        </div>
        <div className="why-grid">
          <div className="why-card">
            <span className="why-icon"><Car size={32} strokeWidth={1.5} style={{ color: '#024110' }} /></span>
            <h3>{t("bikeCarOptions")}</h3>
            <p>{t("bikeCarOptionsDesc")}</p>
          </div>
          <div className="why-card">
            <span className="why-icon"><MapPin size={32} strokeWidth={1.5} style={{ color: '#024110' }} /></span>
            <h3>{t("localFocus")}</h3>
            <p>{t("localFocusDesc")}</p>
          </div>
          <div className="why-card">
            <span className="why-icon"><Route size={32} strokeWidth={1.5} style={{ color: '#024110' }} /></span>
            <h3>{t("longDistance")}</h3>
            <p>{t("longDistanceDesc")}</p>
          </div>
        </div>
      </section>

      <div className="divider gradient" />

      {/* ── HELP CENTRE ── */}
      <div className="help-centre">
        <h2 className="help-title">{t("helpCentreTitle")}</h2>
        <div className="help-grid">
          <div className="help-col">
            <div className="help-item">
              <h4>{t("helpQ1")}</h4>
              <p>{t("helpA1")}</p>
            </div>
            <div className="help-item">
              <h4>{t("helpQ2")}</h4>
              <p>{t("helpA2")}</p>
            </div>
          </div>
          <div className="help-col">
            <div className="help-item">
              <h4>{t("helpQ3")}</h4>
              <p>{t("helpA3")}</p>
            </div>
            <div className="help-item">
              <h4>{t("helpQ4")}</h4>
              <p>{t("helpA4")}</p>
            </div>
          </div>
        </div>
        <div className="help-btn-wrap">
          <button className="help-btn" onClick={() => navigate("/help-center")}>
            {t("readHelpCentre")}
          </button>
        </div>
        <div className="divider gradient" />
      </div>

      <Footer />
    </div>
  );
}