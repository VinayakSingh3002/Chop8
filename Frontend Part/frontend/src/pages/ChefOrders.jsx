// src/pages/ChefOrders.jsx
import React, { useEffect, useState, useCallback } from "react";
import { getUser } from "../services/AuthService";
import { API } from "../config";
import { Link } from "react-router";
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

// ── Payment status badge ────────────────────────────────
function PayBadge({ label, status, amount }) {
  const isPaid = status === "PAID";
  const isCOD  = status === "COD";
  const bg     = isPaid||isCOD ? "#e8f5e9" : "#fff3e0";
  const color  = isPaid||isCOD ? "#2e7d32" : "#e65100";
  const icon   = isPaid ? "✅" : isCOD ? "💵" : "⏳";
  const text   = isPaid ? `Paid ₹${amount||0}` : isCOD ? "COD" : "Pending";
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"3px" }}>
      <div style={{ fontSize:"10px", color:"#999", textTransform:"uppercase", fontWeight:600, letterSpacing:"0.4px" }}>{label}</div>
      <div style={{ display:"inline-flex", alignItems:"center", gap:"4px", padding:"4px 10px", background:bg, borderRadius:"20px", fontSize:"12px", fontWeight:600, color, width:"fit-content" }}>
        {icon} {text}
      </div>
    </div>
  );
}

