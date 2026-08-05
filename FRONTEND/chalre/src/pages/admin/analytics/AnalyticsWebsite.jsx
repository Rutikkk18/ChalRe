import React from "react";
import DateRangeFilter from "./components/DateRangeFilter";
import "../../../styles/analytics.css";

export default function AnalyticsWebsite() {
  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <div>
          <h1 className="analytics-title">🌐 Website Behavioral Analytics</h1>
          <p className="analytics-subtitle">GA4 website traffic, sessions, page views, and user journeys</p>
        </div>
        <DateRangeFilter />
      </div>

      <div className="analytics-notice-box">
        <div className="analytics-notice-title">GA4 Data API Integration (Phase 2)</div>
        <p>
          Firebase Analytics is actively collecting page views, screen views, search events, and checkout funnels.
          Direct GA4 Data API reporting inside this admin view will be enabled in Phase 2.
        </p>
        <p style={{ marginTop: "12px", fontSize: "0.85rem", color: "#6b7280" }}>
          In the meantime, live web analytics and traffic streams are accessible directly in your Google Analytics 4 Dashboard under property <strong>G-B4353LW6QT</strong>.
        </p>
      </div>
    </div>
  );
}
