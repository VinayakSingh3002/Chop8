// src/pages/SignUp.jsx
import React, { useState } from "react";
import styles from "./Styles/Auth.module.css";
import { Link, useNavigate } from "react-router";
import { signup } from "../services/AuthService";

function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "", email: "", mobile: "", address: "",
    password: "", confirmPassword: "", role: "customer", pricePerDay: "",
  });
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); setError(""); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (form.password !== form.confirmPassword) { setError("Passwords do not match"); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (form.role === "chef" && (!form.pricePerDay || isNaN(form.pricePerDay) || Number(form.pricePerDay) <= 0)) {
      setError("Please enter a valid price per day for your chef profile."); return;
    }
    setLoading(true);
    try {
      const data = await signup(form);
      const tableMsg = form.role === "chef" ? "Chef account created!" : "Customer account created!";
      setSuccess(`${tableMsg} Welcome, ${data.name} 🎉`);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.message || "Signup failed. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <div className={styles.container}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h2>Sign Up</h2>

        {error   && <div style={{ color:"#c00",background:"#fff0f0",border:"1px solid #fcc",borderRadius:"8px",padding:"10px 14px",fontSize:"14px" }}>{error}</div>}
        {success && <div style={{ color:"#2a7a2a",background:"#f0fff0",border:"1px solid #b2d8b2",borderRadius:"8px",padding:"10px 14px",fontSize:"14px" }}>{success}</div>}

        <input name="name"    placeholder="Full Name"     value={form.name}    onChange={handleChange} required />
        <input name="email"   type="email" placeholder="Email" value={form.email} onChange={handleChange} required />
        <input name="mobile"  placeholder="Mobile Number" value={form.mobile}  onChange={handleChange} required />
        <input name="address" placeholder="Address"       value={form.address} onChange={handleChange} required />

        <select name="role" value={form.role} onChange={handleChange}>
          <option value="customer">Customer</option>
          <option value="chef">Chef</option>
        </select>

        {/* Price per day — only shown when role is chef */}
        {form.role === "chef" && (
          <input
            name="pricePerDay"
            type="number"
            min="1"
            placeholder="Your price per day (₹)"
            value={form.pricePerDay}
            onChange={handleChange}
            required
          />
        )}

        <input name="password"        type="password" placeholder="Password"         value={form.password}        onChange={handleChange} required />
        <input name="confirmPassword" type="password" placeholder="Confirm Password"  value={form.confirmPassword} onChange={handleChange} required />

        <button type="submit" disabled={loading}>{loading ? "Creating Account..." : "Create Account"}</button>

        <p className={styles.switch}>Already have an account? <Link to="/login">Login</Link></p>
      </form>
    </div>
  );
}

export default Signup;