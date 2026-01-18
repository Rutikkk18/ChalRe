import React, { useEffect } from "react";
import Footer from "../components/Footer";
import "../styles/JoinOurTeam.css";

export default function JoinOurTeam() {

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="jot-wrapper">
            {/* 1. Hero Section */}
            <section className="jot-hero">
                <div className="jot-hero-content">
                    <h1>Building smarter, greener ways to travel together.</h1>
                    <p>
                        Join us in redefining mobility. We connect communities, reduce traffic,
                        and make travel affordable for everyone.
                    </p>
                </div>
            </section>

            <div className="jot-container">
                {/* 2. Who We Are */}
                <section className="jot-section">
                    <h2>Who We Are</h2>
                    <p>
                        ChalRe is a ride-sharing platform designed for the real world. We focus
                        on connecting people from villages, towns, and cities, making daily
                        commutes and long-distance travel simple and cost-effective.
                    </p>
                    <p>
                        We are an early-stage, founder-led startup driven by the mission to
                        solve genuine travel problems with technology. We believe in transparency,
                        humility, and hard work.
                    </p>
                </section>

                {/* 3. What We Do */}
                <section className="jot-section">
                    <h2>What We Do</h2>
                    <div className="jot-grid">
                        <div className="jot-card">
                            <h3>Ride Sharing</h3>
                            <p>
                                Seamlessly connecting car and bike owners with passengers going the same way.
                            </p>
                        </div>
                        <div className="jot-card">
                            <h3>Community First</h3>
                            <p>
                                Building trust through verified profiles and secure payments for safe travel.
                            </p>
                        </div>
                        <div className="jot-card">
                            <h3>Affordability</h3>
                            <p>
                                Making travel cheaper by splitting costs, without compromising on comfort.
                            </p>
                        </div>
                    </div>
                </section>

                {/* 4. Our Tech Stack */}
                <section className="jot-section">
                    <h2>Our Tech Stack</h2>
                    <p>
                        We use modern, scalable technologies to build a fast and reliable platform.
                    </p>
                    <ul className="jot-tech-list">
                        <li><strong>Frontend:</strong> React.js, Vite, Modern CSS</li>
                        <li><strong>Backend:</strong> Java, Spring Boot, REST APIs</li>
                        <li><strong>Database:</strong> MySQL, Cloud Database</li>
                        <li><strong>Infrastructure:</strong> Vercel, Render, Cloud Hosting</li>
                        <li><strong>Integrations:</strong> Razorpay, Maps APIs, Real-time services</li>
                    </ul>
                </section>

                {/* 5. Team Culture */}
                <section className="jot-section bg-light">
                    <h2>Team Culture</h2>
                    <div className="jot-culture-grid">
                        <div className="culture-item">
                            <h4>Ownership</h4>
                            <p>We take full responsibility for our work and its impact.</p>
                        </div>
                        <div className="culture-item">
                            <h4>Learning</h4>
                            <p>We are constantly learning, adapting, and improving.</p>
                        </div>
                        <div className="culture-item">
                            <h4>Simplicity</h4>
                            <p>We value simple, effective solutions over complexity.</p>
                        </div>
                    </div>
                </section>

                {/* 6. Careers / Opportunities */}
                <section className="jot-section text-center">
                    <div className="jot-hiring-box">
                        <h2>Careers at ChalRe</h2>
                        <p className="jot-lead">
                            We are currently a small, focused team and are <strong>not actively hiring</strong> at this moment.
                        </p>
                        <p>
                            However, we are always excited to connect with passionate developers,
                            designers, and problem-solvers who resonate with our mission. If you
                            love building impactful products, we'd love to hear from you for future opportunities.
                        </p>
                    </div>
                </section>

                {/* 7. Contact CTA */}
                <section className="jot-cta">
                    <h3>Interested in joining us in the future?</h3>
                    <p>Drop us a hello, and let's stay in touch.</p>
                    <a href="mailto:contact@chalre.com" className="jot-btn">
                        Get in Touch
                    </a>
                </section>
            </div>

            <Footer />
        </div>
    );
}
