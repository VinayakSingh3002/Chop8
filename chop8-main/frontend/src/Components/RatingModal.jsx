// src/Components/RatingModal.jsx
import React, { useState } from "react";
import { API } from "../config";

/**
 * Props:
 *  booking     — the booking object
 *  raterId     — id of person giving the rating
 *  raterName   — name of person giving the rating
 *  raterRole   — "customer" | "chef"
 *  rateeId     — id of person being rated
 *  rateeName   — name of person being rated
 *  rateeRole   — "chef" | "customer"
 *  onClose()   — called when modal closes
 *  onSubmitted()— called after successful submission
 */
function RatingModal({
  booking, raterId, raterName, raterRole,
  rateeId, rateeName, rateeRole,
  onClose, onSubmitted,
}) {
  const [stars,   setStars]   = useState(0);
  const [hover,   setHover]   = useState(0);
  const [comment, setComment] = useState("");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  const handleSubmit = async () => {
    if (stars === 0) { setError("Please select a star rating."); return; }

    setSaving(true);
    setError("");
    try {
      const res  = await fetch(API.ratings, {
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
          comment,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to submit rating."); return; }
      if (onSubmitted) onSubmitted(stars);
      onClose();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const isChefRating = rateeRole === "chef";

  return (
    <div style={overlay}>
      <div style={modal}>

        {/* Header */}
        <div style={{
          background: isChefRating
            ? "linear-gradient(135deg,#1e3c72,#2a5298)"
            : "linear-gradient(135deg,#f7971e,#ffd200)",
          borderRadius: "14px 14px 0 0",
          padding: "22px 24px",
          color: isChefRating ? "white" : "#3e2000",
        }}>
          <div style={{ fontSize: "13px", opacity: 0.85, marginBottom: "4px" }}>
            {isChefRating ? "Rate your Chef" : "Rate this Customer"}
          </div>
          <div style={{ fontSize: "20px", fontWeight: 700 }}>
            {isChefRating ? "👨‍🍳" : "👤"} {rateeName}
          </div>
          <div style={{ fontSize: "12px", opacity: 0.8, marginTop: "4px" }}>
            Booking {booking?.tokenId} · {booking?.date}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "18px" }}>

          {error && (
            <div style={errBox}>{error}</div>
          )}

          {/* Star selector */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "13px", color: "#666", marginBottom: "10px", fontWeight: 600 }}>
              How would you rate your experience?
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
              {[1, 2, 3, 4, 5].map(n => (
                <span
                  key={n}
                  style={{
                    fontSize: "38px",
                    cursor: "pointer",
                    color: n <= (hover || stars) ? "#ffc107" : "#ddd",
                    transition: "color 0.15s, transform 0.15s",
                    transform: n <= (hover || stars) ? "scale(1.15)" : "scale(1)",
                    display: "inline-block",
                  }}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => { setStars(n); setError(""); }}
                >
                  ★
                </span>
              ))}
            </div>
            {stars > 0 && (
              <div style={{ marginTop: "8px", fontSize: "14px", fontWeight: 600, color: "#1e3c72" }}>
                {starLabel(stars)}
              </div>
            )}
          </div>

          {/* Comment */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={labelSt}>
              Comment <span style={{ color: "#aaa", fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder={`Share your experience with ${rateeName}...`}
              rows={3}
              maxLength={300}
              style={textareaSt}
            />
            <div style={{ fontSize: "11px", color: "#bbb", textAlign: "right" }}>
              {comment.length}/300
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={handleSubmit}
              disabled={saving}
              style={{
                flex: 1,
                padding: "12px",
                background: saving ? "#ccc"
                  : isChefRating
                  ? "linear-gradient(135deg,#1e3c72,#2a5298)"
                  : "linear-gradient(135deg,#f7971e,#ffd200)",
                color: isChefRating ? "white" : "#3e2000",
                border: "none",
                borderRadius: "10px",
                fontWeight: 700,
                fontSize: "15px",
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Submitting..." : "Submit Rating"}
            </button>
            <button onClick={onClose} style={cancelBtn}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function starLabel(n) {
  return ["", "Poor", "Fair", "Good", "Very Good", "Excellent"][n];
}

const overlay    = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "16px" };
const modal      = { background: "white", borderRadius: "14px", width: "100%", maxWidth: "400px", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", overflow: "hidden" };
const errBox     = { background: "#fff0f0", border: "1px solid #fcc", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#c00" };
const labelSt    = { fontSize: "12px", fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.4px" };
const textareaSt = { padding: "10px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", outline: "none", resize: "vertical", fontFamily: "inherit", width: "100%", boxSizing: "border-box" };
const cancelBtn  = { padding: "12px 18px", background: "#f0f0f0", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "14px", color: "#555" };

export default RatingModal;