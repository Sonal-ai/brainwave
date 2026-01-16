import React from 'react';
import styles from './Navbar.module.css';
import Link from 'next/link';
import { AuthButtons } from '../AuthButtons';

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
                <AuthButtons styles={styles} />
            </div>
        </nav>
    );
}
