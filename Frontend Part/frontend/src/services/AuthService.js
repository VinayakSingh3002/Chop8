// src/services/AuthService.js
import { API } from "../config";

const STORAGE_KEY = "chop8_user";

// ─── SIGNUP ──────────────────────────────────────────────
export async function signup(formData) {
  const res = await fetch(`${API.auth}/signup`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name:     formData.name,
      email:    formData.email,
      password: formData.password,
      mobile:   formData.mobile,
      address:  formData.address,
      role:     formData.role,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Signup failed");
  return data;
}

// ─── LOGIN ────────────────────────────────────────────────
export async function login(email, password) {
  const res = await fetch(`${API.auth}/login`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Login failed");
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return data;
}

// ─── LOGOUT ───────────────────────────────────────────────
export function logout() {
  localStorage.removeItem(STORAGE_KEY);
}

// ─── GET LOGGED IN USER ───────────────────────────────────
export function getUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ─── IS LOGGED IN? ────────────────────────────────────────
export function isLoggedIn() {
  return !!getUser();
}

// ─── UPDATE LOCAL USER ────────────────────────────────────
export function updateLocalUser(updates) {
  const current = getUser();
  if (!current) return;
  const merged = { ...current, ...updates };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  window.dispatchEvent(new Event("storage"));
}

// ─── FETCH PROFILE FROM SERVER ────────────────────────────
export async function fetchProfile(role, userId) {
  const res = await fetch(`${API.profile}/${role}/${userId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not load profile");
  return data;
}

// ─── SAVE PROFILE TO SERVER ───────────────────────────────
export async function saveProfile(role, userId, payload) {
  const res = await fetch(`${API.profile}/${role}/${userId}`, {
    method:  "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not save profile");
  return data;
}