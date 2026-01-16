"use client";

import React, { useState } from 'react';
import Summariser from '@/components/Utilities/Summariser';
import QuizMaster from '@/components/Utilities/QuizMaster';
import styles from './page.module.css';

export default function UtilitiesPage() {
    const [activeTab, setActiveTab] = useState('summariser');

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Utilities</h1>
                <p>Advanced AI tools to help you with your studies.</p>
            </div>

            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === 'summariser' ? styles.active : ''}`}
                    onClick={() => setActiveTab('summariser')}
                >
                    Summariser
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'quiz' ? styles.active : ''}`}
                    onClick={() => setActiveTab('quiz')}
                >
                    Quiz Master
                </button>
                {/* Future utility tabs can be added here */}
            </div>

            <div className={styles.content}>
                {activeTab === 'summariser' && <Summariser />}
                {activeTab === 'quiz' && <QuizMaster />}
            </div>
        </div>
    );
}
