import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  CreditCard,
  AlertTriangle,
  ChevronDown,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Lock,
  Receipt
} from "lucide-react";
import "../styles/TrustTransparency.css";

// ── Interactive Pillar Items & Micro-Animation Scenes ──
const PILL_ITEMS = [
  {
    id: "kyc",
    label: "KYC Document Checks",
    caption: "Every driver ID and licence is reviewed against verification criteria before offering rides."
  },
  {
    id: "upi",
    label: "Transparent UPI Payments",
    caption: "Secure payment via Razorpay. Held safely and transferred directly to registered UPI."
  },
  {
    id: "route",
    label: "Realistic Expectations",
    caption: "Peer-to-peer rides depend on commuters traveling your route. We say so upfront."
  },
  {
    id: "fee",
    label: "Zero Platform Fees",
    caption: "Zero commission cuts. Drivers receive what they ask, passengers pay what they see."
  }
];

function KycScene() {
  return (
    <svg viewBox="0 0 320 200" role="img" aria-label="ID card receiving a verified stamp">
      <g className="kyc-card">
        <rect x="50" y="40" width="220" height="130" rx="14" className="fill-white stroke-line" />
        <circle cx="105" cy="92" r="20" className="fill-mint" />
        <circle cx="105" cy="86" r="7" className="fill-green" />
        <path d="M91 108a14 11 0 0 1 28 0z" className="fill-green" />
        <rect x="140" y="76" width="95" height="9" rx="4.5" className="fill-mint" />
        <rect x="140" y="95" width="70" height="9" rx="4.5" className="fill-mint" />
        <rect x="70" y="138" width="170" height="8" rx="4" className="fill-mint" />
        <rect x="50" y="40" width="220" height="3" className="kyc-scan" />
      </g>
      <g className="kyc-stamp">
        <circle cx="236" cy="142" r="30" className="fill-green" />
        <circle cx="236" cy="142" r="24" fill="none" stroke="#bfe8c8" strokeWidth="2" strokeDasharray="3 4" />
        <path d="M223 142l9 9 17-19" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" className="kyc-tick" />
      </g>
    </svg>
  );
}

function UpiScene() {
  return (
    <svg viewBox="0 0 320 200" role="img" aria-label="Phone payment turning into a secure lock">
      <g className="upi-phone">
        <rect x="112" y="24" width="96" height="156" rx="16" className="fill-white stroke-green" strokeWidth="3" />
        <rect x="146" y="32" width="28" height="4" rx="2" className="fill-mint" />
      </g>
      <circle cx="160" cy="102" r="26" className="upi-ripple" />
      <circle cx="160" cy="102" r="26" className="upi-ripple r2" />
      <g className="upi-badge">
        <circle cx="160" cy="102" r="26" className="fill-green" />
        <text x="160" y="109" textAnchor="middle" fontSize="20" fontWeight="700" fill="#fff">₹</text>
      </g>
      <g className="upi-lock">
        <circle cx="160" cy="102" r="26" className="fill-green" />
        <path d="M150 99v-5a10 10 0 0 1 20 0v5" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
        <rect x="147" y="99" width="26" height="19" rx="4" fill="#fff" />
        <circle cx="160" cy="108" r="3" className="fill-green" />
      </g>
      <rect x="128" y="146" width="64" height="8" rx="4" className="fill-mint" />
      <rect x="138" y="160" width="44" height="8" rx="4" className="fill-mint" />
    </svg>
  );
}

function RouteScene() {
  return (
    <svg viewBox="0 0 320 200" role="img" aria-label="Two commuters travelling to a shared destination">
      <path id="trip" d="M30 150 C 90 150, 100 70, 160 90 S 240 120, 262 62" fill="none" className="route-line" />
      <g className="pin">
        <path d="M262 28a18 18 0 0 1 18 18c0 14-18 30-18 30s-18-16-18-30a18 18 0 0 1 18-18z" className="fill-green" />
        <circle cx="262" cy="46" r="6" fill="#fff" />
      </g>
      <g className="walker w1">
        <circle r="11" className="fill-green" />
        <circle cy="-3" r="3.5" fill="#fff" />
        <path d="M-6 6a6 4.5 0 0 1 12 0z" fill="#fff" />
      </g>
      <g className="walker w2">
        <circle r="11" className="fill-mint stroke-green" strokeWidth="2" />
        <circle cy="-3" r="3.5" className="fill-green" />
        <path d="M-6 6a6 4.5 0 0 1 12 0z" className="fill-green" />
      </g>
    </svg>
  );
}

