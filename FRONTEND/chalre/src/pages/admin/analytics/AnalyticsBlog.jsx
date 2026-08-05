import React from "react";
import DateRangeFilter from "./components/DateRangeFilter";
import "../../../styles/analytics.css";

export default function AnalyticsBlog() {
  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <div>
          <h1 className="analytics-title">📝 Blog & Content Analytics</h1>
          <p className="analytics-subtitle">Article readers, popular posts, and content conversion</p>
        </div>
        <DateRangeFilter />
      </div>

      <div className="analytics-notice-box">
        <div className="analytics-notice-title">Blog GA4 Analytics (Phase 2)</div>
        <p>
          Blog article opens and category filtering events are actively recorded via Firebase Analytics (<code>blog_article_opened</code>).
        </p>
        <p style={{ marginTop: "12px", fontSize: "0.85rem", color: "#6b7280" }}>
          Full content readership reports and custom engagement breakdown will be populated here in Phase 2 via GA4 Data API integration.
        </p>
      </div>
    </div>
  );
}
