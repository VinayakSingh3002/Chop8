// src/pages/Orders.jsx
import React, { useEffect, useState, useCallback } from "react";
import { getUser } from "../services/AuthService";
import { API, PAYMENT } from "../config";import { Link } from "react-router";
import PaymentGateway from "../Components/PaymentGateway";
import RatingModal from "../Components/RatingModal";

function isExpired(date, timeOut, status) {
  if (status === "EXPIRED")   return true;
  if (status === "CANCELLED") return false;
  if (!date) return false;
  const now = new Date();
  if (timeOut) return now > new Date(`${date}T${timeOut}:00`);
  return now > new Date(`${date}T23:59:59`);
}
function calcDuration(a, b) {
  try {
    const [h1,m1]=a.split(":").map(Number),[h2,m2]=b.split(":").map(Number);
    const mins=(h2*60+m2)-(h1*60+m1); if(mins<=0) return null;
    const h=Math.floor(mins/60),m=mins%60; return m===0?`${h} hrs`:`${h}h ${m}m`;
  } catch { return null; }
}
function isLateCancelWindow(date, timeIn) {
  if (!date || !timeIn) return false;
  try {
    const start  = new Date(`${date}T${timeIn}:00`);
    const cutoff = new Date(start.getTime() - PAYMENT.CANCEL_CUTOFF_HRS*60*60*1000);
    return new Date() > cutoff;
  } catch { return false; }
}
function timeUntilLateCancelWindow(date, timeIn) {
  if (!date || !timeIn) return "";
  try {
    const start  = new Date(`${date}T${timeIn}:00`);
    const cutoff = new Date(start.getTime() - PAYMENT.CANCEL_CUTOFF_HRS*60*60*1000);
    const now    = new Date();
    if (now > cutoff) return "";
    const diffMs = cutoff - now;
    const hrs    = Math.floor(diffMs/(1000*60*60));
    const mins   = Math.floor((diffMs%(1000*60*60))/(1000*60));
    return hrs > 0 ? `Free cancel for ${hrs}h ${mins}m more` : `Free cancel for ${mins}m more`;
  } catch { return ""; }
}

