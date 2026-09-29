// src/pages/admin/AdminDashboard.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import "../../styles/AdminDashboard.css";

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [recentBookings, setRecentBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastRefreshed, setLastRefreshed] = useState(null);

    const fetchRecentBookings = useCallback(async () => {
        try {
            const res = await api.get("/admin/payouts/recent-bookings");
            setRecentBookings(res.data || []);
            setLastRefreshed(new Date());
        } catch (err) {
            console.error("Failed to fetch recent bookings", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRecentBookings();
        const interval = setInterval(fetchRecentBookings, 30000); // auto-refresh every 30s
        return () => clearInterval(interval);
    }, [fetchRecentBookings]);

    const formatTime = (isoStr) => {
        if (!isoStr) return "—";
        try {
            return new Date(isoStr).toLocaleString("en-IN", {
                day: "2-digit", month: "short", year: "numeric",
                hour: "2-digit", minute: "2-digit", hour12: true
            });
        } catch {
            return isoStr;
        }
    };

    const getCity = (loc) => loc ? loc.split(",")[0].trim() : "—";

    return (
        <div className="admin-dashboard">
            <h1>Admin Dashboard</h1>
            <p className="admin-subtitle">
                Welcome to the ChalRe Admin Panel. Select an option below to get started.
            </p>

            {/* ── Existing 3 nav cards ── */}
            <div className="admin-grid">
                <div
                    className="admin-card"
                    onClick={() => navigate("/admin/verifications")}
                    style={{ cursor: "pointer" }}
                >
                    <h3>🪪 Driver Verifications</h3>
                    <p>Review pending driver documents and approve or reject.</p>
                </div>

                <div
                    className="admin-card"
                    onClick={() => navigate("/admin/payouts")}
                    style={{ cursor: "pointer" }}
                >
                    <h3>💸 Payout Tracker</h3>
                    <p>Track confirmed rides and manage driver payments manually.</p>
                </div>

                <div
                    className="admin-card"
                    onClick={() => navigate("/admin/deletion-requests")}
                    style={{ cursor: "pointer" }}
                >
                    <h3>🗑️ Deletion Requests</h3>
                    <p>Review and mark completed user account deletion requests.</p>
                </div>
            </div>

            {/* ── Recent Bookings Feed ── */}
            <div style={{
                marginTop: "36px",
                background: "#fff",
                borderRadius: "14px",
                boxShadow: "0 0 0 1px #e5e7eb, 0 2px 12px rgba(0,0,0,0.07)",
                overflow: "hidden"
            }}>
                {/* Header */}
                <div style={{
                    padding: "18px 24px",
                    borderBottom: "1px solid #f0f0f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "8px"
                }}>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: "17px", color: "#0a2614" }}>
                            🎫 Recent Paid Bookings
                        </div>
                        <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}>
                            Live feed · auto-refreshes every 30s
                            {lastRefreshed && ` · Last updated ${lastRefreshed.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`}
                        </div>
                    </div>
                    <button
                        onClick={fetchRecentBookings}
                        style={{
                            background: "#f0fdf4",
                            border: "1px solid #86efac",
                            borderRadius: "8px",
                            padding: "7px 16px",
                            fontSize: "13px",
                            color: "#166534",
                            fontWeight: 600,
                            cursor: "pointer"
                        }}
                    >
                        ↻ Refresh
                    </button>
                </div>

                {/* Content */}
                {loading ? (
                    <div style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>
                        Loading recent bookings…
                    </div>
                ) : recentBookings.length === 0 ? (
                    <div style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>
                        No paid bookings yet.
                    </div>
                ) : (
                    <div>
                        {recentBookings.map((b) => (
                            <div key={b.bookingId} style={{
                                padding: "16px 24px",
                                borderBottom: "1px solid #f9fafb",
                                display: "flex",
                                gap: "20px",
                                flexWrap: "wrap",
                                alignItems: "flex-start"
                            }}>
                                {/* Route pill */}
                                <div style={{ minWidth: "180px", flex: 1 }}>
                                    <div style={{ fontWeight: 800, fontSize: "15px", color: "#0a2614", marginBottom: "4px" }}>
                                        {getCity(b.passengerPickup || b.from)} → {getCity(b.passengerDrop || b.to)}
                                    </div>
                                    <div style={{ fontSize: "12px", color: "#6b7280" }}>
                                        📅 Ride: {b.rideDate} {b.rideTime ? `· ${b.rideTime}` : ""}
                                    </div>
                                    <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
                                        🆔 Booking #{b.bookingId}
                                    </div>
                                </div>

                                {/* Passenger */}
                                <div style={{ minWidth: "150px" }}>
                                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>Passenger</div>
                                    <div style={{ fontWeight: 700, fontSize: "14px", color: "#111" }}>{b.passengerName || "—"}</div>
                                    <div style={{ fontSize: "12px", color: "#6b7280" }}>{b.passengerPhone || "—"}</div>
                                </div>

                                {/* Driver */}
                                <div style={{ minWidth: "150px" }}>
                                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>Driver</div>
                                    <div style={{ fontWeight: 700, fontSize: "14px", color: "#111" }}>{b.driverName || "—"}</div>
                                    <div style={{ fontSize: "12px", color: "#6b7280" }}>{b.driverPhone || "—"}</div>
                                </div>

                                {/* Amount + seats */}
                                <div style={{ minWidth: "110px" }}>
                                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>Paid</div>
                                    <div style={{ fontWeight: 800, fontSize: "16px", color: "#16a34a" }}>₹{b.amountRupees?.toFixed(0) || "—"}</div>
                                    <div style={{ fontSize: "12px", color: "#6b7280" }}>{b.seatsBooked} seat{b.seatsBooked !== 1 ? "s" : ""}</div>
                                </div>

                                {/* Razorpay ID + time */}
                                <div style={{ minWidth: "170px" }}>
                                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>Razorpay ID</div>
                                    <div style={{ fontSize: "11px", color: "#374151", fontFamily: "monospace", wordBreak: "break-all" }}>
                                        {b.txnId || "—"}
                                    </div>
                                    <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px" }}>
                                        🕐 {formatTime(b.bookingTime)}
                                    </div>
                                </div>

                                {/* Status badge */}
                                <div style={{ display: "flex", alignItems: "flex-start", paddingTop: "2px" }}>
                                    <span style={{
                                        background: "#dcfce7",
                                        color: "#166534",
                                        border: "1px solid #86efac",
                                        borderRadius: "20px",
                                        padding: "3px 12px",
                                        fontSize: "11px",
                                        fontWeight: 700
                                    }}>✓ PAID</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}