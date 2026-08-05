import React, { useEffect, useState } from "react";
import { fetchPaymentAnalytics } from "../../../api/adminAnalyticsApi";
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

const COLORS = ["#024110", "#ef4444", "#f59e0b", "#3b82f6"];

export default function AnalyticsPayments() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchPaymentAnalytics();
      setData(res);
    } catch (err) {
      console.error("Failed to load payment analytics:", err);
      setError("Failed to load payment analytics data.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="analytics-container">
        <div className="analytics-loading">
          <div className="analytics-spinner" />
          <span>Loading payment analytics...</span>
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
          <h1 className="analytics-title">💳 Payment & Revenue Analytics</h1>
          <p className="analytics-subtitle">Platform revenue, payouts, and payment status breakdown</p>
        </div>
        <DateRangeFilter />
      </div>

      <div className="kpi-grid">
        <KPICard label="Total Revenue" value={`₹${data.totalRevenue?.toLocaleString() || 0}`} icon="💰" />
        <KPICard label="Avg Transaction" value={`₹${data.avgTransactionValue || 0}`} icon="📊" />
        <KPICard label="Pending Driver Payouts" value={data.pendingPayouts} icon="⏳" />
        <KPICard label="Completed Payouts" value={data.completedPayouts} icon="💸" />
      </div>

      <div className="charts-grid">
        <ChartCard title="Monthly Revenue Trend" fullWidth>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.monthlyRevenue || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(val) => [`₹${val}`, "Revenue"]} />
              <Bar dataKey="revenue" fill="#024110" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Payment Status Breakdown" fullWidth>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data.statusBreakdown || []} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="count" nameKey="status" label>
                {(data.statusBreakdown || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
