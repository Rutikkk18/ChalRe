import "../styles/TermsAndConditions.css";
import { useState, useEffect } from "react";

const sections = [
  {
    id: 1,
    icon: "👋",
    title: "1. Introduction",
    content: [
      `Welcome to <strong>ChalRe</strong>. Your privacy is important to us. This Privacy Policy explains how ChalRe collects, uses, stores, and protects your personal information when you use our mobile application and related services.`,
      `By creating an account or using ChalRe, you agree to the practices described in this Privacy Policy.`,
    ],
  },
  {
    id: 2,
    icon: "🗂️",
    title: "2. Information We Collect",
    content: [
      `To provide ride-sharing and carpooling services, ChalRe may collect the following information: <strong>Full Name, Email Address, Phone Number, Profile Photograph, Vehicle Information</strong> submitted by drivers, <strong>UPI ID</strong> for payment-related purposes, and <strong>Driver Verification Documents</strong> such as Driving License, Government ID, Vehicle Registration Certificate, or other verification documents.`,
      `We also collect <strong>Ride Information</strong> including pickup location, destination, travel date, time, and route details, a <strong>Device Notification Token</strong> used for push notifications, and account and authentication information provided through Firebase Authentication.`,
    ],
  },
  {
    id: 3,
    icon: "⚙️",
    title: "3. How We Use Your Information",
    content: [
      `ChalRe uses collected information for the following purposes: creating and managing user accounts, verifying user identity and driver eligibility, matching passengers and drivers, and facilitating ride bookings and ride management.`,
      `Your information is also used for processing and managing payments, sending ride updates and important notifications, improving platform safety and preventing fraud, providing customer support, and maintaining platform security and functionality.`,
    ],
  },
  {
    id: 4,
    icon: "🔗",
    title: "4. Information Sharing",
    content: [
      `<strong>ChalRe does not sell your personal information to third parties.</strong> Certain information may be shared when necessary to provide services, including driver and passenger profile information visible during ride coordination, and contact information when required for confirmed ride bookings.`,
      `Information may also be shared with payment providers for payment processing, or with legal authorities and government agencies when required by applicable law. Only the minimum information necessary to provide the service is shared.`,
    ],
  },
  {
    id: 5,
    icon: "💳",
    title: "5. Payments and Razorpay",
    content: [
      `Payments processed through the ChalRe platform may be handled by <strong>Razorpay</strong> or other authorized payment service providers.`,
      `ChalRe does not store complete debit card, credit card, banking, or payment instrument information on its servers. Payment processing is subject to the privacy policies and security practices of the respective payment providers.`,
    ],
  },
  {
    id: 6,
    icon: "📍",
    title: "6. Location Information",
    content: [
      `ChalRe collects ride-related location information entered by users, including pickup and destination locations. This information is used for ride discovery and matching, route-related functionality, and improving user experience.`,
      `<strong>ChalRe does not use background location tracking.</strong> Location data entered during ride booking is used solely for platform operations and service delivery.`,
    ],
  },
  {
    id: 7,
    icon: "🔔",
    title: "7. Notifications",
    content: [
      `ChalRe may send notifications related to ride requests, booking confirmations, ride updates, verification status updates, and important account or security alerts.`,
      `Users may control notification permissions through their device settings at any time.`,
    ],
  },
  {
    id: 8,
    icon: "🔒",
    title: "8. Data Security",
    content: [
      `ChalRe takes reasonable technical and organizational measures to protect user information from unauthorized access, disclosure, alteration, or destruction. <strong>We use industry-standard security measures to protect user information. However, no method of transmission or storage is 100% secure.</strong>`,
      `While we strive to protect all information, no internet transmission or electronic storage method can be guaranteed to be completely secure. Users are encouraged to keep their account credentials confidential.`,
    ],
  },
  {
    id: 9,
    icon: "✅",
    title: "9. User Rights / Account Deletion",
    content: [
      `Users may request deletion of their ChalRe account through the in-app Account Deletion option, through the website dashboard, or by emailing <strong>chalreofficial@gmail.com</strong>.`,
      `Requests are reviewed manually by the ChalRe team and typically processed within <strong>30 days</strong>.`,
      `Certain records may be retained where required by law or operational obligations.`,
    ],
  },
  {
    id: 10,
    icon: "👶",
    title: "10. Children's Privacy",
    content: [
      `ChalRe is intended only for individuals who are legally eligible to use ride-sharing services. <strong>We do not knowingly collect personal information from children under the age of 18.</strong>`,
      `If we become aware that personal information from a child under 18 has been collected, appropriate steps will be taken to remove such information promptly.`,
    ],
  },
  {
    id: 11,
    icon: "🔄",
    title: "11. Changes to This Privacy Policy",
    content: [
      `ChalRe may update this Privacy Policy from time to time. Updated versions will be published within the application and will become <strong>effective immediately upon publication.</strong>`,
      `Users are encouraged to review this Privacy Policy periodically to stay informed of any changes.`,
    ],
  },
  {
    id: 12,
    icon: "📧",
    title: "12. Contact Us",
    content: [
      `If you have questions regarding this Privacy Policy or your personal information, you may contact us at <strong>chalreofficial@gmail.com</strong>`,
      `ChalRe Team, India.`,
    ],
  },
];

