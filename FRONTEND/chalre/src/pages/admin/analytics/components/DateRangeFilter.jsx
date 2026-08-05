import React, { useState } from "react";

export default function DateRangeFilter({ onFilterChange }) {
  const [activePreset, setActivePreset] = useState("all");

  const presets = [
    { id: "7d", label: "Last 7 Days" },
    { id: "30d", label: "Last 30 Days" },
    { id: "90d", label: "Last 90 Days" },
    { id: "all", label: "All Time" },
  ];

  const handleSelect = (id) => {
    setActivePreset(id);
    if (onFilterChange) {
      onFilterChange(id);
    }
  };

  return (
    <div className="date-filter-wrap">
      {presets.map((p) => (
        <button
          key={p.id}
          className={`date-preset-btn ${activePreset === p.id ? "active" : ""}`}
          onClick={() => handleSelect(p.id)}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
