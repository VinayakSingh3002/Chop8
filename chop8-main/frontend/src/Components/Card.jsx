// src/Components/Card.jsx
import React from "react";
import styles from "./css/Card.module.css";

function Card({
  title           = "Chef Name",
  subtitle        = "Professional Chef",  // used for mobile number on services page
  specialisation  = "",                   // e.g. "Indian Chef", "Italian Chef"
  icon            = "👨‍🍳",
  price           = 0,
  avgRating       = null,
  ratingCount     = 0,
  onBook          = () => {},
  isBooked        = false,
}) {
  return (
    <div className={styles.card}>

      <div className={styles.top}>
        <div className={styles.icon}>{icon}</div>
        <h3>{title}</h3>

        {/* Specialisation badge — shown if set */}
        {specialisation ? (
          <div style={{
            display: "inline-block",
            margin: "4px 0 2px",
            padding: "3px 10px",
            background: "linear-gradient(135deg,#e3f2fd,#bbdefb)",
            color: "#1565c0",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "0.3px",
          }}>
            {specialisation}
          </div>
        ) : (
          <p style={{ fontSize: "13px", color: "#888", margin: "4px 0 2px" }}>{subtitle}</p>
        )}

        {/* Star rating display */}
        {avgRating !== null && avgRating > 0 ? (
          <div style={{ marginTop: "5px", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
            <span style={{ color: "#ffc107", fontSize: "13px" }}>
              {"★".repeat(Math.round(avgRating))}{"☆".repeat(5 - Math.round(avgRating))}
            </span>
            <span style={{ fontSize: "11px", color: "#888" }}>
              {avgRating.toFixed(1)} ({ratingCount})
            </span>
          </div>
        ) : (
          <div style={{ marginTop: "4px", fontSize: "11px", color: "#bbb" }}>
            No ratings yet
          </div>
        )}
      </div>

      {/* Price */}
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