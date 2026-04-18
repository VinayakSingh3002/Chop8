// src/pages/RecommendedChefs.jsx
import React, { useEffect, useState, useCallback } from "react";
import { API } from "../config";
import BookingForm from "../Components/BookingForm.jsx";
import { getUser } from "../services/AuthService";

const MEDAL = [
  { bg: "linear-gradient(135deg,#f7971e,#ffd200)", text: "#3e2000", emoji: "🥇" },
  { bg: "linear-gradient(135deg,#9e9e9e,#e0e0e0)", text: "#212121", emoji: "🥈" },
  { bg: "linear-gradient(135deg,#cd7f32,#f0b97a)", text: "#3e2000", emoji: "🥉" },
];

const LABEL_STYLE = {
  "Highly Recommended": { bg: "#e8f5e9", color: "#1b5e20", border: "#a5d6a7" },
  "Recommended":        { bg: "#e3f2fd", color: "#0d47a1", border: "#90caf9" },
  "Good":               { bg: "#fff8e1", color: "#f57f17", border: "#ffe082" },
  "Average":            { bg: "#fce4ec", color: "#880e4f", border: "#f48fb1" },
  "Unrated":            { bg: "#f5f5f5", color: "#757575", border: "#e0e0e0" },
  "—":                  { bg: "#f5f5f5", color: "#757575", border: "#e0e0e0" },
};

function Stars({ avg, count }) {
  const n = Math.min(5, Math.max(0, Math.round(Number(avg) || 0)));
  return (
    <span style={{ fontSize: "13px" }}>
      <span style={{ color: "#ffc107" }}>{"★".repeat(n)}</span>
      <span style={{ color: "#e0e0e0" }}>{"★".repeat(5 - n)}</span>
      <span style={{ color: "#888", marginLeft: 5 }}>
        {Number(avg || 0).toFixed(1)} ({count || 0} review{count !== 1 ? "s" : ""})
      </span>
    </span>
  );
}

function ScoreBar({ score }) {
  const pct   = Math.min(100, ((Number(score) || 0) / 5) * 100);
  const color = pct >= 80 ? "#2e7d32" : pct >= 60 ? "#1565c0" : pct >= 40 ? "#f57f17" : "#c62828";
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#999", marginBottom: 3 }}>
        <span>ML Score</span>
        <strong style={{ color }}>{Number(score || 0).toFixed(2)} / 5.00</strong>
      </div>
      <div style={{ background: "#eee", borderRadius: 6, height: 6, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 6, transition: "width 1s ease" }} />
      </div>
    </div>
  );
}

function Sentiment({ bd }) {
  if (!bd) return null;
  const { positive: p = 0, negative: n = 0, neutral: u = 0 } = bd;
  if (p + n + u === 0) return (
    <p style={{ fontSize: 11, color: "#ccc", margin: "6px 0 0", fontStyle: "italic" }}>No review comments yet</p>
  );
  return (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 7 }}>
      {p > 0 && <Chip bg="#e8f5e9" color="#2e7d32" border="#a5d6a7">😊 {p} positive</Chip>}
      {u > 0 && <Chip bg="#f5f5f5" color="#555"    border="#ddd"   >😐 {u} neutral</Chip>}
      {n > 0 && <Chip bg="#ffebee" color="#c62828" border="#ef9a9a">😞 {n} negative</Chip>}
    </div>
  );
}
function Chip({ bg, color, border, children }) {
  return (
    <span style={{ background: bg, color, border: `1px solid ${border}`, borderRadius: 12, padding: "2px 9px", fontSize: 11, fontWeight: 600 }}>
      {children}
    </span>
  );
}

