import React, { useEffect, useState } from "react";
import { fetchUserAnalytics } from "../../../api/adminAnalyticsApi";
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

const COLORS = ["#024110", "#4caf50", "#f59e0b", "#ef4444"];

export default function AnalyticsUsers() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchUserAnalytics();
      setData(res);
    } catch (err) {
      console.error("Failed to load user analytics:", err);
      setError("Failed to load user analytics data.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="analytics-container">
        <div className="analytics-loading">
          <div className="analytics-spinner" />
          <span>Loading user analytics...</span>
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

  const roleData = [
    { name: "Drivers", value: data.drivers },
    { name: "Passengers", value: data.passengers },
  ];

  const authMethodData = [
    { name: "Google Sign-In", value: data.googleUsers },
    { name: "Email / Password", value: data.emailUsers },
  ];

  const verificationData = [
    { name: "Approved", value: data.approvedVerification },
    { name: "Pending", value: data.pendingVerification },
    { name: "Rejected", value: data.rejectedVerification },
  ];

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <div>
          <h1 className="analytics-title">👥 User Analytics</h1>
          <p className="analytics-subtitle">User registration and role breakdown</p>
        </div>
        <DateRangeFilter />
      </div>

      <div className="kpi-grid">
        <KPICard label="Total Users" value={data.totalUsers} icon="👥" />
        <KPICard label="Drivers" value={data.drivers} icon="🚗" subtext={`${data.verifiedDrivers} verified`} />
        <KPICard label="Passengers" value={data.passengers} icon="🧳" />
        <KPICard label="Verified Drivers" value={data.verifiedDrivers} icon="✅" />
      </div>

      <div className="charts-grid">
        <ChartCard title="Role Distribution">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={roleData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" label>
                {roleData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Authentication Method">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={authMethodData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" label>
                {authMethodData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Driver Verification Status" fullWidth>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={verificationData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#024110" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
