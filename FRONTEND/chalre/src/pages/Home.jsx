// src/pages/Home.jsx
import "../styles/home.css";
import LocationAutocomplete from "../components/LocationAutocomplete";
import { useNavigate } from "react-router-dom";
import { useState,useEffect } from "react";

export default function Home() {
  const navigate = useNavigate();

  const [search, setSearch] = useState({
    from: "",
    to: "",
    date: "",
    passengers: 1,
  });

  const updateSearch = (field, value) => {
    setSearch((prev) => ({ ...prev, [field]: value }));
  };

  const [scrolled, setScrolled] = useState(false);

useEffect(() => {
  const onScroll = () => {
    setScrolled(window.scrollY > 120);
  };

  window.addEventListener("scroll", onScroll);
  return () => window.removeEventListener("scroll", onScroll);
}, []);

  return (
    <div className="home-wrapper">
      {/* HERO SECTION */}
      <header className="hero">
        <h1>Ride Together. Travel Smarter.</h1>
        <p>
          A modern platform connecting local riders. Safe, fast and affordable
          rides for everyone.
        </p>

        <div className={`home-search-bar ${scrolled ? "search-sticky" : ""}`}>
          <div className="search-item">
            <LocationAutocomplete
              value={search.from}
              onChange={(val) => updateSearch("from", val)}
              placeholder="Leaving From"
            />
          </div>

          <div className="divider" />

          <div className="search-item">
            <LocationAutocomplete
              value={search.to}
              onChange={(val) => updateSearch("to", val)}
              placeholder="Going to"
            />
          </div>

          <div className="divider" />

          <div className="search-item small">
            <input
              type="date"
              value={search.date}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => updateSearch("date", e.target.value)}
            />
          </div>

          <div className="divider" />

          <div className="search-item small">
            <div className="seat-input">
              <span className="seat-label">Seats </span>
              <input
                type="number"
                min="1"
                max="10"
                value={search.passengers}
                onChange={(e) =>
                  updateSearch("passengers", e.target.value)
                }
              />
            </div>
          </div>

          <button
            className="search-action"
            onClick={() => {
              // Validate from and to
              if (!search.from.trim() || !search.to.trim()) {
                alert("Please enter both 'Leaving From' and 'Going to' locations.");
                return;
              }
              // Navigate to /search with state
              navigate("/search", { state: { from: search.from, to: search.to, date: search.date, passengers: search.passengers } });
            }}
          >
            Search
          </button>
        </div>
      </header>
      <div class="divider gradient"></div>

      {/* FEATURES SECTION */}
      <section className="features">
        <div className="feature-card">
          <h3>Verified Users</h3>
          <p>Every rider undergoes document verification for safety and trust.</p>
        </div>

        <div className="feature-card">
          <h3>Smart Matching</h3>
          <p>
            Find rides going your way in seconds using our auto-matching engine.
          </p>
        </div>

        <div className="feature-card">
          <h3>Secure Payments</h3>
          <p>
            Pay securely with multiple payment options. Fast and reliable transactions.
          </p>
        </div>
        <div class="divider gradient"/>
      </section>

      <div className="ride-sharehome">

        <h2 className="h2hr">Share your ride. Save more.</h2>
        <p className="phr">Post your trip, fill empty seats, and split fuel and toll costs effortlessly.</p>
        <button className="btn-hssr">Share your ride</button>
      
        
      </div>
      <div class="divider gradient"/>
      


    </div>
  );
}
