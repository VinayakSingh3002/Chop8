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
function isCancelled(s) { return s === "CANCELLED"; }
function calcDuration(a, b) {
  try {
    const [h1,m1]=a.split(":").map(Number),[h2,m2]=b.split(":").map(Number);
    const mins=(h2*60+m2)-(h1*60+m1); if(mins<=0) return null;
    const h=Math.floor(mins/60),m=mins%60; return m===0?`${h} hrs`:`${h}h ${m}m`;
  } catch { return null; }
}

function PastCard({ b, watermarkLabel, watermarkColor, tokenBg, pillStyle, pillLabel,
                    canRate, alreadyRated, onRate }) {
  return (
    <div style={{ position:"relative" }}>
      <div style={{ ...card, opacity:0.82, filter:"grayscale(25%)" }}>
        <div style={{ ...tokenBadge, background:tokenBg }}>{b.tokenId}</div>
        <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:"16px" }}>
          <div><div style={lbl}>Customer</div><div style={val}>👤 {b.user?.name||"—"}</div><div style={sub}>{b.user?.email||""}</div></div>
          <div><div style={lbl}>Date</div><div style={val}>📅 {b.date}</div></div>
          {(b.timeIn||b.timeOut)&&(
            <div><div style={lbl}>Timings</div><div style={val}>🕐 {b.timeIn||"—"} → 🕔 {b.timeOut||"—"}</div>
              {b.timeIn&&b.timeOut&&calcDuration(b.timeIn,b.timeOut)&&<div style={sub}>{calcDuration(b.timeIn,b.timeOut)}</div>}
            </div>
          )}
          <div><div style={lbl}>Status</div><div style={{...val,...pillStyle,padding:"4px 12px",borderRadius:"20px",fontSize:"13px",display:"inline-block"}}>{pillLabel}</div></div>
          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
            {canRate && <button onClick={onRate} style={rateBtn}>⭐ Rate Customer</button>}
            {alreadyRated && <div style={{fontSize:"12px",color:"#2e7d32",fontStyle:"italic"}}>✅ Rated</div>}
          </div>
        </div>
      </div>
      <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",borderRadius:"14px",overflow:"hidden"}}>
        <div style={{fontSize:"48px",fontWeight:900,color:watermarkColor,transform:"rotate(-20deg)",letterSpacing:"4px",userSelect:"none",whiteSpace:"nowrap"}}>{watermarkLabel}</div>
      </div>
    </div>
  );
}

