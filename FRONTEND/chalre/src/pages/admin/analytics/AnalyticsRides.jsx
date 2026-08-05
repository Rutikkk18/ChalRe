import React, { useEffect, useState } from "react";
import { fetchRideAnalytics } from "../../../api/adminAnalyticsApi";
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
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = ["#024110", "#4caf50", "#f59e0b", "#ef4444", "#3b82f6"];

export default function AnalyticsRides() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchRideAnalytics();
      setData(res);
    } catch (err) {
      console.error("Failed to load ride analytics:", err);
      setError("Failed to load ride analytics data.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="analytics-container">
        <div className="analytics-loading">
          <div className="analytics-spinner" />
          <span>Loading ride analytics...</span>
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

  const rideStatusData = [
    { name: "Active", value: data.activeRides },
    { name: "Cancelled", value: data.cancelledRides },
  ];

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <div>
          <h1 className="analytics-title">🚗 Ride Analytics</h1>
          <p className="analytics-subtitle">Ride creation, status, and vehicle distribution</p>
        </div>
        <DateRangeFilter />
      </div>

      <div className="kpi-grid">
        <KPICard label="Total Rides" value={data.totalRides} icon="🚗" />
        <KPICard label="Active Rides" value={data.activeRides} icon="✅" />
        <KPICard label="Cancelled Rides" value={data.cancelledRides} icon="🚫" />
        <KPICard label="Average Ride Price" value={`₹${Math.round(data.averagePrice || 0)}`} icon="🏷️" />
      </div>

      <div className="charts-grid">
        <ChartCard title="Vehicle Type Distribution">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.vehicleTypeBreakdown || []} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#024110" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Ride Status">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={rideStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" label>
                {rideStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top Origin Cities" fullWidth>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.topOrigins || []} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis dataKey="city" type="category" width={100} />
              <Tooltip />
              <Bar dataKey="count" fill="#4caf50" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
