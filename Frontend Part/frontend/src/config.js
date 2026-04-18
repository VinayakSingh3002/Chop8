// src/config.js
const BASE = "http://localhost:8080";

export const API = {
  auth:      `${BASE}/api/auth`,
  profile:   `${BASE}/api/profile`,
  chefs:     `${BASE}/api/chefs`,
  book:      `${BASE}/api/book`,
  bookings:  `${BASE}/api/bookings`,
  payment:   `${BASE}/api/payment`,
  receipt:   `${BASE}/api/payment/receipt`,
  ratings:   `${BASE}/api/ratings`,
  recommend: `${BASE}/api/recommend/chefs`,   // ← dedicated key, no string hacks needed
};

// ── Payment & cancellation configuration ──────────────────
// These values must match BookingService.java constants exactly
export const PAYMENT = {
  PLATFORM_CHARGE:         49,
  GST_RATE:                0.03,
  ADVANCE_PERCENT:         0.30,
  FINAL_PERCENT:           0.70,
  CANCEL_CUTOFF_HRS:       3,
  EMERGENCY_THRESHOLD_HRS: 5,
  EMERGENCY_MULTIPLIER:    1.5,
};

// ── Price breakdown calculator ─────────────────────────────
export function calcPriceBreakdown(chefPricePerDay, isEmergency = false) {
  const baseChef  = chefPricePerDay || 0;
  const chef      = isEmergency
    ? Math.round(baseChef * PAYMENT.EMERGENCY_MULTIPLIER * 100) / 100
    : baseChef;
  const surcharge = isEmergency ? Math.round((chef - baseChef) * 100) / 100 : 0;
  const platform  = PAYMENT.PLATFORM_CHARGE;
  const gst       = Math.round((chef + platform) * PAYMENT.GST_RATE * 100) / 100;
  const total     = Math.round((chef + platform + gst) * 100) / 100;
  const advance   = Math.round(total * PAYMENT.ADVANCE_PERCENT * 100) / 100;
  const final_amt = Math.round((total - advance) * 100) / 100;
  return { baseChef, chef, surcharge, platform, gst, total, advance, final: final_amt };
}