'use client';

import { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

export default function AttendancePage() {
    const { user } = useAuth0();

    // Default subjects from static data (fallback)
    const DEFAULT_SUBJECTS = [
        "COMPUTER AIDED ENGINEERING GRAPHICS-2",
        "BASIC ELECTRONICS & COMMUNICATION ENGINEERING",
        "PROGRAMMING FUNDAMENTALS",
        "AS SELECTED",
        "MATHEMATICS-I",
        "WEB DESIGNING"
    ];

    const [subjects, setSubjects] = useState<string[]>(DEFAULT_SUBJECTS);
    const [attendance, setAttendance] = useState<Record<string, { attended: number; total: number }>>({});

    // Load Data
    useEffect(() => {
        // 1. Try to load saved attendance from LocalStorage
        const saved = localStorage.getItem('attendance_data');
        if (saved) {
            setAttendance(JSON.parse(saved));
        } else {
            // Initialize
            const initial: any = {};
            DEFAULT_SUBJECTS.forEach(s => initial[s] = { attended: 0, total: 0 });
            setAttendance(initial);
        }

        // 2. Try to sync subjects from DB (optional, essentially "get from previous method")
        if (user?.email) {
            fetch('/api/auth/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email, name: user.name })
            })
                .then(r => r.json())
                .then(data => {
                    const timetableSubjs = data.user?.timetable?.subjects?.map((s: any) => s.name);
                    if (timetableSubjs && timetableSubjs.length > 0) {
                        // Merge with existing attendance logic if needed, for now just replace list
                        // But we must preserve attendance data for matching names
                        setSubjects(timetableSubjs);
                    }
                })
                .catch(e => console.error(e));
        }
    }, [user]);

    // Save on Change
    useEffect(() => {
        if (Object.keys(attendance).length > 0) {
            localStorage.setItem('attendance_data', JSON.stringify(attendance));
        }
    }, [attendance]);

    const updateAttendance = (subject: string, type: 'present' | 'absent') => {
        setAttendance(prev => {
            const current = prev[subject] || { attended: 0, total: 0 };
            const newTotal = current.total + 1;
            const newAttended = type === 'present' ? current.attended + 1 : current.attended;

            return {
                ...prev,
                [subject]: { attended: newAttended, total: newTotal }
            };
        });
    };

    const resetSubject = (subject: string) => {
        if (confirm(`Reset attendance for ${subject}?`)) {
            setAttendance(prev => ({
                ...prev,
                [subject]: { attended: 0, total: 0 }
            }));
        }
    };

    const getPercentage = (sub: string) => {
        const data = attendance[sub];
        if (!data || data.total === 0) return 0;
        return ((data.attended / data.total) * 100).toFixed(1);
    };

    return (
        <div style={{ animation: 'fadeUp 0.6s ease-out', padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>Attendance Tracker</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Track your daily classes. Goal: 75%</p>

            <div style={{ display: 'grid', gap: '24px' }}>
                {subjects.map(subject => {
                    const data = attendance[subject] || { attended: 0, total: 0 };
                    const pct = Number(getPercentage(subject));
                    const isLow = pct < 75 && data.total > 0;

                    return (
                        <div key={subject} style={{
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '16px',
                            padding: '24px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>{subject}</h3>
                                <div style={{
                                    padding: '6px 12px', borderRadius: '20px',
                                    background: isLow ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                                    color: isLow ? 'var(--error)' : 'var(--success)',
                                    fontWeight: 'bold', fontSize: '14px'
                                }}>
                                    {pct}%
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', marginBottom: '24px', overflow: 'hidden' }}>
                                <div style={{
                                    width: `${pct}%`, height: '100%',
                                    background: isLow ? 'var(--error)' : 'var(--success)',
                                    transition: 'width 0.3s ease'
                                }}></div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                                    {data.attended} / {data.total} Classes
                                </div>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        onClick={() => updateAttendance(subject, 'absent')}
                                        style={{
                                            padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--error)',
                                            background: 'transparent', color: 'var(--error)', cursor: 'pointer', fontWeight: 600
                                        }}>
                                        Missed
                                    </button>
                                    <button
                                        onClick={() => updateAttendance(subject, 'present')}
                                        style={{
                                            padding: '8px 16px', borderRadius: '8px', border: 'none',
                                            background: 'var(--success)', color: 'white', cursor: 'pointer', fontWeight: 600
                                        }}>
                                        Attended
                                    </button>
                                </div>
                            </div>
                            <div style={{ marginTop: '12px', textAlign: 'right' }}>
                                <button onClick={() => resetSubject(subject)} style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Reset</button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