// ── Penalty confirmation dialog ────────────────────────────
function PenaltyConfirmDialog({ booking, onConfirm, onDismiss }) {
  const advancePaid   = booking.advancePaymentStatus === "PAID";
  const penaltyAmount = advancePaid ? (booking.advanceAmount || 0) : 0;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:"16px" }}>
      <div style={{ background:"white", borderRadius:"16px", width:"100%", maxWidth:"420px", boxShadow:"0 24px 60px rgba(0,0,0,0.3)", overflow:"hidden" }}>
        <div style={{ background:"linear-gradient(135deg,#b71c1c,#e53935)", padding:"20px 24px", color:"white" }}>
          <div style={{ fontSize:"24px", marginBottom:"6px" }}>⚠️</div>
          <div style={{ fontSize:"18px", fontWeight:700 }}>Late Cancellation</div>
          <div style={{ fontSize:"12px", opacity:0.85, marginTop:"4px" }}>Within {PAYMENT.CANCEL_CUTOFF_HRS} hours of scheduled start time</div>
        </div>
        <div style={{ padding:"20px 24px" }}>
          <div style={{ background:"#f8f9fa", borderRadius:"10px", padding:"12px 14px", marginBottom:"16px", fontSize:"13px", color:"#444" }}>
            <div><strong>Chef:</strong> {booking.chef?.name}</div>
            <div><strong>Date:</strong> {booking.date} · {booking.timeIn} – {booking.timeOut}</div>
          </div>
          <div style={{ background:advancePaid?"#fff3e0":"#e8f5e9", border:`1px solid ${advancePaid?"#ffcc80":"#a5d6a7"}`, borderRadius:"10px", padding:"14px 16px", marginBottom:"16px" }}>
            {advancePaid ? (
              <>
                <div style={{ fontWeight:700, color:"#e65100", marginBottom:"8px", fontSize:"14px" }}>💸 Cancellation Deduction</div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:"13px", marginBottom:"4px" }}>
                  <span style={{ color:"#555" }}>Advance paid (30%)</span>
                  <span style={{ fontWeight:600, color:"#e65100" }}>₹{penaltyAmount} — Forfeited</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:"13px" }}>
                  <span style={{ color:"#555" }}>Final amount (70%)</span>
                  <span style={{ fontWeight:600, color:"#2e7d32" }}>₹{booking.finalAmount||0} — Not charged</span>
                </div>
                <div style={{ borderTop:"1px dashed #ffcc80", marginTop:"8px", paddingTop:"8px", fontSize:"12px", color:"#bf360c" }}>
                  ⚠️ Advance of <strong>₹{penaltyAmount}</strong> will NOT be refunded per cancellation policy.
                </div>
              </>
            ) : (
              <>
                <div style={{ fontWeight:700, color:"#2e7d32", marginBottom:"6px", fontSize:"14px" }}>✅ No Penalty</div>
                <div style={{ fontSize:"13px", color:"#555" }}>No advance was paid online, so no deduction applies.</div>
              </>
            )}
          </div>
          <div style={{ display:"flex", gap:"10px" }}>
            <button onClick={onConfirm} style={{ flex:1, padding:"12px", background:"linear-gradient(135deg,#b71c1c,#e53935)", color:"white", border:"none", borderRadius:"10px", fontWeight:700, fontSize:"14px", cursor:"pointer" }}>
              {advancePaid ? `Cancel & Forfeit ₹${penaltyAmount}` : "Cancel Booking (No Penalty)"}
            </button>
            <button onClick={onDismiss} style={{ padding:"12px 18px", background:"#f5f5f5", border:"none", borderRadius:"10px", cursor:"pointer", fontSize:"14px", color:"#555" }}>
              Keep Booking
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
function Orders() {
  const [bookings,      setBookings]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [payBooking,    setPayBooking]    = useState(null);
  const [paymentType,   setPaymentType]   = useState("ADVANCE");
  const [rateBooking,   setRateBooking]   = useState(null);
  const [ratedSet,      setRatedSet]      = useState(new Set());
  const [penaltyDialog, setPenaltyDialog] = useState(null);
  const loggedUser = getUser();

  const fetchBookings = useCallback(() => {
    if (!loggedUser || loggedUser.role !== "customer") { setLoading(false); return; }
    fetch(`${API.bookings}/user/${loggedUser.userId}`)
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setBookings(list);
        setLoading(false);
        list.forEach(b => {
          fetch(`${API.ratings}/booking/${b.id}/rater/${loggedUser.userId}?role=customer`)
            .then(r => r.json())
            .then(d => { if (d.alreadyRated) setRatedSet(prev => new Set([...prev, b.id])); })
            .catch(() => {});
        });
      })
      .catch(() => setLoading(false));
  }, [loggedUser?.userId]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  // ── Refetch a single booking from backend by its ID ───
  // Called after payment success to get the REAL DB state
  // instead of guessing local state spread.
  const refetchBooking = useCallback(async (bookingId) => {
    try {
      const res  = await fetch(`${API.bookings}/user/${loggedUser.userId}`);
      const list = await res.json();
      if (!Array.isArray(list)) return;
      const updated = list.find(b => b.id === bookingId);
      if (updated) {
        setBookings(prev => prev.map(b => b.id === bookingId ? updated : b));
      }
    } catch { /* ignore — stale state is better than crash */ }
  }, [loggedUser?.userId]);

  const handleCancelClick = (booking) => {
    const lateWindow = isLateCancelWindow(booking.date, booking.timeIn);
    if (lateWindow && booking.status !== "PENDING") {
      setPenaltyDialog(booking);
    } else {
      executeCancellation(booking.id);
    }
  };

  const executeCancellation = async (bookingId) => {
    setPenaltyDialog(null);
    try {
      const res  = await fetch(`${API.bookings}/${bookingId}`, { method:"DELETE", headers:{"Content-Type":"application/json"} });
      const data = await res.json();
      if (res.ok) {
        setBookings(prev => prev.map(b => b.id === bookingId ? {
          ...b,
          status:              "CANCELLED",
          cancellationPenalty: data.cancellationPenalty || 0,
          cancellationNote:    data.cancellationNote    || "",
        } : b));
      } else {
        alert(data.error || "Could not cancel.");
      }
    } catch { alert("Network error."); }
  };

  const openPayment = (booking, type) => { setPaymentType(type); setPayBooking(booking); };

  if (!loggedUser) return (<div style={pw}><div style={mb("#e3f2fd","#90caf9","#0d47a1")}><div style={is}>🔒</div><h2>Login Required</h2><Link to="/login"><button style={bp}>Go to Login</button></Link></div></div>);
  if (loggedUser.role === "chef") return (<div style={pw}><div style={mb("#fff8e1","#ffe082","#7a5c00")}><div style={is}>👨‍🍳</div><h2>Chef Dashboard</h2><Link to="/chef-orders"><button style={by}>My Bookings</button></Link></div></div>);

  return (
    <div style={{ padding:"40px 20px", maxWidth:"920px", margin:"0 auto" }}>

      {penaltyDialog && (
        <PenaltyConfirmDialog
          booking={penaltyDialog}
          onConfirm={() => executeCancellation(penaltyDialog.id)}
          onDismiss={() => setPenaltyDialog(null)}
        />
      )}

      {payBooking && (
        <PaymentGateway
          booking={payBooking}
          paymentType={paymentType}
          onClose={() => setPayBooking(null)}
          onSuccess={async (receipt) => {
            // ✅ KEY FIX: Refetch from backend instead of spreading local state.
            // This guarantees we get the real tokenId and status=CONFIRMED
            // that the backend just saved, eliminating the stale-state bug.
            setPayBooking(null);
            await refetchBooking(payBooking.id);
          }}
        />
      )}

      {rateBooking && (
        <RatingModal
          booking={rateBooking}
          raterId={loggedUser.userId} raterName={loggedUser.name} raterRole="customer"
          rateeId={rateBooking.chef?.id} rateeName={rateBooking.chef?.name} rateeRole="chef"
          onClose={() => setRateBooking(null)}
          onSubmitted={() => { setRatedSet(prev => new Set([...prev, rateBooking.id])); setRateBooking(null); }}
        />
      )}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"6px" }}>
        <h2 style={{ fontSize:"28px", color:"#1e3c72", margin:0 }}>My Orders</h2>
        <div style={{ display:"flex", gap:"10px" }}>
          <Link to="/payments"><button style={bo}>💳 My Payments</button></Link>
          <Link to="/services"><button style={bp}>+ Book Chef</button></Link>
        </div>
      </div>
      <p style={{ color:"#666", marginBottom:"24px" }}>Hello, <strong>{loggedUser.name}</strong></p>

      {loading ? <p style={{ color:"#888" }}>Loading...</p>
        : bookings.length === 0 ? (
          <div style={mb("#f5faff","#e0eafc","#1e3c72")}><div style={is}>📋</div><h3>No bookings yet</h3><Link to="/services"><button style={bp}>Browse Chefs</button></Link></div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:"20px" }}>
            {bookings.map(booking => {
              // isPending: only truly pending if status=PENDING AND advance not yet paid
              // If advance is paid but status didn't update (stale DB state), treat as CONFIRMED
              const advancePaidAlready = booking.advancePaymentStatus === "PAID";
              const isPending   = booking.status === "PENDING" && !advancePaidAlready;
              const isCancelled = booking.status === "CANCELLED";
              const expired     = isExpired(booking.date, booking.timeOut, booking.status);
              const inactive    = isCancelled || expired;
              const isCOD       = booking.paymentMode === "COD";
              const advancePaid = advancePaidAlready;
              const finalPaid   = booking.finalPaymentStatus === "PAID" || booking.paymentStatus === "PAID";
              const lateWindow  = !inactive && !isPending && isLateCancelWindow(booking.date, booking.timeIn);
              const freeTimeMsg = timeUntilLateCancelWindow(booking.date, booking.timeIn);
              const hasPenalty  = booking.cancellationPenalty > 0;
              const canRate     = expired && (finalPaid || isCOD) && !ratedSet.has(booking.id);
              const alreadyRated= ratedSet.has(booking.id);

              // Token badge — isPending means no tokenId yet
              const isEmergency = booking.isEmergency === true;
              const emergencyPrefix = isEmergency ? "🚨 Emergency · " : "";
              const tokenDisplay = isPending
                ? { text:"PAYMENT PENDING",                                         bg:"linear-gradient(135deg,#e53935,#ef5350)" }
                : isCancelled
                ? { text:"CANCELLED",                                                bg:"#e53935" }
                : !advancePaid && !isCOD
                ? { text:"PAY TO CONFIRM",                                           bg:"linear-gradient(135deg,#f7971e,#ffd200)", color:"#3e2000" }
                : expired
                ? { text:`${emergencyPrefix}${booking.tokenId||"—"}`,               bg: isEmergency?"linear-gradient(135deg,#b71c1c,#e53935)":"#9e9e9e" }
                : finalPaid
                ? { text:`${emergencyPrefix}${booking.tokenId}`,                    bg: isEmergency?"linear-gradient(135deg,#b71c1c,#e53935)":"linear-gradient(135deg,#2e7d32,#43a047)" }
                : advancePaid
                ? { text:`${emergencyPrefix}${booking.tokenId} · Adv Paid`,         bg: isEmergency?"linear-gradient(135deg,#b71c1c,#e53935)":"linear-gradient(135deg,#f7971e,#ffd200)", color: isEmergency?"white":"#3e2000" }
                : isCOD
                ? { text:`${emergencyPrefix}${booking.tokenId} · COD`,              bg: isEmergency?"linear-gradient(135deg,#b71c1c,#e53935)":"linear-gradient(135deg,#2e7d32,#43a047)" }
                : { text:`${emergencyPrefix}${booking.tokenId}`,                    bg: isEmergency?"linear-gradient(135deg,#b71c1c,#e53935)":"linear-gradient(135deg,#4facfe,#00c6ff)" };

              return (
                <div key={booking.id} style={{ position:"relative" }}>

                  {/* PENDING banner — only shown when status is truly PENDING */}
                  {isPending && (
                    <div style={{ background:"linear-gradient(135deg,#fff3e0,#ffe0b2)", border:"2px solid #ff9800", borderRadius:"14px 14px 0 0", padding:"14px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"10px" }}>
                      <div>
                        <div style={{ fontWeight:700, color:"#e65100", fontSize:"14px" }}>⏳ Awaiting Advance Payment</div>
                        <div style={{ fontSize:"12px", color:"#bf360c", marginTop:"2px" }}>Token not generated yet. Pay ₹{booking.advanceAmount||0} advance to confirm.</div>
                      </div>
                      <button onClick={() => openPayment(booking, "ADVANCE")} style={{ padding:"10px 20px", background:"linear-gradient(135deg,#f7971e,#ffd200)", color:"#3e2000", border:"none", borderRadius:"8px", fontWeight:700, fontSize:"14px", cursor:"pointer", whiteSpace:"nowrap" }}>
                        💳 Pay ₹{booking.advanceAmount||0} → Get Token
                      </button>
                    </div>
                  )}

                  {/* Late cancel warning banner */}
                  {lateWindow && (
                    <div style={{ background:"#fff8e1", border:"1px solid #ffcc80", borderTopLeftRadius:"14px", borderTopRightRadius:"14px", padding:"10px 20px", display:"flex", alignItems:"center", gap:"8px", fontSize:"12px", color:"#e65100" }}>
                      <span style={{ fontSize:"16px" }}>⏰</span>
                      <span><strong>Late cancellation window</strong> — within {PAYMENT.CANCEL_CUTOFF_HRS} hours of start.{advancePaid?` Cancelling will forfeit ₹${booking.advanceAmount||0} advance.`:" No advance penalty."}</span>
                    </div>
                  )}

                  <div style={{ ...card, borderRadius:(isPending||lateWindow)?"0 0 14px 14px":"14px", borderTop:(isPending||lateWindow)?"none":undefined, opacity:inactive?0.82:1, filter:inactive?"grayscale(20%)":"none" }}>

                    {/* Token badge */}
                    <div style={{ position:"absolute", top:"16px", right:"20px", background:tokenDisplay.bg, color:tokenDisplay.color||"white", borderRadius:"20px", padding:"4px 14px", fontSize:"11px", fontWeight:700, letterSpacing:"0.5px", maxWidth:"200px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {tokenDisplay.text}
                    </div>

                    {/* Info */}
                    <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:"14px", marginTop:"4px" }}>
                      <div><div style={lbl}>Chef</div><div style={val}>👨‍🍳 {booking.chef?.name||"—"}</div></div>
                      <div><div style={lbl}>Date</div><div style={val}>📅 {booking.date}</div></div>
                      {(booking.timeIn||booking.timeOut)&&(
                        <div><div style={lbl}>Timings</div><div style={val}>🕐 {booking.timeIn} → 🕔 {booking.timeOut}</div>
                          {booking.timeIn&&booking.timeOut&&calcDuration(booking.timeIn,booking.timeOut)&&<div style={{fontSize:"11px",color:"#888"}}>{calcDuration(booking.timeIn,booking.timeOut)}</div>}
                        </div>
                      )}
                      <div><div style={lbl}>Status</div>
                        <div style={{...val,padding:"4px 12px",borderRadius:"20px",fontSize:"13px",display:"inline-block",...(isPending?{color:"#e65100",background:"#fff3e0"}:isCancelled?{color:"#c62828",background:"#ffebee"}:expired?{color:"#757575",background:"#f5f5f5"}:{color:"#2e7d32",background:"#e8f5e9"})}}>
                          {isPending?"Pending Payment":isCancelled?"Cancelled":expired?"Expired":"Confirmed"}
                        </div>
                      </div>
                    </div>

                    {/* Price summary */}
                    {booking.totalAmount > 0 && (
                      <div style={{ marginTop:"12px", background:"#f8fbff", border:`1px solid ${booking.isEmergency?"#ef9a9a":"#e0eafc"}`, borderRadius:"10px", padding:"12px 14px" }}>
                        <div style={{ fontSize:"11px", fontWeight:700, color:"#555", textTransform:"uppercase", marginBottom:"8px", letterSpacing:"0.5px", display:"flex", alignItems:"center", gap:"6px" }}>
                          💰 Payment Summary
                          {booking.isEmergency && <span style={{ background:"#b71c1c", color:"white", fontSize:"10px", padding:"1px 7px", borderRadius:"10px", fontWeight:700 }}>🚨 Emergency</span>}
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"8px" }}>
                          <AmtCell label="Chef"        value={`₹${booking.chefAmount||0}`} />
                          <AmtCell label="Platform"    value={`₹${booking.platformCharge||0}`} />
                          <AmtCell label="GST (3%)"    value={`₹${booking.gstAmount||0}`} />
                          {booking.isEmergency && booking.emergencySurcharge > 0 && (
                            <AmtCell label="⚡ Surcharge" value={`+₹${booking.emergencySurcharge}`} bold orange />
                          )}
                          <AmtCell label="Total"       value={`₹${booking.totalAmount||0}`}   bold blue />
                          <AmtCell label="Advance 30%" value={`₹${booking.advanceAmount||0}`} bold orange />
                          <AmtCell label="Final 70%"   value={`₹${booking.finalAmount||0}`}   bold green />
                        </div>
                      </div>
                    )}

                    {/* Cancellation note */}
                    {isCancelled && hasPenalty && (
                      <div style={{ marginTop:"10px", background:"#fff3e0", border:"1px solid #ffcc80", borderRadius:"8px", padding:"10px 14px" }}>
                        <div style={{ fontWeight:700, color:"#e65100", fontSize:"12px", marginBottom:"3px" }}>💸 Cancellation Penalty Applied</div>
                        <div style={{ fontSize:"12px", color:"#bf360c" }}>₹{booking.cancellationPenalty} advance forfeited (late cancel within {PAYMENT.CANCEL_CUTOFF_HRS}h)</div>
                        {booking.cancellationNote && <div style={{ fontSize:"11px", color:"#888", marginTop:"4px" }}>{booking.cancellationNote}</div>}
                      </div>
                    )}
                    {isCancelled && !hasPenalty && booking.cancellationNote && (
                      <div style={{ marginTop:"10px", background:"#e8f5e9", border:"1px solid #a5d6a7", borderRadius:"8px", padding:"10px 14px", fontSize:"12px", color:"#2e7d32" }}>
                        ✅ {booking.cancellationNote}
                      </div>
                    )}

                    {/* Payment pills */}
                    <div style={{ marginTop:"10px", display:"flex", gap:"8px", flexWrap:"wrap" }}>
                      {isCOD ? (
                        <SPill icon="💵" label="Cash on Delivery" color="#2e7d32" bg="#e8f5e9" />
                      ) : (
                        <>
                          <SPill icon={advancePaid?"✅":"⏳"} label={advancePaid?`Advance Paid ₹${booking.advanceAmount||0}`:`Advance ₹${booking.advanceAmount||0} Pending`} color={advancePaid?"#2e7d32":"#e65100"} bg={advancePaid?"#e8f5e9":"#fff3e0"} />
                          {advancePaid && <SPill icon={finalPaid?"✅":"⏳"} label={finalPaid?`Final Paid ₹${booking.finalAmount||0}`:`Final ₹${booking.finalAmount||0} Pending`} color={finalPaid?"#2e7d32":"#888"} bg={finalPaid?"#e8f5e9":"#f5f5f5"} />}
                        </>
                      )}
                    </div>

                    {/* Buttons */}
                    <div style={{ marginTop:"12px", display:"flex", gap:"8px", flexWrap:"wrap", alignItems:"flex-start" }}>
                      {!inactive && !isPending && !isCOD && advancePaid && !finalPaid && (
                        <button onClick={() => openPayment(booking, "FINAL")} style={finalBtn}>💳 Pay Final ₹{booking.finalAmount||0}</button>
                      )}
                      {!inactive && !isPending && (
                        <div style={{ display:"flex", flexDirection:"column", gap:"3px" }}>
                          <button onClick={() => handleCancelClick(booking)} style={{ ...cancelBtnSt, background:lateWindow?"#fff8e1":"#fff0f0", color:lateWindow?"#e65100":"#c00", border:`1px solid ${lateWindow?"#ffcc80":"#fcc"}` }}>
                            {lateWindow ? "⚠️ Cancel (Penalty Applies)" : "Cancel Booking"}
                          </button>
                          {freeTimeMsg && !lateWindow && <span style={{ fontSize:"10px", color:"#2e7d32" }}>✅ {freeTimeMsg}</span>}
                        </div>
                      )}
                      {isPending && (
                        <button onClick={() => executeCancellation(booking.id)} style={{ ...cancelBtnSt, fontSize:"12px" }}>Cancel Booking</button>
                      )}
                      {canRate && (
                        <button
                          onClick={async () => {
                            // Live DB check before opening modal — prevents showing
                            // the modal if RatingPoller already triggered a rating
                            try {
                              const r = await fetch(`${API.ratings}/booking/${booking.id}/rater/${loggedUser.userId}?role=customer`);
                              const d = await r.json();
                              if (d.alreadyRated) {
                                // Mark as rated locally so button disappears
                                setRatedSet(prev => new Set([...prev, booking.id]));
                                return;
                              }
                            } catch { /* proceed — modal handles it */ }
                            setRateBooking(booking);
                          }}
                          style={rateBtn}
                        >
                          ⭐ Rate Chef
                        </button>
                      )}
                      {alreadyRated && <div style={{ fontSize:"12px", color:"#2e7d32", fontStyle:"italic", display:"flex", alignItems:"center", gap:"4px" }}>✅ You rated this chef</div>}
                      {inactive && !isPending && !canRate && !alreadyRated && <div style={{ fontSize:"12px", color:"#aaa", fontStyle:"italic" }}>{isCancelled?"Booking cancelled":"Booking ended"}</div>}
                    </div>

                    {/* Txn IDs + download receipt */}
                    {(booking.advancePaymentId||booking.finalPaymentId) && (
                      <div style={{ marginTop:"10px", padding:"8px 12px", background:"#f0fff4", border:"1px solid #a5d6a7", borderRadius:"8px", fontSize:"11px", color:"#2e7d32", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"8px" }}>
                        <div>
                          {booking.advancePaymentId && <div>Advance Txn: {booking.advancePaymentId}</div>}
                          {booking.finalPaymentId   && <div>Final Txn:   {booking.finalPaymentId}</div>}
                        </div>
                        <a href={`${API.receipt}/${booking.id}`} download={`Chop8_Receipt_${booking.tokenId||booking.id}.txt`} style={{ textDecoration:"none" }}>
                          <button style={{ padding:"5px 12px", background:"linear-gradient(135deg,#1e3c72,#2a5298)", color:"white", border:"none", borderRadius:"6px", fontSize:"11px", fontWeight:600, cursor:"pointer" }}>
                            ⬇️ Receipt
                          </button>
                        </a>
                      </div>
                    )}
                  </div>

                  {inactive && !isPending && (
                    <div style={{ position:"absolute", top:0, left:0, right:0, bottom:0, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none", borderRadius:"14px", overflow:"hidden" }}>
                      <div style={{ fontSize:"48px", fontWeight:900, color:isCancelled?"rgba(200,30,30,0.13)":"rgba(120,120,120,0.18)", transform:"rotate(-20deg)", letterSpacing:"4px", userSelect:"none", whiteSpace:"nowrap" }}>
                        {isCancelled?"CANCELLED":"EXPIRED"}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}

function AmtCell({ label, value, bold, blue, orange, green }) {
  const color = blue?"#1e3c72":orange?"#e65100":green?"#2e7d32":"#555";
  return (
    <div style={{ textAlign:"center", padding:"6px 4px", background:bold?"white":"transparent", borderRadius:"6px", border:bold?"1px solid #e0eafc":"none" }}>
      <div style={{ fontSize:"10px", color:"#999", textTransform:"uppercase", marginBottom:"3px" }}>{label}</div>
      <div style={{ fontSize:bold?"14px":"12px", fontWeight:bold?700:400, color }}>{value}</div>
    </div>
  );
}
function SPill({ icon, label, color, bg }) {
  return (
    <div style={{ display:"inline-flex", alignItems:"center", gap:"5px", padding:"4px 12px", background:bg, borderRadius:"20px", fontSize:"12px", fontWeight:600, color }}>
      {icon} {label}
    </div>
  );
}

const pw  = { padding:"60px 20px", maxWidth:"500px", margin:"0 auto" };
const mb  = (bg,bdr,color) => ({ background:bg, border:`1px solid ${bdr}`, borderRadius:"16px", padding:"40px 30px", textAlign:"center", color });
const is  = { fontSize:"48px", marginBottom:"16px" };
const bp  = { padding:"10px 20px", background:"linear-gradient(135deg,#4facfe,#00c6ff)", color:"white", border:"none", borderRadius:"8px", fontWeight:600, cursor:"pointer", fontSize:"14px" };
const bo  = { padding:"10px 20px", background:"white", color:"#1e3c72", border:"1px solid #b3d9ff", borderRadius:"8px", fontWeight:600, cursor:"pointer", fontSize:"14px" };
const by  = { marginTop:"16px", padding:"10px 28px", background:"#ffc107", color:"#3e2000", border:"none", borderRadius:"8px", fontWeight:600, cursor:"pointer", fontSize:"15px" };
const card= { background:"#fff", border:"1px solid #e0eafc", padding:"20px 24px", boxShadow:"0 2px 12px rgba(0,0,0,0.06)", position:"relative" };
const lbl = { fontSize:"11px", color:"#999", textTransform:"uppercase", marginBottom:"4px" };
const val = { fontSize:"15px", fontWeight:600, color:"#1e3c72" };
const finalBtn    = { padding:"8px 14px", background:"linear-gradient(135deg,#2e7d32,#43a047)", color:"white", border:"none", borderRadius:"8px", cursor:"pointer", fontWeight:700, fontSize:"12px" };
const rateBtn     = { padding:"8px 14px", background:"linear-gradient(135deg,#1e3c72,#2a5298)", color:"white", border:"none", borderRadius:"8px", cursor:"pointer", fontWeight:700, fontSize:"12px" };
const cancelBtnSt = { padding:"8px 14px", background:"#fff0f0", color:"#c00", border:"1px solid #fcc", borderRadius:"8px", cursor:"pointer", fontWeight:600, fontSize:"12px" };

export default Orders;