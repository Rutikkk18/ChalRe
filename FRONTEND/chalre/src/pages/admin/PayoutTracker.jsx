// src/pages/admin/PayoutTracker.jsx
import React, { useEffect, useState } from "react";
import api from "../../api/axios";

export default function PayoutTracker() {
    const [pendingPayouts, setPendingPayouts] = useState([]);
    const [completedPayouts, setCompletedPayouts] = useState([]);
    const [activeTab, setActiveTab] = useState("pending");
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [noteInputs, setNoteInputs] = useState({});

    useEffect(() => {
        fetchPayouts();
    }, []);

    const fetchPayouts = async () => {
        setLoading(true);
        try {
            const [pendingRes, completedRes] = await Promise.all([
                api.get("/admin/payouts/pending"),
                api.get("/admin/payouts/completed")
            ]);
            setPendingPayouts(pendingRes.data || []);
            setCompletedPayouts(completedRes.data || []);
        } catch (err) {
            console.error("Failed to fetch payouts", err);
            alert("Failed to load payout data.");
        } finally {
            setLoading(false);
        }
    };

    const handleMarkPaid = async (paymentId) => {
        const note = noteInputs[paymentId] || "";
        if (!note.trim()) {
            alert("Please enter UPI reference number or payment note before marking as paid.");
            return;
        }
        if (!window.confirm(`Mark this driver as paid? Note: ${note}`)) return;

        setProcessingId(paymentId);
        try {
            await api.post(`/admin/payouts/mark-paid/${paymentId}`, { note });
            alert("Driver marked as paid successfully!");
            fetchPayouts();
        } catch (err) {
            const msg = err.response?.data || "Failed to mark as paid.";
            alert(typeof msg === "string" ? msg : JSON.stringify(msg));
        } finally {
            setProcessingId(null);
        }
    };

    const styles = {
        wrapper: { padding: "24px", maxWidth: "1000px", margin: "0 auto", fontFamily: "Times New Roman, serif" },
        title: { fontSize: "24px", fontWeight: "800", color: "#0a2614", marginBottom: "8px" },
        subtitle: { color: "#6b7280", fontSize: "14px", marginBottom: "24px" },
        tabs: { display: "flex", gap: "0", borderBottom: "2px solid #e5e7eb", marginBottom: "24px" },
        tab: (active) => ({
            padding: "10px 28px",
            border: "none",
            borderBottom: active ? "3px solid #024110" : "3px solid transparent",
            background: "none",
            fontWeight: "700",
            fontSize: "14px",
            cursor: "pointer",
            color: active ? "#024110" : "#6b7280",
            marginBottom: "-2px",
            fontFamily: "Times New Roman, serif"
        }),
        card: {
            background: "#fff",
            borderRadius: "12px",
            padding: "20px",
            marginBottom: "16px",
            boxShadow: "0 0 0 1px #e5e7eb, 0 2px 8px rgba(0,0,0,0.08)"
        },
        row: { display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" },
        left: { flex: 1, minWidth: "200px" },
        right: { display: "flex", flexDirection: "column", gap: "8px", minWidth: "220px" },
        route: { fontWeight: "800", fontSize: "16px", color: "#0a2614", marginBottom: "4px" },
        meta: { fontSize: "13px", color: "#6b7280", marginBottom: "2px" },
        upiBox: {
            background: "#f0fdf4",
            border: "1px solid #86efac",
            borderRadius: "8px",
            padding: "10px 14px",
            fontSize: "13px",
            color: "#166534",
            fontWeight: "600"
        },
        amountBox: {
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "8px",
            padding: "10px 14px",
            fontSize: "13px",
            color: "#1e40af"
        },
        noteInput: {
            width: "100%",
            padding: "8px 10px",
            borderRadius: "6px",
            border: "1px solid #d1d5db",
            fontSize: "13px",
            fontFamily: "Times New Roman, serif"
        },
        markPaidBtn: (disabled) => ({
            background: disabled ? "#9ca3af" : "#16a34a",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "10px 16px",
            fontSize: "13px",
            fontWeight: "700",
            cursor: disabled ? "not-allowed" : "pointer",
            fontFamily: "Times New Roman, serif"
        }),
        paidBadge: {
            background: "#dcfce7",
            color: "#166534",
            border: "1px solid #86efac",
            borderRadius: "20px",
            padding: "4px 12px",
            fontSize: "12px",
            fontWeight: "700",
            display: "inline-block"
        },
        empty: {
            textAlign: "center",
            padding: "48px",
            color: "#6b7280",
            fontSize: "15px"
        },
        summaryBar: {
            display: "flex",
            gap: "16px",
            marginBottom: "24px",
            flexWrap: "wrap"
        },
        summaryCard: (color) => ({
            background: color,
            borderRadius: "10px",
            padding: "16px 20px",
            flex: 1,
            minWidth: "140px"
        }),
        summaryLabel: { fontSize: "12px", color: "#6b7280", fontWeight: "600" },
        summaryVal: { fontSize: "22px", fontWeight: "800", color: "#0a2614", marginTop: "4px" }
    };

    const totalPending = pendingPayouts.reduce((sum, p) => sum + (p.driverAmount || 0), 0);
    const totalCompleted = completedPayouts.reduce((sum, p) => sum + (p.driverAmount || 0), 0);

    return (
        <div style={styles.wrapper}>
            <h1 style={styles.title}>Payout Tracker</h1>
            <p style={styles.subtitle}>Track and manage driver payments manually</p>

            {/* Summary bar */}
            <div style={styles.summaryBar}>
                <div style={styles.summaryCard("#fef9c3")}>
                    <div style={styles.summaryLabel}>Pending Payouts</div>
                    <div style={styles.summaryVal}>₹{totalPending.toFixed(2)}</div>
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>{pendingPayouts.length} drivers</div>
                </div>
                <div style={styles.summaryCard("#dcfce7")}>
                    <div style={styles.summaryLabel}>Completed Payouts</div>
                    <div style={styles.summaryVal}>₹{totalCompleted.toFixed(2)}</div>
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>{completedPayouts.length} drivers paid</div>
                </div>
                <div style={styles.summaryCard("#eff6ff")}>
                    <div style={styles.summaryLabel}>Chalre Revenue</div>
                    <div style={styles.summaryVal}>
                        ₹{completedPayouts.reduce((sum, p) => {
                            const total = p.amountRupees || 0;
                            const driver = p.driverAmount || 0;
                            return sum + (total - driver);
                        }, 0).toFixed(2)}
                    </div>
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>from completed rides</div>
                </div>
            </div>

            {/* Tabs */}
            <div style={styles.tabs}>
                <button style={styles.tab(activeTab === "pending")} onClick={() => setActiveTab("pending")}>
                    Pending ({pendingPayouts.length})
                </button>
                <button style={styles.tab(activeTab === "completed")} onClick={() => setActiveTab("completed")}>
                    Completed ({completedPayouts.length})
                </button>
            </div>

            {loading ? (
                <div style={styles.empty}>Loading payouts...</div>
            ) : activeTab === "pending" ? (
                pendingPayouts.length === 0 ? (
                    <div style={styles.empty}>✅ No pending payouts! All drivers are paid.</div>
                ) : (
                    pendingPayouts.map((p) => (
                        <div key={p.paymentId} style={styles.card}>
                            <div style={styles.row}>
                                <div style={styles.left}>
                                    <div style={styles.route}>{p.from} → {p.to}</div>
                                    <div style={styles.meta}>📅 Ride: {p.rideDate}</div>
                                    <div style={styles.meta}>👤 Driver: <strong>{p.driverName}</strong></div>
                                    <div style={styles.meta}>📞 Phone: {p.driverPhone || "—"}</div>
                                    <div style={styles.meta}>🧑 Passenger: {p.passengerName}</div>
                                    <div style={styles.meta}>🆔 Razorpay ID: {p.razorpayPaymentId}</div>
                                    <div style={styles.meta}>✅ Confirmed at: {p.releasedAt ? new Date(p.releasedAt).toLocaleString() : "—"}</div>
                                </div>
                                <div style={styles.right}>
                                    <div style={styles.upiBox}>
                                        💸 UPI: {p.driverUpiId || "⚠️ Driver has no UPI ID"}
                                    </div>
                                    <div style={styles.amountBox}>
                                        💰 Pay driver: ₹{p.driverAmount?.toFixed(2)}<br />
                                        <span style={{ fontSize: "11px", color: "#6b7280" }}>
                                            Total: ₹{p.amountRupees} | Chalre: ₹{p.chalreCut?.toFixed(2)}
                                        </span>
                                    </div>
                                    <input
                                        style={styles.noteInput}
                                        placeholder="Enter UPI ref / transaction note"
                                        value={noteInputs[p.paymentId] || ""}
                                        onChange={(e) => setNoteInputs(prev => ({
                                            ...prev,
                                            [p.paymentId]: e.target.value
                                        }))}
                                    />
                                    <button
                                        style={styles.markPaidBtn(processingId === p.paymentId)}
                                        onClick={() => handleMarkPaid(p.paymentId)}
                                        disabled={processingId === p.paymentId}
                                    >
                                        {processingId === p.paymentId ? "Processing..." : "✓ Mark Driver Paid"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )
            ) : (
                completedPayouts.length === 0 ? (
                    <div style={styles.empty}>No completed payouts yet.</div>
                ) : (
                    completedPayouts.map((p) => (
                        <div key={p.paymentId} style={styles.card}>
                            <div style={styles.row}>
                                <div style={styles.left}>
                                    <div style={styles.route}>{p.from} → {p.to}</div>
                                    <div style={styles.meta}>📅 Ride: {p.rideDate}</div>
                                    <div style={styles.meta}>👤 Driver: <strong>{p.driverName}</strong></div>
                                    <div style={styles.meta}>💸 UPI: {p.driverUpiId || "—"}</div>
                                    <div style={styles.meta}>💰 Paid: ₹{p.driverAmount?.toFixed(2)}</div>
                                    <div style={styles.meta}>🕐 Paid at: {p.driverPaidAt ? new Date(p.driverPaidAt).toLocaleString() : "—"}</div>
                                    <div style={styles.meta}>📝 Note: {p.driverPayoutNote || "—"}</div>
                                </div>
                                <div style={{ display: "flex", alignItems: "flex-start" }}>
                                    <span style={styles.paidBadge}>✓ Paid</span>
                                </div>
                            </div>
                        </div>
                    ))
                )
            )}
        </div>
    );
}