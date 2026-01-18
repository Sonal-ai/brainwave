'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth0 } from '@auth0/auth0-react';
import { STATIC_SUBJECTS } from '@/lib/constants';
import styles from './page.module.css';

export default function Dashboard() {
    const { user, isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
    const router = useRouter();
    const [scheduleData, setScheduleData] = useState<any>(STATIC_TIMETABLE_DATA);
    const [nextClasses, setNextClasses] = useState<any[]>([]);
    const [advice, setAdvice] = useState<any>(null);
    const [loadingAdvice, setLoadingAdvice] = useState(false);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            loginWithRedirect();
        }
    }, [isLoading, isAuthenticated, loginWithRedirect]);

    const [showAdviceModal, setShowAdviceModal] = useState(false);

    // Fetch Advice Logic
    const fetchAdvice = async () => {
        setLoadingAdvice(true);
        try {
            if (!user?.email) return;

            // Get data from localStorage (Scoped to User)
            const attData = JSON.parse(localStorage.getItem(`attendance_data_${user.email}`) || '{}');
            const acadData = JSON.parse(localStorage.getItem(`academic_data_${user.email}`) || '{}');


            const res = await fetch('/api/advice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    attendance: attData,
                    cgpa: acadData.cgpa || "N/A"
                })
            });
            const data = await res.json();
            setAdvice(data);
            setShowAdviceModal(true); // Open Modal on success
        } catch (error) {
            console.error("Failed to fetch advice", error);
        } finally {
            setLoadingAdvice(false);
        }
    };

    // Auto-fetch advice on mount (or you could make it manual)
    useEffect(() => {
        if (isAuthenticated) {
            // Optional: fetchAdvice(); 
        }
    }, [isAuthenticated]);

    // ... (Data Sync Effect & Calculate Upcoming Classes - existing code) ...
    // Note: Re-inserting existing effects here for completeness in context if needed, 
    // but usually 'replace_file_content' is surgical. I will just add the variables and render logic.

    // Data Sync Effect
    useEffect(() => {
        if (isAuthenticated && user?.email) {
            fetch('/api/auth/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email, name: user.name })
            })
                .then(r => r.json())
                .then(data => {
                    const timetable = data.user?.timetable;
                    if (timetable) {
                        setScheduleData(timetable);
                    }
                })
                .catch(e => console.error(e));
        }
    }, [isAuthenticated, user]);

    // Calculate Upcoming Classes
    useEffect(() => {
        // Try to get subjects from new schema or legacy schema
        const subjectsList = scheduleData?.schedule?.subjects || scheduleData?.subjects || [];
        if (subjectsList.length === 0) return;

        const allSessions: any[] = [];
        subjectsList.forEach((subj: any) => {
            if (subj.classes) {
                subj.classes.forEach((cls: any) => {
                    allSessions.push({
                        ...cls,
                        subjectName: subj.name,
                        day: cls.day?.toUpperCase() // Normalize day
                    });
                });
            }
        });

        const now = new Date();
        const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        const currentDay = days[now.getDay()];
        const currentTime = now.getHours() * 60 + now.getMinutes();

        // 1. Get classes for TODAY that haven't passed yet
        const todayClasses = allSessions
            .filter(s => s.day === currentDay || s.day?.startsWith(currentDay))
            .filter(s => {
                const [h, m] = s.start_time.split(':').map(Number);
                const classTime = h * 60 + m;
                return classTime > currentTime;
            })
            .sort((a, b) => a.start_time.localeCompare(b.start_time));

        // 2. Get classes for TOMORROW (if today has < 3 left)
        const nextDayIndex = (now.getDay() + 1) % 7;
        const nextDay = days[nextDayIndex];
        const tomorrowClasses = allSessions
            .filter(s => s.day === nextDay || s.day?.startsWith(nextDay))
            .sort((a, b) => a.start_time.localeCompare(b.start_time));

        setNextClasses([...todayClasses, ...tomorrowClasses].slice(0, 3));
    }, [scheduleData]);

    if (isLoading || !isAuthenticated || !user) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>Loading...</div>;
    }



    const NOTICES = [
        { id: 1, title: 'Mid-Term Schedule Released', date: '2 hours ago', urgent: true },
        { id: 2, title: 'Holiday', date: '1 day ago', urgent: false },
        { id: 3, title: 'Project Submission Deadline Extended', date: '2 days ago', urgent: false },
    ];

    // Helper to get advice color
    const getAdviceColor = (adviceType: string) => {
        switch (adviceType) {
            case 'ATTEND_MORE_CLASSES': return 'var(--error)';
            case 'STUDY_HARDER': return 'var(--warning)';
            default: return 'var(--success)';
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.welcomeHeading}>
                        Hello, <span className={styles.userName}>{user.name}</span>
                    </h1>
                    <p className={styles.subtitle}>
                        Here is what's happening today.
                    </p>
                </div>

                <button
                    onClick={fetchAdvice}
                    disabled={loadingAdvice}
                    className={styles.adviceBtn}
                >
                    {loadingAdvice ? (
                        <>
                            <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span> Analyzing...
                        </>
                    ) : (
                        <>
                            <span>🤖</span> Get AI Advice
                        </>
                    )}
                </button>
            </header>

            {/* AI Advisor Modal */}
            {showAdviceModal && advice && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal} style={{ border: `1px solid ${getAdviceColor(advice.primary_advice)}` }}>
                        <button
                            onClick={() => setShowAdviceModal(false)}
                            style={{
                                position: 'absolute', top: '20px', right: '20px',
                                background: 'transparent', border: 'none', color: 'var(--text-secondary)',
                                fontSize: '24px', cursor: 'pointer'
                            }}
                        >
                            ✕
                        </button>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '32px' }}>
                            <div style={{
                                background: getAdviceColor(advice.primary_advice), color: 'white',
                                width: '80px', height: '80px', borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px',
                                marginBottom: '24px', boxShadow: `0 10px 20px ${getAdviceColor(advice.primary_advice)}40`
                            }}>
                                🤖
                            </div>
                            <h2 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                AI Recommendation
                            </h2>
                            <h3 style={{ fontSize: '32px', fontWeight: '900', color: getAdviceColor(advice.primary_advice), margin: 0 }}>
                                {advice.primary_advice.replace(/_/g, ' ')}
                            </h3>
                        </div>

                        <div style={{ background: 'var(--bg-tertiary)', padding: '24px', borderRadius: '16px', marginBottom: '24px' }}>
                            <p style={{ fontSize: '16px', lineHeight: 1.6, color: 'var(--text-primary)', margin: 0 }}>
                                {advice.reason}
                            </p>
                        </div>

                        {advice.next_steps?.length > 0 && (
                            <div>
                                <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '12px' }}>SUGGESTED ACTIONS</h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                    {advice.next_steps.map((step: string, i: number) => (
                                        <div key={i} style={{
                                            background: 'var(--bg-primary)', padding: '12px 20px',
                                            borderRadius: '12px', fontSize: '14px', border: '1px solid var(--glass-border)',
                                            display: 'flex', alignItems: 'center', gap: '8px'
                                        }}>
                                            <span style={{ color: 'var(--accent-primary)' }}>•</span> {step}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Main Content Grid */}
            <div className={styles.mainGrid}>
                {/* 1. Upcoming Classes */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h2 className={styles.cardTitle}>Upcoming Classes</h2>
                        <button onClick={() => router.push('/dashboard/timetable')} className={styles.viewAllBtn}>View All</button>
                    </div>

                    {nextClasses.length > 0 ? (
                        <div className={styles.classList}>
                            {nextClasses.map((cls, idx) => (
                                <div key={idx} className={styles.classItem}>
                                    <div className={styles.timeBox}>
                                        <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{cls.start_time}</div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{cls.location || 'TBA'}</div>
                                    </div>
                                    <div style={{ overflow: 'hidden' }}>
                                        <div style={{ fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cls.subjectName}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{cls.day} (Next)</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '20px', textAlign: 'center' }}>
                            No upcoming classes found for today/tomorrow.
                        </div>
                    )}
                </div>

                {/* 2. Notice Board */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h2 className={styles.cardTitle}>Notice Board</h2>
                        <span style={{ fontSize: '12px', background: 'var(--accent-primary)', color: 'white', padding: '2px 8px', borderRadius: '10px' }}>New</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {NOTICES.map(notice => (
                            <div key={notice.id} className={styles.noticeItem} style={{ borderLeft: `3px solid ${notice.urgent ? 'var(--error)' : 'var(--text-secondary)'}` }}>
                                <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>{notice.title}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{notice.date}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. AI Shortcut & System */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* AI Card */}
                    <div
                        onClick={() => router.push('/dashboard/chat')}
                        className={styles.aiCard}
                    >
                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>Ask AI Helper</h2>
                            <p style={{ fontSize: '14px', opacity: 0.9, marginBottom: '16px' }}>
                                Need help with assignments or finding files? Chat now.
                            </p>
                            <button className={styles.openChatBtn}>
                                Open Chat
                            </button>
                        </div>
                        {/* Decorative Circle */}
                        <div style={{
                            position: 'absolute', right: '-20px', bottom: '-20px',
                            width: '100px', height: '100px', background: 'rgba(255,255,255,0.2)',
                            borderRadius: '50%'
                        }}></div>
                    </div>

                    {/* System Status (Condensed) */}
                    <div className={styles.systemStatus}>
                        <h2 style={{ fontSize: '16px', marginBottom: '12px', color: 'var(--accent-primary)' }}>System Status</h2>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)' }}></div>
                                All Systems Operational
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--warning)' }}></div>
                                Community Syncing...
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const STATIC_TIMETABLE_DATA = {
    "subjects": [
        {
            "name": "COMPUTER AIDED ENGINEERING GRAPHICS-2",
            "classes": [
                { "day": "MON", "start_time": "09:00", "end_time": "10:00", "location": "LAB", "subject": "COMPUTER AIDED ENGINEERING GRAPHICS-2" },
                { "day": "MON", "start_time": "11:00", "end_time": "12:00", "location": "", "subject": "COMPUTER AIDED ENGINEERING GRAPHICS-2" },
                { "day": "WED", "start_time": "11:00", "end_time": "12:00", "location": "", "subject": "COMPUTER AIDED ENGINEERING GRAPHICS-2" }
            ]
        },
        {
            "name": "BASIC ELECTRONICS & COMMUNICATION ENGINEERING",
            "classes": [
                { "day": "MON", "start_time": "12:00", "end_time": "13:00", "location": "", "subject": "BASIC ELECTRONICS & COMMUNICATION ENGINEERING" },
                { "day": "THU", "start_time": "11:00", "end_time": "12:00", "location": "", "subject": "BASIC ELECTRONICS & COMMUNICATION ENGINEERING" },
                { "day": "THU", "start_time": "16:00", "end_time": "17:00", "location": "LAB", "subject": "BASIC ELECTRONICS & COMMUNICATION ENGINEERING" }
            ]
        },
        {
            "name": "PROGRAMMING FUNDAMENTALS",
            "classes": [
                { "day": "MON", "start_time": "13:00", "end_time": "14:00", "location": "", "subject": "PROGRAMMING FUNDAMENTALS" },
                { "day": "FRI", "start_time": "13:00", "end_time": "14:00", "location": "", "subject": "PROGRAMMING FUNDAMENTALS" },
                { "day": "FRI", "start_time": "14:00", "end_time": "15:00", "location": "LAB", "subject": "PROGRAMMING FUNDAMENTALS" }
            ]
        },
        {
            "name": "AS SELECTED",
            "classes": [
                { "day": "TUE", "start_time": "08:00", "end_time": "09:00", "location": "", "subject": "AS SELECTED" },
                { "day": "THU", "start_time": "08:00", "end_time": "09:00", "location": "", "subject": "AS SELECTED" }
            ]
        },
        {
            "name": "MATHEMATICS-I",
            "classes": [
                { "day": "TUE", "start_time": "12:00", "end_time": "13:00", "location": "PB-GF6", "subject": "MATHEMATICS-I" },
                { "day": "TUE", "start_time": "13:00", "end_time": "14:00", "location": "PB-GF6", "subject": "MATHEMATICS-I" },
                { "day": "WED", "start_time": "09:00", "end_time": "10:00", "location": "", "subject": "MATHEMATICS-I" },
                { "day": "WED", "start_time": "15:00", "end_time": "16:00", "location": "PB-GF6", "subject": "MATHEMATICS-I" }
            ]
        },
        {
            "name": "WEB DESIGNING",
            "classes": [
                { "day": "TUE", "start_time": "14:00", "end_time": "15:00", "location": "CS103", "subject": "WEB DESIGNING" },
                { "day": "THU", "start_time": "14:00", "end_time": "15:00", "location": "CS-103", "subject": "WEB DESIGNING" }
            ]
        }
    ]
};
