import React from 'react';
import styles from './Navbar.module.css';
import Link from 'next/link';

export default function Navbar() {
    return (
        <nav className={styles.navbar}>
            <Link href="/" className={styles.logo}>
                DTU <span>Helper</span>
            </Link>

            <div className={styles.actions}>
                <Link href="/about" className={styles.link}>Features</Link>
                <Link href="/community" className={styles.link}>Community</Link>
                <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)', margin: '0 8px' }}></div>
                <Link href="/login" className={`${styles.button} ${styles.buttonSecondary}`}>
                    Login
                </Link>
                <Link href="/signup" className={`${styles.button} ${styles.buttonPrimary}`}>
                    Get Started
                </Link>
            </div>
        </nav>
    );
}
