import React, { useEffect, useState } from "react";
import { fetchAnalyticsOverview } from "../../../api/adminAnalyticsApi";
import KPICard from "./components/KPICard";
import ChartCard from "./components/ChartCard";
import DateRangeFilter from "./components/DateRangeFilter";
import "../../../styles/analytics.css";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const COLORS = ["#024110", "#4caf50", "#f59e0b", "#ef4444", "#3b82f6"];

export default function AnalyticsOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadOverview();
  }, []);

  const loadOverview = async () => {
    try {
      setLoading(true);
      const res = await fetchAnalyticsOverview();
      setData(res);
    } catch (err) {
      console.error("Failed to load analytics overview:", err);
      setError("Failed to load analytics overview data.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="analytics-container">
        <div className="analytics-loading">
          <div className="analytics-spinner" />
          <span>Loading analytics overview...</span>
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
    { name: "Live Bookable", value: data.liveBookableRides },
    { name: "Cancelled", value: data.cancelledRides },
  ];

  const bookingStatusData = [
    { name: "Confirmed", value: data.confirmedBookings },
    { name: "Cancelled", value: data.cancelledBookings },
  ];

  const overviewBarData = [
    { name: "Users", count: data.totalUsers },
    { name: "Rides", count: data.totalRides },
    { name: "Bookings", count: data.totalBookings },
  ];

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <div>
          <h1 className="analytics-title">📊 Analytics Overview</h1>
          <p className="analytics-subtitle">Key performance indicators across ChalRe</p>
        </div>
        <DateRangeFilter />
      </div>

      <div className="kpi-grid">
        <KPICard label="Total Users" value={data.totalUsers} icon="👥" />
        <KPICard label="Total Rides" value={data.totalRides} icon="🚗" subtext={`${data.liveBookableRides} live bookable`} />
        <KPICard label="Total Bookings" value={data.totalBookings} icon="📋" subtext={`${data.confirmedBookings} confirmed`} />
        <KPICard label="Total Revenue" value={`₹${data.totalRevenue?.toLocaleString() || 0}`} icon="💰" />
      </div>

      <div className="kpi-grid">
        <KPICard label="Live Bookable Rides" value={data.liveBookableRides} icon="✅" />
        <KPICard label="Pending Payouts" value={data.pendingPayouts} icon="⏳" />
        <KPICard label="Completed Payouts" value={data.completedPayouts} icon="💸" />
        <KPICard label="Avg Booking Value" value={`₹${data.avgBookingValue || 0}`} icon="📈" />
      </div>

      <div className="charts-grid">
        <ChartCard title="Platform Metrics Overview">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={overviewBarData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#024110" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Ride Status Breakdown">
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

        <ChartCard title="Booking Status Breakdown" fullWidth>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={bookingStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" label>
                {bookingStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
