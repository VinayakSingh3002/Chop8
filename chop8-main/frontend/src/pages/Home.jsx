// src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import styles from "./Styles/Home.module.css";
import Card from "../Components/Card";
import { Link, useNavigate } from "react-router";
import Footer from "../Components/Footer";
import { API } from "../config";

const CATEGORIES = [
  { icon: "🍛", label: "Indian Chef",    color: "#ff6b35", bg: "#fff3ee", border: "#ffd4c2" },
  { icon: "🍝", label: "Italian Chef",   color: "#2e7d32", bg: "#f1f8e9", border: "#c5e1a5" },
  { icon: "🍰", label: "Dessert Chef",   color: "#ad1457", bg: "#fce4ec", border: "#f48fb1" },
  { icon: "🥗", label: "Healthy Chef",   color: "#00695c", bg: "#e0f2f1", border: "#80cbc4" },
  { icon: "🍱", label: "Japanese Chef",  color: "#283593", bg: "#e8eaf6", border: "#9fa8da" },
  { icon: "🌮", label: "Mexican Chef",   color: "#e65100", bg: "#fff8e1", border: "#ffcc80" },
  { icon: "🥘", label: "Continental",    color: "#4527a0", bg: "#ede7f6", border: "#b39ddb" },
  { icon: "🍜", label: "Chinese Chef",   color: "#b71c1c", bg: "#ffebee", border: "#ef9a9a" },
];

function Home() {
  const [chefs, setChefs] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(API.chefs)
      .then(r => r.json())
      .then(data => setChefs(Array.isArray(data) ? data.slice(0, 3) : []))
      .catch(() => {});
  }, []);

  return (
    <div className={styles.home}>

      {/* 🔥 HERO — with background image overlay */}
      <section
        className={styles.hero}
        style={{
          backgroundImage: `
            linear-gradient(135deg, rgba(38,160,218,0.82) 0%, rgba(49,71,85,0.88) 100%),
            url('https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1400&auto=format&fit=crop&q=80')
          `,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className={styles.heroContent}>
          <h1>Book Professional Chefs at Your Home</h1>
          <p>Enjoy restaurant-quality meals with expert chefs</p>
          <div className={styles.heroBtns}>
            <Link to="/services">
              <button className={styles.primaryBtn}>Explore Services</button>
            </Link>
            <Link to="/signup">
              <button className={styles.secondaryBtn}>Become a Chef</button>
            </Link>
          </div>
        </div>
      </section>

      {/* 🍽️ OUR SERVICES — real chef cards, Book Now navigates to /services */}
      <section className={styles.section}>
        <h2>Our Services</h2>
        <div className={styles.cards}>
          {chefs.length > 0 ? chefs.map(chef => (
            <Card
              key={chef.id}
              title={chef.name}
              subtitle={chef.mobile || "Professional Chef"}
              specialisation={chef.specialisation || ""}
              icon="👨‍🍳"
              price={chef.pricePerDay || 0}
              avgRating={chef.avgRating || 0}
              ratingCount={chef.ratingCount || 0}
              onBook={() => navigate("/services")}
            />
          )) : (
            <>
              <Card
                title="Personal Chef"
                subtitle="Cook at your home"
                icon="👨‍🍳"
                price={499}
                onBook={() => navigate("/services")}
              />
              <Card
                title="Event Catering"
                subtitle="For parties & events"
                icon="🎉"
                price={999}
                onBook={() => navigate("/services")}
              />
              <Card
                title="Meal Prep"
                subtitle="Healthy daily meals"
                icon="🍱"
                price={299}
                onBook={() => navigate("/services")}
              />
            </>
          )}
        </div>
        <div style={{ marginTop: "28px", textAlign: "center" }}>
          <Link to="/services">
            <button className={styles.primaryBtn} style={{ padding: "12px 32px", fontSize: "15px" }}>
              View All Chefs →
            </button>
          </Link>
        </div>
      </section>

      {/* 🍴 BROWSE BY SPECIALISATION */}
      <section className={styles.sectionAlt}>
        <h2>Browse by Specialisation</h2>
        <p style={{ color: "#666", marginBottom: "32px", fontSize: "15px" }}>
          Find the perfect chef for your cuisine preference
        </p>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "16px",
          maxWidth: "900px",
          margin: "0 auto",
        }}>
          {CATEGORIES.map((cat, i) => (
            <Link
              to={`/services?specialisation=${encodeURIComponent(cat.label)}`}
              key={i}
              style={{ textDecoration: "none" }}
            >
              <div
                style={{
                  background: cat.bg,
                  border: `1.5px solid ${cat.border}`,
                  borderRadius: "16px",
                  padding: "22px 16px",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.25s ease",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = "translateY(-5px)";
                  e.currentTarget.style.boxShadow = "0 10px 25px rgba(0,0,0,0.12)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
                }}
              >
                <div style={{ fontSize: "36px", marginBottom: "10px" }}>{cat.icon}</div>
                <div style={{ fontWeight: 700, fontSize: "13px", color: cat.color, letterSpacing: "0.3px" }}>
                  {cat.label}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 🚀 CTA */}
      <section className={styles.cta}>
        <h2>Join as a Chef Partner</h2>
        <p>Start earning by sharing your cooking skills</p>
        <Link to="/signup">
          <button className={styles.primaryBtn}>Register Now</button>
        </Link>
      </section>

      <Footer />
    </div>
  );
}

export default Home;