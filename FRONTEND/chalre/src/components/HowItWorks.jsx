import { useState, useRef, useEffect } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Car,
  MapPin,
  Calendar,
  Users,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Route,
  Star,
  Sparkles,
  Info
} from "lucide-react";
import "../styles/HowItWorks.css";

const AUTO_ADVANCE_MS = 5500;

const STAGES = [
  {
    id: "offer",
    stepNumber: 1,
    tabLabel: "Offer",
    title: "Krishna offers a ride.",
    description: "Krishna posts the journey, departure time, available seats and price.",
    krishnaActivity: "Publishes a ride.",
    aditiActivity: "Can discover the ride when searching for a suitable journey.",
    krishnaRole: "Ride Host & Driver",
    aditiRole: "Searching Passenger",
    visualType: "offer"
  },
  {
    id: "book",
    stepNumber: 2,
    tabLabel: "Book",
    title: "Aditi books a seat.",
    description: "Aditi chooses a suitable ride and follows ChalRe's booking and payment process.",
    krishnaActivity: "Receives the appropriate booking notification.",
    aditiActivity: "Selects the ride and books a seat.",
    krishnaRole: "Notified Host",
    aditiRole: "Booking Passenger",
    visualType: "book"
  },
  {
    id: "connect",
    stepNumber: 3,
    tabLabel: "Connect",
    title: "They coordinate their journey.",
    description: "Krishna and Aditi use the available chat and call options to coordinate pickup details and prepare for the journey.",
    krishnaActivity: "Coordinates the pickup.",
    aditiActivity: "Confirms the meeting details.",
    krishnaRole: "Coordinating Host",
    aditiRole: "Coordinating Co-traveller",
    visualType: "connect"
  },
  {
    id: "travel",
    stepNumber: 4,
    tabLabel: "Travel",
    title: "The journey begins.",
    description: "Krishna and Aditi meet at the agreed pickup point and travel together to their destination.",
    krishnaActivity: "Drives the planned route.",
    aditiActivity: "Boards the ride and travels along the route.",
    krishnaRole: "Driving",
    aditiRole: "Travelling",
    visualType: "travel"
  },
  {
    id: "payout",
    stepNumber: 5,
    tabLabel: "Payout",
    title: "The journey is completed.",
    description: "After the ride is completed, Krishna's payout follows ChalRe's existing payout process.",
    krishnaActivity: "The payout enters or progresses through the applicable payout workflow.",
    aditiActivity: "Has completed the journey.",
    krishnaRole: "Ride Completed",
    aditiRole: "Journey Completed",
    visualType: "payout"
  }
];

