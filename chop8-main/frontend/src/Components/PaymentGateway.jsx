// src/Components/PaymentGateway.jsx
import React, { useState } from "react";
import { API } from "../config";

function PaymentGateway({ booking, chef, onSuccess, onClose }) {
  const [step,     setStep]     = useState("form");
  const [card,     setCard]     = useState({ number: "", expiry: "", cvv: "", name: "" });
  const [error,    setError]    = useState("");
  const [receipt,  setReceipt]  = useState(null);
  const [smsCopied,setSmsCopied]= useState(false);

  const amount = chef?.pricePerDay || 0;

  const handleCardNumber = (e) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 16);
    const fmt = val.match(/.{1,4}/g)?.join(" ") || val;
    setCard({ ...card, number: fmt });
    setError("");
  };

  const handleExpiry = (e) => {
    let val = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (val.length >= 3) val = val.slice(0, 2) + "/" + val.slice(2);
    setCard({ ...card, expiry: val });
    setError("");
  };

  const handlePay = async () => {
    const rawNumber = card.number.replace(/\s/g, "");
    if (!card.name.trim())        { setError("Please enter the cardholder name."); return; }
    if (rawNumber.length !== 16)  { setError("Please enter a valid 16-digit card number."); return; }
    if (card.expiry.length !== 5) { setError("Please enter a valid expiry (MM/YY)."); return; }
    if (card.cvv.length < 3)      { setError("Please enter a valid CVV."); return; }

    setStep("processing");
    setError("");
    await new Promise(res => setTimeout(res, 2500));

    try {
      const res  = await fetch(`${API.payment}/process`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id, amount }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "Payment failed. Please try again.");
        setStep("form");
        return;
      }

      setReceipt(data);
      setStep("success");
      if (onSuccess) onSuccess(data);
    } catch {
      setError("Network error. Please try again.");
      setStep("form");
    }
  };

  const handleCopySms = () => {
    if (!receipt?.smsText) return;
    navigator.clipboard.writeText(receipt.smsText)
      .then(() => { setSmsCopied(true); setTimeout(() => setSmsCopied(false), 2500); })
      .catch(() => {});
  };

  // ── Processing ────────────────────────────────────────
  if (step === "processing") return (
    <div style={overlay}>
      <div style={modal}>
        <div style={{ textAlign: "center", padding: "50px 24px" }}>
          <div style={spinnerEl} />
          <h3 style={{ color: "#1e3c72", marginTop: "28px", marginBottom: "8px" }}>
            Processing Payment...
          </h3>
          <p style={{ color: "#888", fontSize: "14px", margin: 0 }}>
            Please do not close this window
          </p>
          <p style={{ color: "#2a5298", fontWeight: 700, fontSize: "22px", marginTop: "12px" }}>
            ₹{amount}
          </p>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // ── Success ───────────────────────────────────────────
  if (step === "success" && receipt) return (
    <div style={overlay}>
      <div style={{ ...modal, maxWidth: "480px" }}>

        {/* Green header */}
        <div style={{ background: "linear-gradient(135deg,#2e7d32,#43a047)", borderRadius: "14px 14px 0 0", padding: "28px 24px", textAlign: "center", color: "white" }}>
          <div style={{ fontSize: "56px", marginBottom: "6px" }}>✅</div>
          <h2 style={{ margin: 0, fontSize: "22px" }}>Payment Successful!</h2>
          <p style={{ margin: "6px 0 0", opacity: 0.9, fontSize: "13px" }}>
            ₹{receipt.amountPaid} paid for booking {receipt.tokenId}
          </p>
        </div>

        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Receipt */}
          <div style={receiptBox}>
            <div style={receiptTitle}>🧾 Payment Receipt</div>
            <div style={receiptGrid}>
              <Row label="Payment ID"  value={receipt.paymentId} />
              <Row label="Token"       value={receipt.tokenId} />
              <Row label="Chef"        value={receipt.chefName} />
              <Row label="Customer"    value={receipt.customerName} />
              <Row label="Date"        value={receipt.date} />
              {receipt.timeIn && (
                <Row label="Timings" value={`${receipt.timeIn} – ${receipt.timeOut}`} />
              )}
              <Row label="Paid At"     value={receipt.paidAt} />
              <div style={{ gridColumn: "1/-1", borderTop: "1px dashed #ddd", margin: "4px 0" }} />
              <Row label="Amount Paid" value={`₹${receipt.amountPaid}`} highlight />
              <Row label="Status"      value="PAID ✅"                  highlight />
            </div>
          </div>

          {/* SMS notification panel */}
          <div style={smsPanel}>
            <div style={smsPanelHeader}>
              <span style={{ fontSize: "18px" }}>📱</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: "13px", color: "#1b5e20" }}>
                  Payment SMS — Send to {receipt.customerMobile || "customer's mobile"}
                </div>
                <div style={{ fontSize: "11px", color: "#388e3c", marginTop: "2px" }}>
                  Copy this message and send it manually via WhatsApp or SMS app
                </div>
              </div>
            </div>

            {/* SMS text box */}
            <div style={smsTextBox}>
              {receipt.smsText}
            </div>

            {/* Mobile number display */}
            {receipt.customerMobile && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
                <span style={{ fontSize: "12px", color: "#555" }}>Send to:</span>
                <span style={{ fontWeight: 700, fontSize: "13px", color: "#1e3c72", letterSpacing: "1px" }}>
                  {receipt.customerMobile}
                </span>
              </div>
            )}

            {/* Copy button */}
            <button onClick={handleCopySms} style={copyBtn}>
              {smsCopied ? "✅ Copied!" : "📋 Copy Message"}
            </button>
          </div>

          <button onClick={onClose} style={doneBtn}>Done</button>
        </div>
      </div>
    </div>
  );

  // ── Payment form ──────────────────────────────────────
  return (
    <div style={overlay}>
      <div style={modal}>

        {/* Header */}
        <div style={{ background: "linear-gradient(135deg,#1e3c72,#2a5298)", borderRadius: "14px 14px 0 0", padding: "20px 24px", color: "white" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "12px", opacity: 0.75, marginBottom: "2px" }}>Secure Payment</div>
              <div style={{ fontSize: "26px", fontWeight: 700 }}>₹{amount}</div>
            </div>
            <span style={{ fontSize: "30px" }}>💳</span>
          </div>
          <div style={{ marginTop: "8px", fontSize: "13px", opacity: 0.8 }}>
            {booking?.tokenId} · Chef {chef?.name}
          </div>
        </div>

        {/* Form */}
        <div style={{ padding: "22px", display: "flex", flexDirection: "column", gap: "14px" }}>

          {error && <div style={errBox}>{error}</div>}

          <div style={fg}>
            <label style={lbl}>Card Number</label>
            <input placeholder="1234 5678 9012 3456" value={card.number}
              onChange={handleCardNumber} maxLength={19} style={inp} />
          </div>

          <div style={fg}>
            <label style={lbl}>Cardholder Name</label>
            <input placeholder="Name on card" value={card.name}
              onChange={e => { setCard({ ...card, name: e.target.value }); setError(""); }}
              style={inp} />
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <div style={{ ...fg, flex: 1 }}>
              <label style={lbl}>Expiry</label>
              <input placeholder="MM/YY" value={card.expiry}
                onChange={handleExpiry} maxLength={5} style={inp} />
            </div>
            <div style={{ ...fg, flex: 1 }}>
              <label style={lbl}>CVV</label>
              <input placeholder="•••" type="password" value={card.cvv} maxLength={4}
                onChange={e => { setCard({ ...card, cvv: e.target.value.replace(/\D/g, "") }); setError(""); }}
                style={inp} />
            </div>
          </div>

          {/* Summary */}
          <div style={{ background: "#f0f8ff", border: "1px solid #b3d9ff", borderRadius: "10px", padding: "14px" }}>
            <SumRow label="Chef"  value={chef?.name} />
            <SumRow label="Date"  value={booking?.date} />
            {booking?.timeIn && (
              <SumRow label="Time" value={`${booking.timeIn} – ${booking.timeOut}`} />
            )}
            <div style={{ borderTop: "1px dashed #b3d9ff", marginTop: "10px", paddingTop: "10px" }}>
              <SumRow label="Total" value={`₹${amount}`} bold />
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={handlePay} style={payBtn}>🔒 Pay ₹{amount}</button>
            <button onClick={onClose}   style={cancelBtn}>Cancel</button>
          </div>

          <p style={{ fontSize: "11px", color: "#bbb", textAlign: "center", margin: 0 }}>
            🔒 Simulated payment — no real money is charged
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────
function Row({ label, value, highlight }) {
  return (
    <>
      <div style={{ fontSize: "11px", color: "#999", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: highlight ? "15px" : "13px", fontWeight: highlight ? 700 : 500, color: highlight ? "#1e3c72" : "#444" }}>
        {value}
      </div>
    </>
  );
}

function SumRow({ label, value, bold }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#1e3c72", marginBottom: "4px" }}>
      <span>{label}</span>
      <strong style={{ fontWeight: bold ? 700 : 600, fontSize: bold ? "15px" : "13px" }}>{value}</strong>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────
const overlay    = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "16px" };
const modal      = { background: "white", borderRadius: "14px", width: "100%", maxWidth: "420px", boxShadow: "0 24px 60px rgba(0,0,0,0.3)", overflow: "hidden", maxHeight: "90vh", overflowY: "auto" };
const fg         = { display: "flex", flexDirection: "column", gap: "5px" };
const lbl        = { fontSize: "11px", fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.4px" };
const inp        = { padding: "10px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "15px", outline: "none", letterSpacing: "1px", width: "100%", boxSizing: "border-box" };
const errBox     = { background: "#fff0f0", border: "1px solid #fcc", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#c00" };
const payBtn     = { flex: 1, padding: "12px", background: "linear-gradient(135deg,#1e3c72,#2a5298)", color: "white", border: "none", borderRadius: "10px", fontWeight: 700, fontSize: "15px", cursor: "pointer" };
const cancelBtn  = { padding: "12px 18px", background: "#f0f0f0", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "14px", color: "#555" };
const doneBtn    = { width: "100%", padding: "13px", background: "linear-gradient(135deg,#2e7d32,#43a047)", color: "white", border: "none", borderRadius: "10px", fontWeight: 700, fontSize: "15px", cursor: "pointer" };
const receiptBox   = { background: "#f8fbff", border: "1px solid #e0eafc", borderRadius: "12px", padding: "16px" };
const receiptTitle = { fontWeight: 700, fontSize: "14px", color: "#1e3c72", marginBottom: "12px", textAlign: "center" };
const receiptGrid  = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" };
const spinnerEl    = { width: "52px", height: "52px", border: "5px solid #e0eafc", borderTop: "5px solid #2a5298", borderRadius: "50%", animation: "spin 0.9s linear infinite", margin: "0 auto" };

// SMS panel styles
const smsPanel = {
  background: "#f1f8e9",
  border: "1px solid #aed581",
  borderRadius: "12px",
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};
const smsPanelHeader = {
  display: "flex",
  alignItems: "flex-start",
  gap: "10px",
};
const smsTextBox = {
  background: "white",
  border: "1px solid #c5e1a5",
  borderRadius: "8px",
  padding: "12px",
  fontSize: "13px",
  color: "#2e7d32",
  lineHeight: 1.6,
  fontFamily: "monospace",
  wordBreak: "break-word",
};
const copyBtn = {
  alignSelf: "flex-start",
  padding: "8px 18px",
  background: "linear-gradient(135deg,#558b2f,#7cb342)",
  color: "white",
  border: "none",
  borderRadius: "8px",
  fontWeight: 700,
  fontSize: "13px",
  cursor: "pointer",
};

export default PaymentGateway;