function ChefOrders() {
  const [bookings,    setBookings]    = useState([]);
  const [available,   setAvailable]   = useState(false);
  const [toggling,    setToggling]    = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [rateBooking, setRateBooking] = useState(null);
  const [ratedSet,    setRatedSet]    = useState(new Set());
  const loggedUser = getUser();

  const fetchData = useCallback(() => {
    if (!loggedUser || loggedUser.role !== "chef") { setLoading(false); return; }
    Promise.all([
      fetch(`${API.bookings}/chef/${loggedUser.userId}`).then(r => r.json()),
      fetch(API.chefs).then(r => r.json()),
    ]).then(([bookingsData, chefsData]) => {
      const list = Array.isArray(bookingsData) ? bookingsData : [];
      setBookings(list);
      const me = chefsData.find(c => c.id === loggedUser.userId);
      if (me) setAvailable(me.available);
      setLoading(false);
      // Check which bookings this chef already rated
      list.forEach(b => {
        fetch(`${API.ratings}/booking/${b.id}/rater/${loggedUser.userId}`)
          .then(r => r.json())
          .then(d => { if (d.alreadyRated) setRatedSet(prev => new Set([...prev, b.id])); })
          .catch(() => {});
      });
    }).catch(() => setLoading(false));
  }, [loggedUser?.userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleToggle = async () => {
    setToggling(true);
    try {
      const res  = await fetch(`${API.chefs}/${loggedUser.userId}/toggle-availability`, { method:"PUT" });
      const data = await res.json();
      if (res.ok) { setAvailable(data.available); alert(data.message); }
      else alert(data.error || "Could not update availability.");
    } catch { alert("Network error."); }
    finally { setToggling(false); }
  };

  if (!loggedUser) return (<div style={pageWrap}><div style={msgBox("#e3f2fd","#90caf9","#0d47a1")}><div style={iconSt}>🔒</div><h2>Login Required</h2><Link to="/login"><button style={btnPrimary}>Go to Login</button></Link></div></div>);
  if (loggedUser.role === "customer") return (<div style={pageWrap}><div style={msgBox("#f5faff","#e0eafc","#1e3c72")}><div style={iconSt}>🚫</div><h2>Access Denied</h2><Link to="/orders"><button style={btnPrimary}>My Orders</button></Link></div></div>);

  const activeBookings    = bookings.filter(b => !isExpired(b.date,b.timeOut,b.status) && !isCancelled(b.status));
  const cancelledBookings = bookings.filter(b => isCancelled(b.status));
  const expiredBookings   = bookings.filter(b => isExpired(b.date,b.timeOut,b.status));

  return (
    <div style={{ padding:"40px 20px", maxWidth:"860px", margin:"0 auto" }}>

      {rateBooking && (
        <RatingModal
          booking={rateBooking}
          raterId={loggedUser.userId} raterName={loggedUser.name} raterRole="chef"
          rateeId={rateBooking.user?.id} rateeName={rateBooking.user?.name} rateeRole="customer"
          onClose={() => setRateBooking(null)}
          onSubmitted={stars => {
            setRatedSet(prev => new Set([...prev, rateBooking.id]));
            setRateBooking(null);
            alert(`You rated ${rateBooking.user?.name} ${stars} ⭐`);
          }} />
      )}

      {/* Header + availability toggle */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"16px", marginBottom:"30px" }}>
        <div>
          <h2 style={{ fontSize:"28px", color:"#1e3c72", margin:0 }}>My Dashboard</h2>
          <p style={{ color:"#666", marginTop:"4px" }}>Hello Chef, <strong>{loggedUser.name}</strong></p>
        </div>
        <div style={{ background:available?"#e8f5e9":"#fbe9e7", border:`1px solid ${available?"#a5d6a7":"#ffab91"}`, borderRadius:"14px", padding:"16px 24px", textAlign:"center", minWidth:"210px" }}>
          <div style={{ fontSize:"13px", color:"#555", marginBottom:"8px" }}>Your availability</div>
          <div style={{ fontSize:"17px", fontWeight:700, marginBottom:"12px", color:available?"#2e7d32":"#bf360c" }}>{available?"● AVAILABLE":"● UNAVAILABLE"}</div>
          <button onClick={handleToggle} disabled={toggling} style={{ padding:"10px 22px", background:available?"linear-gradient(135deg,#ef5350,#e53935)":"linear-gradient(135deg,#66bb6a,#43a047)", color:"white", border:"none", borderRadius:"8px", fontWeight:700, cursor:toggling?"not-allowed":"pointer", fontSize:"14px" }}>
            {toggling?"Updating...":available?"Go Unavailable":"Go Available"}
          </button>
          <div style={{ fontSize:"11px", color:"#888", marginTop:"8px" }}>{available?"Customers can book you":"Customers cannot book you"}</div>
        </div>
      </div>

      {/* Active bookings */}
      <h3 style={{ color:"#1e3c72", marginBottom:"12px" }}>Active Bookings ({activeBookings.length})</h3>
      {loading ? <p style={{ color:"#888" }}>Loading...</p>
        : activeBookings.length === 0 ? (
          <div style={{ ...msgBox("#fff8e1","#ffe082","#7a5c00"), marginBottom:"30px" }}>
            <div style={iconSt}>📋</div><p>No active bookings. Turn on availability so customers can book you.</p>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:"14px", marginBottom:"30px" }}>
            {activeBookings.map(b => (
              <div key={b.id} style={card}>
                <div style={{ ...tokenBadge, background:"linear-gradient(135deg,#f7971e,#ffd200)", color:"#3e2000" }}>{b.tokenId}</div>
                <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:"16px" }}>
                  <div><div style={lbl}>Customer</div><div style={val}>👤 {b.user?.name||"—"}</div><div style={sub}>{b.user?.email||""}</div><div style={sub}>{b.user?.mobile||""}</div></div>
                  <div><div style={lbl}>Date</div><div style={val}>📅 {b.date}</div></div>
                  {(b.timeIn||b.timeOut)&&(<div><div style={lbl}>Timings</div><div style={val}>🕐 {b.timeIn||"—"} → 🕔 {b.timeOut||"—"}</div>{b.timeIn&&b.timeOut&&calcDuration(b.timeIn,b.timeOut)&&<div style={sub}>{calcDuration(b.timeIn,b.timeOut)}</div>}</div>)}
                  <div><div style={lbl}>Status</div><div style={{...val,color:"#2e7d32",background:"#e8f5e9",padding:"4px 12px",borderRadius:"20px",fontSize:"13px",display:"inline-block"}}>{b.status}</div></div>
                  <div><div style={lbl}>Payment</div><div style={{...val,color:b.paymentStatus==="PAID"?"#2e7d32":"#e65100",background:b.paymentStatus==="PAID"?"#e8f5e9":"#fff3e0",padding:"4px 12px",borderRadius:"20px",fontSize:"13px",display:"inline-block"}}>{b.paymentStatus==="PAID"?`✅ Paid ₹${b.amountPaid}`:"⏳ Pending"}</div></div>
                </div>
              </div>
            ))}
          </div>
        )}

      {/* Cancelled */}
      {cancelledBookings.length > 0 && (
        <>
          <h3 style={{ color:"#c62828", marginBottom:"12px" }}>Cancelled Bookings ({cancelledBookings.length})</h3>
          <div style={{ display:"flex", flexDirection:"column", gap:"14px", marginBottom:"30px" }}>
            {cancelledBookings.map(b => (
              <PastCard key={b.id} b={b}
                watermarkLabel="CANCELLED" watermarkColor="rgba(200,30,30,0.13)" tokenBg="#e53935"
                pillStyle={{ color:"#c62828", background:"#ffebee" }} pillLabel="Cancelled"
                canRate={false} alreadyRated={false} onRate={null} />
            ))}
          </div>
        </>
      )}

      {/* Expired — chefs can rate customers here */}
      {expiredBookings.length > 0 && (
        <>
          <h3 style={{ color:"#9e9e9e", marginBottom:"12px" }}>Past Bookings ({expiredBookings.length})</h3>
          <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
            {expiredBookings.map(b => {
              const canRate      = !ratedSet.has(b.id);
              const alreadyRated = ratedSet.has(b.id);
              return (
                <PastCard key={b.id} b={b}
                  watermarkLabel="EXPIRED" watermarkColor="rgba(120,120,120,0.18)" tokenBg="#9e9e9e"
                  pillStyle={{ color:"#757575", background:"#f5f5f5" }} pillLabel="Expired"
                  canRate={canRate} alreadyRated={alreadyRated}
                  onRate={() => setRateBooking(b)} />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

const pageWrap= {padding:"60px 20px",maxWidth:"500px",margin:"0 auto"};
const msgBox=   (bg,border,color)=>({background:bg,border:`1px solid ${border}`,borderRadius:"16px",padding:"40px 30px",textAlign:"center",color});
const iconSt=   {fontSize:"48px",marginBottom:"16px"};
const btnPrimary={marginTop:"16px",padding:"10px 28px",background:"linear-gradient(135deg,#4facfe,#00c6ff)",color:"white",border:"none",borderRadius:"8px",fontWeight:600,cursor:"pointer",fontSize:"15px"};
const card=     {background:"#fff",border:"1px solid #e0eafc",borderRadius:"14px",padding:"20px 24px",boxShadow:"0 2px 12px rgba(0,0,0,0.06)",position:"relative"};
const tokenBadge={position:"absolute",top:"16px",right:"20px",borderRadius:"20px",padding:"4px 14px",fontSize:"13px",fontWeight:700,letterSpacing:"1px"};
const lbl=      {fontSize:"11px",color:"#999",textTransform:"uppercase",marginBottom:"4px"};
const val=      {fontSize:"15px",fontWeight:600,color:"#1e3c72"};
const sub=      {fontSize:"13px",color:"#777",marginTop:"2px"};
const rateBtn=  {padding:"8px 16px",background:"linear-gradient(135deg,#f7971e,#ffd200)",color:"#3e2000",border:"none",borderRadius:"8px",cursor:"pointer",fontWeight:700,fontSize:"13px"};

export default ChefOrders;