// src/components/RideLoader.jsx

import "../styles/Rideloader.css";
export default function RideLoader({ visible }) {
  if (!visible) return null;

  return (
    <div className="ride-loader-overlay">
      <div className="ride-loader-box">
        <div className="road-track">
          {/* Dashed road lines */}
          <div className="road-lines">
            <span /><span /><span /><span /><span /><span />
          </div>

          {/* Moving car SVG */}
          <div className="car-mover">
            <svg
              viewBox="0 0 120 60"
              xmlns="http://www.w3.org/2000/svg"
              className="car-svg"
            >
              {/* Car body */}
              <rect x="10" y="28" width="100" height="22" rx="6" fill="#024110" />
              {/* Car roof */}
              <path d="M30 28 Q38 10 55 10 H75 Q90 10 95 28 Z" fill="#075017" />
              {/* Windows */}
              <path d="M38 28 Q43 14 55 14 H68 Q78 14 82 28 Z" fill="#a8d5b5" opacity="0.85" />
              {/* Window divider */}
              <line x1="61" y1="14" x2="61" y2="28" stroke="#024110" strokeWidth="2" />
              {/* Headlight */}
              <ellipse cx="111" cy="38" rx="5" ry="4" fill="#fef08a" opacity="0.9" />
              {/* Taillight */}
              <rect x="10" y="34" width="5" height="8" rx="2" fill="#f87171" opacity="0.9" />
              {/* Wheels */}
              <circle cx="33" cy="50" r="9" fill="#1a1a1a" />
              <circle cx="33" cy="50" r="4.5" fill="#9ca3af" />
              <circle cx="90" cy="50" r="9" fill="#1a1a1a" />
              <circle cx="90" cy="50" r="4.5" fill="#9ca3af" />
              {/* Door lines */}
              <line x1="62" y1="28" x2="62" y2="50" stroke="#149349" strokeWidth="1.2" opacity="0.6" />
              {/* Door handle */}
              <rect x="52" y="37" width="7" height="2.5" rx="1.2" fill="#28a745" opacity="0.7" />
              <rect x="66" y="37" width="7" height="2.5" rx="1.2" fill="#28a745" opacity="0.7" />
            </svg>
          </div>

          {/* Speed lines behind car */}
          <div className="speed-lines">
            <span /><span /><span />
          </div>
        </div>

        <p className="ride-loader-text">Searching for rides…</p>
      </div>
    </div>
  );
}