import React from "react";
import { Link } from "react-router";
import styles from "./css/Footer.module.css";
import { CiInstagram } from "react-icons/ci";
import { FaFacebookSquare } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";



function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.topSection}>
          {/* Logo */}
          <div className={styles.logoSection}>
            <Link to="/" className={styles.logoWrapper}>
              <img src="/chop8_logo.png" className={styles.logo} alt="Logo" />
            </Link>
          </div>

          {/* Links */}
          <div className={styles.grid}>
            {/* Resources */}
            <div>
              <h2 className={styles.heading}>Resources</h2>
              <ul className={styles.list}>
                <li>
                  <Link to="/">Home</Link>
                </li>
                <li>
                  <Link to="/about">About</Link>
                </li>
              </ul>
            </div>

            {/* Follow */}
            <div>
              <h2 className={styles.heading}>Follow us</h2>
              <ul className={styles.list}>
                <li>
                  <a
                    href="https://github.com/vishal-kushwaha1001"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Github
                  </a>
                </li>
                <li>
                  <Link to="/">Discord</Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h2 className={styles.heading}>Legal</h2>
              <ul className={styles.list}>
                <li>
                  <Link to="#">Privacy Policy</Link>
                </li>
                <li>
                  <Link to="#">Terms & Conditions</Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <hr className={styles.divider} />

        {/* Bottom */}
        <div className={styles.bottom}>
          <span className={styles.copy}>
            © 2026 <a href="#">chop8</a>. All Rights Reserved.
          </span>

          {/* Social Icons */}
          <div className={styles.socials}>
            <Link to="#" className={styles.icon}><FaFacebookSquare /></Link>
            <Link to="#" className={styles.icon}><CiInstagram /></Link>
            <Link to="#" className={styles.icon}><FaXTwitter/></Link>
            <Link to="#" className={styles.icon}></Link>
            <Link to="#" className={styles.icon}> </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
