import React, { useEffect, useState } from "react";
import { fetchRouteAnalytics } from "../../../api/adminAnalyticsApi";
import KPICard from "./components/KPICard";
import ChartCard from "./components/ChartCard";
import DateRangeFilter from "./components/DateRangeFilter";
import "../../../styles/analytics.css";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export default function AnalyticsRoutes() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchRouteAnalytics();
      setData(res);
    } catch (err) {
      console.error("Failed to load route analytics:", err);
      setError("Failed to load route analytics data.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="analytics-container">
        <div className="analytics-loading">
          <div className="analytics-spinner" />
          <span>Loading route analytics...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="analytics-container">
        <div className="analytics-notice-box">
          <div className="analytics-notice-title">Error Loading Data</div>
          <p>{error || "No data available."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <div>
          <h1 className="analytics-title">🗺️ Route Analytics</h1>
          <p className="analytics-subtitle">Most travelled routes, origins, and destinations</p>
        </div>
        <DateRangeFilter />
      </div>

      <div className="kpi-grid">
        <KPICard label="Unique Routes" value={data.totalUniqueRoutes} icon="🗺️" />
        <KPICard label="Top Route Pair" value={data.topRoutePair || "N/A"} icon="🚩" />
      </div>

      <div className="charts-grid">
        <ChartCard title="Top 10 Origin Cities">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.topOrigins || []} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis dataKey="city" type="category" width={100} />
              <Tooltip />
              <Bar dataKey="count" fill="#024110" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top 10 Destination Cities">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.topDestinations || []} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis dataKey="city" type="category" width={100} />
              <Tooltip />
              <Bar dataKey="count" fill="#4caf50" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Most Popular Route Pairs" fullWidth>
          {(!data.topOdPairs || data.topOdPairs.length === 0) ? (
            <p>No route data available.</p>
          ) : (
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Origin</th>
                  <th>Destination</th>
                  <th>Rides Count</th>
                  <th>Avg Price</th>
                </tr>
              </thead>
              <tbody>
                {data.topOdPairs.map((pair, idx) => (
                  <tr key={idx}>
                    <td>{pair.from}</td>
                    <td>{pair.to}</td>
                    <td>{pair.count}</td>
                    <td>₹{pair.avgPrice}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
