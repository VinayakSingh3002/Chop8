// src/Components/RightNav.jsx
import React, { useState, useEffect } from "react";
import styles from "./css/Rightnav.module.css";
import { Link, useNavigate } from "react-router";
import { FaUserCircle } from "react-icons/fa";
import Sidebar from "./Sidebar.jsx";
import { getUser, logout } from "../services/AuthService";

function RightNav() {
  const navigate = useNavigate();
  const [open, setOpen]   = useState(false);
  const [user, setUser]   = useState(getUser()); // reactive state

  // Re-read localStorage whenever the component mounts or window regains focus
  // This ensures navbar updates after login redirect
  useEffect(() => {
    const sync = () => setUser(getUser());
    window.addEventListener("focus", sync);
    // Also sync on storage events (e.g. login in another tab)
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("focus", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setUser(null); // update navbar immediately
    navigate("/login");
  };

  return (
    <>
      <div className={styles.actions}>
        {user ? (
          <>
            <Link to="/profile" className={styles.profileBtn}>
              <FaUserCircle className={styles.icon} /> {user.name}
            </Link>
            <button
              onClick={handleLogout}
              className={styles.loginBtn}
              style={{ cursor: "pointer", border: "none", background: "none" }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login"  className={styles.loginBtn}>Log in</Link>
            <Link to="/signup" className={styles.startBtn}>Get started</Link>
          </>
        )}

        {/* Hamburger */}
        <div
          className={`${styles.hamburger} ${open ? styles.active : ""}`}
          onClick={() => setOpen(!open)}
        >
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>

      <Sidebar
        open={open}
        setOpen={setOpen}
        username={user?.name    || "Guest"}
        email={user?.email      || "Not logged in"}
        mobileN0={user?.mobile  || ""}
        address={user?.address  || ""}
        onLogout={handleLogout}
      />
    </>
  );
}

export default RightNav;