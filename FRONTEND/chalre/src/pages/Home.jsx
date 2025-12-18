// src/pages/Home.jsx
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link } from "react-router-dom";
import "../styles/home.css";

export default function Home() {
  const { user, logout } = useContext(AuthContext);

  return (
    <div className="home-wrapper">

      {/* NAVBAR */}
      <nav className="navbar">
        <div className="logo">ChalRe</div>

        {/* MAIN LINKS */}
        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/search">Search Rides</Link>
          <Link to="/offer">Offer Ride</Link>

          {!user && <Link to="/login">Login</Link>}
          {user && <Link to="/dashboard">Dashboard</Link>}
        

        {/* RIGHT SIDE BUTTONS */}
        
        {!user ? (
          <Link to="/register" className="register-btn">Register</Link>
        ) : (
          <button onClick={logout} className="logout-btn">Logout</button>
        )}
        </div>
      </nav>

      {/* HERO SECTION */}
      <header className="hero">
        <h1>Ride Together. Travel Smarter.</h1>
        <p>A modern platform connecting local riders. Safe, fast and affordable rides for everyone.</p>

        <div className="hero-buttons">
          <Link to="/search" className="hero-btn primary">Search Rides</Link>
          <Link to="/offer" className="hero-btn secondary">Offer a Ride</Link>
        </div>
      </header>

      {/* FEATURES SECTION */}
      <section className="features">
        <div className="feature-card">
          <h3>Verified Users</h3>
          <p>Every rider undergoes document verification for safety and trust.</p>
        </div>

        <div className="feature-card">
          <h3>Smart Matching</h3>
          <p>Find rides going your way in seconds using our auto-matching engine.</p>
        </div>

        <div className="feature-card">
          <h3>Secure Wallet</h3>
          <p>Pay instantly, load money and track all your travel payments.</p>
        </div>
      </section>

    </div>
  );
}
