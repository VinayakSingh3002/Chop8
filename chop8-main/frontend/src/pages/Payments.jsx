// src/pages/Payments.jsx
import React, { useEffect, useState } from "react";
import { getUser } from "../services/AuthService";
import { API } from "../config";
import { Link } from "react-router";

function calcDuration(timeIn, timeOut) {
  try {
    const [h1, m1] = timeIn.split(":").map(Number);
    const [h2, m2] = timeOut.split(":").map(Number);
    const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (mins <= 0) return null;
    const h = Math.floor(mins / 60), m = mins % 60;
    return m === 0 ? `${h} hrs` : `${h}h ${m}m`;
  } catch { return null; }
}

function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const loggedUser = getUser();

  useEffect(() => {
    if (!loggedUser || loggedUser.role !== "customer") { setLoading(false); return; }
    fetch(`${API.payment}/user/${loggedUser.userId}`)
      .then(r => r.json())
      .then(data => { setPayments(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (!loggedUser) return (
    <div style={pageWrap}>
      <div style={msgBox("#e3f2fd","#90caf9","#0d47a1")}>
        <div style={iconSt}>🔒</div><h2>Login Required</h2>
        <Link to="/login"><button style={btnPrimary}>Go to Login</button></Link>
      </div>
    </div>
  );

  if (loggedUser.role === "chef") return (
    <div style={pageWrap}>
      <div style={msgBox("#fff8e1","#ffe082","#7a5c00")}>
        <div style={iconSt}>👨‍🍳</div><h2>Chefs don't have a payment section</h2>
        <Link to="/chef-orders"><button style={btnYellow}>My Dashboard</button></Link>
      </div>
    </div>
  );

  const total = payments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);

  return (
    <div style={{ padding: "40px 20px", maxWidth: "860px", margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <h2 style={{ fontSize: "28px", color: "#1e3c72", margin: 0 }}>My Payments</h2>
        <Link to="/services"><button style={btnPrimary}>+ Book a Chef</button></Link>
      </div>
      <p style={{ color: "#666", marginBottom: "24px" }}>
        Hello, <strong>{loggedUser.name}</strong> — your payment receipts.
      </p>

      {/* Total spent summary */}
      {payments.length > 0 && (
        <div style={{ background: "linear-gradient(135deg,#1e3c72,#2a5298)", borderRadius: "14px", padding: "20px 24px", color: "white", marginBottom: "28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "13px", opacity: 0.8 }}>Total Spent</div>
            <div style={{ fontSize: "32px", fontWeight: 700 }}>₹{total.toFixed(2)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "13px", opacity: 0.8 }}>Payments</div>
            <div style={{ fontSize: "32px", fontWeight: 700 }}>{payments.length}</div>
          </div>
        </div>
      )}

      {/* Receipt list */}
      {loading ? (
        <p style={{ color: "#888" }}>Loading payments...</p>
      ) : payments.length === 0 ? (
        <div style={msgBox("#f5faff","#e0eafc","#1e3c72")}>
          <div style={iconSt}>💳</div>
          <h3>No payments yet</h3>
          <p style={{ fontSize: "14px", color: "#888" }}>Book a chef and complete payment to see receipts here.</p>
          <Link to="/services"><button style={btnPrimary}>Browse Chefs</button></Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {payments.map(p => (
            <div key={p.id} style={card}>
              {/* Token badge */}
              <div style={tokenBadge}>{p.tokenId}</div>

              {/* PAID badge */}
              <div style={paidBadge}>✅ PAID</div>

              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>

                <div>
                  <div style={lbl}>Chef</div>
                  <div style={val}>👨‍🍳 {p.chef?.name || "—"}</div>
                </div>

                <div>
                  <div style={lbl}>Date</div>
                  <div style={val}>📅 {p.date}</div>
                </div>

                {(p.timeIn || p.timeOut) && (
                  <div>
                    <div style={lbl}>Timings</div>
                    <div style={val}>🕐 {p.timeIn} → 🕔 {p.timeOut}</div>
                    {p.timeIn && p.timeOut && calcDuration(p.timeIn, p.timeOut) && (
                      <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>{calcDuration(p.timeIn, p.timeOut)}</div>
                    )}
                  </div>
                )}

                <div>
                  <div style={lbl}>Payment ID</div>
                  <div style={{ ...val, fontSize: "13px", color: "#555", fontWeight: 500 }}>{p.paymentId}</div>
                </div>

                <div>
                  <div style={lbl}>Amount Paid</div>
                  <div style={{ ...val, fontSize: "20px", color: "#2e7d32" }}>₹{p.amountPaid}</div>
                </div>

              </div>

              {/* Receipt strip */}
              <div style={{ marginTop: "14px", padding: "10px 14px", background: "#f0fff4", border: "1px solid #a5d6a7", borderRadius: "8px", fontSize: "12px", color: "#2e7d32" }}>
                📱 SMS sent to {p.user?.mobile || loggedUser.mobile || "registered mobile"} · Txn: {p.paymentId}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const pageWrap  = { padding: "60px 20px", maxWidth: "500px", margin: "0 auto" };
const msgBox    = (bg, border, color) => ({ background: bg, border: `1px solid ${border}`, borderRadius: "16px", padding: "40px 30px", textAlign: "center", color });
const iconSt    = { fontSize: "48px", marginBottom: "16px" };
const btnPrimary = { padding: "10px 24px", background: "linear-gradient(135deg,#4facfe,#00c6ff)", color: "white", border: "none", borderRadius: "8px", fontWeight: 600, cursor: "pointer", fontSize: "14px" };
const btnYellow  = { marginTop: "16px", padding: "10px 28px", background: "#ffc107", color: "#3e2000", border: "none", borderRadius: "8px", fontWeight: 600, cursor: "pointer", fontSize: "15px" };
const card      = { background: "#fff", border: "1px solid #e0eafc", borderRadius: "14px", padding: "20px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", position: "relative" };
const tokenBadge = { position: "absolute", top: "16px", left: "20px", background: "linear-gradient(135deg,#4facfe,#00c6ff)", color: "white", borderRadius: "20px", padding: "4px 14px", fontSize: "13px", fontWeight: 700, letterSpacing: "1px" };
const paidBadge  = { position: "absolute", top: "16px", right: "20px", background: "#e8f5e9", color: "#2e7d32", border: "1px solid #a5d6a7", borderRadius: "20px", padding: "4px 12px", fontSize: "12px", fontWeight: 700 };
const lbl       = { fontSize: "11px", color: "#999", textTransform: "uppercase", marginBottom: "4px" };
const val       = { fontSize: "15px", fontWeight: 600, color: "#1e3c72" };

export default Payments;