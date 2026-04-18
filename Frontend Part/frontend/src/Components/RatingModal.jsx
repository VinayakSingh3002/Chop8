// src/Components/RatingModal.jsx
//
// ONE-TIME RATING ENFORCED:
// - If API returns "already rated" error → shows locked confirmation screen
//   and auto-closes after 2 seconds instead of keeping form open
// - Submit button is hard-disabled until a star is selected
// - Overlay click does NOT close the modal (must use X or Later button)
//
import React, { useState, useEffect } from "react";
import { API } from "../config";

function RatingModal({
  booking,
  raterId, raterName, raterRole,
  rateeId, rateeName, rateeRole,
  onClose,      // called when user dismisses without rating
  onSubmitted,  // called after successful submission
}) {
  const [stars,        setStars]        = useState(0);
  const [hover,        setHover]        = useState(0);
  const [comment,      setComment]      = useState("");
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");
  const [success,      setSuccess]      = useState(false);
  const [alreadyDone,  setAlreadyDone]  = useState(false); // locked state

  // Hard guards
  if (!rateeId || !booking?.id) return null;

  const isChefRating = rateeRole === "chef";
  const headerBg     = isChefRating
    ? "linear-gradient(135deg,#1e3c72,#2a5298)"
    : "linear-gradient(135deg,#f7971e,#ffd200)";
  const headerColor  = isChefRating ? "white" : "#3e2000";

  const handleSubmit = async () => {
    if (stars === 0) {
      setError("⭐ Please tap a star to give your rating before submitting.");
      return;
    }
    if (!rateeId) {
      setError("Something went wrong. Please refresh and try again.");
      return;
    }
    if (saving) return;

    setSaving(true);
    setError("");

    try {
      const res = await fetch(API.ratings, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.id,
          raterId,
          raterName,
          raterRole,
          rateeId,
          rateeRole,
          stars,
          comment: comment.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // ── Already rated: show locked screen, auto-close ──
        if (data.error && data.error.toLowerCase().includes("already rated")) {
          setAlreadyDone(true);
          setTimeout(() => {
            if (onSubmitted) onSubmitted(stars);
          }, 2000);
          return;
        }
        // Other error: show message, keep form open
        setError(data.error || "Failed to submit. Please try again.");
        setSaving(false);
        return;
      }

      // ✅ Success
      setSuccess(true);
      setTimeout(() => {
        if (onSubmitted) onSubmitted(stars);
      }, 1400);

    } catch {
      setError("Network error. Please check your connection and try again.");
      setSaving(false);
    }
  };

  // ── Already rated locked screen ───────────────────────
  if (alreadyDone) {
    return (
      <div style={overlay}>
        <div style={modal}>
          <div style={{ background:"linear-gradient(135deg,#2e7d32,#43a047)", borderRadius:"14px", padding:"44px 24px", textAlign:"center", color:"white" }}>
            <div style={{ fontSize:"52px", marginBottom:"10px" }}>✅</div>
            <div style={{ fontSize:"20px", fontWeight:700, marginBottom:"6px" }}>Already Rated</div>
            <div style={{ fontSize:"14px", opacity:0.9 }}>
              You have already submitted your rating for this booking.
            </div>
            <div style={{ fontSize:"13px", opacity:0.75, marginTop:"8px" }}>
              Closing automatically...
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Success screen ────────────────────────────────────
  if (success) {
    return (
      <div style={overlay}>
        <div style={modal}>
          <div style={{ background:"linear-gradient(135deg,#2e7d32,#43a047)", borderRadius:"14px", padding:"44px 24px", textAlign:"center", color:"white" }}>
            <div style={{ fontSize:"56px", marginBottom:"12px" }}>🌟</div>
            <div style={{ fontSize:"22px", fontWeight:700, marginBottom:"8px" }}>Rating Submitted!</div>
            <div style={{ fontSize:"15px", opacity:0.9 }}>You gave <strong>{rateeName}</strong></div>
            <div style={{ fontSize:"32px", margin:"10px 0", letterSpacing:"4px" }}>{"★".repeat(stars)}</div>
          </div>
        </div>
      </div>
    );
  }

  // ── Rating form ───────────────────────────────────────
  return (
    <div style={overlay}>
      <div style={modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ background:headerBg, borderRadius:"14px 14px 0 0", padding:"20px 24px", color:headerColor }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <div style={{ fontSize:"12px", opacity:0.8, marginBottom:"4px" }}>
                {isChefRating ? "Rate your Chef" : "Rate this Customer"}
              </div>
              <div style={{ fontSize:"20px", fontWeight:700 }}>
                {isChefRating ? "👨‍🍳" : "👤"} {rateeName}
              </div>
              <div style={{ fontSize:"11px", opacity:0.75, marginTop:"4px" }}>
                Booking {booking?.tokenId || `#${booking?.id}`} · {booking?.date}
              </div>
            </div>
            <button onClick={onClose} style={{ background:"rgba(255,255,255,0.2)", border:"none", borderRadius:"50%", width:"30px", height:"30px", cursor:"pointer", color:headerColor, fontSize:"14px", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding:"24px", display:"flex", flexDirection:"column", gap:"18px" }}>

          {error && <div style={errBox}>{error}</div>}

          {/* Stars */}
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:"13px", color:"#555", fontWeight:600, marginBottom:"6px" }}>
              How would you rate your experience?
            </div>
            <div style={{ fontSize:"12px", color:"#aaa", marginBottom:"14px" }}>
              Tap a star to select your rating
            </div>
            <div style={{ display:"flex", justifyContent:"center", gap:"10px" }} onClick={e => e.stopPropagation()}>
              {[1,2,3,4,5].map(n => (
                <span
                  key={n}
                  role="button"
                  tabIndex={0}
                  aria-label={`${n} star`}
                  style={{
                    fontSize:"44px",
                    cursor:"pointer",
                    color: n <= (hover || stars) ? "#ffc107" : "#e0e0e0",
                    transition:"color 0.12s, transform 0.12s",
                    transform: n <= (hover || stars) ? "scale(1.25)" : "scale(1)",
                    display:"inline-block",
                    userSelect:"none",
                    WebkitUserSelect:"none",
                    lineHeight:1,
                  }}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onClick={e => { e.stopPropagation(); setStars(n); setError(""); }}
                  onKeyDown={e => { if (e.key==="Enter"||e.key===" ") { setStars(n); setError(""); } }}
                >★</span>
              ))}
            </div>
            <div style={{ marginTop:"12px", minHeight:"24px", fontSize:"15px", fontWeight:700, color:stars>0?"#1e3c72":"#ccc" }}>
              {stars > 0
                ? ["","😞 Poor","😐 Fair","🙂 Good","😊 Very Good","🤩 Excellent!"][stars]
                : "— tap a star —"}
            </div>
          </div>

          {/* Comment */}
          <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
            <label style={lblSt}>
              Comment&nbsp;
              <span style={{ fontWeight:400, color:"#bbb", textTransform:"none" }}>(optional)</span>
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder={`Share your experience with ${rateeName}...`}
              rows={3}
              maxLength={300}
              style={textareaSt}
            />
            <div style={{ fontSize:"11px", color:"#bbb", textAlign:"right" }}>{comment.length}/300</div>
          </div>

          {/* Buttons */}
          <div style={{ display:"flex", gap:"10px" }}>
            <button
              onClick={handleSubmit}
              disabled={stars === 0 || saving}
              style={{
                flex:1, padding:"13px",
                background: stars===0||saving ? "#ccc"
                  : isChefRating
                  ? "linear-gradient(135deg,#1e3c72,#2a5298)"
                  : "linear-gradient(135deg,#f7971e,#ffd200)",
                color: isChefRating ? "white" : "#3e2000",
                border:"none", borderRadius:"10px",
                fontWeight:700, fontSize:"15px",
                cursor: stars===0||saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Submitting..." : stars===0 ? "⭐ Select a rating" : `Submit ${stars}★ Rating`}
            </button>
            <button onClick={onClose} style={laterBtn}>Later</button>
          </div>

          <p style={{ fontSize:"11px", color:"#ccc", textAlign:"center", margin:0 }}>
            You can rate later from the Orders page.
          </p>
        </div>
      </div>
    </div>
  );
}

const overlay    = { position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:"16px" };
const modal      = { background:"white", borderRadius:"14px", width:"100%", maxWidth:"400px", boxShadow:"0 24px 60px rgba(0,0,0,0.3)", overflow:"hidden" };
const errBox     = { background:"#fff0f0", border:"1px solid #fcc", borderRadius:"8px", padding:"12px 14px", fontSize:"13px", color:"#c00", fontWeight:500 };
const lblSt      = { fontSize:"11px", fontWeight:600, color:"#555", textTransform:"uppercase", letterSpacing:"0.4px" };
const textareaSt = { padding:"10px 12px", borderRadius:"8px", border:"1px solid #ddd", fontSize:"14px", outline:"none", resize:"vertical", fontFamily:"inherit", width:"100%", boxSizing:"border-box" };
const laterBtn   = { padding:"13px 18px", background:"#f5f5f5", border:"none", borderRadius:"10px", cursor:"pointer", fontSize:"14px", color:"#666" };

export default RatingModal;