function FeeScene() {
  return (
    <svg viewBox="0 0 320 200" role="img" aria-label="Transparent pricing breakdown: Driver 80rs, Platform 0rs, Passenger 80rs">
      {/* Background Card */}
      <g className="fee-card">
        <rect x="36" y="20" width="248" height="160" rx="14" className="fill-white stroke-line" />
        
        {/* Top Header Strip */}
        <path d="M36 34a14 14 0 0 1 14-14h220a14 14 0 0 1 14 14v18H36z" fill="#005917" />
        <text x="52" y="37" fontSize="10" fontWeight="800" fill="#86efac" letterSpacing="0.08em">TRANSPARENT PRICING</text>
        <text x="268" y="37" textAnchor="end" fontSize="9" fontWeight="700" fill="#ffffff" opacity="0.85">0% HIDDEN FEES</text>
        
        {/* Row 1: Driver offers ride */}
        <g className="fee-row fee-row-1">
          <circle cx="54" cy="68" r="7" fill="#e8f5ec" />
          <path d="M50 69l3 3 5-5" fill="none" stroke="#005917" strokeWidth="1.5" strokeLinecap="round" />
          <text x="68" y="71" fontSize="12" fontWeight="600" fill="#1b3820">Driver offers ride</text>
          <text x="268" y="71" textAnchor="end" fontSize="13" fontWeight="800" fill="#0f2413">₹80</text>
        </g>
        
        {/* Dashed Separator */}
        <line x1="50" y1="84" x2="270" y2="84" stroke="rgba(0, 89, 23, 0.16)" strokeWidth="1" strokeDasharray="3 3" />
        
        {/* Row 2: ChalRe Platform Fee (₹0) */}
        <g className="fee-row fee-row-2">
          <circle cx="54" cy="103" r="7" fill="#dcfce7" />
          <text x="54" y="106" textAnchor="middle" fontSize="9" fontWeight="800" fill="#15803d">⚡</text>
          <text x="68" y="105" fontSize="12" fontWeight="600" fill="#1b3820">ChalRe platform fee</text>
          <rect x="180" y="94" width="52" height="17" rx="8.5" fill="rgba(0, 89, 23, 0.09)" />
          <text x="206" y="105" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#005917">0% CUT</text>
          <text x="268" y="105" textAnchor="end" fontSize="14" fontWeight="800" fill="#15803d">₹0</text>
        </g>
        
        {/* Solid Separator */}
        <line x1="50" y1="120" x2="270" y2="120" stroke="rgba(0, 89, 23, 0.22)" strokeWidth="1.2" />
        
        {/* Row 3: Passenger pays */}
        <g className="fee-row fee-row-3">
          <rect x="46" y="128" width="228" height="40" rx="9" fill="#f0fdf4" stroke="rgba(0, 89, 23, 0.2)" strokeWidth="1" />
          <circle cx="62" cy="148" r="8" fill="#005917" />
          <path d="M58 148l3 3 5-5" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <text x="76" y="147" fontSize="11" fontWeight="700" fill="#005917">Passenger pays</text>
          <text x="76" y="159" fontSize="8.5" fontWeight="500" fill="#4a6750">Direct &amp; fair journey fare</text>
          <text x="264" y="153" textAnchor="end" fontSize="16" fontWeight="900" fill="#005917">₹80</text>
        </g>
      </g>
    </svg>
  );
}

const SCENES = { kyc: KycScene, upi: UpiScene, route: RouteScene, fee: FeeScene };