function ChefOrders() {
  const [bookings,      setBookings]      = useState([]);
  const [available,     setAvailable]     = useState(false);
  const [toggling,      setToggling]      = useState(false);
  const [loading,       setLoading]       = useState(true);
  // rateData holds { booking, rateeId, rateeName } — rateeId fetched safely from API
  const [rateData,      setRateData]      = useState(null);
  const [ratedSet,      setRatedSet]      = useState(new Set());
  const loggedUser = getUser();

  const fetchData = useCallback(() => {
    if (!loggedUser || loggedUser.role !== "chef") { setLoading(false); return; }
    Promise.all([
      fetch(`${API.bookings}/chef/${loggedUser.userId}`).then(r => r.json()),
      fetch(`${API.chefs}`).then(r => r.json()),
    ]).then(([bookingsData, chefsData]) => {
      const list = Array.isArray(bookingsData) ? bookingsData : [];
      setBookings(list);
      if (Array.isArray(chefsData)) {
        const me = chefsData.find(c => c.id === loggedUser.userId);
        if (me) setAvailable(me.available ?? false);
      }
      setLoading(false);
      // Check which bookings the chef has already rated
      list.forEach(b => {
        fetch(`${API.ratings}/booking/${b.id}/rater/${loggedUser.userId}?role=chef`)
          .then(r => r.json())
          .then(d => { if (d.alreadyRated) setRatedSet(prev => new Set([...prev, b.id])); })
          .catch(() => {});
      });
    }).catch(() => setLoading(false));
  }, [loggedUser?.userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleAvailability = async () => {
    setToggling(true);
    try {
      const res  = await fetch(`${API.chefs}/${loggedUser.userId}/toggle-availability`, { method:"PUT" });
      const data = await res.json();
      if (res.ok) setAvailable(data.available);
    } finally { setToggling(false); }
  };

  // ── Open rate modal safely ────────────────────────────
  // Uses /customer-rated API to get customerId safely,
  // avoiding b.user.id which may be null due to large photo field.
  const openRateModal = async (b) => {
    // Step 1: Check if chef already rated this booking
    try {
      const cr = await fetch(`${API.ratings}/booking/${b.id}/rater/${loggedUser.userId}?role=chef`);
      const cd = await cr.json();
      if (cd.alreadyRated) {
        setRatedSet(prev => new Set([...prev, b.id]));
        return; // already rated — do not open modal
      }
    } catch { /* proceed */ }

    // Step 2: Get customer ID safely from dedicated endpoint
    let rateeId   = b.user?.id;     // try direct first
    let rateeName = b.user?.name || "Customer";

    try {
      const r    = await fetch(`${API.ratings}/booking/${b.id}/customer-rated`);
      const data = await r.json();
      // Always use API-provided IDs — more reliable than b.user.id
      if (data.customerId) {
        rateeId   = data.customerId;
        rateeName = data.customerName || "Customer";
      }
    } catch { /* fallback to b.user.id already set above */ }

    if (!rateeId) {
      alert("Could not load customer details. Please refresh the page and try again.");
      return;
    }

    setRateData({ booking: b, rateeId, rateeName });
  };

  if (!loggedUser) return (<div style={pw}><div style={msgBox("#e3f2fd","#90caf9","#0d47a1")}><div style={is}>🔒</div><h2>Login Required</h2><Link to="/login"><button style={bp}>Login</button></Link></div></div>);
  if (loggedUser.role !== "chef") return (<div style={pw}><div style={msgBox("#fff8e1","#ffe082","#7a5c00")}><div style={is}>👤</div><h2>Chefs Only</h2><Link to="/orders"><button style={bp}>My Orders</button></Link></div></div>);

  const active    = bookings.filter(b => b.status === "CONFIRMED" || b.status === "PENDING");
  const cancelled = bookings.filter(b => b.status === "CANCELLED");
  const past      = bookings.filter(b => b.status === "EXPIRED");

  return (
    <div style={{ padding:"40px 20px", maxWidth:"960px", margin:"0 auto" }}>

      {/* Rating modal — rateeId always comes from openRateModal, never from b.user.id directly */}
      {rateData && (
        <RatingModal
          booking={rateData.booking}
          raterId={loggedUser.userId}
          raterName={loggedUser.name}
          raterRole="chef"
          rateeId={rateData.rateeId}
          rateeName={rateData.rateeName}
          rateeRole="customer"
          onClose={() => setRateData(null)}
          onSubmitted={() => {
            setRatedSet(prev => new Set([...prev, rateData.booking.id]));
            setRateData(null);
          }}
        />
      )}

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"28px", flexWrap:"wrap", gap:"12px" }}>
        <h2 style={{ fontSize:"28px", color:"#1e3c72", margin:0 }}>Chef Dashboard</h2>
        <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
          <div style={{ fontSize:"13px", color:"#666" }}>
            Status: <strong style={{ color:available?"#2e7d32":"#c62828" }}>{available?"🟢 Available":"🔴 Unavailable"}</strong>
          </div>
          <button onClick={toggleAvailability} disabled={toggling} style={{ padding:"10px 20px", background:available?"linear-gradient(135deg,#e53935,#b71c1c)":"linear-gradient(135deg,#2e7d32,#43a047)", color:"white", border:"none", borderRadius:"8px", fontWeight:600, cursor:toggling?"not-allowed":"pointer", fontSize:"14px" }}>
            {toggling?"Updating...":available?"Go Unavailable":"Go Available"}
          </button>
        </div>
      </div>

      {loading ? <p style={{ color:"#888" }}>Loading...</p> : (
        <>
          {/* ── Active ── */}
          <Section title={`Active Bookings (${active.length})`} color="#1e3c72">
            {active.length === 0
              ? <EmptyMsg>No active bookings right now.</EmptyMsg>
              : active.map(b => {
                  const isPending   = b.status === "PENDING";
                  const isCOD       = b.paymentMode === "COD";
                  const advStatus   = b.advancePaymentStatus;
                  const advPaid     = advStatus === "PAID";
                  const isEmergency = b.isEmergency === true;
                  const tokenBg     = isEmergency
                    ? "linear-gradient(135deg,#b71c1c,#e53935)"
                    : isPending
                    ? "linear-gradient(135deg,#e53935,#ef5350)"
                    : isCOD
                    ? "linear-gradient(135deg,#2e7d32,#43a047)"
                    : advPaid
                    ? "linear-gradient(135deg,#f7971e,#ffd200)"
                    : "linear-gradient(135deg,#4facfe,#00c6ff)";
                  const tokenText   = isPending
                    ? "PAYMENT PENDING"
                    : isEmergency
                    ? `🚨 Emergency · ${isCOD ? b.tokenId + " · COD" : b.tokenId || "—"}`
                    : isCOD
                    ? `${b.tokenId} · COD`
                    : b.tokenId || "—";

                  return (
                    <div key={b.id} style={card}>
                      <div style={{ ...tokenBadge, background:tokenBg, color:"white" }}>
                        {tokenText}
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:"16px" }}>
                        <div>
                          <div style={lbl}>Customer</div>
                          <div style={val}>👤 {b.user?.name||"—"}</div>
                          <div style={sub}>{b.user?.email||""}</div>
                          <div style={sub}>{b.user?.mobile||""}</div>
                        </div>
                        <div><div style={lbl}>Date</div><div style={val}>📅 {b.date}</div></div>
                        {(b.timeIn||b.timeOut)&&(
                          <div>
                            <div style={lbl}>Timings</div>
                            <div style={val}>🕐 {b.timeIn||"—"} → 🕔 {b.timeOut||"—"}</div>
                            {b.timeIn&&b.timeOut&&calcDuration(b.timeIn,b.timeOut)&&<div style={sub}>{calcDuration(b.timeIn,b.timeOut)}</div>}
                          </div>
                        )}
                        <div>
                          <div style={lbl}>Status</div>
                          <div style={{...val,padding:"4px 12px",borderRadius:"20px",fontSize:"13px",display:"inline-block",...(isPending?{color:"#e65100",background:"#fff3e0"}:{color:"#2e7d32",background:"#e8f5e9"})}}>
                            {isPending?"Awaiting Payment":"Confirmed"}
                          </div>
                        </div>
                        {isCOD ? (
                          <PayBadge label="Full Payment" status="COD" amount={b.totalAmount} />
                        ) : (
                          <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                            <PayBadge label="Advance (30%)" status={advStatus}              amount={b.advanceAmount} />
                            <PayBadge label="Final (70%)"   status={b.finalPaymentStatus}   amount={b.finalAmount} />
                          </div>
                        )}
                      </div>
                      {b.totalAmount > 0 && (
                        <div style={{ marginTop:"12px", display:"flex", gap:"12px", flexWrap:"wrap", padding:"10px 14px", background:"#f8fbff", border:`1px solid ${isEmergency?"#ef9a9a":"#e0eafc"}`, borderRadius:"8px", alignItems:"center" }}>
                          {isEmergency && <span style={{ background:"#b71c1c", color:"white", fontSize:"10px", padding:"2px 8px", borderRadius:"10px", fontWeight:700 }}>🚨 Emergency ×1.5</span>}
                          <PriceChip label="Chef"     value={`₹${b.chefAmount||0}`} />
                          <PriceChip label="Platform" value={`₹${b.platformCharge||0}`} />
                          <PriceChip label="GST"      value={`₹${b.gstAmount||0}`} />
                          {isEmergency && b.emergencySurcharge > 0 &&
                            <PriceChip label="⚡ Surcharge" value={`+₹${b.emergencySurcharge}`} bold />}
                          <PriceChip label="Total"    value={`₹${b.totalAmount||0}`} bold />
                        </div>
                      )}
                    </div>
                  );
              })}
          </Section>

          {/* ── Cancelled ── */}
          <Section title={`Cancelled Bookings (${cancelled.length})`} color="#c62828">
            {cancelled.length === 0
              ? <EmptyMsg>No cancellations.</EmptyMsg>
              : cancelled.map(b => (
                <WatermarkCard key={b.id} b={b} label="CANCELLED" watermarkColor="rgba(200,30,30,0.13)"
                  tokenBg="#e53935" pillStyle={{color:"#c62828",background:"#ffebee"}} pillLabel="Cancelled" />
              ))}
          </Section>

          {/* ── Past/Expired ── */}
          <Section title={`Past Bookings (${past.length})`} color="#555">
            {past.length === 0
              ? <EmptyMsg>No completed bookings yet.</EmptyMsg>
              : past.map(b => {
                  const isCOD      = b.paymentMode === "COD";
                  const advStatus  = b.advancePaymentStatus;
                  const finStatus  = b.finalPaymentStatus || b.paymentStatus;
                  const fullyPaid  = finStatus === "PAID" || isCOD;
                  const chefRated  = ratedSet.has(b.id);
                  const canRate    = fullyPaid && !chefRated;

                  const isEmergency = b.isEmergency === true;
                  return (
                    <div key={b.id} style={{ position:"relative" }}>
                      <div style={{ ...card, opacity:0.85, filter:"grayscale(15%)" }}>
                        <div style={{ ...tokenBadge, background: isEmergency?"linear-gradient(135deg,#b71c1c,#e53935)":"#9e9e9e" }}>
                          {isEmergency ? `🚨 Emergency · ${b.tokenId||"—"}` : b.tokenId||"—"}
                        </div>
                        <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:"16px" }}>
                          <div>
                            <div style={lbl}>Customer</div>
                            <div style={val}>👤 {b.user?.name||"—"}</div>
                            <div style={sub}>{b.user?.email||""}</div>
                          </div>
                          <div><div style={lbl}>Date</div><div style={val}>📅 {b.date}</div></div>
                          {(b.timeIn||b.timeOut)&&(
                            <div>
                              <div style={lbl}>Timings</div>
                              <div style={val}>🕐 {b.timeIn||"—"} → 🕔 {b.timeOut||"—"}</div>
                              {b.timeIn&&b.timeOut&&calcDuration(b.timeIn,b.timeOut)&&<div style={sub}>{calcDuration(b.timeIn,b.timeOut)}</div>}
                            </div>
                          )}
                          <div>
                            <div style={lbl}>Status</div>
                            <div style={{...val,color:"#757575",background:"#f5f5f5",padding:"4px 12px",borderRadius:"20px",fontSize:"13px",display:"inline-block"}}>Completed</div>
                          </div>
                          {isCOD ? (
                            <PayBadge label="Full Payment" status="COD" amount={b.totalAmount} />
                          ) : (
                            <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                              <PayBadge label="Advance (30%)" status={advStatus} amount={b.advanceAmount} />
                              <PayBadge label="Final (70%)"   status={finStatus} amount={b.finalAmount} />
                            </div>
                          )}
                          {/* Rate button — uses openRateModal which safely fetches customerId */}
                          <div style={{ display:"flex", alignItems:"center" }}>
                            {canRate ? (
                              <button onClick={() => openRateModal(b)} style={rateBtn}>
                                ⭐ Rate Customer
                              </button>
                            ) : chefRated ? (
                              <div style={{ fontSize:"12px", color:"#2e7d32", fontStyle:"italic" }}>
                                ✅ You rated this customer
                              </div>
                            ) : null}
                          </div>
                        </div>
                        {b.totalAmount > 0 && (
                          <div style={{ marginTop:"12px", display:"flex", gap:"12px", flexWrap:"wrap", padding:"10px 14px", background:"#f8fbff", border:`1px solid ${isEmergency?"#ef9a9a":"#e0eafc"}`, borderRadius:"8px", alignItems:"center" }}>
                            {isEmergency && <span style={{ background:"#b71c1c", color:"white", fontSize:"10px", padding:"2px 8px", borderRadius:"10px", fontWeight:700 }}>🚨 Emergency ×1.5</span>}
                            <PriceChip label="Chef"     value={`₹${b.chefAmount||0}`} />
                            <PriceChip label="Platform" value={`₹${b.platformCharge||0}`} />
                            <PriceChip label="GST"      value={`₹${b.gstAmount||0}`} />
                            {isEmergency && b.emergencySurcharge > 0 &&
                              <PriceChip label="⚡ Surcharge" value={`+₹${b.emergencySurcharge}`} bold />}
                            <PriceChip label="Total"    value={`₹${b.totalAmount||0}`} bold />
                          </div>
                        )}
                      </div>
                      <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",borderRadius:"14px",overflow:"hidden"}}>
                        <div style={{fontSize:"48px",fontWeight:900,color:"rgba(120,120,120,0.15)",transform:"rotate(-20deg)",letterSpacing:"4px",userSelect:"none",whiteSpace:"nowrap"}}>EXPIRED</div>
                      </div>
                    </div>
                  );
              })}
          </Section>
        </>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────
