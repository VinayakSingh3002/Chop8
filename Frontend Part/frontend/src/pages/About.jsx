import React from "react";
import styles from "./Styles/About.module.css"

function About() {
  return (
    <div className={styles.about}>

      {/* 🔥 HERO */}
      <section className={styles.hero}>
        <h1>About Chop8</h1>
        <p>Your gateway to professional chefs at your doorstep</p>
      </section>

      {/* 📖 INTRO */}
      <section className={styles.section}>
        <h2>Who We Are</h2>
        <p>
          Chop8 is a chef management platform that connects customers with
          professional chefs for home cooking, events, and customized meals.
          We aim to bring restaurant-quality food experiences directly to your
          home with convenience and trust.
        </p>
      </section>

      {/* 🎯 MISSION & VISION */}
      <section className={styles.sectionAlt}>
        <div className={styles.grid}>
          <div>
            <h3>Our Mission</h3>
            <p>
              To make high-quality cooking services accessible to everyone by
              connecting skilled chefs with customers in a seamless way.
            </p>
          </div>

          <div>
            <h3>Our Vision</h3>
            <p>
              To become the leading platform for chef services and redefine how
              people experience food at home.
            </p>
          </div>
        </div>
      </section>

      {/* 👨‍🍳 WHY CHOOSE US */}
      <section className={styles.section}>
        <h2>Why Choose Us</h2>

        <div className={styles.features}>
          <div>👨‍🍳 Verified Professional Chefs</div>
          <div>🍽️ Customized Meal Experience</div>
          <div>🕒 Flexible Booking</div>
          <div>⭐ High Quality & Hygiene</div>
        </div>
      </section>

      {/* 📊 STATS */}
      <section className={styles.sectionAlt}>
        <div className={styles.stats}>
          <div>
            <h3>500+</h3>
            <p>Chefs</p>
          </div>
          <div>
            <h3>1000+</h3>
            <p>Happy Customers</p>
          </div>
          <div>
            <h3>4.8⭐</h3>
            <p>Average Rating</p>
          </div>
        </div>
      </section>

      {/* 🚀 CTA */}
      <section className={styles.cta}>
        <h2>Join Chop8 Today</h2>
        <p>Book a chef or become one — start your journey now</p>
        <button>Get Started</button>
      </section>

    </div>
  );
}

export default About;