import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  CreditCard,
  FileText,
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  CheckCircle2,
  ExternalLink,
  Lock,
  HelpCircle
} from "lucide-react";
import "../styles/TrustCenter.css";

export default function TrustCenter() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("all");
  const [expandedSection, setExpandedSection] = useState(null);

  const categories = [
    { id: "all", label: "All Topics" },
    { id: "safety", label: "Safety & KYC" },
    { id: "payments", label: "Payments & Fees" },
    { id: "refunds", label: "Refunds & Cancellations" },
    { id: "payouts", label: "Driver Payouts" },
    { id: "limits", label: "Limitations & Expectations" }
  ];

  const policySections = [
    {
      id: "kyc-checks",
      category: "safety",
      title: "1. Driver Verification & KYC Review",
      icon: ShieldCheck,
      badge: "Verified Policy",
      summary: "What documents we inspect and what verification realistically means.",
      content: [
        "Drivers publishing journeys on ChalRe must submit government-issued identification: an ID Card, a Driving License, and a current Profile Photo.",
        "Our administrative team inspects these submissions against internal verification criteria before approving the account to offer rides.",
        "Honest limitation: Verification verifies document submission and reduces account impersonation, but it does not represent an independent police background check, criminal history clearance, or a guarantee of personal safety or driving quality. Commuters are encouraged to exercise normal personal awareness."
      ]
    },
    {
      id: "journey-transparency",
      category: "safety",
      title: "2. Ride & Profile Transparency",
      icon: FileText,
      badge: "Verified Feature",
      summary: "Clear journey parameters available prior to booking.",
      content: [
        "Before booking or confirming a seat, passengers see the vehicle type (Car or Motorcycle), route details (pickup, drop, and waypoints), departure time, and per-seat contribution.",
        "Both participants can view each other's profile information to coordinate departure.",
        "All coordination should occur through our platform messaging channels to ensure a documented trail."
      ]
    },
    {
      id: "zero-fee",
      category: "payments",
      title: "3. ₹0 Platform Booking Fee (Launch Offer)",
      icon: CreditCard,
      badge: "Active Launch Policy",
      summary: "Current fee structure and financial transparency.",
      content: [
        "During our initial launch period, ChalRe charges a ₹0 platform fee. Passengers pay solely the trip contribution established by the driver.",
        "No hidden charges, surge markups, or undisclosed payment handling fees are added at checkout.",
        "If a platform convenience fee is introduced in future phases, it will be prominently displayed before payment authorization."
      ]
    },
    {
      id: "razorpay-payments",
      category: "payments",
      title: "4. Payment Collection & Processing",
      icon: Lock,
      badge: "Razorpay Secured",
      summary: "How payment funds are handled from booking to completion.",
      content: [
        "All online bookings are processed securely via Razorpay's PCI-DSS compliant payment gateway (supporting UPI, debit/credit cards, and net banking).",
        "When a passenger initiates a booking, a temporary seat hold is established. Upon payment verification, funds are held by the platform and are not transferred to the driver until the ride concludes.",
        "ChalRe does not collect or store full card details or banking passwords on its servers."
      ]
    },
    {
      id: "refund-policy",
      category: "refunds",
      title: "5. Cancellations & Refund Reconciliations",
      icon: HelpCircle,
      badge: "UPI Reconciled",
      summary: "Eligibility, processing timelines, and how refunds are handled.",
      content: [
        "If a seat hold expires before payment completes, or if a driver cancels a confirmed ride, a full refund is initiated.",
        "For passenger-initiated cancellations, refund eligibility depends on the time remaining before the scheduled departure. Early cancellations maximize refund amounts.",
        "Refund processing: Refunds are not instantaneous cash returns; they are reviewed and reconciled by administration, then transferred directly to the user's registered UPI ID. Please ensure an active UPI ID is maintained in your Dashboard."
      ]
    },
    {
      id: "payout-process",
      category: "payouts",
      title: "6. Driver Payout Procedure",
      icon: CreditCard,
      badge: "Admin Reconciled",
      summary: "How and when drivers receive trip contributions.",
      content: [
        "Drivers must add and verify their valid UPI ID in their Dashboard to receive payouts.",
        "Following ride completion, the passenger confirms completion, or an automatic post-trip reconciliation window applies.",
        "Payouts are reviewed, marked as completed by administration with reference tracking, and transferred directly to the driver's registered UPI account."
      ]
    },
    {
      id: "what-we-dont-promise",
      category: "limits",
      title: "7. What We Don't Promise (Our Limitations)",
      icon: AlertTriangle,
      badge: "Legal Transparency",
      summary: "Clear statement of our responsibilities and technology boundaries.",
      content: [
        "ChalRe is an intermediary peer-to-peer technology platform that connects travelers going in the same direction. We do not operate a commercial transportation fleet or employ drivers.",
        "Document verification mitigates risks, but cannot guarantee individual conduct, driving skill, or vehicle mechanical condition.",
        "Driver contributions are intended to offset real travel fuel expenses, not generate commercial profits or guaranteed wages."
      ]
    }
  ];

  const filteredSections = activeCategory === "all"
    ? policySections
    : policySections.filter(s => s.category === activeCategory);

  const toggleSection = (id) => {
    setExpandedSection(prev => (prev === id ? null : id));
  };

  return (
    <div className="trust-center-page">
      <div className="trust-center-hero">
        <div className="trust-center-container">
          <button
            type="button"
            className="trust-back-btn"
            onClick={() => navigate("/")}
          >
            <ArrowLeft size={16} />
            <span>Back to Home</span>
          </button>

          <div className="trust-hero-badge">
            <Lock size={13} />
            <span>CHALRE TRUST CENTER</span>
          </div>

          <h1 className="trust-hero-title">
            Our Commitments, <span className="trust-hero-accent">Policies &amp; Limitations</span>
          </h1>

          <p className="trust-hero-sub">
            Clear, verified facts about how ChalRe handles document checks, online payments, cancellations, and user safety.
          </p>
        </div>
      </div>

      <div className="trust-center-body">
        <div className="trust-center-container">

          {/* Category Tabs */}
          <div className="trust-cat-pills" role="tablist" aria-label="Policy Categories">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={activeCategory === c.id}
                className={`trust-cat-pill ${activeCategory === c.id ? "trust-cat-pill--active" : ""}`}
                onClick={() => setActiveCategory(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Policy Cards Accordion */}
          <div className="trust-policy-list">
            {filteredSections.map((sec) => {
              const SectionIcon = sec.icon;
              const isExpanded = expandedSection === sec.id;
              return (
                <div
                  key={sec.id}
                  className={`trust-policy-card ${isExpanded ? "trust-policy-card--expanded" : ""}`}
                >
                  <button
                    type="button"
                    className="trust-policy-header"
                    onClick={() => toggleSection(sec.id)}
                    aria-expanded={isExpanded}
                  >
                    <div className="trust-policy-header-left">
                      <div className="trust-policy-icon-box">
                        <SectionIcon size={18} />
                      </div>
                      <div>
                        <div className="trust-policy-tag-row">
                          <span className="trust-policy-badge">{sec.badge}</span>
                        </div>
                        <h2 className="trust-policy-title">{sec.title}</h2>
                        <p className="trust-policy-summary">{sec.summary}</p>
                      </div>
                    </div>

                    <ChevronDown
                      size={18}
                      className={`trust-policy-chevron ${isExpanded ? "trust-policy-chevron--rotated" : ""}`}
                    />
                  </button>

                  {isExpanded && (
                    <div className="trust-policy-content">
                      {sec.content.map((p, pIdx) => (
                        <p key={pIdx}>{p}</p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Links Section */}
          <div className="trust-related-box">
            <h3>Additional Safety &amp; Policy Resources</h3>
            <div className="trust-related-links">
              <button
                type="button"
                className="trust-link-pill"
                onClick={() => navigate("/scam")}
              >
                <AlertTriangle size={15} />
                <span>Anti-Scam &amp; Fraud Prevention Guide</span>
                <ExternalLink size={13} />
              </button>
              <button
                type="button"
                className="trust-link-pill"
                onClick={() => navigate("/terms")}
              >
                <FileText size={15} />
                <span>Terms &amp; Conditions</span>
                <ExternalLink size={13} />
              </button>
              <button
                type="button"
                className="trust-link-pill"
                onClick={() => navigate("/privacy-policy")}
              >
                <Lock size={15} />
                <span>Privacy &amp; Data Policy</span>
                <ExternalLink size={13} />
              </button>
              <button
                type="button"
                className="trust-link-pill"
                onClick={() => navigate("/help-center")}
              >
                <CheckCircle2 size={15} />
                <span>Help Center &amp; FAQs</span>
                <ExternalLink size={13} />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
