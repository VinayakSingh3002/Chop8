// src/Components/RatingPoller.jsx
//
// Mounted once in App.jsx — runs silently on every page.
// Every 30 seconds it checks the logged-in user's bookings.
// When a booking's timeOut passes (or has passed within the last 10 minutes)
// AND it hasn't been rated yet, a rating popup appears automatically.
//
import React, { useEffect, useState, useRef } from "react";
import { getUser } from "../services/AuthService";
import { API } from "../config";
import RatingModal from "./RatingModal";

// A booking is "just expired" if its date+timeOut is within the last 10 minutes
function justExpired(date, timeOut) {
  if (!date || !timeOut) return false;
  const expireAt = new Date(`${date}T${timeOut}:00`);
  const now      = new Date();
  const diffMs   = now - expireAt;           // positive = already expired
  return diffMs >= 0 && diffMs <= 10 * 60 * 1000; // within last 10 minutes
}

function RatingPoller() {
  const [pendingRatings, setPendingRatings] = useState([]); // queue of {booking, rateeId, rateeName, rateeRole}
  const [current,        setCurrent]        = useState(null);
  const ratedRef = useRef(new Set()); // bookingIds already rated this session

  const loggedUser = getUser();

  const checkBookings = async () => {
    const user = getUser(); // always read fresh
    if (!user) return;

    try {
      let bookings = [];

      if (user.role === "customer") {
        const res = await fetch(`${API.bookings}/user/${user.userId}`);
        bookings  = await res.json();
      } else if (user.role === "chef") {
        const res = await fetch(`${API.bookings}/chef/${user.userId}`);
        bookings  = await res.json();
      }

      if (!Array.isArray(bookings)) return;

      const queue = [];

      for (const b of bookings) {
        // Only CONFIRMED bookings that just expired
        if (b.status !== "CONFIRMED") continue;
        if (!justExpired(b.date, b.timeOut)) continue;
        // Skip if already rated this session
        if (ratedRef.current.has(b.id)) continue;

        // Check if already rated in DB
        try {
          const cr = await fetch(`${API.ratings}/booking/${b.id}/rater/${user.userId}`);
          const cd = await cr.json();
          if (cd.alreadyRated) {
            ratedRef.current.add(b.id);
            continue;
          }
        } catch { continue; }

        if (user.role === "customer") {
          // Customer rates the chef
          if (b.chef?.id) {
            queue.push({
              booking:   b,
              rateeId:   b.chef.id,
              rateeName: b.chef.name || "Chef",
              rateeRole: "chef",
            });
          }
        } else {
          // Chef rates the customer
          if (b.user?.id) {
            queue.push({
              booking:   b,
              rateeId:   b.user.id,
              rateeName: b.user.name || "Customer",
              rateeRole: "customer",
            });
          }
        }
      }

      if (queue.length > 0) {
        setPendingRatings(prev => {
          // Merge avoiding duplicates
          const existingIds = new Set(prev.map(p => p.booking.id));
          const newItems    = queue.filter(q => !existingIds.has(q.booking.id));
          return [...prev, ...newItems];
        });
      }
    } catch { /* network error — ignore silently */ }
  };

  // Poll every 30 seconds
  useEffect(() => {
    if (!loggedUser) return;
    checkBookings();
    const interval = setInterval(checkBookings, 30_000);
    return () => clearInterval(interval);
  }, [loggedUser?.userId]);

  // Show next in queue when current is dismissed
  useEffect(() => {
    if (!current && pendingRatings.length > 0) {
      setCurrent(pendingRatings[0]);
      setPendingRatings(prev => prev.slice(1));
    }
  }, [current, pendingRatings]);

  if (!current || !loggedUser) return null;

  return (
    <RatingModal
      booking={current.booking}
      raterId={loggedUser.userId}
      raterName={loggedUser.name}
      raterRole={loggedUser.role}
      rateeId={current.rateeId}
      rateeName={current.rateeName}
      rateeRole={current.rateeRole}
      onClose={() => {
        // "Skip" — mark as seen so it doesn't re-appear this session
        ratedRef.current.add(current.booking.id);
        setCurrent(null);
      }}
      onSubmitted={(stars) => {
        ratedRef.current.add(current.booking.id);
        setCurrent(null);
      }}
    />
  );
}

export default RatingPoller;