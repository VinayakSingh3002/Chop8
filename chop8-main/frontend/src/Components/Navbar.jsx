import React from 'react'
import styles from "./css/Navbar.module.css"
import { NavLink, Link } from 'react-router'
import RightNav from './RightNav';
import {
  FaHome,
  FaServicestack,
  FaShoppingCart,
  FaInfoCircle,
} from "react-icons/fa";


function Navbar() {
 const navItems = [
    { path: "/", label: "Home", icon: <FaHome /> },
    { path: "/Services", label: "Services", icon: <FaServicestack /> },
    { path: "/Orders", label: "Orders", icon: <FaShoppingCart /> },
    { path: "/About", label: "About", icon: <FaInfoCircle /> },
  ];

  return (
    <header className={styles.header}>
      <nav className={styles.navbar}>
        <div className={styles.container}>

          {/* Logo */}
          <Link to="/" className={styles.logo}>
            <img
              src="/chop8_logo.png"
              className={styles.logoImg}
              alt="Logo"
            /> 
            <p className={styles.logoText}>chop8</p>
          </Link>

          <RightNav />

          {/* Menu */}
          <div className={styles.menuContainer} id="">
            <ul className={styles.menu}>

              {navItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `${styles.link} ${isActive ? styles.active : ""}`
                    }
                  >
                    <span className={styles.icon}>{item.icon}</span>
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </nav>
    </header>
  );
}

export default Navbar;