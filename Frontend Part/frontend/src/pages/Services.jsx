// src/pages/Services.jsx
import React, { useState, useEffect, useCallback } from "react";
import styles from "./Styles/Services.module.css";
import Card from "../Components/Card";
import BookingForm from "../Components/BookingForm.jsx";
import { getUser } from "../services/AuthService";
import { API } from "../config";
import { Link, useSearchParams } from "react-router";

function isBookingActive(booking) {
  if (!booking) return false;
  if (booking.status !== "CONFIRMED") return false;
  if (!booking.date) return false;
  const now = new Date();
  if (booking.timeOut) return now < new Date(`${booking.date}T${booking.timeOut}:00`);
  return now < new Date(`${booking.date}T23:59:59`);
}

function Services() {
  const [searchParams]                  = useSearchParams();
  const [search,       setSearch]       = useState(searchParams.get("specialisation") || "");
  const [chefs,        setChefs]        = useState([]);
  const [myBookings,   setMyBookings]   = useState([]);
  const [busyMap,      setBusyMap]      = useState({});
  const [ratingsMap,   setRatingsMap]   = useState({});
  const [selectedChef, setSelectedChef] = useState(null);
  const [loading,      setLoading]      = useState(true);

  const loggedUser = getUser();
  const isCustomer = loggedUser?.role === "customer";
  const today      = new Date().toISOString().split("T")[0];

  const loadData = useCallback(() => {
    if (!isCustomer) { setLoading(false); return; }
    Promise.all([
      fetch(API.chefs).then(r => r.json()),
      fetch(`${API.bookings}/user/${loggedUser.userId}`).then(r => r.json()),
    ]).then(([chefsData, bookingsData]) => {
      setChefs(chefsData);
      setMyBookings(Array.isArray(bookingsData) ? bookingsData : []);
      chefsData.forEach(chef => {
        fetch(`${API.bookings}/chef/${chef.id}/busy?date=${today}`)
          .then(r => r.json())
          .then(data => setBusyMap(prev => ({ ...prev, [chef.id]: data.busy === true })))
          .catch(() => {});
        fetch(`${API.ratings}/ratee/${chef.id}`)
          .then(r => r.json())
          .then(data => setRatingsMap(prev => ({
            ...prev,
            [chef.id]: { average: data.average || 0, count: data.count || 0 },
          })))
          .catch(() => {});
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [isCustomer, loggedUser?.userId, today]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!isCustomer || chefs.length === 0) return;
    const interval = setInterval(() => {
      chefs.forEach(chef => {
        fetch(`${API.bookings}/chef/${chef.id}/busy?date=${today}`)
          .then(r => r.json())
          .then(data => setBusyMap(prev => ({ ...prev, [chef.id]: data.busy === true })))
          .catch(() => {});
      });
      fetch(`${API.bookings}/user/${loggedUser.userId}`)
        .then(r => r.json())
        .then(data => setMyBookings(Array.isArray(data) ? data : []))
        .catch(() => {});
    }, 30_000);
    return () => clearInterval(interval);
  }, [isCustomer, chefs, loggedUser?.userId, today]);

  const getMyActiveBooking = (chefId) =>
    myBookings.find(b => b.chef?.id === chefId && isBookingActive(b)) || null;

  const filteredChefs = chefs.filter(c => {
    const q = search.toLowerCase();
    return (
      (c.name           || "").toLowerCase().includes(q) ||
      (c.specialisation || "").toLowerCase().includes(q)
    );
  });

  if (!loggedUser) return (
    <div style={pageWrap}>
      <div style={msgBox("#e3f2fd","#90caf9","#0d47a1")}>
        <div style={iconSt}>🔒</div>
        <h2>Login Required</h2>
        <p>Please login as a customer to view and book chefs.</p>
        <Link to="/login"><button style={btnPrimary}>Go to Login</button></Link>
      </div>
    </div>
  );

  if (loggedUser.role === "chef") return (
    <div style={pageWrap}>
      <div style={msgBox("#fff8e1","#ffe082","#7a5c00")}>
        <div style={iconSt}>👨‍🍳</div>
        <h2>Hello Chef, {loggedUser.name}!</h2>
        <p>Chefs cannot book other chefs.</p>
        <Link to="/chef-orders"><button style={btnYellow}>My Dashboard</button></Link>
      </div>
    </div>
  );

  return (
    <div className={styles.services}>
      <div className={styles.searchBox}>
        <input type="text" placeholder="Search by name or specialisation..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {search && (
        <div style={{ textAlign:"center", marginBottom:"16px" }}>
          <span style={{ background:"#e3f2fd", color:"#1565c0", borderRadius:"20px", padding:"5px 14px", fontSize:"13px", fontWeight:600 }}>
            🔍 Filtering: "{search}"
          </span>
          <button onClick={() => setSearch("")}
            style={{ marginLeft:"8px", background:"none", border:"none", color:"#888", cursor:"pointer", fontSize:"13px" }}>
            ✕ Clear
          </button>
        </div>
      )}

      <section className={styles.about}>
        <h2>Services</h2>
    
      </section>

      <section className={styles.list}>
        {loading ? (
          <p style={{ textAlign:"center", color:"#888" }}>Loading chefs...</p>
        ) : filteredChefs.length === 0 ? (
          <p style={{ textAlign:"center", color:"#888" }}>No chefs found{search?` for "${search}"`:""}.</p>
        ) : (
          <div className={styles.cards}>
            {filteredChefs.map((chef, i) => {
              const isBusyToday   = busyMap[chef.id] === true;
              const myBooking     = getMyActiveBooking(chef.id);
              const alreadyBooked = !!myBooking;
              const chefRating    = ratingsMap[chef.id] || { average: 0, count: 0 };

              const badge = !chef.available
                ? { bg:"#fbe9e7", color:"#bf360c", border:"#ffab91", dot:"#bf360c", pulse:false, label:"Unavailable" }
                : isBusyToday
                ? { bg:"#e3f2fd", color:"#0d47a1", border:"#90caf9", dot:"#1565c0", pulse:true,  label:"Busy Today"  }
                : { bg:"#e8f5e9", color:"#2e7d32", border:"#a5d6a7", dot:"#2e7d32", pulse:false, label:"Available"   };

              return (
                <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", width:"220px" }}>
                  <div style={{ position:"relative", width:"100%" }}>

                    <div style={{ position:"absolute", top:"10px", left:"10px", zIndex:2, background:badge.bg, color:badge.color, border:`1px solid ${badge.border}`, borderRadius:"20px", padding:"3px 10px", fontSize:"11px", fontWeight:700, display:"flex", alignItems:"center", gap:"5px" }}>
                      <span style={{ display:"inline-block", width:"8px", height:"8px", borderRadius:"50%", background:badge.dot, animation:badge.pulse?"pulse 1.4s infinite":"none" }} />
                      {badge.label}
                    </div>

                    {alreadyBooked && (
                      <div style={{ position:"absolute", top:"10px", right:"10px", zIndex:2, background:"#ede7f6", color:"#4527a0", border:"1px solid #b39ddb", borderRadius:"20px", padding:"3px 10px", fontSize:"11px", fontWeight:700 }}>
                        Booked
                      </div>
                    )}

                    <Card
                      title={chef.name}
                      subtitle={chef.mobile || "Professional Chef"}
                      specialisation={chef.specialisation || ""}
                      photo={chef.photo || ""}
                      icon="👨‍🍳"
                      price={chef.pricePerDay || 0}
                      avgRating={chefRating.average}
                      ratingCount={chefRating.count}
                      onBook={() => {
                        if (!chef.available) { alert(`${chef.name} is currently unavailable.`); return; }
                        setSelectedChef(selectedChef?.id === chef.id ? null : chef);
                      }}
                    />
                  </div>

                  {selectedChef?.id === chef.id && (
                    <BookingForm
                      chef={chef}
                      alreadyBooked={myBooking}
                      onClose={() => setSelectedChef(null)}
                      onBooked={(booking) => {
                        // ✅ FIX: No alert here — receipt screen in PaymentGateway already
                        // shows the token clearly. Alert caused "Token: null" because the
                        // booking object at this point may not have tokenId yet (ONLINE flow:
                        // token is generated inside PaymentGateway after advance payment).
                        setSelectedChef(null);
                        setMyBookings(prev => {
                          const existing = prev.findIndex(b => b.id === booking.id);
                          if (existing >= 0) {
                            const updated = [...prev];
                            updated[existing] = booking;
                            return updated;
                          }
                          return [...prev, booking];
                        });
                        // Update busy map if this booking is for today
                        if (booking.status === "CONFIRMED" && booking.date === today) {
                          setBusyMap(prev => ({ ...prev, [chef.id]: true }));
                        }
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <style>{`
        @keyframes pulse {
          0%   { box-shadow: 0 0 0 0 rgba(21,101,192,0.7); }
          70%  { box-shadow: 0 0 0 8px rgba(21,101,192,0); }
          100% { box-shadow: 0 0 0 0 rgba(21,101,192,0); }
        }
      `}</style>
    </div>
  );
}

const pageWrap   = { padding:"60px 20px", maxWidth:"500px", margin:"0 auto" };
const msgBox     = (bg,border,color) => ({ background:bg, border:`1px solid ${border}`, borderRadius:"16px", padding:"40px 30px", textAlign:"center", color });
const iconSt     = { fontSize:"48px", marginBottom:"16px" };
const btnPrimary = { marginTop:"16px", padding:"10px 28px", background:"linear-gradient(135deg,#4facfe,#00c6ff)", color:"white", border:"none", borderRadius:"8px", fontWeight:600, cursor:"pointer", fontSize:"15px" };
const btnYellow  = { marginTop:"16px", padding:"10px 28px", background:"#ffc107", color:"#3e2000", border:"none", borderRadius:"8px", fontWeight:600, cursor:"pointer", fontSize:"15px" };

export default Services;