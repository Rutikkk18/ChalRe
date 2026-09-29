// src/components/VerificationPopup.jsx
import { useNavigate } from "react-router-dom";
import "../styles/verificationPopup.css";

/**
 * Shown when a driver tries to offer a ride but is not verified.
 *
 * Props:
 *  - status : "NOT_SUBMITTED" | "PENDING" | "REJECTED"
 *  - onClose : () => void   — dismiss the popup (does NOT allow submission)
 */
export default function VerificationPopup({ status, onClose }) {
  const navigate = useNavigate();

  const config = {
    NOT_SUBMITTED: {
      icon: "🔐",
      title: "Verify Yourself to Offer Rides",
      badgeClass: "vp-badge--blocked",
      badgeText: "Not Verified",
      description:
        "ChalRe requires document verification before you can offer rides. This keeps our platform safe and builds trust with passengers.",
      perks: [
        "✅ Only takes a few minutes",
        "✅ Your documents are reviewed securely",
        "✅ Passengers prefer verified drivers — get more bookings",
      ],
      ctaLabel: "Upload Documents",
      ctaClass: "vp-btn--primary",
    },
    PENDING: {
      icon: "⏳",
      title: "Verification Under Review",
      badgeClass: "vp-badge--pending",
      badgeText: "Pending Review",
      description:
        "Your documents have been submitted and are currently being reviewed by our team. You'll be able to offer rides once approved.",
      perks: [
        "🔍 Our team reviews documents within 24–48 hours",
        "📩 You'll be notified once your status changes",
        "✅ Thank you for keeping the platform safe!",
      ],
      ctaLabel: "Check Status",
      ctaClass: "vp-btn--warning",
    },
    REJECTED: {
      icon: "⚠️",
      title: "Documents Rejected",
      badgeClass: "vp-badge--rejected",
      badgeText: "Rejected",
      description:
        "Your submitted documents were not approved. Please re-upload clear, valid documents to continue offering rides.",
      perks: [
        "📄 Ensure documents are clear and not expired",
        "🔄 Re-upload and our team will review again",
        "🔐 Verification protects both drivers and passengers",
      ],
      ctaLabel: "Re-upload Documents",
      ctaClass: "vp-btn--danger",
    },
  };

  const { icon, title, badgeClass, badgeText, description, perks, ctaLabel, ctaClass } =
    config[status] || config["NOT_SUBMITTED"];

  return (
    <div
      className="vp-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vp-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="vp-modal">

        {/* Header */}
        <div className="vp-header">
          <span className="vp-icon">{icon}</span>
          <div className="vp-header-text">
            <span className={`vp-badge ${badgeClass}`}>{badgeText}</span>
            <h2 id="vp-title" className="vp-title">{title}</h2>
          </div>
          <button className="vp-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="vp-body">
          <p className="vp-description">{description}</p>

          <ul className="vp-perks">
            {perks.map((perk, i) => (
              <li key={i} className="vp-perk-item">{perk}</li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="vp-footer">
          <button className="vp-btn vp-btn--ghost" onClick={onClose}>
            Maybe Later
          </button>
          <button
            className={`vp-btn ${ctaClass}`}
            onClick={() => { onClose(); navigate("/verification"); }}
          >
            {ctaLabel}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
              <line x1="5" x2="19" y1="12" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>

      </div>
    </div>
  );
}
