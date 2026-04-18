// src/Components/PaymentReminderPoller.jsx
//
// Runs silently on every page. Polls every 30 seconds.
// Shows payment reminder popup for bookings that need action.
//
// Reminder rules:
//   A) Advance not paid + expiring within 2 min → show advance payment popup
//   B) Advance paid + final not paid + timeOut passed → show final payment popup
//      (since we now give 24hr grace period for final payment)
//
// A booking is considered "advance paid" if advancePaymentStatus === "PAID"
// NOT by checking paymentStatus (which is "ADVANCE_PAID" not "PAID")
//
import React, { useEffect, useState, useRef } from "react";
import { getUser } from "../services/AuthService";
import { API } from "../config";
import PaymentGateway from "./PaymentGateway";

function expiresWithin(date, timeOut, withinMinutes) {
  if (!date || !timeOut) return false;
  const expireAt = new Date(`${date}T${timeOut}:00`);
  const now      = new Date();
  const diffMs   = expireAt - now; // positive = future, negative = past
  return diffMs > 0 && diffMs <= withinMinutes * 60 * 1000;
}

function hasTimeOutPassed(date, timeOut) {
  if (!date || !timeOut) return false;
  return new Date() > new Date(`${date}T${timeOut}:00`);
}

// Within 24hr grace window after timeOut
function isWithinGracePeriod(date, timeOut) {
  if (!date || !timeOut) return false;
  const expireAt = new Date(`${date}T${timeOut}:00`);
  const now      = new Date();
  if (now <= expireAt) return false;
  return (now - expireAt) <= 24 * 60 * 60 * 1000;
}

function PaymentReminderPoller() {
  const [reminderBooking, setReminderBooking] = useState(null);
  const [paymentType,     setPaymentType]     = useState("ADVANCE");
  // Track both shown and paid bookingIds to prevent re-showing after payment
  const shownRef = useRef(new Set());
  const paidRef  = useRef(new Set());

  const checkPayments = async () => {
    const user = getUser();
    if (!user || user.role !== "customer") return;

    try {
      const res      = await fetch(`${API.bookings}/user/${user.userId}`);
      const bookings = await res.json();
      if (!Array.isArray(bookings)) return;

      for (const b of bookings) {
        if (b.status === "CANCELLED" || b.status === "EXPIRED") continue;
        if (b.paymentMode !== "ONLINE") continue;
        if (paidRef.current.has(b.id))  continue; // already paid this session
        if (shownRef.current.has(b.id)) continue; // already shown this session

        const advancePaid = b.advancePaymentStatus === "PAID";
        const finalPaid   = b.finalPaymentStatus   === "PAID"
                         || b.paymentStatus         === "PAID";

        if (finalPaid) {
          // Fully paid — mark as done, never show again
          paidRef.current.add(b.id);
          shownRef.current.add(b.id);
          continue;
        }

        if (!advancePaid) {
          // ── Case A: Advance not paid, expiring within 2 minutes ──
          if (b.status === "CONFIRMED" && expiresWithin(b.date, b.timeOut, 2)) {
            shownRef.current.add(b.id);
            setPaymentType("ADVANCE");
            setReminderBooking(b);
            break;
          }
          // Also show if status is PENDING (never got advance paid) and expiring soon
          if (b.status === "PENDING" && expiresWithin(b.date, b.timeOut, 2)) {
            shownRef.current.add(b.id);
            setPaymentType("ADVANCE");
            setReminderBooking(b);
            break;
          }

        } else {
          // ── Case B: Advance paid, final not yet paid ──
          // Show reminder if timeOut has passed (service is done, time to pay final)
          if (b.status === "CONFIRMED" &&
              hasTimeOutPassed(b.date, b.timeOut) &&
              isWithinGracePeriod(b.date, b.timeOut)) {
            shownRef.current.add(b.id);
            setPaymentType("FINAL");
            setReminderBooking(b);
            break;
          }
        }
      }
    } catch { /* ignore network errors */ }
  };

  useEffect(() => {
    const user = getUser();
    if (!user || user.role !== "customer") return;
    checkPayments();
    const interval = setInterval(checkPayments, 30_000);
    return () => clearInterval(interval);
  }, []);

  if (!reminderBooking) return null;

  const isAdvance = paymentType === "ADVANCE";

  return (
    <>
      {/* Banner behind the gateway */}
      <div style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.65)",
        zIndex: 999,
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: "16px",
        pointerEvents: "none",
      }}>
        <div style={{
          background: isAdvance ? "#fff3e0" : "#e8f5e9",
          border: `2px solid ${isAdvance ? "#ff9800" : "#43a047"}`,
          borderRadius: "12px",
          padding: "12px 20px",
          maxWidth: "400px",
          width: "100%",
          textAlign: "center",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          pointerEvents: "auto",
        }}>
          <div style={{ fontSize: "22px", marginBottom: "4px" }}>
            {isAdvance ? "⏰" : "💰"}
          </div>
          <div style={{ fontWeight: 700, color: isAdvance ? "#e65100" : "#2e7d32", fontSize: "14px" }}>
            {isAdvance
              ? "Advance Payment Due — Booking Expiring Soon!"
              : "Final Payment Due — Service Completed!"}
          </div>
          <div style={{ fontSize: "12px", color: isAdvance ? "#bf360c" : "#1b5e20", marginTop: "4px" }}>
            {isAdvance
              ? `Booking with Chef ${reminderBooking.chef?.name} expires at ${reminderBooking.timeOut}. Pay advance now to confirm.`
              : `Service with Chef ${reminderBooking.chef?.name} on ${reminderBooking.date} is complete. Pay final ₹${reminderBooking.finalAmount || 0} now.`}
          </div>
        </div>
      </div>

      <PaymentGateway
        booking={reminderBooking}
        paymentType={paymentType}
        onClose={() => {
          // User dismissed — remove from shown set so it can re-appear
          // next poll IF still applicable (they might pay later)
          shownRef.current.delete(reminderBooking.id);
          setReminderBooking(null);
        }}
        onSuccess={(receipt) => {
          // Payment done — mark as paid so it NEVER shows again this session
          paidRef.current.add(reminderBooking.id);
          shownRef.current.add(reminderBooking.id);
          setReminderBooking(null);
        }}
      />
    </>
  );
}

export default PaymentReminderPoller;