function Section({ title, color, children }) {
  return (
    <div style={{ marginBottom:"36px" }}>
      <h3 style={{ fontSize:"18px", color, margin:"0 0 14px", paddingBottom:"8px", borderBottom:`2px solid ${color}22` }}>{title}</h3>
      <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>{children}</div>
    </div>
  );
}
function EmptyMsg({ children }) {
  return <p style={{ color:"#aaa", fontSize:"14px", fontStyle:"italic", margin:0 }}>{children}</p>;
}
function WatermarkCard({ b, label, watermarkColor, tokenBg, pillStyle, pillLabel }) {
  return (
    <div style={{ position:"relative" }}>
      <div style={{ ...card, opacity:0.82, filter:"grayscale(25%)" }}>
        <div style={{ ...tokenBadge, background:tokenBg }}>{b.tokenId||"—"}</div>
        <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:"16px" }}>
          <div><div style={lbl}>Customer</div><div style={val}>👤 {b.user?.name||"—"}</div><div style={sub}>{b.user?.email||""}</div></div>
          <div><div style={lbl}>Date</div><div style={val}>📅 {b.date}</div></div>
          {(b.timeIn||b.timeOut)&&(
            <div><div style={lbl}>Timings</div><div style={val}>🕐 {b.timeIn||"—"} → 🕔 {b.timeOut||"—"}</div>
              {b.timeIn&&b.timeOut&&calcDuration(b.timeIn,b.timeOut)&&<div style={sub}>{calcDuration(b.timeIn,b.timeOut)}</div>}
            </div>
          )}
          <div><div style={lbl}>Status</div><div style={{...val,...pillStyle,padding:"4px 12px",borderRadius:"20px",fontSize:"13px",display:"inline-block"}}>{pillLabel}</div></div>
          {b.cancellationPenalty > 0 && (
            <div style={{ fontSize:"12px", color:"#e65100", background:"#fff3e0", padding:"4px 10px", borderRadius:"8px", border:"1px solid #ffcc80" }}>
              💸 Penalty: ₹{b.cancellationPenalty} forfeited
            </div>
          )}
        </div>
      </div>
      <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",borderRadius:"14px",overflow:"hidden"}}>
        <div style={{fontSize:"48px",fontWeight:900,color:watermarkColor,transform:"rotate(-20deg)",letterSpacing:"4px",userSelect:"none",whiteSpace:"nowrap"}}>{label}</div>
      </div>
    </div>
  );
}
function PriceChip({ label, value, bold }) {
  return (
    <div style={{ textAlign:"center" }}>
      <div style={{ fontSize:"10px", color:"#aaa", textTransform:"uppercase", marginBottom:"2px" }}>{label}</div>
      <div style={{ fontSize:bold?"14px":"12px", fontWeight:bold?700:400, color:bold?"#1e3c72":"#555" }}>{value}</div>
    </div>
  );
}

