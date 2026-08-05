import React from "react";

export default function KPICard({ label, value, subtext, icon }) {
  return (
    <div className="kpi-card">
      <div className="kpi-card-info">
        <span className="kpi-label">{label}</span>
        <span className="kpi-value">{value !== undefined && value !== null ? value : "0"}</span>
        {subtext && <span className="kpi-subtext">{subtext}</span>}
      </div>
      {icon && <div className="kpi-icon-badge">{icon}</div>}
    </div>
  );
}
