// src/pages/Orders.jsx
import React, { useEffect, useState, useCallback } from "react";
import { getUser } from "../services/AuthService";
import { API } from "../config";
import { Link } from "react-router";
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
function isCancelled(s) { return s === "CANCELLED"; }
function calcDuration(a, b) {
  try {
    const [h1,m1]=a.split(":").map(Number),[h2,m2]=b.split(":").map(Number);
    const mins=(h2*60+m2)-(h1*60+m1); if(mins<=0) return null;
    const h=Math.floor(mins/60),m=mins%60; return m===0?`${h} hrs`:`${h}h ${m}m`;
  } catch { return null; }
}

function Orders() {
  const [bookings,    setBookings]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [payBooking,  setPayBooking]  = useState(null);
  const [rateBooking, setRateBooking] = useState(null);
  const [ratedSet,    setRatedSet]    = useState(new Set());
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
          fetch(`${API.ratings}/booking/${b.id}/rater/${loggedUser.userId}`)
            .then(r => r.json())
            .then(d => { if (d.alreadyRated) setRatedSet(prev => new Set([...prev, b.id])); })
            .catch(() => {});
        });
      })
      .catch(() => setLoading(false));
  }, [loggedUser?.userId]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const handleCancel = async (bookingId, tokenId) => {
    if (!window.confirm(`Cancel booking ${tokenId}?`)) return;
    try {
      const res = await fetch(`${API.bookings}/${bookingId}`, { method: "DELETE", headers: { "Content-Type": "application/json" } });
      if (res.ok) setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: "CANCELLED" } : b));
      else { const t = await res.text(); let m="Could not cancel."; try{m=JSON.parse(t).error||m;}catch{m=t||m;} alert(m); }
    } catch { alert("Network error."); }
  };

  if (!loggedUser) return (<div style={pw}><div style={mb("#e3f2fd","#90caf9","#0d47a1")}><div style={is}>🔒</div><h2>Login Required</h2><Link to="/login"><button style={bp}>Go to Login</button></Link></div></div>);
  if (loggedUser.role === "chef") return (<div style={pw}><div style={mb("#fff8e1","#ffe082","#7a5c00")}><div style={is}>👨‍🍳</div><h2>Chef Dashboard</h2><Link to="/chef-orders"><button style={by}>View My Customers</button></Link></div></div>);

  return (
    <div style={{ padding:"40px 20px", maxWidth:"920px", margin:"0 auto" }}>

      {payBooking && (
        <PaymentGateway booking={payBooking} chef={payBooking.chef}
          onClose={() => setPayBooking(null)}
          onSuccess={receipt => {
            setBookings(prev => prev.map(b =>
              b.id === payBooking.id
                ? { ...b, paymentStatus:"PAID", paymentId:receipt.paymentId, amountPaid:receipt.amountPaid, status:"EXPIRED" }
                : b
            ));
            setPayBooking(null);
          }} />
      )}

      {rateBooking && (
        <RatingModal
          booking={rateBooking}
          raterId={loggedUser.userId} raterName={loggedUser.name} raterRole="customer"
          rateeId={rateBooking.chef?.id} rateeName={rateBooking.chef?.name} rateeRole="chef"
          onClose={() => setRateBooking(null)}
          onSubmitted={stars => {
            setRatedSet(prev => new Set([...prev, rateBooking.id]));
            setRateBooking(null);
            alert(`Thank you! You rated Chef ${rateBooking.chef?.name} ${stars} ⭐`);
          }} />
      )}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"6px" }}>
        <h2 style={{ fontSize:"28px", color:"#1e3c72", margin:0 }}>My Orders</h2>
        <div style={{ display:"flex", gap:"10px" }}>
          <Link to="/payments"><button style={bo}>💳 My Payments</button></Link>
          <Link to="/services"><button style={bp}>+ Book Another Chef</button></Link>
        </div>
      </div>
      <p style={{ color:"#666", marginBottom:"30px" }}>Hello, <strong>{loggedUser.name}</strong></p>

      {loading ? <p style={{ color:"#888" }}>Loading...</p>
        : bookings.length === 0 ? (
          <div style={mb("#f5faff","#e0eafc","#1e3c72")}><div style={is}>📋</div><h3>No bookings yet</h3><Link to="/services"><button style={bp}>Browse Chefs</button></Link></div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            {bookings.map(booking => {
              const cancelled   = isCancelled(booking.status);
              const expired     = isExpired(booking.date, booking.timeOut, booking.status);
              const inactive    = cancelled || expired;
              const isCOD       = booking.paymentMode === "COD";
              const isOnline    = booking.paymentMode === "ONLINE";
              const isPaid      = booking.paymentStatus === "PAID";
              const isCodPaid   = booking.paymentStatus === "COD";
              const canPay      = !inactive && isOnline && !isPaid;
              const canRate     = expired && (isPaid || isCodPaid) && !ratedSet.has(booking.id);
              const alreadyRated= ratedSet.has(booking.id);

              // Token badge colour logic
              const tokenBg = cancelled ? "#e53935"
                : isCOD   ? "linear-gradient(135deg,#2e7d32,#43a047)"     // green for COD
                : isPaid  ? "linear-gradient(135deg,#2e7d32,#43a047)"     // green for paid
                : expired ? "#9e9e9e"
                : canPay  ? "linear-gradient(135deg,#f7971e,#ffd200)"     // orange = needs payment
                : "linear-gradient(135deg,#4facfe,#00c6ff)";              // blue = normal

              const wLabel  = cancelled ? "CANCELLED" : "EXPIRED";
              const pill    = cancelled ? { color:"#c62828", background:"#ffebee" } : expired ? { color:"#757575", background:"#f5f5f5" } : { color:"#2e7d32", background:"#e8f5e9" };
              const pLabel  = cancelled ? "Cancelled" : expired ? "Expired" : booking.status;

              return (
                <div key={booking.id} style={{ position:"relative" }}>
                  <div style={{ ...card, opacity: inactive?0.82:1, filter: inactive?"grayscale(20%)":"none" }}>

                    {/* Token badge — shows COD or token ID */}
                    <div style={{ ...tokenBadge, background:tokenBg }}>
                      {isCOD ? `${booking.tokenId} · COD` : booking.tokenId}
                    </div>

                    <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:"16px", marginTop:"4px" }}>
                      <div><div style={lbl}>Chef</div><div style={val}>👨‍🍳 {booking.chef?.name||"—"}</div></div>
                      <div><div style={lbl}>Date</div><div style={val}>📅 {booking.date}</div></div>
                      {(booking.timeIn||booking.timeOut)&&(
                        <div><div style={lbl}>Timings</div><div style={val}>🕐 {booking.timeIn} → 🕔 {booking.timeOut}</div>
                          {booking.timeIn&&booking.timeOut&&calcDuration(booking.timeIn,booking.timeOut)&&<div style={{fontSize:"12px",color:"#888",marginTop:"2px"}}>{calcDuration(booking.timeIn,booking.timeOut)}</div>}
                        </div>
                      )}
                      <div><div style={lbl}>Status</div><div style={{...val,...pill,padding:"4px 12px",borderRadius:"20px",fontSize:"13px",display:"inline-block"}}>{pLabel}</div></div>

                      {/* Payment column */}
                      <div>
                        <div style={lbl}>Payment</div>
                        {isCOD ? (
                          <div style={{...val,color:"#2e7d32",background:"#e8f5e9",padding:"4px 12px",borderRadius:"20px",fontSize:"13px",display:"inline-block"}}>
                            💵 Cash on Delivery
                          </div>
                        ) : isPaid ? (
                          <div style={{...val,color:"#2e7d32",background:"#e8f5e9",padding:"4px 12px",borderRadius:"20px",fontSize:"13px",display:"inline-block"}}>
                            ✅ Paid ₹{booking.amountPaid}
                          </div>
                        ) : (
                          <div style={{...val,color:"#e65100",background:"#fff3e0",padding:"4px 12px",borderRadius:"20px",fontSize:"13px",display:"inline-block"}}>
                            ⏳ Online — Pending
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
                        {/* PAY NOW — only for ONLINE unpaid active bookings */}
                        {canPay && (
                          <button onClick={() => setPayBooking(booking)} style={payBtn}>
                            💳 Pay Now ₹{booking.chef?.pricePerDay || 0}
                          </button>
                        )}
                        {!inactive && (
                          <button onClick={() => handleCancel(booking.id, booking.tokenId)} style={cancelBtnSt}>Cancel</button>
                        )}
                        {canRate && (
                          <button onClick={() => setRateBooking(booking)} style={rateBtn}>⭐ Rate Chef</button>
                        )}
                        {alreadyRated && <div style={{fontSize:"12px",color:"#2e7d32",fontStyle:"italic"}}>✅ Rated</div>}
                        {inactive && !canRate && !alreadyRated && (
                          <div style={{fontSize:"12px",color:"#aaa",fontStyle:"italic"}}>{cancelled?"Booking cancelled":"Booking ended"}</div>
                        )}
                      </div>
                    </div>

                    {/* Payment txn strip */}
                    {isPaid && booking.paymentId && (
                      <div style={{marginTop:"12px",padding:"8px 14px",background:"#f0fff4",border:"1px solid #a5d6a7",borderRadius:"8px",fontSize:"12px",color:"#2e7d32"}}>
                        📱 Payment confirmed · Txn: {booking.paymentId}
                      </div>
                    )}
                  </div>

                  {inactive && (
                    <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",borderRadius:"14px",overflow:"hidden"}}>
                      <div style={{fontSize:"48px",fontWeight:900,color:cancelled?"rgba(200,30,30,0.13)":"rgba(120,120,120,0.18)",transform:"rotate(-20deg)",letterSpacing:"4px",userSelect:"none",whiteSpace:"nowrap"}}>{wLabel}</div>
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

const pw  = {padding:"60px 20px",maxWidth:"500px",margin:"0 auto"};
const mb  = (bg,border,color)=>({background:bg,border:`1px solid ${border}`,borderRadius:"16px",padding:"40px 30px",textAlign:"center",color});
const is  = {fontSize:"48px",marginBottom:"16px"};
const bp  = {padding:"10px 20px",background:"linear-gradient(135deg,#4facfe,#00c6ff)",color:"white",border:"none",borderRadius:"8px",fontWeight:600,cursor:"pointer",fontSize:"14px"};
const bo  = {padding:"10px 20px",background:"white",color:"#1e3c72",border:"1px solid #b3d9ff",borderRadius:"8px",fontWeight:600,cursor:"pointer",fontSize:"14px"};
const by  = {marginTop:"16px",padding:"10px 28px",background:"#ffc107",color:"#3e2000",border:"none",borderRadius:"8px",fontWeight:600,cursor:"pointer",fontSize:"15px"};
const card= {background:"#fff",border:"1px solid #e0eafc",borderRadius:"14px",padding:"20px 24px",boxShadow:"0 2px 12px rgba(0,0,0,0.06)",position:"relative"};
const tokenBadge={position:"absolute",top:"16px",right:"20px",color:"white",borderRadius:"20px",padding:"4px 14px",fontSize:"12px",fontWeight:700,letterSpacing:"0.5px",maxWidth:"200px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"};
const lbl = {fontSize:"11px",color:"#999",textTransform:"uppercase",marginBottom:"4px"};
const val = {fontSize:"15px",fontWeight:600,color:"#1e3c72"};
const payBtn     ={padding:"8px 16px",background:"linear-gradient(135deg,#f7971e,#ffd200)",color:"#3e2000",border:"none",borderRadius:"8px",cursor:"pointer",fontWeight:700,fontSize:"13px"};
const rateBtn    ={padding:"8px 16px",background:"linear-gradient(135deg,#1e3c72,#2a5298)",color:"white",border:"none",borderRadius:"8px",cursor:"pointer",fontWeight:700,fontSize:"13px"};
const cancelBtnSt={padding:"8px 16px",background:"#fff0f0",color:"#c00",border:"1px solid #fcc",borderRadius:"8px",cursor:"pointer",fontWeight:600,fontSize:"13px"};

export default Orders;