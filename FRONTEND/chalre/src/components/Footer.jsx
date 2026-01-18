import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Footer.css";

export default function Footer() {
  const navigate = useNavigate();

  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Column 1 */}
        <div className="footer-col">
          <h4>Ride Anywhere with ChalRe</h4>
          <ul>
            <li>Popular rides near you</li>
            <li>Trending ride destinations</li>
          </ul>
        </div>

        {/* Column 2 */}
        <div className="footer-col">
          <h4>Shared Travel Routes</h4>
          <ul>
            <li>Kolhapur → Gargoti</li>
            <li>Sangli → Miraj </li>
            <li>Rajarampuri,Kolhapur → Kalamba</li>
            <li>Ichalkarangi → Pune</li>
            <li>Your Villege → Your Desination</li>
          </ul>
        </div>

        {/* Column 3 */}
        <div className="footer-col">
          <h4>Learn More</h4>
          <ul>
            <li onClick={() => navigate("/about")}>About ChalRe</li>
            <li onClick={() => navigate("/about")}>How ChalRe Works</li>
            <li onClick={() => navigate("/help-center")}>Help & Support</li>
            <li>Media & Press</li>
            <li className="footer-highlight" onClick={() => navigate("/careers")}>
              Join Our Team
            </li>
          </ul>

          <button className="language-btn">Language – English (India)</button>

          <div className="social-icons">
            <span>f</span>
            <span>x</span>
            <span>▶</span>
            <span>◎</span>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <span onClick={() => navigate("/terms")}>Terms & Conditions</span>
        <span>© ChalRe 2025</span>
      </div>
    </footer>
  );
}