const PrivacyPolicy = () => {
  const [openSection, setOpenSection] = useState(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [visibleSections, setVisibleSections] = useState({});

  // ── Per-page SEO ────────────────────────────────────────────────────────────
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Privacy Policy | ChalRe";

    let meta = document.querySelector('meta[name="description"]');
    const prevDesc = meta ? meta.getAttribute("content") : "";
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.setAttribute(
      "content",
      "Read ChalRe's Privacy Policy to understand how we collect, use, protect, and manage user information."
    );

    return () => {
      document.title = prevTitle;
      if (meta) meta.setAttribute("content", prevDesc);
    };
  }, []);

  // ── Reading progress bar ────────────────────────────────────────────────────
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ── Scroll-in animation ─────────────────────────────────────────────────────
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => ({ ...prev, [entry.target.dataset.id]: true }));
          }
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll(".tc-section").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const toggle = (id) => setOpenSection(openSection === id ? null : id);

  return (
    <>
      {/* Reading progress bar */}
      <div className="tc-progress" style={{ width: `${scrollProgress}%` }} />

      <div className="tc-wrap">

        {/* ── HEADER ── */}
        <header className="tc-header">
          <span className="tc-badge">
            <span className="tc-badge-dot" />
            Privacy Policy
          </span>

          <h1 className="tc-title">Privacy Policy</h1>

          <p className="tc-subtitle">
            This Privacy Policy explains how ChalRe collects, uses, stores, and
            protects your personal information when you use our platform.
          </p>

          <div className="tc-meta-row">
            <span className="tc-meta-chip">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <rect x="1" y="3" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M5 1v4M11 1v4M1 7h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Last Updated: June 2026
            </span>
            <span className="tc-meta-chip">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 5v3.5l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              ~4 min read
            </span>
          </div>

          {/* Table of Contents */}
          <nav className="tc-toc" aria-label="Table of contents">
            <p className="tc-toc-heading">Quick Navigation</p>
            <div className="tc-toc-grid">
              {sections.map((s) => (
                <button
                  key={s.id}
                  className="tc-toc-btn"
                  onClick={() => {
                    document.getElementById(`pp-section-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  <span className="tc-toc-icon">{s.icon}</span>
                  <span>{s.title.replace(/^\d+\.\s/, "")}</span>
                </button>
              ))}
            </div>
          </nav>
        </header>

        {/* ── SECTIONS ── */}
        <main className="tc-sections">
          {sections.map((section) => {
            const isOpen = openSection === section.id;
            const isVisible = visibleSections[section.id];
            return (
              <div
                key={section.id}
                id={`pp-section-${section.id}`}
                data-id={section.id}
                className={`tc-section${isVisible ? " tc-section--in" : ""}${isOpen ? " tc-section--open" : ""}`}
                style={{ "--i": section.id }}
              >
                {/* Accent stripe */}
                <div className="tc-section-num" aria-hidden="true" />

                {/* Clickable header */}
                <button
                  className="tc-section-header"
                  onClick={() => toggle(section.id)}
                  aria-expanded={isOpen}
                  aria-controls={`pp-body-${section.id}`}
                >
                  <span className="tc-section-icon" aria-hidden="true">{section.icon}</span>
                  <span className="tc-section-num-label" aria-hidden="true">
                    {String(section.id).padStart(2, "0")}
                  </span>
                  <span className="tc-section-title">{section.title}</span>
                  <span className={`tc-chevron${isOpen ? " tc-chevron--open" : ""}`} aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                      <path d="M4.5 6.75L9 11.25L13.5 6.75" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </button>

                {/* Body */}
                <div
                  id={`pp-body-${section.id}`}
                  className={`tc-section-body${isOpen ? " tc-section-body--open" : ""}`}
                  role="region"
                >
                  <div className="tc-section-body-inner">
                    {section.content.map((para, i) => (
                      <p key={i} dangerouslySetInnerHTML={{ __html: para }} />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </main>

        {/* ── FOOTER ACKNOWLEDGEMENT ── */}
        <footer className="tc-footer">
          <div className="tc-footer-icon" aria-hidden="true">🔐</div>
          <div className="tc-footer-text">
            <p>
              By creating an account or using <strong>ChalRe</strong>, you acknowledge
              and agree to the data practices described in this Privacy Policy.
            </p>
            <p>
              Privacy questions?{" "}
              <a href="mailto:chalreofficial@gmail.com">chalreofficial@gmail.com</a>
            </p>
          </div>
        </footer>

      </div>
    </>
  );
};

export default PrivacyPolicy;
