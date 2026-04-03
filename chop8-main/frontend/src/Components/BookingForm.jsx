// src/Components/BookingForm.jsx
import React, { useState } from "react";
import { API } from "../config";

function BookingForm({ chef, onClose, onBooked, alreadyBooked }) {
  const [date,        setDate]        = useState("");
  const [timeIn,      setTimeIn]      = useState("");
  const [timeOut,     setTimeOut]     = useState("");
  const [paymentMode, setPaymentMode] = useState(""); // "COD" | "ONLINE"
  const [busy,        setBusy]        = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");

  const price = chef?.pricePerDay || 0;

  // Already booked warning
  if (alreadyBooked) {
    return (
      <div style={{ ...formWrap, background: "#fff3e0", border: "1px solid #ffcc80" }}>
        <div style={{ fontSize: "22px", marginBottom: "8px" }}>⚠️</div>
        <div style={{ color: "#e65100", fontWeight: 600, fontSize: "14px", marginBottom: "4px" }}>
          You already have a booking with {chef.name}
        </div>
        <div style={{ color: "#bf360c", fontSize: "13px", marginBottom: "12px" }}>
          On {alreadyBooked.date}
          {alreadyBooked.timeIn && ` · ${alreadyBooked.timeIn} – ${alreadyBooked.timeOut}`}
        </div>
        <div style={{ fontSize: "13px", color: "#777", marginBottom: "12px" }}>
          Please cancel your existing booking first before booking again.
        </div>
        <button onClick={onClose} style={cancelBtn}>Close</button>
      </div>
    );
  }

  const handleDateChange = async (e) => {
    const val = e.target.value;
    setDate(val); setError(""); setBusy(false);
    if (!val) return;
    try {
      const res  = await fetch(`${API.bookings}/chef/${chef.id}/busy?date=${val}`);
      const data = await res.json();
      setBusy(data.busy === true);
      if (data.busy) setError(`${chef.name} is already booked on ${val}. Please choose a different date.`);
    } catch { /* ignore */ }
  };

  const handleTimeOutChange = (e) => {
    const val = e.target.value;
    setTimeOut(val); setError("");
    if (timeIn && val && val <= timeIn) setError("Check-out time must be after check-in time.");
  };

  const handleSubmit = async () => {
    const loggedUser = JSON.parse(localStorage.getItem("chop8_user"));
    if (!loggedUser)        { setError("Please login to book a chef."); return; }
    if (!date)              { setError("Please select a date."); return; }
    if (!timeIn)            { setError("Please select a check-in time."); return; }
    if (!timeOut)           { setError("Please select a check-out time."); return; }
    if (timeOut <= timeIn)  { setError("Check-out time must be after check-in time."); return; }
    if (busy)               { setError(`${chef.name} is already booked on ${date}.`); return; }
    if (!paymentMode)       { setError("Please select a payment method."); return; }

    setLoading(true); setError("");
    try {
      const res  = await fetch(API.book, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date, timeIn, timeOut,
          paymentMode,
          status: "PENDING",
          chef:   { id: chef.id },
          user:   { id: loggedUser.userId },
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Booking failed."); return; }
      if (onBooked) onBooked(data);
      if (onClose)  onClose();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const timeInvalid  = timeIn && timeOut && timeOut <= timeIn;
  const canConfirm   = !loading && !busy && !timeInvalid && paymentMode;

  return (
    <div style={formWrap}>
      <h4 style={{ margin: "0 0 12px", color: "#1e3c72" }}>Book {chef.name}</h4>
      {error && <div style={errBox}>{error}</div>}

      {/* Date */}
      <div style={fg}>
        <label style={lbl}>📅 Select Date</label>
        <input type="date" min={new Date().toISOString().split("T")[0]}
          style={{ ...inp, borderColor: busy ? "#e53935" : "#ccc", background: busy ? "#fff5f5" : "white" }}
          onChange={handleDateChange} />
      </div>

      {/* Time row */}
      <div style={{ display: "flex", gap: "10px" }}>
        <div style={{ ...fg, flex: 1 }}>
          <label style={lbl}>🕐 Check-In</label>
          <input type="time" style={inp} value={timeIn}
            onChange={e => { setTimeIn(e.target.value); setError(""); }} />
        </div>
        <div style={{ ...fg, flex: 1 }}>
          <label style={lbl}>🕔 Check-Out</label>
          <input type="time" style={{ ...inp, borderColor: timeInvalid ? "#e53935" : "#ccc", background: timeInvalid ? "#fff5f5" : "white" }}
            value={timeOut} onChange={handleTimeOutChange} />
        </div>
      </div>

      {/* Duration preview */}
      {timeIn && timeOut && !timeInvalid && (
        <div style={badge("#e8f5e9","#a5d6a7","#2e7d32")}>
          ✅ {calcDuration(timeIn, timeOut)} &nbsp;·&nbsp; {timeIn} – {timeOut}
        </div>
      )}
      {date && !busy && <div style={badge("#e8f5e9","#a5d6a7","#2e7d32")}>✅ {chef.name} is free on {date}</div>}
      {date && busy  && <div style={badge("#e3f2fd","#90caf9","#0d47a1")}>🔵 {chef.name} is already booked on {date}. Choose another date.</div>}

      {/* ── Payment Mode Selector ── */}
      <div style={fg}>
        <label style={lbl}>💳 Payment Method</label>
        <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>

          {/* COD option */}
          <button
            type="button"
            onClick={() => { setPaymentMode("COD"); setError(""); }}
            style={{
              flex: 1, padding: "12px 10px",
              border: `2px solid ${paymentMode === "COD" ? "#2e7d32" : "#ddd"}`,
              borderRadius: "10px",
              background: paymentMode === "COD" ? "#e8f5e9" : "white",
              cursor: "pointer",
              transition: "all 0.2s",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "22px", marginBottom: "4px" }}>💵</div>
            <div style={{ fontWeight: 700, fontSize: "13px", color: paymentMode === "COD" ? "#2e7d32" : "#333" }}>
              Cash on Delivery
            </div>
            <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>Pay when chef arrives</div>
          </button>

          {/* ONLINE option */}
          <button
            type="button"
            onClick={() => { setPaymentMode("ONLINE"); setError(""); }}
            style={{
              flex: 1, padding: "12px 10px",
              border: `2px solid ${paymentMode === "ONLINE" ? "#1e3c72" : "#ddd"}`,
              borderRadius: "10px",
              background: paymentMode === "ONLINE" ? "#e3f2fd" : "white",
              cursor: "pointer",
              transition: "all 0.2s",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "22px", marginBottom: "4px" }}>💳</div>
            <div style={{ fontWeight: 700, fontSize: "13px", color: paymentMode === "ONLINE" ? "#1e3c72" : "#333" }}>
              Online Payment
            </div>
            <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>Pay ₹{price} before expiry</div>
          </button>

        </div>
      </div>

      {/* ONLINE warning */}
      {paymentMode === "ONLINE" && (
        <div style={badge("#fff8e1","#ffe082","#7a5c00")}>
          ⚠️ You must complete online payment before check-out time. A reminder will appear 2 minutes before expiry.
        </div>
      )}

      {/* COD note */}
      {paymentMode === "COD" && (
        <div style={badge("#e8f5e9","#a5d6a7","#2e7d32")}>
          ✅ Pay ₹{price} in cash when the chef arrives. Token will show COD.
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: "flex", gap: "8px" }}>
        <button onClick={handleSubmit} disabled={!canConfirm}
          style={{ flex: 1, padding: "10px", background: canConfirm ? "linear-gradient(135deg,#4facfe,#00c6ff)" : "#ccc", color: "white", border: "none", borderRadius: "8px", fontWeight: 600, cursor: canConfirm ? "pointer" : "not-allowed", fontSize: "14px" }}>
          {loading ? "Booking..." : "Confirm Booking"}
        </button>
        <button onClick={onClose} style={cancelBtn}>Cancel</button>
      </div>
    </div>
  );
}

function calcDuration(a, b) {
  const [h1,m1] = a.split(":").map(Number), [h2,m2] = b.split(":").map(Number);
  const mins = (h2*60+m2)-(h1*60+m1), h = Math.floor(mins/60), m = mins%60;
  return m === 0 ? `${h} hrs` : `${h}h ${m}m`;
}

const badge     = (bg, border, color) => ({ background: bg, border: `1px solid ${border}`, borderRadius: "8px", padding: "8px 12px", fontSize: "13px", color });
const formWrap  = { width: "100%", padding: "18px", border: "1px solid #b3d9ff", borderRadius: "12px", marginTop: "12px", background: "#f0f8ff", display: "flex", flexDirection: "column", gap: "12px" };
const fg        = { display: "flex", flexDirection: "column", gap: "4px" };
const lbl       = { fontSize: "12px", color: "#555", fontWeight: 500 };
const inp       = { width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #ccc", fontSize: "14px", boxSizing: "border-box" };
const errBox    = { color: "#c00", background: "#fff0f0", padding: "8px 12px", borderRadius: "8px", fontSize: "13px", border: "1px solid #fcc" };
const cancelBtn = { padding: "10px 16px", background: "#eee", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px" };

export default BookingForm;