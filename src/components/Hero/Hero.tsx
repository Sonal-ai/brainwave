import React from 'react';
import styles from './Hero.module.css';
import Link from 'next/link';

export default function Hero() {
    return (
        <section className={styles.hero}>
            <div className={`${styles.blob} ${styles.blob1}`}></div>
            <div className={`${styles.blob} ${styles.blob2}`}></div>

            <div className={styles.badge}>
                <span style={{ width: 8, height: 8, background: 'currentColor', borderRadius: '50%' }}></span>
                v1.0 Public Beta
            </div>

            <h1 className={styles.title}>
                <span className={styles.gradientText}>Your Academic</span>
                <br />
                <span className={styles.highlight}>Superintelligence</span>
            </h1>

            <p className={styles.subtitle}>
                The all-in-one platform for DTU students. Manage files, track attendance, and get instant answers from your own personalized AI assistant.
            </p>

            <div className={styles.ctaGroup}>
                <Link href="/signup">
                    <button className={styles.primaryCta}>
                        Launch Dashboard
                    </button>
                </Link>
                <Link href="/about">
                    <button className={styles.secondaryCta}>
                        Explore Features
                    </button>
                </Link>
            </div>
        </section>
    );
}
