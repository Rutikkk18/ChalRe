// src/pages/AboutChalRe.jsx
import "../styles/AboutChalRe.css";
import { useLanguage } from "../context/LanguageContext";

const AboutChalRe = () => {
  const { t } = useLanguage();

  return (
    <div className="about-container">

      {/* Hero */}
      <section className="about-hero">
        <div className="hero-content">
          <h1>{t("aboutHeroTitle")}</h1>
          <p>{t("aboutHeroSubtitle")}</p>
        </div>
      </section>

      {/* Mission */}
      <section className="about-section">
        <div className="section-content">
          <h2>{t("aboutMissionTitle")}</h2>
          <p>{t("aboutMissionDesc")}</p>
        </div>
      </section>

      {/* How It Works */}
      <section className="about-section how-it-works">
        <div className="section-content">
          <h2>{t("aboutHowTitle")}</h2>
          <div className="about-steps">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3>{t("aboutStep1Title")}</h3>
              <p>{t("aboutStep1Desc")}</p>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <h3>{t("aboutStep2Title")}</h3>
              <p>{t("aboutStep2Desc")}</p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <h3>{t("aboutStep3Title")}</h3>
              <p>{t("aboutStep3Desc")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why ChalRe */}
      <section className="about-section why-section">
        <div className="section-content">
          <h2>{t("aboutWhyTitle")}</h2>
          <ul className="about-list">
            <li><span className="check-icon">✓</span><span>{t("aboutWhy1")}</span></li>
            <li><span className="check-icon">✓</span><span>{t("aboutWhy2")}</span></li>
            <li><span className="check-icon">✓</span><span>{t("aboutWhy3")}</span></li>
            <li><span className="check-icon">✓</span><span>{t("aboutWhy4")}</span></li>
            <li><span className="check-icon">✓</span><span>{t("aboutWhy5")}</span></li>
          </ul>
        </div>
      </section>

      {/* Vision */}
      <section className="about-section vision-section">
        <div className="section-content">
          <h2>{t("aboutVisionTitle")}</h2>
          <p>{t("aboutVisionDesc")}</p>
        </div>
      </section>

    </div>
  );
};

export default AboutChalRe; 