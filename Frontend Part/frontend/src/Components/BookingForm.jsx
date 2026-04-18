// src/Components/BookingForm.jsx
import React, { useState } from "react";
import { API, calcPriceBreakdown, PAYMENT } from "../config";
import PaymentGateway from "./PaymentGateway";

function BookingForm({ chef, onClose, onBooked, alreadyBooked }) {
  const [date,         setDate]         = useState("");
  const [timeIn,       setTimeIn]       = useState("");
  const [timeOut,      setTimeOut]      = useState("");
  const [paymentMode,  setPaymentMode]  = useState("");
  const [busy,         setBusy]         = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");

  // Holds the PENDING booking while PaymentGateway is open
  const [pendingBooking,  setPendingBooking]  = useState(null);
  // Shows warning if user tries to close PaymentGateway without paying
  const [showPayWarning,  setShowPayWarning]  = useState(false);

  const price = chef?.pricePerDay || 0;

  // Detect emergency: same day + timeIn within EMERGENCY_THRESHOLD_HRS from now
  const isEmergency = (() => {
    if (!date || !timeIn) return false;
    try {
      const today   = new Date().toISOString().split("T")[0];
      if (date !== today) return false;
      const now     = new Date();
      const start   = new Date(`${date}T${timeIn}:00`);
      const diffHrs = (start - now) / (1000 * 60 * 60);
      return diffHrs >= 0 && diffHrs <= PAYMENT.EMERGENCY_THRESHOLD_HRS;
    } catch { return false; }
  })();

  const breakdown = calcPriceBreakdown(price, isEmergency);

  // ── Already booked warning ────────────────────────────
  if (alreadyBooked) {
    return (
      <div style={{ ...formWrap, background: "#fff3e0", border: "1px solid #ffcc80" }}>
        <div style={{ fontSize: "22px", marginBottom: "8px" }}>⚠️</div>
        <div style={{ color: "#e65100", fontWeight: 600, fontSize: "14px", marginBottom: "4px" }}>
          You already have a booking with {chef.name}
        </div>
        <div style={{ color: "#bf360c", fontSize: "13px", marginBottom: "4px" }}>
          On {alreadyBooked.date}
          {alreadyBooked.timeIn && ` · ${alreadyBooked.timeIn} – ${alreadyBooked.timeOut}`}
        </div>
        <div style={{ fontSize: "13px", color: "#777", marginBottom: "12px" }}>
          Please cancel your existing booking first.
        </div>
        <button onClick={onClose} style={cancelBtn}>Close</button>
      </div>
    );
  }

  // ── PaymentGateway screen (ONLINE mode after booking created) ──
  if (pendingBooking) {
    return (
      <div style={{ width: "100%", position: "relative" }}>

        {/* Warning overlay if user tries to skip payment */}
        {showPayWarning && (
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
            background: "#fff3e0", border: "1px solid #ffcc80",
            borderRadius: "10px", padding: "14px 16px", margin: "0 0 10px",
          }}>
            <div style={{ fontWeight: 700, color: "#e65100", fontSize: "13px", marginBottom: "6px" }}>
              ⚠️ Booking is not confirmed yet!
            </div>
            <div style={{ fontSize: "12px", color: "#bf360c", marginBottom: "10px" }}>
              Your booking is saved as <strong>PENDING</strong> but the token will only be generated
              after you complete the advance payment. Without payment, the chef is not notified.
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setShowPayWarning(false)}
                style={{ flex: 1, padding: "8px", background: "linear-gradient(135deg,#f7971e,#ffd200)", color: "#3e2000", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}
              >
                💳 Complete Payment
              </button>
              <button
                onClick={() => {
                  // Pass pending booking to parent — user can pay later from Orders page
                  if (onBooked) onBooked(pendingBooking);
                  if (onClose)  onClose();
                }}
                style={{ padding: "8px 14px", background: "#eee", border: "none", borderRadius: "8px", fontSize: "12px", cursor: "pointer", color: "#666" }}
              >
                Pay Later
              </button>
            </div>
          </div>
        )}

        <PaymentGateway
          booking={pendingBooking}
          paymentType="ADVANCE"
          onClose={() => {
            // User clicked cancel in PaymentGateway — show warning instead of silently closing
            setShowPayWarning(true);
          }}
          onSuccess={receipt => {
            // ✅ Advance paid — token generated — booking is now CONFIRMED
            const confirmedBooking = {
              ...pendingBooking,
              tokenId:              receipt.tokenId,
              status:               "CONFIRMED",
              advancePaymentStatus: "PAID",
              advanceAmount:        receipt.amountPaid,
              advancePaymentId:     receipt.paymentId,
            };
            if (onBooked) onBooked(confirmedBooking);
            if (onClose)  onClose();
          }}
        />
      </div>
    );
  }

  // ── Date busy check ───────────────────────────────────
  const handleDateChange = async (e) => {
    const val = e.target.value;
    setDate(val); setError(""); setBusy(false);
    if (!val) return;
    try {
      const res  = await fetch(`${API.bookings}/chef/${chef.id}/busy?date=${val}`);
      const data = await res.json();
      setBusy(data.busy === true);
      if (data.busy) setError(`${chef.name} is already booked on ${val}. Choose another date.`);
    } catch { /* ignore */ }
  };

  const handleTimeOutChange = (e) => {
    const val = e.target.value;
    setTimeOut(val); setError("");
    if (timeIn && val && val <= timeIn) setError("Check-out must be after check-in.");
  };

  // ── Submit booking ────────────────────────────────────
  const handleSubmit = async () => {
    const loggedUser = JSON.parse(localStorage.getItem("chop8_user"));
    if (!loggedUser)        { setError("Please login to book."); return; }
    if (!date)              { setError("Please select a date."); return; }
    if (!timeIn)            { setError("Please select a check-in time."); return; }
    if (!timeOut)           { setError("Please select a check-out time."); return; }
    if (timeOut <= timeIn)  { setError("Check-out must be after check-in."); return; }
    if (busy)               { setError(`${chef.name} is already booked on ${date}.`); return; }
    if (!paymentMode)       { setError("Please select a payment method."); return; }

    setLoading(true); setError("");
    try {
      const res = await fetch(API.book, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date, timeIn, timeOut, paymentMode,
          chef: { id: chef.id },
          user: { id: loggedUser.userId },
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Booking failed."); return; }

      if (paymentMode === "ONLINE") {
        // Booking is PENDING — open PaymentGateway immediately
        // Token will only be generated AFTER advance payment succeeds
        setPendingBooking(data);
      } else {
        // COD — token assigned immediately, booking confirmed
        if (onBooked) onBooked(data);
        if (onClose)  onClose();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const timeInvalid = timeIn && timeOut && timeOut <= timeIn;
  const canConfirm  = !loading && !busy && !timeInvalid && paymentMode;

  // ── Booking form ──────────────────────────────────────
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

      {/* Time */}
      <div style={{ display: "flex", gap: "10px" }}>
        <div style={{ ...fg, flex: 1 }}>
          <label style={lbl}>🕐 Check-In</label>
          <input type="time" style={inp} value={timeIn}
            onChange={e => { setTimeIn(e.target.value); setError(""); }} />
        </div>
        <div style={{ ...fg, flex: 1 }}>
          <label style={lbl}>🕔 Check-Out</label>
          <input type="time" style={{ ...inp, borderColor: timeInvalid ? "#e53935" : "#ccc" }}
            value={timeOut} onChange={handleTimeOutChange} />
        </div>
      </div>

      {timeIn && timeOut && !timeInvalid && (
        <div style={badge("#e8f5e9","#a5d6a7","#2e7d32")}>✅ {calcDuration(timeIn, timeOut)} · {timeIn} – {timeOut}</div>
      )}
      {date && !busy && <div style={badge("#e8f5e9","#a5d6a7","#2e7d32")}>✅ {chef.name} is free on {date}</div>}
      {date && busy  && <div style={badge("#e3f2fd","#90caf9","#0d47a1")}>🔵 Already booked. Choose another date.</div>}

      {/* Price breakdown */}
      <div style={priceBox}>
        <div style={priceTitle}>
          💰 Price Breakdown
          {isEmergency && (
            <span style={{ marginLeft:"8px", background:"#b71c1c", color:"white", fontSize:"10px", padding:"2px 8px", borderRadius:"10px", fontWeight:700, letterSpacing:"0.5px" }}>
              🚨 EMERGENCY
            </span>
          )}
        </div>
        {isEmergency ? (
          <>
            <PRow label="Base Chef Charges"        value={`₹${breakdown.baseChef}`} />
            <PRow label={`Emergency Surcharge (×${PAYMENT.EMERGENCY_MULTIPLIER})`} value={`+₹${breakdown.surcharge}`} bold orange />
            <PRow label="Effective Chef Charges"   value={`₹${breakdown.chef}`} bold />
          </>
        ) : (
          <PRow label="Chef Charges"               value={`₹${breakdown.chef}`} />
        )}
        <PRow label="Platform Fee"                 value={`₹${breakdown.platform}`} />
        <PRow label="GST (3%)"                     value={`₹${breakdown.gst}`} small />
        <div style={priceDivider} />
        <PRow label="Total Amount"                 value={`₹${breakdown.total}`}   bold blue />
        <div style={priceDivider} />
        <PRow label="Advance Now (30%)"            value={`₹${breakdown.advance}`} bold orange />
        <PRow label="After Service (70%)"          value={`₹${breakdown.final}`}   bold green />
      </div>

      {/* Emergency warning */}
      {isEmergency && (
        <div style={{ background:"#ffebee", border:"2px solid #e53935", borderRadius:"10px", padding:"12px 14px" }}>
          <div style={{ fontWeight:700, color:"#b71c1c", fontSize:"13px", marginBottom:"4px" }}>
            🚨 Emergency Booking Detected
          </div>
          <div style={{ fontSize:"12px", color:"#c62828", lineHeight:1.5 }}>
            This booking is within <strong>{PAYMENT.EMERGENCY_THRESHOLD_HRS} hours</strong> of the start time.
            Chef charges are <strong>×{PAYMENT.EMERGENCY_MULTIPLIER}</strong> (₹{breakdown.baseChef} → ₹{breakdown.chef}).
            The token will be marked as <strong>Emergency Chef Booking</strong>.
          </div>
        </div>
      )}

      {/* Cancellation policy */}
      <div style={badge("#fff8e1","#ffe082","#7a5c00")}>
        ⚠️ Cancellation disabled {PAYMENT.CANCEL_CUTOFF_HRS} hours before booking start time.
      </div>

      {/* Payment mode selector */}
      <div style={fg}>
        <label style={lbl}>💳 Payment Method</label>
        <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>

          <button type="button" onClick={() => { setPaymentMode("COD"); setError(""); }}
            style={{ ...modeBtn, border: `2px solid ${paymentMode === "COD" ? "#2e7d32" : "#ddd"}`, background: paymentMode === "COD" ? "#e8f5e9" : "white" }}>
            <div style={{ fontSize: "18px", marginBottom: "3px" }}>💵</div>
            <div style={{ fontWeight: 700, fontSize: "12px", color: paymentMode === "COD" ? "#2e7d32" : "#333" }}>Cash on Delivery</div>
            <div style={{ fontSize: "10px", color: "#888", marginTop: "2px" }}>Full ₹{breakdown.total} in cash</div>
          </button>

          <button type="button" onClick={() => { setPaymentMode("ONLINE"); setError(""); }}
            style={{ ...modeBtn, border: `2px solid ${paymentMode === "ONLINE" ? "#1e3c72" : "#ddd"}`, background: paymentMode === "ONLINE" ? "#e3f2fd" : "white" }}>
            <div style={{ fontSize: "18px", marginBottom: "3px" }}>💳</div>
            <div style={{ fontWeight: 700, fontSize: "12px", color: paymentMode === "ONLINE" ? "#1e3c72" : "#333" }}>Online Payment</div>
            <div style={{ fontSize: "10px", color: "#888", marginTop: "2px" }}>Pay ₹{breakdown.advance} advance now</div>
          </button>

        </div>
      </div>

      {/* Mode-specific notes */}
      {paymentMode === "ONLINE" && (
        <div style={badge("#e3f2fd","#90caf9","#0d47a1")}>
          💳 Pay <strong>₹{breakdown.advance}</strong> advance now → <strong>token generated</strong> → pay <strong>₹{breakdown.final}</strong> after service.
        </div>
      )}
      {paymentMode === "COD" && (
        <div style={badge("#e8f5e9","#a5d6a7","#2e7d32")}>
          ✅ Token generated immediately. Pay <strong>₹{breakdown.total}</strong> cash when chef arrives.
        </div>
      )}

      {/* Confirm button */}
      <div style={{ display: "flex", gap: "8px" }}>
        <button onClick={handleSubmit} disabled={!canConfirm}
          style={{ flex: 1, padding: "11px", background: canConfirm ? "linear-gradient(135deg,#4facfe,#00c6ff)" : "#ccc", color: "white", border: "none", borderRadius: "8px", fontWeight: 600, cursor: canConfirm ? "pointer" : "not-allowed", fontSize: "14px" }}>
          {loading
            ? "Processing..."
            : paymentMode === "ONLINE"
            ? `Continue to Pay ₹${breakdown.advance} →`
            : paymentMode === "COD"
            ? `Confirm Booking (COD)`
            : "Confirm Booking"}
        </button>
        <button onClick={onClose} style={cancelBtn}>Cancel</button>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────
function PRow({ label, value, bold, blue, orange, green, small }) {
  const color = blue ? "#1e3c72" : orange ? "#e65100" : green ? "#2e7d32" : "#555";
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: small ? "11px" : "13px", color: bold ? color : "#666", fontWeight: bold ? 700 : 400, padding: "2px 0" }}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}
function calcDuration(a, b) {
  const [h1,m1]=a.split(":").map(Number),[h2,m2]=b.split(":").map(Number);
  const mins=(h2*60+m2)-(h1*60+m1),h=Math.floor(mins/60),m=mins%60;
  return m===0?`${h} hrs`:`${h}h ${m}m`;
}

const badge      = (bg,bdr,color)=>({background:bg,border:`1px solid ${bdr}`,borderRadius:"8px",padding:"8px 12px",fontSize:"12px",color});
const formWrap   = {width:"100%",padding:"18px",border:"1px solid #b3d9ff",borderRadius:"12px",marginTop:"12px",background:"#f0f8ff",display:"flex",flexDirection:"column",gap:"12px"};
const fg         = {display:"flex",flexDirection:"column",gap:"4px"};
const lbl        = {fontSize:"12px",color:"#555",fontWeight:500};
const inp        = {width:"100%",padding:"8px 10px",borderRadius:"8px",border:"1px solid #ccc",fontSize:"14px",boxSizing:"border-box"};
const errBox     = {color:"#c00",background:"#fff0f0",padding:"8px 12px",borderRadius:"8px",fontSize:"13px",border:"1px solid #fcc"};
const cancelBtn  = {padding:"10px 16px",background:"#eee",border:"none",borderRadius:"8px",cursor:"pointer",fontSize:"14px"};
const modeBtn    = {flex:1,padding:"12px 8px",borderRadius:"10px",cursor:"pointer",transition:"all 0.2s",textAlign:"center"};
const priceBox   = {background:"white",border:"1px solid #e0eafc",borderRadius:"10px",padding:"12px 14px",display:"flex",flexDirection:"column",gap:"3px"};
const priceTitle = {fontWeight:700,fontSize:"12px",color:"#1e3c72",marginBottom:"6px"};
const priceDivider={borderTop:"1px dashed #ddd",margin:"4px 0"};

export default BookingForm;