export default function RecommendedChefs() {
  const [chefs,         setChefs]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [fallback,      setFallback]      = useState(false);
  const [rawDebug,      setRawDebug]      = useState(null);   // stores raw response for debugging
  const [selectedChef,  setSelectedChef]  = useState(null);
  const [busyMap,       setBusyMap]       = useState({});
  const [myBookings,    setMyBookings]    = useState([]);

  const loggedUser = getUser();
  const isCustomer = loggedUser?.role === "customer";
  const today      = new Date().toISOString().split("T")[0];

  const loadLeaderboard = useCallback(() => {
    setLoading(true);
    setError("");

    fetch(API.recommend)
      .then(r => {
        if (!r.ok) throw new Error("HTTP " + r.status + " from backend");
        return r.json();
      })
      .then(data => {
        // ── Save raw response so we can debug in console ──
        console.log("[RecommendedChefs] raw response from /api/recommend/chefs:", data);
        setRawDebug(data);

        // ── Extract the ranked array — handle ALL possible shapes ─
        let list = [];

        if (Array.isArray(data)) {
          // Edge case: API returned a plain array directly
          list = data;
        } else if (data && Array.isArray(data.ranked)) {
          // Normal case: { ranked: [...] }
          list = data.ranked;
        } else if (data && data.error) {
          // API returned an error object
          throw new Error(data.error);
        }

        console.log("[RecommendedChefs] chefs to display:", list.length);

        setChefs(list);
        setFallback(!!data?.fallback);
        setLoading(false);

        // Check availability for each chef
        list.forEach(chef => {
          fetch(`${API.bookings}/chef/${chef.id}/busy?date=${today}`)
            .then(r => r.json())
            .then(d => setBusyMap(prev => ({ ...prev, [chef.id]: d.busy === true })))
            .catch(() => {});
        });
      })
      .catch(err => {
        console.error("[RecommendedChefs] fetch error:", err);
        setError(err.message || "Could not load chefs. Is Spring Boot running on port 8080?");
        setLoading(false);
      });
  }, [today]);

  useEffect(() => {
    loadLeaderboard();
    if (isCustomer && loggedUser?.userId) {
      fetch(`${API.bookings}/user/${loggedUser.userId}`)
        .then(r => r.json())
        .then(d => setMyBookings(Array.isArray(d) ? d : []))
        .catch(() => {});
    }
  }, [loadLeaderboard, isCustomer, loggedUser?.userId]);

  function getMyActiveBooking(chefId) {
    return myBookings.find(b =>
      b.chefId === chefId &&
      b.status === "CONFIRMED" &&
      b.date &&
      new Date() < new Date(`${b.date}T${b.timeOut || "23:59"}:00`)
    );
  }

  // ── Loading ───────────────────────────────────────────
  if (loading) return (
    <div style={S.page}>
      <div style={{ textAlign: "center", padding: "80px 0" }}>
        <div style={S.spinner} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ color: "#888", marginTop: 16 }}>Loading leaderboard...</p>
      </div>
    </div>
  );

  // ── Error ─────────────────────────────────────────────
  if (error) return (
    <div style={S.page}>
      <div style={{ background: "#fff3e0", border: "1px solid #ffcc80", borderRadius: 12, padding: 20, color: "#e65100" }}>
        <strong>⚠️ Error:</strong> {error}
        <br /><br />
        <button onClick={loadLeaderboard} style={{ padding: "8px 20px", background: "#e65100", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>
          Retry
        </button>
      </div>
    </div>
  );

  // ── Main render ───────────────────────────────────────
  return (
    <div style={S.page}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: "#1e3c72", margin: "0 0 6px" }}>
          🏆 Chef Leaderboard
        </h2>
        <p style={{ color: "#666", margin: 0, fontSize: 14 }}>
          Ranked by AI — ML analysis of customer review comments + star ratings.
          {isCustomer && " Click any chef to book them."}
        </p>
      </div>

      {/* Fallback warning */}
      {fallback && (
        <div style={{ marginBottom: 18, background: "#fff8e1", border: "1px solid #ffe082", borderRadius: 10, padding: "10px 16px", fontSize: 13, color: "#f57f17", display: "flex", gap: 10 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <strong>Python ML engine is offline.</strong> Ranked by star rating only.
            <br />
            <span style={{ fontSize: 12, color: "#888" }}>
              Start Python for full ML ranking: <code>cd recommend_service &amp;&amp; python app.py</code>
            </span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {chefs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", background: "#f8f9fa", borderRadius: 16, border: "2px dashed #ddd" }}>
          <div style={{ fontSize: 56, marginBottom: 14 }}>👨‍🍳</div>
          <p style={{ fontSize: 17, color: "#555", margin: "0 0 6px", fontWeight: 600 }}>No chefs found</p>
          <p style={{ fontSize: 13, color: "#aaa", margin: "0 0 18px" }}>
            Register some chefs first, then they will appear here.
          </p>
          <a href="http://localhost:8080/api/recommend/debug" target="_blank" rel="noreferrer"
             style={{ fontSize: 12, color: "#1565c0" }}>
            🔍 Open debug endpoint to check backend
          </a>
          {/* Show raw response for debugging */}
          {rawDebug && (
            <details style={{ marginTop: 20, textAlign: "left", fontSize: 11, color: "#888" }}>
              <summary style={{ cursor: "pointer" }}>Raw API response (for developer debugging)</summary>
              <pre style={{ background: "#f0f0f0", padding: 12, borderRadius: 8, overflow: "auto", marginTop: 8 }}>
                {JSON.stringify(rawDebug, null, 2)}
              </pre>
            </details>
          )}
        </div>
      ) : (

        /* ── Leaderboard ── */
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Column headers */}
          <div style={{ display: "grid", gridTemplateColumns: "56px 1fr 60px", gap: "0 12px", padding: "4px 16px", color: "#aaa", fontSize: 11, fontWeight: 700, letterSpacing: "0.6px", textTransform: "uppercase" }}>
            <span>Rank</span><span>Chef</span><span style={{ textAlign: "right" }}>Score</span>
          </div>

          {chefs.map((chef, i) => {
            const medal     = i < 3 ? MEDAL[i] : null;
            const lStyle    = LABEL_STYLE[chef.recommendLabel] || LABEL_STYLE["Unrated"];
            const isBusy    = busyMap[chef.id] === true;
            const myBooking = getMyActiveBooking(chef.id);
            const isOpen    = selectedChef?.id === chef.id;

            return (
              <div key={chef.id ?? i}>

                {/* Chef card */}
                <div
                  onClick={() => isCustomer && setSelectedChef(isOpen ? null : chef)}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 14,
                    padding: "16px", borderRadius: isOpen ? "14px 14px 0 0" : 14,
                    background:  isOpen ? "#f0f4ff" : "white",
                    border:      isOpen ? "2px solid #2a5298" : "1px solid #e0eafc",
                    borderBottom: isOpen ? "none" : undefined,
                    boxShadow:   isOpen ? "0 4px 20px rgba(42,82,152,0.12)" : "0 2px 8px rgba(0,0,0,0.05)",
                    cursor:      isCustomer ? "pointer" : "default",
                    transition:  "all 0.2s ease",
                    userSelect:  "none",
                  }}
                >
                  {/* Medal / rank */}
                  <div style={{
                    width: 44, minWidth: 44, height: 44, borderRadius: 12,
                    background: medal ? medal.bg : "#1e3c72",
                    color:      medal ? medal.text : "white",
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    fontWeight: 900, fontSize: 12, lineHeight: 1.2, flexShrink: 0,
                  }}>
                    {medal ? <span style={{ fontSize: 22 }}>{medal.emoji}</span> : `#${i + 1}`}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>

                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: "#1e3c72" }}>
                        👨‍🍳 {chef.name || "—"}
                      </span>

                      {/* Recommendation label */}
                      {chef.recommendLabel && chef.recommendLabel !== "—" && (
                        <span style={{ background: lStyle.bg, color: lStyle.color, border: `1px solid ${lStyle.border}`, borderRadius: 20, padding: "2px 10px", fontSize: 10, fontWeight: 700 }}>
                          {chef.recommendLabel}
                        </span>
                      )}

                      {/* Specialisation */}
                      {chef.specialisation && (
                        <span style={{ background: "#e3f2fd", color: "#1565c0", borderRadius: 12, padding: "2px 10px", fontSize: 10, fontWeight: 600 }}>
                          {chef.specialisation}
                        </span>
                      )}


                    </div>

                    <div style={{ display: "flex", gap: 14, marginTop: 4, flexWrap: "wrap", alignItems: "center" }}>
                      {Number(chef.pricePerDay) > 0 && (
                        <span style={{ fontSize: 13, color: "#555", fontWeight: 600 }}>
                          💰 ₹{chef.pricePerDay}<span style={{ color: "#aaa", fontWeight: 400 }}>/day</span>
                        </span>
                      )}
                      <Stars avg={chef.avgRating} count={chef.ratingCount} />
                    </div>

                    <ScoreBar score={chef.recommendScore} />
                    <Sentiment bd={chef.sentimentBreakdown} />

                    {isCustomer && !isOpen && (
                      <p style={{ margin: "6px 0 0", fontSize: 11, color: "#aaa" }}>
                        {isBusy ? "Click to view (busy today)" : "Click to book this chef →"}
                      </p>
                    )}
                  </div>

                  {/* Score number */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "#1e3c72", lineHeight: 1 }}>
                      {Number(chef.recommendScore || 0).toFixed(1)}
                    </div>
                    <div style={{ fontSize: 10, color: "#aaa" }}>/ 5.0</div>
                  </div>
                </div>

                {/* Booking panel */}
                {isOpen && isCustomer && (
                  <div style={{ background: "#f0f4ff", border: "2px solid #2a5298", borderTop: "none", borderRadius: "0 0 14px 14px", padding: "0 16px 16px" }}>
                    {isBusy ? (
                      <div style={{ padding: "20px 0", textAlign: "center", color: "#e65100", fontSize: 14 }}>
                        🔴 <strong>{chef.name}</strong> is busy today. Try again tomorrow!
                        <br />
                        <button onClick={() => setSelectedChef(null)} style={S.closeBtn}>Close</button>
                      </div>
                    ) : myBooking ? (
                      <div style={{ padding: "20px 0", textAlign: "center", color: "#2e7d32", fontSize: 14 }}>
                        ✅ You already have an active booking with <strong>{chef.name}</strong>.
                        <br />
                        <button onClick={() => setSelectedChef(null)} style={S.closeBtn}>Close</button>
                      </div>
                    ) : (
                      <BookingForm
                        chef={chef}
                        onClose={() => setSelectedChef(null)}
                        onSuccess={() => {
                          setSelectedChef(null);
                          loadLeaderboard();
                          if (loggedUser?.userId) {
                            fetch(`${API.bookings}/user/${loggedUser.userId}`)
                              .then(r => r.json())
                              .then(d => setMyBookings(Array.isArray(d) ? d : []))
                              .catch(() => {});
                          }
                        }}
                      />
                    )}
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

const S = {
  page:     { padding: "40px 24px", maxWidth: 860, margin: "0 auto" },
  spinner:  { width: 44, height: 44, border: "4px solid #e0eafc", borderTop: "4px solid #2a5298", borderRadius: "50%", animation: "spin 0.9s linear infinite", margin: "0 auto" },
  closeBtn: { marginTop: 12, padding: "8px 20px", background: "#1e3c72", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 },
};