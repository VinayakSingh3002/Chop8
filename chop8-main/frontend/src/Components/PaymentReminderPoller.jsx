// src/Components/PaymentReminderPoller.jsx
//
// Mounted once in App.jsx — runs silently on every page.
// Every 30 seconds it checks for ONLINE + unpaid bookings
// that expire within the next 2 minutes and shows a payment popup.
//
import React, { useEffect, useState, useRef } from "react";
import { getUser } from "../services/AuthService";
import { API } from "../config";
import PaymentGateway from "./PaymentGateway";

// Returns true if booking expires within the next `withinMinutes` minutes
function expiresWithin(date, timeOut, withinMinutes) {
  if (!date || !timeOut) return false;
  const expireAt = new Date(`${date}T${timeOut}:00`);
  const now      = new Date();
  const diffMs   = expireAt - now; // positive = future
  return diffMs > 0 && diffMs <= withinMinutes * 60 * 1000;
}

function PaymentReminderPoller() {
  const [reminderBooking, setReminderBooking] = useState(null); // booking to pay
  const shownRef = useRef(new Set()); // bookingIds already shown this session

  const loggedUser = getUser();

  const checkPayments = async () => {
    const user = getUser();
    if (!user || user.role !== "customer") return;

    try {
      const res      = await fetch(`${API.bookings}/user/${user.userId}`);
      const bookings = await res.json();
      if (!Array.isArray(bookings)) return;

      for (const b of bookings) {
        // Only CONFIRMED + ONLINE + not yet paid
        if (b.status      !== "CONFIRMED") continue;
        if (b.paymentMode !== "ONLINE")    continue;
        if (b.paymentStatus === "PAID")    continue;
        if (shownRef.current.has(b.id))    continue;

        // Show if expiring within 2 minutes
        if (expiresWithin(b.date, b.timeOut, 2)) {
          shownRef.current.add(b.id);
          setReminderBooking(b);
          break; // show one at a time
        }
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (!loggedUser || loggedUser.role !== "customer") return;
    checkPayments();
    const interval = setInterval(checkPayments, 30_000);
    return () => clearInterval(interval);
  }, [loggedUser?.userId]);

  if (!reminderBooking) return null;

  return (
    <>
      {/* Warning overlay before gateway opens */}
      <ReminderOverlay
        booking={reminderBooking}
        onPay={() => {}} // PaymentGateway handles everything
        onDismiss={() => setReminderBooking(null)}
      />
      <PaymentGateway
        booking={reminderBooking}
        chef={reminderBooking.chef}
        onClose={() => setReminderBooking(null)}
        onSuccess={(receipt) => {
          setReminderBooking(null);
        }}
      />
    </>
  );
}

// Small banner shown behind the gateway to explain why it appeared
function ReminderOverlay({ booking, onDismiss }) {
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.65)",
      zIndex: 999,
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      paddingTop: "20px",
      pointerEvents: "none",
    }}>
      <div style={{
        background: "#fff3e0",
        border: "2px solid #ff9800",
        borderRadius: "12px",
        padding: "14px 20px",
        maxWidth: "400px",
        width: "100%",
        textAlign: "center",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        pointerEvents: "auto",
      }}>
        <div style={{ fontSize: "24px", marginBottom: "4px" }}>⏰</div>
        <div style={{ fontWeight: 700, color: "#e65100", fontSize: "14px" }}>
          Payment Due — Booking Expiring Soon!
        </div>
        <div style={{ fontSize: "13px", color: "#bf360c", marginTop: "4px" }}>
          Booking <strong>{booking.tokenId}</strong> with Chef <strong>{booking.chef?.name}</strong> expires at <strong>{booking.timeOut}</strong>.
          Complete payment now to confirm.
        </div>
      </div>
    </div>
  );
}

export default PaymentReminderPoller;