// src/Components/Card.jsx
import React from "react";
import styles from "./css/Card.module.css";

function Card({
  title          = "Chef Name",
  subtitle       = "Professional Chef",
  specialisation = "",
  icon           = "👨‍🍳",
  photo          = "",        // base64 string or empty — shown if set
  price          = 0,
  avgRating      = null,
  ratingCount    = 0,
  onBook         = () => {},
  isBooked       = false,
}) {

  const hasPhoto = photo && typeof photo === "string" && photo.trim().length > 0;

  return (
    <div className={styles.card}>
      <div className={styles.top}>

        {/* ── Profile photo OR emoji fallback ── */}
        {hasPhoto ? (
          <div style={{
            width: "72px", height: "72px",
            borderRadius: "50%",
            overflow: "hidden",
            margin: "0 auto 10px",
            border: "3px solid rgba(255,255,255,0.7)",
            boxShadow: "0 3px 10px rgba(0,0,0,0.15)",
            flexShrink: 0,
          }}>
            <img
              src={photo}
              alt={title}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={e => {
                // If image fails to load, hide it so emoji fallback shows
                e.target.style.display = "none";
                e.target.parentElement.style.display = "none";
              }}
            />
          </div>
        ) : (
          <div className={styles.icon}>{icon}</div>
        )}

        <h3>{title}</h3>

        {/* Specialisation badge */}
        {specialisation ? (
          <div style={{
            display: "inline-block",
            margin: "4px 0 2px",
            padding: "3px 12px",
            background: "linear-gradient(135deg,#e3f2fd,#bbdefb)",
            color: "#1565c0",
            borderRadius: "20px",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.3px",
          }}>
            {specialisation}
          </div>
        ) : (
          <p style={{ fontSize: "12px", color: "#888", margin: "4px 0 2px" }}>{subtitle}</p>
        )}

        {/* Star rating */}
        {avgRating !== null && Number(avgRating) > 0 ? (
          <div style={{ marginTop: "5px", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
            <span style={{ color: "#ffc107", fontSize: "13px" }}>
              {"★".repeat(Math.round(Number(avgRating)))}
              {"☆".repeat(5 - Math.round(Number(avgRating)))}
            </span>
            <span style={{ fontSize: "11px", color: "#888" }}>
              {Number(avgRating).toFixed(1)} ({ratingCount})
            </span>
          </div>
        ) : (
          <div style={{ marginTop: "4px", fontSize: "11px", color: "#bbb" }}>No ratings yet</div>
        )}
      </div>

      <div className={styles.price}>
        {price > 0 ? `₹${price}` : (
          <span style={{ fontSize: "13px", color: "#aaa" }}>Price not set</span>
        )}
      </div>

      <button
        className={styles.bookBtn}
        onClick={onBook}
        disabled={isBooked}
        style={isBooked ? {
          background: "linear-gradient(135deg,#a8edbc,#4caf7d)",
          cursor: "default",
          opacity: 1,
        } : {}}
      >
        {isBooked ? "✔ Booked" : "Book Now"}
      </button>
    </div>
  );
}

export default Card;