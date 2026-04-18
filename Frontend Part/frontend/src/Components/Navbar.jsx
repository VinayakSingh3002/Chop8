// src/Components/Navbar.jsx
//
// Changes from previous version:
//   ❌ REMOVED: 🏆 Recommended Chefs link (it is now on the Home page as a leaderboard section)
//   ✅ KEPT:    Home, Services, Orders, About, login/logout, sidebar hamburger
//
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import styles from "./css/Navbar.module.css";
import Sidebar from "./Sidebar";
import { getUser, logout } from "../services/AuthService";

function Navbar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const loggedUser = getUser();
  const navigate   = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <>
      <nav className={styles.navbar}>

        {/* ── Brand / Logo ── */}
        <Link to="/" className={styles.brand}>
          <img src="/chop8-logo.png" alt="Chop8" className={styles.logo}
               onError={e => { e.target.style.display = "none"; }} />
          <span className={styles.brandText}>chop8</span>
        </Link>

        {/* ── Centre nav links ── */}
        {/* 🏆 Recommended Chefs link has been REMOVED from here.
            The leaderboard is now shown directly on the Home page. */}
        <ul className={styles.navLinks}>
          <li><Link to="/"          className={styles.navLink}>🏠 Home</Link></li>
          <li><Link to="/services"  className={styles.navLink}>🍴 Services</Link></li>
          <li>
            <Link
              to={loggedUser?.role === "chef" ? "/chef-orders" : "/orders"}
              className={styles.navLink}
            >
              🛒 Orders
            </Link>
          </li>
          <li><Link to="/about"     className={styles.navLink}>ℹ️ About</Link></li>
        </ul>

        {/* ── Right side ── */}
        <div className={styles.rightNav}>
          {loggedUser ? (
            <>
              <Link to="/profile" className={styles.userPill}>
                <span className={styles.userIcon}>👤</span>
                <span>{loggedUser.name}</span>
              </Link>
              <button className={styles.logoutBtn} onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login">
                <button className={styles.loginBtn}>Log in</button>
              </Link>
              <Link to="/signup">
                <button className={styles.signupBtn}>Get started</button>
              </Link>
            </>
          )}

          {/* Hamburger — opens Sidebar */}
          <button className={styles.hamburger} onClick={() => setSidebarOpen(true)}>
            ☰
          </button>
        </div>
      </nav>

      {/* Sidebar (slide-in panel) */}
      {loggedUser && (
        <Sidebar
          open={sidebarOpen}
          setOpen={setSidebarOpen}
          onLogout={handleLogout}
          username={loggedUser.name}
          mobileN0={loggedUser.mobile  || ""}
          email={loggedUser.email      || ""}
          address={loggedUser.address  || ""}
        />
      )}
    </>
  );
}

export default Navbar;