const pw       = { padding:"60px 20px", maxWidth:"500px", margin:"0 auto" };
const msgBox   = (bg,bdr,color) => ({ background:bg, border:`1px solid ${bdr}`, borderRadius:"16px", padding:"40px 30px", textAlign:"center", color });
const is       = { fontSize:"48px", marginBottom:"16px" };
const bp       = { padding:"10px 24px", background:"linear-gradient(135deg,#4facfe,#00c6ff)", color:"white", border:"none", borderRadius:"8px", fontWeight:600, cursor:"pointer" };
const card     = { background:"#fff", border:"1px solid #e0eafc", borderRadius:"14px", padding:"20px 24px", boxShadow:"0 2px 12px rgba(0,0,0,0.06)", position:"relative" };
const tokenBadge = { position:"absolute", top:"16px", right:"20px", color:"white", borderRadius:"20px", padding:"4px 14px", fontSize:"11px", fontWeight:700, letterSpacing:"0.5px", maxWidth:"200px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" };
const lbl      = { fontSize:"11px", color:"#999", textTransform:"uppercase", marginBottom:"4px" };
const val      = { fontSize:"15px", fontWeight:600, color:"#1e3c72" };
const sub      = { fontSize:"12px", color:"#888", marginTop:"2px" };
const rateBtn  = { padding:"8px 14px", background:"linear-gradient(135deg,#f7971e,#ffd200)", color:"#3e2000", border:"none", borderRadius:"8px", cursor:"pointer", fontWeight:700, fontSize:"12px" };

export default ChefOrders;