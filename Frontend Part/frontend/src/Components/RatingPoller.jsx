// src/Components/RatingPoller.jsx
//
// Rules:
//  1. Only shows popup for bookings with status=EXPIRED (backend confirmed done)
//     OR CONFIRMED where timeOut has passed (grace: catches live expiry)
//     AND within 24 hours of timeOut
//  2. Always checks DB before showing — never shows if already rated
//  3. "Later" means: do NOT show again this session (stored in sessionStorage
//     so it survives page refresh within the same browser tab session)
//  4. After submit: never shows again (stored in sessionStorage too)
//  5. Only one popup at a time — queue processed one by one
//  6. No re-show after 30s poll if user already dismissed or rated
//
import React, { useEffect, useState, useRef } from "react";
import { getUser } from "../services/AuthService";
import { API } from "../config";
import RatingModal from "./RatingModal";

// ── Persistence helpers using sessionStorage ────────────
// sessionStorage persists across page refreshes WITHIN the same tab session
// but clears when the tab is closed. Perfect for "don't show again today".

const SS_KEY = "chop8_rated_bookings"; // comma-separated booking IDs

function getSessionRated() {
  try {
    const raw = sessionStorage.getItem(SS_KEY);
    return raw ? new Set(raw.split(",").map(Number).filter(Boolean)) : new Set();
  } catch { return new Set(); }
}

function markSessionRated(bookingId) {
  try {
    const set = getSessionRated();
    set.add(Number(bookingId));
    sessionStorage.setItem(SS_KEY, [...set].join(","));
  } catch { /* ignore */ }
}

// ── Time helpers ─────────────────────────────────────────
function hasTimeOutPassed(date, timeOut) {
  if (!date || !timeOut) return false;
  return new Date() > new Date(`${date}T${timeOut}:00`);
}

function isWithin24Hours(date, timeOut) {
  if (!date || !timeOut) return false;
  const expireAt = new Date(`${date}T${timeOut}:00`);
  const now      = new Date();
  if (now < expireAt) return false;
  return (now - expireAt) <= 24 * 60 * 60 * 1000;
}

// ── Main component ────────────────────────────────────────
function RatingPoller() {
  const [current, setCurrent] = useState(null); // the one item currently showing
  const processingRef = useRef(false);           // prevents concurrent polling
  const mountedRef    = useRef(true);            // prevents setState after unmount

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Core polling function ─────────────────────────────
  const pollAndShow = async () => {
    // Don't start a new check if one is in progress or modal is open
    if (processingRef.current) return;
    const user = getUser();
    if (!user) return;

    processingRef.current = true;

    try {
      // Fetch bookings for this user/chef
      let bookings = [];
      if (user.role === "customer") {
        const res = await fetch(`${API.bookings}/user/${user.userId}`);
        bookings  = await res.json();
      } else if (user.role === "chef") {
        const res = await fetch(`${API.bookings}/chef/${user.userId}`);
        bookings  = await res.json();
      }
      if (!Array.isArray(bookings)) return;

      // Get bookings already dismissed/rated this session
      const sessionRated = getSessionRated();

      for (const b of bookings) {
        // ── Gate 1: Skip ineligible statuses ────────────
        if (b.status === "CANCELLED" || b.status === "PENDING") continue;

        // ── Gate 2: Skip if already handled this session ─
        if (sessionRated.has(Number(b.id))) continue;

        // ── Gate 3: Only show after booking is truly done ─
        // Primary trigger: backend set status=EXPIRED
        // Secondary trigger: CONFIRMED + timeOut passed + within 24hr window
        const isExpired   = b.status === "EXPIRED";
        const isConfirmed = b.status === "CONFIRMED";
        const timePassed  = hasTimeOutPassed(b.date, b.timeOut);
        const within24h   = isWithin24Hours(b.date, b.timeOut);

        const eligible = (isExpired && within24h) ||
                         (isConfirmed && timePassed && within24h);

        if (!eligible) continue;

        // ── Gate 4: Resolve who to rate ──────────────────
        let rateeId   = null;
        let rateeName = null;

        if (user.role === "customer") {
          if (!b.chef?.id) continue;
          rateeId   = b.chef.id;
          rateeName = b.chef.name || "Chef";

        } else if (user.role === "chef") {
          // For chef side: must get customerId from dedicated API
          // (b.user.id unreliable due to large photo field in JSON)
          try {
            const cr    = await fetch(`${API.ratings}/booking/${b.id}/customer-rated`);
            const cdata = await cr.json();

            // Only show to chef if customer already rated
            if (!cdata.rated) continue;

            if (cdata.customerId) {
              rateeId   = cdata.customerId;
              rateeName = cdata.customerName || "Customer";
            } else if (b.user?.id) {
              rateeId   = b.user.id;
              rateeName = b.user.name || "Customer";
            }
          } catch {
            if (b.user?.id) { rateeId = b.user.id; rateeName = b.user.name || "Customer"; }
            else continue;
          }
          if (!rateeId) continue;
        }

        // ── Gate 5: DB check — has this user already rated? ─
        try {
          const dr   = await fetch(`${API.ratings}/booking/${b.id}/rater/${user.userId}?role=${user.role}`);
          const dd   = await dr.json();
          if (dd.alreadyRated) {
            // Already rated in DB — suppress for this session
            markSessionRated(b.id);
            continue;
          }
        } catch { continue; } // on network error, skip to next booking

        // ── All gates passed: show modal for this booking ─
        if (!mountedRef.current) break;
        setCurrent({
          booking:   b,
          rateeId,
          rateeName,
          rateeRole: user.role === "customer" ? "chef" : "customer",
        });
        break; // show one at a time — stop scanning
      }
    } catch { /* ignore network errors */ }
    finally {
      processingRef.current = false;
    }
  };

  // ── Start polling ─────────────────────────────────────
  useEffect(() => {
    pollAndShow();
    const interval = setInterval(() => {
      // Only poll if no modal is currently showing
      if (!current) pollAndShow();
    }, 30_000);
    return () => clearInterval(interval);
  }, [current]); // re-register interval when current changes

  const loggedUser = getUser();
  if (!current || !loggedUser) return null;
  if (!current.rateeId) {
    markSessionRated(current.booking.id);
    setCurrent(null);
    return null;
  }

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
        // "Later" clicked — suppress for this ENTIRE session (survives refresh)
        markSessionRated(current.booking.id);
        setCurrent(null);
      }}

      onSubmitted={() => {
        // Successfully rated — suppress permanently for this session
        markSessionRated(current.booking.id);
        setCurrent(null);
      }}
    />
  );
}

export default RatingPoller;