export default function TrustTransparency() {
  const navigate = useNavigate();

  // Track which receipt item is currently expanded
  const [expandedId, setExpandedId] = useState("docs");

  // Interactive Micro-animation pills state
  const [activePill, setActivePill] = useState("kyc");
  const [animRun, setAnimRun] = useState(0);
  const pillRefs = useRef([]);

  // Auto-advance animation loop through all 4 pillars
  useEffect(() => {
    const timer = setInterval(() => {
      const idx = PILL_ITEMS.findIndex((x) => x.id === activePill);
      const nextIdx = (idx + 1) % PILL_ITEMS.length;
      setActivePill(PILL_ITEMS[nextIdx].id);
      setAnimRun((n) => n + 1);
    }, 4200);

    return () => clearInterval(timer);
  }, [activePill]);

  const selectPill = (id) => {
    setActivePill(id);
    setAnimRun((n) => n + 1);
  };

  const onPillKeyDown = (e, i) => {
    if (!["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].includes(e.key)) return;
    e.preventDefault();
    const dir = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1;
    const next = (i + dir + PILL_ITEMS.length) % PILL_ITEMS.length;
    pillRefs.current[next]?.focus();
    selectPill(PILL_ITEMS[next].id);
  };

  const currentPill = PILL_ITEMS.find((x) => x.id === activePill) || PILL_ITEMS[0];

  const toggleItem = (id) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  // Receipt items data structure
  const receiptSections = [
    {
      group: "A. SAFETY & VERIFICATION",
      icon: ShieldCheck,
      items: [
        {
          id: "docs",
          title: "Document checks",
          value: "KYC Review",
          status: "verified",
          shortDesc: "Manual verification of submitted ID, Driving License & profile photo.",
          details:
            "Drivers offering rides submit government-issued identification (ID Card, Driving License) and a clear profile photo. Submissions are manually reviewed by our admin team before ride publishing is permitted. While this process filters unverified accounts and mitigates impersonation risk, it does not constitute a police background check or guarantee individual behavior."
        },
        {
          id: "ride-info",
          title: "Ride & vehicle transparency",
          value: "Upfront Details",
          status: "verified",
          shortDesc: "Vehicle model, departure time, route, and seat price displayed clearly.",
          details:
            "Passengers can inspect exact journey details — including vehicle type (car or bike), pickup and drop locations, departure schedule, and per-seat contribution — before committing. Both participants can view each other's verified profiles before traveling."
        },
        {
          id: "comms",
          title: "Communication & safety",
          value: "In-App Chat",
          status: "verified",
          shortDesc: "Coordinate pickup & journey details directly through platform messaging.",
          details:
            "Once a booking is confirmed, passengers and drivers can coordinate pickup spots via in-app messaging or contact details. We urge users never to click suspicious external payment links sent by anyone."
        },
        {
          id: "concern",
          title: "Report a concern",
          value: "Support Channel",
          status: "neutral",
          shortDesc: "Report suspicious accounts, fare disputes, or safety concerns.",
          details:
            "Users can flag safety concerns, fake accounts, or payment issues directly to support via our Help Center and Scam Prevention center. Flagged accounts are reviewed for suspension or permanent termination."
        }
      ]
    },
    {
      group: "B. PAYMENTS & REFUNDS",
      icon: CreditCard,
      items: [
        {
          id: "platform-fee",
          title: "Platform fee",
          value: "₹0 Launch Offer",
          status: "verified",
          shortDesc: "Zero platform booking commission during the initial launch phase.",
          details:
            "ChalRe currently charges ₹0 platform fee. Passengers pay solely the ride contribution set by the driver. Should any platform maintenance fee be introduced in the future, it will be transparently disclosed before checkout."
        },
        {
          id: "payment-collection",
          title: "Payment collection",
          value: "Razorpay Secured",
          status: "verified",
          shortDesc: "Payments collected online via Razorpay (UPI, Cards, Netbanking).",
          details:
            "When you book, payment is collected through Razorpay's PCI-DSS compliant infrastructure. Funds are held pending journey completion and are not immediately transferred to the driver."
        },
        {
          id: "cancellations",
          title: "Cancellation & refund",
          value: "UPI Processing",
          status: "neutral",
          shortDesc: "Refund eligibility depends on timing and cancellation circumstances.",
          details:
            "If a booking fails due to an expired seat hold or driver cancellation, a full refund is initiated. For passenger cancellations, refund eligibility depends on the time prior to departure. Approved refunds are processed directly to the user's registered UPI ID following reconciliation."
        },
        {
          id: "driver-payouts",
          title: "Driver payouts",
          value: "Post-Ride Transfer",
          status: "neutral",
          shortDesc: "Payouts processed to driver's registered UPI ID after ride ends.",
          details:
            "Driver earnings are released after the journey ends. The passenger confirms completion (or auto-confirmation triggers), and payouts are reconciled and transferred to the driver's registered UPI account."
        }
      ]
    },
    {
      group: "C. WHAT WE DON'T PROMISE",
      icon: AlertTriangle,
      items: [
        {
          id: "no-guarantee-safety",
          title: "No absolute safety guarantee",
          value: "Shared Responsibility",
          status: "neutral",
          shortDesc: "Document review mitigates risks, but cannot guarantee individual conduct.",
          details:
            "ChalRe is a peer-to-peer ride-sharing technology platform connecting independent travelers. While document checks verify driver credentials, we cannot supervise driving habits, road conditions, or human behavior. Users must exercise normal personal caution."
        }
      ]
    }
  ];

  return (
    <section className="chalre-trust-section" aria-labelledby="trust-heading">
      <div className="chalre-trust-container">

        {/* ── TWO-COLUMN LAYOUT ── */}
        <div className="chalre-trust-grid">

          {/* ── LEFT COLUMN: Context & Manifesto ── */}
          <div className="chalre-trust-left">
            <div className="chalre-trust-badge">
              <Lock size={13} />
              <span>TRUST &amp; TRANSPARENCY</span>
            </div>

            <h2 id="trust-heading" className="chalre-trust-title">
              Good journeys start with <span className="chalre-trust-accent">trust.</span>
            </h2>

            <p className="chalre-trust-subtitle">
              Know what we check, how payments work, and what to expect before you ride.
            </p>

            <p className="chalre-trust-manifesto">
              We believe trust starts with being clear about what we do — and honest about what we don't promise. No hidden platform markups, no exaggerated safety claims.
            </p>

            {/* Interactive Pillar Navigation & Micro-Animation Stage */}
            <div className="tp">
              <div className="tp-pills" role="tablist" aria-label="Trust verification pillars">
                {PILL_ITEMS.map((item, i) => (
                  <button
                    key={item.id}
                    ref={(el) => (pillRefs.current[i] = el)}
                    type="button"
                    role="tab"
                    id={`tp-tab-${item.id}`}
                    aria-selected={activePill === item.id}
                    aria-controls="tp-panel"
                    tabIndex={activePill === item.id ? 0 : -1}
                    className={`tp-pill ${activePill === item.id ? "is-active" : ""}`}
                    onClick={() => selectPill(item.id)}
                    onMouseEnter={() => selectPill(item.id)}
                    onKeyDown={(e) => onPillKeyDown(e, i)}
                  >
                    <span className="tp-dot" aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>

              <div className="tp-stage" id="tp-panel" role="tabpanel" aria-labelledby={`tp-tab-${activePill}`}>
                <div className="tp-grid" aria-hidden="true" />
                <div key={`${activePill}-${animRun}`} className={`tp-scene scene-${activePill}`}>
                  {(() => {
                    const Scene = SCENES[activePill];
                    return <Scene />;
                  })()}
                </div>
                <p className="tp-caption" aria-live="polite">
                  {currentPill.caption}
                </p>
              </div>
            </div>

            {/* CTA Button leading to Trust Center */}
            <div className="chalre-trust-cta-wrap">
              <button
                type="button"
                className="chalre-trust-center-btn"
                onClick={() => navigate("/trust-center")}
              >
                <span>Explore our Trust Center</span>
                <ArrowRight size={15} />
              </button>
              <span className="chalre-trust-cta-sub">
                Read our complete safety, verification &amp; payment policies
              </span>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Receipt-Style Trust Statement ── */}
          <div className="chalre-trust-right">
            <div className="chalre-receipt-card" role="region" aria-label="Travel Transparency Statement Receipt">
              
              {/* Receipt Header */}
              <div className="chalre-receipt-header">
                <div className="chalre-receipt-header-top">
                  <div className="chalre-receipt-brand">
                    <Receipt size={16} className="chalre-receipt-brand-icon" />
                    <span className="chalre-receipt-logo">CHALRE</span>
                  </div>
                  <span className="chalre-receipt-doc-badge">OFFICIAL STATEMENT</span>
                </div>

                <h3 className="chalre-receipt-headline">Travel Transparency Statement</h3>
                <div className="chalre-receipt-meta">
                  <span>POLICY VER: 2026.1</span>
                  <span>STATUS: ACTIVE &bull; VERIFIED</span>
                </div>
              </div>

              {/* Receipt Perforated Edge Divider */}
              <div className="chalre-receipt-perforation" aria-hidden="true">
                <div className="chalre-receipt-punch-hole chalre-receipt-punch-hole--left" />
                <div className="chalre-receipt-perforation-line" />
                <div className="chalre-receipt-punch-hole chalre-receipt-punch-hole--right" />
              </div>

              {/* Receipt Body: 3 Groups */}
              <div className="chalre-receipt-body">
                {receiptSections.map((section, sIdx) => {
                  const SectionIcon = section.icon;
                  return (
                    <div key={sIdx} className="chalre-receipt-group">
                      <div className="chalre-receipt-group-title">
                        <SectionIcon size={13} className="chalre-group-icon" />
                        <span>{section.group}</span>
                      </div>

                      <div className="chalre-receipt-items">
                        {section.items.map((item) => {
                          const isExpanded = expandedId === item.id;
                          return (
                            <div
                              key={item.id}
                              className={`chalre-receipt-row ${isExpanded ? "chalre-receipt-row--expanded" : ""}`}
                            >
                              <button
                                type="button"
                                className="chalre-receipt-row-header"
                                onClick={() => toggleItem(item.id)}
                                aria-expanded={isExpanded}
                                aria-controls={`receipt-detail-${item.id}`}
                              >
                                <div className="chalre-row-left">
                                  <span
                                    className={`chalre-status-indicator chalre-status-indicator--${item.status}`}
                                    title={item.status === "verified" ? "Verified platform feature" : "Policy conditional"}
                                  >
                                    {item.status === "verified" ? (
                                      <CheckCircle2 size={13} />
                                    ) : (
                                      <HelpCircle size={13} />
                                    )}
                                  </span>
                                  <div className="chalre-row-text">
                                    <span className="chalre-row-title">{item.title}</span>
                                    <span className="chalre-row-short">{item.shortDesc}</span>
                                  </div>
                                </div>

                                <div className="chalre-row-right">
                                  <span className="chalre-row-value">{item.value}</span>
                                  <ChevronDown
                                    size={15}
                                    className={`chalre-row-chevron ${isExpanded ? "chalre-row-chevron--rotated" : ""}`}
                                  />
                                </div>
                              </button>

                              {/* Expandable Explanation Drawer */}
                              <AnimatePresence initial={false}>
                                {isExpanded && (
                                  <motion.div
                                    id={`receipt-detail-${item.id}`}
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.22, ease: "easeInOut" }}
                                    className="chalre-receipt-row-drawer"
                                  >
                                    <div className="chalre-drawer-inner">
                                      <p>{item.details}</p>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Receipt Bottom Summary / Barcode Style Footer */}
              <div className="chalre-receipt-footer">
                <div className="chalre-receipt-summary-line">
                  <span>TOTAL TRANSPARENCY SCORE</span>
                  <span className="chalre-receipt-total-val">100% DISCLOSED</span>
                </div>
                <div className="chalre-receipt-micro-hash" aria-hidden="true">
                  CHALRE-TRP-STATEMENT-HONEST-P2P-COMMUTING
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
