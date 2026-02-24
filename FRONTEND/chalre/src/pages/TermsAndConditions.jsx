import "../styles/TermsAndConditions.css";
import { useState, useEffect } from "react";

const sections = [
  {
    id: 1,
    icon: "👋",
    title: "1. Introduction",
    content: [
      `Welcome to <strong>ChalRe</strong>. By accessing or using our website or mobile application, you agree to comply with and be bound by these Terms & Conditions. Please read them carefully before using our services.`,
      `If you do not agree to these Terms, please discontinue use of our platform immediately. Your continued use of ChalRe constitutes full acceptance of all terms outlined herein.`,
    ],
  },
  {
    id: 2,
    icon: "🚗",
    title: "2. About ChalRe",
    content: [
      `ChalRe is a <strong>ride-sharing platform</strong> that connects people traveling in the same direction. We serve as an intermediary technology platform and do not directly provide transportation services.`,
      `ChalRe is not a transportation company and is not responsible for the conduct, actions, or omissions of users — whether drivers or passengers — on or off the platform.`,
    ],
  },
  {
    id: 3,
    icon: "👤",
    title: "3. User Responsibilities",
    content: [
      `Users must provide <strong>accurate, current, and complete information</strong> during registration and throughout their use of the platform. You are solely responsible for maintaining the confidentiality of your account credentials.`,
      `You agree to follow all applicable local, state, and national laws while using the platform. Respectful and lawful behavior toward all other users is mandatory. Any misuse, abuse, harassment, or violation of these terms may result in <strong>immediate account suspension or permanent termination</strong>.`,
    ],
  },
  {
    id: 4,
    icon: "💳",
    title: "4. Bookings & Payments",
    content: [
      `Ride prices are independently set by ride owners on the platform. ChalRe only facilitates <strong>communication and booking coordination</strong> between users and does not act as a payment processor for rides arranged outside the platform.`,
      `Any financial transactions conducted outside of the ChalRe platform are entirely at the user's own risk. ChalRe bears no responsibility for disputes, losses, or fraud arising from such transactions.`,
    ],
  },
  {
    id: 5,
    icon: "❌",
    title: "5. Cancellations",
    content: [
      `Cancellation and refund policies may vary depending on the specific ride and the policies set by the ride owner. <strong>Users are strongly encouraged to review all ride details</strong> — including cancellation terms — before confirming a booking.`,
      `ChalRe reserves the right to implement platform-wide cancellation policies at its discretion. Repeated cancellations without valid reason may impact your account standing on the platform.`,
    ],
  },
  {
    id: 6,
    icon: "⚖️",
    title: "6. Limitation of Liability",
    content: [
      `To the fullest extent permitted by applicable law, <strong>ChalRe shall not be liable</strong> for any direct, indirect, incidental, special, consequential, or punitive damages arising from the use of the platform.`,
      `This includes but is not limited to travel incidents, accidents, disputes between users, loss of data, or any interruption of service. Users assume full responsibility for risks associated with ride-sharing arrangements made through the platform.`,
    ],
  },
  {
    id: 7,
    icon: "🔒",
    title: "7. Privacy & Data",
    content: [
      `ChalRe is committed to protecting your privacy. We collect and process personal data in accordance with our <strong>Privacy Policy</strong>, which forms an integral part of these Terms & Conditions.`,
      `By using ChalRe, you consent to the collection and use of your information as described in our Privacy Policy. We do not sell personal data to third parties.`,
    ],
  },
  {
    id: 8,
    icon: "🔄",
    title: "8. Changes to Terms",
    content: [
      `ChalRe reserves the right to <strong>update or modify these Terms & Conditions</strong> at any time without prior notice. Changes become effective immediately upon posting to the platform.`,
      `Continued use of ChalRe following any modifications constitutes your acceptance of the revised terms. We recommend reviewing this page periodically to stay informed of any updates.`,
    ],
  },
];

const TermsAndConditions = () => {
  const [openSection, setOpenSection] = useState(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [visibleSections, setVisibleSections] = useState({});

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
            Legal Document
          </span>

          <h1 className="tc-title">Terms &amp; Conditions</h1>

          <p className="tc-subtitle">
            These terms govern your access and use of the ChalRe platform.
            By continuing, you agree to be bound by the policies below.
          </p>

          <div className="tc-meta-row">
            <span className="tc-meta-chip">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <rect x="1" y="3" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M5 1v4M11 1v4M1 7h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Last updated: January 2026
            </span>
            <span className="tc-meta-chip">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
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
                    document.getElementById(`tc-section-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
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
                id={`tc-section-${section.id}`}
                data-id={section.id}
                className={`tc-section${isVisible ? " tc-section--in" : ""}${isOpen ? " tc-section--open" : ""}`}
                style={{ "--i": section.id }}
              >
                {/* Number stripe */}
                <div className="tc-section-num" aria-hidden="true">
                  {String(section.id).padStart(2, "0")}
                </div>

                {/* Clickable header */}
                <button
                  className="tc-section-header"
                  onClick={() => toggle(section.id)}
                  aria-expanded={isOpen}
                  aria-controls={`tc-body-${section.id}`}
                >
                  <span className="tc-section-icon" aria-hidden="true">{section.icon}</span>
                  <span className="tc-section-title">{section.title}</span>
                  <span className={`tc-chevron${isOpen ? " tc-chevron--open" : ""}`} aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M4.5 6.75L9 11.25L13.5 6.75" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </button>

                {/* Body */}
                <div
                  id={`tc-body-${section.id}`}
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
          <div className="tc-footer-icon" aria-hidden="true">📋</div>
          <div className="tc-footer-text">
            <p>
              By using <strong>ChalRe</strong>, you confirm that you have read, understood,
              and agree to be bound by these Terms &amp; Conditions in full.
            </p>
            <p>
              Have questions?{" "}
              <a href="mailto:support@chalre.com">support@chalre.com</a>
            </p>
          </div>
        </footer>

      </div>
    </>
  );
};

export default TermsAndConditions;