export default function HowItWorks() {
  const [activeStage, setActiveStage] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const tabListRef = useRef(null);

  const current = STAGES[activeStage];

  const handleStageChange = (newIndex) => {
    if (newIndex === activeStage) return;
    setDirection(newIndex > activeStage ? 1 : -1);
    setActiveStage(newIndex);
  };

  const handlePrev = () => {
    if (activeStage > 0) {
      handleStageChange(activeStage - 1);
    } else {
      handleStageChange(STAGES.length - 1);
    }
  };

  const handleNext = () => {
    if (activeStage < STAGES.length - 1) {
      handleStageChange(activeStage + 1);
    } else {
      handleStageChange(0);
    }
  };

  // Auto-advance stages every 5.5 seconds (paused on hover / focus)
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setDirection(1);
      setActiveStage((prev) => (prev + 1) % STAGES.length);
    }, AUTO_ADVANCE_MS);

    return () => clearInterval(timer);
  }, [isPaused, activeStage]);

  // Keyboard navigation for tab list
  const handleKeyDown = (e) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      handleStageChange((activeStage + 1) % STAGES.length);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      handleStageChange((activeStage - 1 + STAGES.length) % STAGES.length);
    } else if (e.key === "Home") {
      e.preventDefault();
      handleStageChange(0);
    } else if (e.key === "End") {
      e.preventDefault();
      handleStageChange(STAGES.length - 1);
    }
  };

  return (
    <section className="hiw-section" aria-labelledby="hiw-heading">
      <div className="hiw-container">
        
        {/* ── HEADER ── */}
        <motion.div
          className="hiw-header"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0, 0, 0.2, 1] }}
        >
          <div className="hiw-pill">
            <Route size={14} strokeWidth={2.2} />
            <span>Step-by-Step Experience</span>
          </div>

          <h2 id="hiw-heading" className="hiw-title">
            How a ride <span className="hiw-title-accent">works.</span>
          </h2>

          <p className="hiw-subtitle">
            From offering a seat to reaching your destination, here's how it works.
          </p>
        </motion.div>

        {/* ── STEPPER / TIMELINE ── */}
        <div className="hiw-stepper-wrapper">
          <div
            className="hiw-stepper"
            role="tablist"
            aria-label="How a ride works five stages"
            ref={tabListRef}
            onKeyDown={handleKeyDown}
          >
            {/* Background connection progress bar */}
            <div className="hiw-stepper-track" aria-hidden="true">
              <div
                className="hiw-stepper-progress"
                style={{
                  width: `${(activeStage / (STAGES.length - 1)) * 100}%`
                }}
              />
            </div>

            {STAGES.map((stage, idx) => {
              const isCompleted = idx < activeStage;
              const isActive = idx === activeStage;

              return (
                <button
                  key={stage.id}
                  type="button"
                  role="tab"
                  id={`hiw-tab-${stage.id}`}
                  aria-selected={isActive}
                  aria-controls={`hiw-panel-${stage.id}`}
                  tabIndex={isActive ? 0 : -1}
                  className={`hiw-step-btn ${isActive ? "hiw-step-btn--active" : ""} ${
                    isCompleted ? "hiw-step-btn--completed" : ""
                  }`}
                  onClick={() => handleStageChange(idx)}
                >
                  <span className="hiw-step-indicator">
                    {isCompleted ? (
                      <Check size={14} strokeWidth={3} className="hiw-check-icon" />
                    ) : (
                      <span className="hiw-step-num">{stage.stepNumber}</span>
                    )}
                  </span>
                  <span className="hiw-step-label">{stage.tabLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── MAIN INTERACTIVE CARD (Pauses autoplay on hover/focus) ── */}
        <div
          className="hiw-card-wrapper"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onFocus={() => setIsPaused(true)}
          onBlur={() => setIsPaused(false)}
        >
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current.id}
              id={`hiw-panel-${current.id}`}
              role="tabpanel"
              aria-labelledby={`hiw-tab-${current.id}`}
              className="hiw-card"
              custom={direction}
              initial={{ opacity: 0, x: direction > 0 ? 18 : -18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? -18 : 18 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Card Main Grid: Left Story, Right Visual */}
              <div className="hiw-card-body">
                
                {/* ── Story Side ── */}
                <div className="hiw-story-side">
                  <div className="hiw-stage-badge">
                    <span className="hiw-stage-dot" />
                    Stage {current.stepNumber} of 5 &bull; {current.tabLabel}
                  </div>

                  <h3 className="hiw-stage-title">{current.title}</h3>

                  <p className="hiw-stage-description">{current.description}</p>

                  {/* Highlights list for current stage */}
                  <div className="hiw-stage-points">
                    <div className="hiw-point-item">
                      <div className="hiw-point-icon">
                        <CheckCircle2 size={16} strokeWidth={2.2} />
                      </div>
                      <div className="hiw-point-text">
                        <strong>Krishna:</strong> {current.krishnaActivity}
                      </div>
                    </div>
                    <div className="hiw-point-item">
                      <div className="hiw-point-icon">
                        <CheckCircle2 size={16} strokeWidth={2.2} />
                      </div>
                      <div className="hiw-point-text">
                        <strong>Aditi:</strong> {current.aditiActivity}
                      </div>
                    </div>
                  </div>

                  {/* Navigation Buttons inside card */}
                  <div className="hiw-card-nav">
                    <button
                      type="button"
                      className="hiw-nav-btn hiw-nav-btn--prev"
                      onClick={handlePrev}
                      aria-label="Previous step"
                    >
                      <ChevronLeft size={16} />
                      <span>Previous</span>
                    </button>

                    <div className="hiw-nav-counter" aria-live="polite">
                      <span>{activeStage + 1} / {STAGES.length}</span>
                      {!isPaused && (
                        <div className="hiw-autoplay-pill" title="Auto-advancing">
                          <span className="hiw-autoplay-dot" />
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="hiw-nav-btn hiw-nav-btn--next"
                      onClick={handleNext}
                      aria-label={activeStage === STAGES.length - 1 ? "Start over" : "Next step"}
                    >
                      <span>{activeStage === STAGES.length - 1 ? "Replay Journey" : "Next Stage"}</span>
                      {activeStage === STAGES.length - 1 ? (
                        <Sparkles size={15} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </button>
                  </div>
                </div>

                {/* ── Interactive Visual Illustration ── */}
                <div className="hiw-visual-side">
                  {current.visualType === "offer" && <OfferVisual />}
                  {current.visualType === "book" && <BookVisual />}
                  {current.visualType === "connect" && <ConnectVisual />}
                  {current.visualType === "travel" && <TravelVisual />}
                  {current.visualType === "payout" && <PayoutVisual />}
                </div>

              </div>
            </motion.div>
          </AnimatePresence>

          {/* Illustrative disclaimer */}
          <div className="hiw-disclaimer">
            <Info size={13} strokeWidth={2} />
            <span>Krishna and Aditi are illustrative personas demonstrating ChalRe's real ride-sharing workflow.</span>
          </div>

        </div>

      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// STAGE 1 VISUAL: OFFER (Gargoti to Kolhapur • ₹80)
// ─────────────────────────────────────────────────────────────
function OfferVisual() {
  return (
    <div className="hiw-visual-box hiw-visual-offer">
      <div className="hiw-mockup-window">
        <div className="hiw-mockup-header">
          <div className="hiw-mockup-tag">
            <Car size={13} />
            <span>Published Ride</span>
          </div>
          <span className="hiw-mockup-status-live">Active on ChalRe</span>
        </div>

        <div className="hiw-route-display">
          <div className="hiw-route-nodes">
            <div className="hiw-route-node hiw-route-node--start">
              <span className="hiw-node-dot" />
              <div className="hiw-node-info">
                <span className="hiw-node-label">Pickup</span>
                <strong>Gargoti (Bus Stand)</strong>
              </div>
            </div>

            <div className="hiw-route-line">
              <div className="hiw-route-dashed" />
              <div className="hiw-vehicle-pill">
                <Car size={13} className="hiw-vehicle-icon" />
              </div>
            </div>

            <div className="hiw-route-node hiw-route-node--end">
              <MapPin size={16} className="hiw-node-pin" />
              <div className="hiw-node-info">
                <span className="hiw-node-label">Drop</span>
                <strong>Kolhapur (CBS)</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="hiw-trip-specs">
          <div className="hiw-spec-chip">
            <Calendar size={13} />
            <span>Tomorrow &bull; 08:30 AM</span>
          </div>
          <div className="hiw-spec-chip">
            <Users size={13} />
            <span>3 seats offered</span>
          </div>
          <div className="hiw-spec-chip hiw-spec-chip--price">
            <span>&#8377;80 / seat</span>
          </div>
        </div>

        <div className="hiw-offer-footer">
          <div className="hiw-driver-sign">
            <div className="hiw-avatar-mini">K</div>
            <span>Krishna's verified trip &bull; Sedan (AC)</span>
          </div>
          <span className="hiw-badge-green">Open for Booking</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// STAGE 2 VISUAL: BOOK (Gargoti to Kolhapur • ₹80)
// ─────────────────────────────────────────────────────────────
function BookVisual() {
  return (
    <div className="hiw-visual-box hiw-visual-book">
      <div className="hiw-mockup-window">
        <div className="hiw-mockup-header">
          <div className="hiw-mockup-tag">
            <ShieldCheck size={13} />
            <span>Booking Confirmed</span>
          </div>
          <span className="hiw-mockup-code">#CR-7842</span>
        </div>

        <div className="hiw-booking-summary">
          <div className="hiw-booking-passenger">
            <div className="hiw-avatar-mini hiw-avatar-mini--aditi">A</div>
            <div>
              <strong>Aditi's Reservation</strong>
              <p>1 Seat Reserved in Krishna's Ride</p>
            </div>
          </div>

          <div className="hiw-ticket-details">
            <div className="hiw-ticket-row">
              <span className="hiw-ticket-label">Departure</span>
              <span className="hiw-ticket-val">Tomorrow &bull; 08:30 AM</span>
            </div>
            <div className="hiw-ticket-row">
              <span className="hiw-ticket-label">Route</span>
              <span className="hiw-ticket-val">Gargoti &rarr; Kolhapur</span>
            </div>
            <div className="hiw-ticket-row">
              <span className="hiw-ticket-label">Seat Contribution</span>
              <span className="hiw-ticket-val">&#8377;80</span>
            </div>
            <div className="hiw-ticket-row hiw-ticket-row--promo">
              <span className="hiw-ticket-label">ChalRe Platform Fee</span>
              <span className="hiw-ticket-val hiw-free-tag">&#8377;0 (Launch Special)</span>
            </div>
          </div>
        </div>

        <div className="hiw-notify-banner">
          <div className="hiw-notify-dot" />
          <span>Notification sent to Krishna: <em>"Aditi has booked 1 seat"</em></span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// STAGE 3 VISUAL: CONNECT (Gargoti Bus Stand Pickup)
// ─────────────────────────────────────────────────────────────
function ConnectVisual() {
  return (
    <div className="hiw-visual-box hiw-visual-connect">
      <div className="hiw-mockup-window">
        <div className="hiw-chat-header">
          <div className="hiw-chat-person">
            <div className="hiw-avatar-mini">K</div>
            <div>
              <strong>Krishna</strong>
              <span className="hiw-chat-status">Ready to coordinate</span>
            </div>
          </div>
          <div className="hiw-call-pill" title="Phone contact unlocked after booking">
            <Phone size={13} />
            <span>Call Driver</span>
          </div>
        </div>

        <div className="hiw-chat-stream">
          <div className="hiw-chat-msg hiw-chat-msg--left">
            <div className="hiw-chat-sender">Krishna &bull; 08:15 AM</div>
            <div className="hiw-chat-bubble hiw-chat-bubble--driver">
              Hi Aditi! I will arrive at the Gargoti Bus Stand main gate at 8:25 AM. White Swift Dzire.
            </div>
          </div>

          <div className="hiw-chat-msg hiw-chat-msg--right">
            <div className="hiw-chat-sender">Aditi &bull; 08:16 AM</div>
            <div className="hiw-chat-bubble hiw-chat-bubble--rider">
              Got it, Krishna! I'll be waiting right by the bus stand shelter with a grey bag.
            </div>
          </div>

          <div className="hiw-chat-msg hiw-chat-msg--left">
            <div className="hiw-chat-sender">Krishna &bull; 08:17 AM</div>
            <div className="hiw-chat-bubble hiw-chat-bubble--driver">
              Perfect! See you there in 10 mins.
            </div>
          </div>
        </div>

        <div className="hiw-connect-note">
          <Info size={12} />
          <span>Direct calling and in-app chat are accessible once the booking is confirmed.</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// STAGE 4 VISUAL: TRAVEL (Gargoti to Kolhapur • Smooth Left-to-Right Loop)
// ─────────────────────────────────────────────────────────────
function TravelVisual() {
  return (
    <div className="hiw-visual-box hiw-visual-travel">
      <div className="hiw-mockup-window">
        <div className="hiw-mockup-header">
          <div className="hiw-mockup-tag">
            <Route size={13} />
            <span>Journey In Progress</span>
          </div>
          <span className="hiw-badge-green">En Route Together</span>
        </div>

        <div className="hiw-road-track-container">
          <div className="hiw-road-scenery">
            <div className="hiw-road-milestone hiw-road-milestone--start">
              <span className="hiw-milestone-marker" />
              <span>Gargoti (Boarded)</span>
            </div>

            <div className="hiw-road-milestone hiw-road-milestone--end">
              <MapPin size={15} className="hiw-dest-pin" />
              <span>Kolhapur (CBS)</span>
            </div>
          </div>

          <div className="hiw-road-strip">
            <div className="hiw-road-dashes" />
            
            {/* Animated vehicle traveling cleanly from left edge across to right edge, then restarting from left */}
            <motion.div
              className="hiw-moving-car"
              animate={{
                left: ["0%", "calc(100% - 95px)"],
                opacity: [0, 1, 1, 0.95, 0]
              }}
              transition={{
                duration: 4.8,
                repeat: Infinity,
                repeatType: "loop",
                ease: "linear",
                times: [0, 0.08, 0.88, 0.96, 1]
              }}
            >
              <div className="hiw-car-shell">
                <Car size={16} strokeWidth={2.2} />
              </div>
              <span className="hiw-car-tag">Krishna &amp; Aditi</span>
            </motion.div>
          </div>

          <div className="hiw-travel-progress-bar">
            <div className="hiw-travel-progress-fill" />
          </div>
        </div>

        <div className="hiw-travel-meta">
          <div className="hiw-travel-meta-item">
            <Clock size={13} />
            <span>ETA: 35 mins remaining</span>
          </div>
          <div className="hiw-travel-meta-item">
            <ShieldCheck size={13} />
            <span>Following agreed commute route</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// STAGE 5 VISUAL: PAYOUT (₹80.00 Trip Earnings)
// ─────────────────────────────────────────────────────────────
function PayoutVisual() {
  return (
    <div className="hiw-visual-box hiw-visual-payout">
      <div className="hiw-mockup-window">
        <div className="hiw-mockup-header">
          <div className="hiw-mockup-tag hiw-mockup-tag--success">
            <CheckCircle2 size={13} />
            <span>Ride Completed</span>
          </div>
          <span className="hiw-mockup-code">Journey Settled</span>
        </div>

        <div className="hiw-payout-workflow-card">
          <div className="hiw-payout-amount-box">
            <div className="hiw-payout-label">Krishna's Trip Earnings</div>
            <div className="hiw-payout-val">&#8377;80.00</div>
            <div className="hiw-payout-zero-fee">Zero platform deduction during launch special</div>
          </div>

          <div className="hiw-workflow-steps">
            <div className="hiw-wf-step hiw-wf-step--done">
              <span className="hiw-wf-dot"><Check size={11} strokeWidth={3} /></span>
              <div className="hiw-wf-content">
                <strong>Destination Reached</strong>
                <p>Aditi has safely reached Kolhapur CBS</p>
              </div>
            </div>

            <div className="hiw-wf-step hiw-wf-step--current">
              <span className="hiw-wf-dot hiw-wf-dot--pulse" />
              <div className="hiw-wf-content">
                <strong>ChalRe Payout Verification</strong>
                <p>Enters applicable payout processing workflow</p>
              </div>
            </div>

            <div className="hiw-wf-step hiw-wf-step--upcoming">
              <span className="hiw-wf-dot" />
              <div className="hiw-wf-content">
                <strong>Disbursement to Krishna</strong>
                <p>Processed in accordance with ChalRe payout schedule</p>
              </div>
            </div>
          </div>
        </div>

        <div className="hiw-rating-exchange">
          <div className="hiw-rating-col">
            <div className="hiw-rating-stars">
              <Star size={12} fill="#eab308" color="#eab308" />
              <Star size={12} fill="#eab308" color="#eab308" />
              <Star size={12} fill="#eab308" color="#eab308" />
              <Star size={12} fill="#eab308" color="#eab308" />
              <Star size={12} fill="#eab308" color="#eab308" />
            </div>
            <span>Aditi rated 5.0 &bull; "Smooth &amp; on time!"</span>
          </div>
        </div>
      </div>
    </div>
  );
}
