import React from "react";

export default function ChartCard({ title, children, fullWidth = false }) {
  return (
    <div className={`chart-card ${fullWidth ? "chart-card-full" : ""}`}>
      <div className="chart-header">
        <h3 className="chart-title">{title}</h3>
      </div>
      <div className="chart-body">{children}</div>
    </div>
  );
}
