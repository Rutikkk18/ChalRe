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
      title: "Verify your profile",
      badgeClass: "vp-badge--blocked",
      badgeText: "Not Verified",
      description:
        "Complete your document verification to build trust and help passengers feel confident booking your rides.",
      ctaLabel: "Upload Documents",
      ctaClass: "vp-btn--primary",
    },
    PENDING: {
      icon: "⏳",
      title: "Verify your profile",
      badgeClass: "vp-badge--pending",
      badgeText: "Pending Review",
      description:
        "Your documents are under review. You can offer rides if your account is eligible under ChalRe's current ride-posting rules.",
      ctaLabel: "Check Status",
      ctaClass: "vp-btn--warning",
    },
    REJECTED: {
      icon: "⚠️",
      title: "Verify your profile",
      badgeClass: "vp-badge--rejected",
      badgeText: "Action Required",
      description:
        "Your submitted documents were not approved. Please re-upload clear, valid documents to continue offering rides.",
      ctaLabel: "Re-upload Documents",
      ctaClass: "vp-btn--danger",
    },
    APPROVED: {
      icon: "✅",
      title: "Profile Verified",
      badgeClass: "vp-badge--approved",
      badgeText: "Verified",
      description:
        "Your profile is verified. You can offer rides anytime.",
      ctaLabel: "View Profile",
      ctaClass: "vp-btn--primary",
    },
  };

  const { icon, title, badgeClass, badgeText, description, ctaLabel, ctaClass } =
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
