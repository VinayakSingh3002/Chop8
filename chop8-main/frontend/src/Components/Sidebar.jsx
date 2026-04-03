// src/Components/Sidebar.jsx
import React from "react";
import styles from "./css/Sidebar.module.css";
import { Link } from "react-router";
import { getUser } from "../services/AuthService";
import {
  FaHome, FaList, FaShoppingCart,
  FaTicketAlt, FaHeart,
  FaClipboardList, FaCreditCard,
} from "react-icons/fa";

function Sidebar({
  open, setOpen, onLogout,
  username = "Customer Name",
  mobileN0 = "+91-0000000000",
  address  = "No address",
  email    = "xyz@gmail.com",
}) {
  const loggedUser = getUser();
  const isChef     = loggedUser?.role === "chef";

  const ordersItem = isChef
    ? { name: "My Bookings", path: "/chef-orders", icon: <FaClipboardList /> }
    : { name: "My Orders",   path: "/orders",      icon: <FaShoppingCart /> };

  const menuItems = [
    { name: "Home",         path: "/",           icon: <FaHome /> },
    { name: "Services",     path: "/services",   icon: <FaList /> },
    ordersItem,
    ...(!isChef ? [{ name: "My Payments", path: "/payments", icon: <FaCreditCard /> }] : []),
    { name: "My Voucher",   path: "/voucher",    icon: <FaTicketAlt /> },
    { name: "Favourites",   path: "/favourites", icon: <FaHeart /> },
  ];

  return (
    <div
      className={`${styles.overlay} ${open ? styles.show : ""}`}
      onClick={() => setOpen(false)}
    >
      <div className={styles.sidebar} onClick={e => e.stopPropagation()}>

        <button className={styles.close} onClick={() => setOpen(false)}>✖</button>

        {/* User info */}
        <div className={styles.user}>
          <h3>{username}</h3>
          <p>{mobileN0}</p>
          <p>{email}</p>
          <p>{address}</p>
          {isChef && (
            <span style={{
              display: "inline-block", marginTop: "6px",
              background: "#ffc107", color: "#3e2000",
              borderRadius: "12px", padding: "2px 10px",
              fontSize: "12px", fontWeight: 600,
            }}>
              Chef Account
            </span>
          )}
        </div>

        {/* Menu links */}
        <ul className={styles.menu}>
          {menuItems.map((item, i) => (
            <li key={i}>
              <Link
                to={item.path}
                className={styles.menuLink}
                onClick={() => setOpen(false)}
              >
                <span className={styles.icon}>{item.icon}</span>
                {item.name}
              </Link>
            </li>
          ))}
        </ul>

        <button className={styles.logout} onClick={onLogout}>Logout</button>
      </div>
    </div>
  );
}

export default Sidebar;