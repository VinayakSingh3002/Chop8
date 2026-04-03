// src/config.js
// Change BASE to your machine's IP when running on a local network.
// e.g. const BASE = "http://192.168.1.5:8080";

const BASE = "http://localhost:8080";

export const API = {
  auth:     `${BASE}/api/auth`,
  profile:  `${BASE}/api/profile`,
  chefs:    `${BASE}/api/chefs`,
  book:     `${BASE}/api/book`,
  bookings: `${BASE}/api/bookings`,
  payment:  `${BASE}/api/payment`,
  ratings:  `${BASE}/api/ratings`,
};