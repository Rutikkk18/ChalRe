import React, { useEffect, useState } from "react";
import { fetchBookingAnalytics } from "../../../api/adminAnalyticsApi";
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

const COLORS = ["#024110", "#ef4444", "#f59e0b", "#3b82f6"];

export default function AnalyticsBookings() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchBookingAnalytics();
      setData(res);
    } catch (err) {
      console.error("Failed to load booking analytics:", err);
      setError("Failed to load booking analytics data.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="analytics-container">
        <div className="analytics-loading">
          <div className="analytics-spinner" />
          <span>Loading booking analytics...</span>
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

  const bookingStatusData = [
    { name: "Confirmed", value: data.confirmedBookings },
    { name: "Cancelled", value: data.cancelledBookings },
  ];

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <div>
          <h1 className="analytics-title">📋 Booking Funnel & Analytics</h1>
          <p className="analytics-subtitle">Booking conversions, cancellations, and seat utilization</p>
        </div>
        <DateRangeFilter />
      </div>

      <div className="kpi-grid">
        <KPICard label="Total Bookings" value={data.totalBookings} icon="📋" />
        <KPICard label="Confirmed" value={data.confirmedBookings} icon="✅" />
        <KPICard label="Cancelled" value={data.cancelledBookings} icon="❌" />
        <KPICard label="Cancellation Rate" value={`${data.cancellationRate}%`} icon="📉" />
      </div>

      <div className="kpi-grid">
        <KPICard label="Avg Seats / Booking" value={data.avgSeatsPerBooking} icon="💺" />
        <KPICard label="Partial Route Bookings" value={data.partialRouteBookings} icon="📍" subtext="Boarded at intermediate stop" />
      </div>

      <div className="charts-grid">
        <ChartCard title="Booking Status">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={bookingStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" label>
                {bookingStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Payment Method Breakdown">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.paymentMethodBreakdown || []} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="method" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#024110" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
