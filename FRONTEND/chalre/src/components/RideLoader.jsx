// src/components/RideLoader.jsx

import "../styles/Rideloader.css";

/**
 * RideLoader — two modes:
 *  - inline (default): sits inside the results container, small & contained
 *  - overlay: full-page frosted glass (pass overlay={true} to use)
 */
export default function RideLoader({ visible, overlay = false }) {
  if (overlay && !visible) return null;

  const wrapperClass = overlay ? "ride-loader-overlay" : "ride-loader-inline";

  return (
    <div className={wrapperClass}>
      <div className="ride-loader-box">

        {/* Scene */}
        <div className="rl-scene">

          {/* Road */}
          <div className="rl-road">
            <div className="rl-road-surface" />
            <div className="rl-lane-line">
              {[...Array(7)].map((_, i) => (
                <span key={i} className="rl-dash" />
              ))}
            </div>
          </div>

          {/* Car */}
          <div className="rl-car-wrap">
            <svg
              viewBox="0 0 110 52"
              xmlns="http://www.w3.org/2000/svg"
              className="rl-car"
            >
              {/* Shadow */}
              <ellipse cx="55" cy="50" rx="38" ry="4" fill="rgba(2,65,16,0.13)" />
              {/* Body */}
              <rect x="8" y="26" width="94" height="20" rx="5" fill="#024110" />
              {/* Roof */}
              <path d="M27 26 Q34 10 50 10 H70 Q84 10 88 26 Z" fill="#035c18" />
              {/* Window glass */}
              <path d="M35 26 Q40 14 50 14 H68 Q77 14 80 26 Z" fill="#b7dfc4" opacity="0.75" />
              {/* Window divider */}
              <line x1="59" y1="14.5" x2="59" y2="26" stroke="#024110" strokeWidth="1.8" />
              {/* Windshield glare */}
              <path d="M37 24 Q41 16 49 15" stroke="white" strokeWidth="1.2" fill="none" opacity="0.4" strokeLinecap="round" />
              {/* Front headlight */}
              <rect x="100" y="32" width="6" height="7" rx="2" fill="#fef9c3" opacity="0.95" />
              <rect x="101" y="33.5" width="4" height="4" rx="1" fill="#fde047" opacity="0.8" />
              {/* Rear light */}
              <rect x="4" y="33" width="5" height="7" rx="2" fill="#f87171" opacity="0.9" />
              {/* Door line */}
              <line x1="59" y1="26" x2="59" y2="46" stroke="#149349" strokeWidth="1" opacity="0.4" />
              {/* Door handles */}
              <rect x="48" y="35" width="8" height="2" rx="1" fill="#28a745" opacity="0.55" />
              <rect x="63" y="35" width="8" height="2" rx="1" fill="#28a745" opacity="0.55" />
              {/* Wheels */}
              <circle cx="28" cy="46" r="8" fill="#111827" />
              <circle cx="28" cy="46" r="4" fill="#374151" />
              <circle cx="28" cy="46" r="1.5" fill="#9ca3af" />
              <circle cx="84" cy="46" r="8" fill="#111827" />
              <circle cx="84" cy="46" r="4" fill="#374151" />
              <circle cx="84" cy="46" r="1.5" fill="#9ca3af" />
              {/* Wheel shine */}
              <path d="M23 42 Q26 40 29 42" stroke="#6b7280" strokeWidth="1" fill="none" opacity="0.6" />
              <path d="M79 42 Q82 40 85 42" stroke="#6b7280" strokeWidth="1" fill="none" opacity="0.6" />
            </svg>
          </div>

          {/* Exhaust puffs */}
          <div className="rl-exhaust">
            <span className="rl-puff rl-puff-1" />
            <span className="rl-puff rl-puff-2" />
            <span className="rl-puff rl-puff-3" />
          </div>
        </div>

        {/* Text + dots */}
        <div className="rl-footer">
          <span className="rl-label">Searching for rides</span>
          <span className="rl-dots">
            <span className="rl-dot" />
            <span className="rl-dot" />
            <span className="rl-dot" />
          </span>
        </div>

      </div>
    </div>
  );
}